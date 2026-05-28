import { describe, it, expect } from "vitest";
import { buildProgressionVolumeModel } from "./progressionVolumeModel.js";

function makeRun({ date, km = 10, durationMin = 60, elevM = 100, sport = "Run", hr = 150 }) {
  return {
    sportType: sport,
    type: sport,
    startDateLocal: date,
    startDate: date,
    distance: km * 1000,
    movingTime: durationMin * 60,
    totalElevationGain: elevM,
    averageHeartrate: hr,
  };
}

describe("buildProgressionVolumeModel", () => {
  it("hasData=false si pas d'activites run-like", () => {
    const m = buildProgressionVolumeModel({ activities: [] });
    expect(m.hasData).toBe(false);
  });

  it("construit 4 KPIs avec deltas annuels", () => {
    const ref = new Date("2026-05-21");
    const acts = [];
    // 12 mois courants : 2 runs/sem * 52 = 104 runs de 10km
    for (let w = 0; w < 52; w += 1) {
      const d = new Date(ref.getTime() - w * 7 * 86400000);
      acts.push(makeRun({ date: d.toISOString(), km: 10 }));
      acts.push(makeRun({ date: d.toISOString(), km: 8 }));
    }
    // Annee precedente : 1 run/sem * 52 = 52 runs de 5km
    for (let w = 52; w < 104; w += 1) {
      const d = new Date(ref.getTime() - w * 7 * 86400000);
      acts.push(makeRun({ date: d.toISOString(), km: 5 }));
    }
    const m = buildProgressionVolumeModel({ activities: acts, referenceDate: ref });
    expect(m.hasData).toBe(true);
    expect(m.kpi).toHaveLength(4);
    const keys = m.kpi.map((k) => k.key);
    expect(keys).toEqual(["distance", "time", "elevation", "sorties"]);
    // Distance courante (10+8=18 km/sem) > precedente (5 km/sem) -> tone positive
    expect(m.kpi[0].deltaTone).toBe("positive");
  });

  it("expose 3 charts avec moyenne glissante", () => {
    const ref = new Date("2026-05-21");
    const acts = [];
    for (let w = 0; w < 10; w += 1) {
      const d = new Date(ref.getTime() - w * 7 * 86400000);
      acts.push(makeRun({ date: d.toISOString(), km: 10 }));
    }
    const m = buildProgressionVolumeModel({ activities: acts, referenceDate: ref });
    expect(m.charts.distance.length).toBeGreaterThan(0);
    expect(m.charts.time.length).toBeGreaterThan(0);
    expect(m.charts.elevation.length).toBeGreaterThan(0);
    // chaque point doit avoir value et rolling
    const sample = m.charts.distance[0];
    expect(sample).toHaveProperty("value");
    expect(sample).toHaveProperty("rolling");
  });

  it("composition expose 12 semaines avec categories", () => {
    const ref = new Date("2026-05-21");
    const acts = [];
    for (let w = 0; w < 12; w += 1) {
      const d = new Date(ref.getTime() - w * 7 * 86400000);
      acts.push(makeRun({ date: d.toISOString(), km: 10, elevM: 50, durationMin: 50 }));
    }
    const m = buildProgressionVolumeModel({ activities: acts, referenceDate: ref });
    expect(m.composition.length).toBeGreaterThanOrEqual(12);
    expect(m.composition.length).toBeLessThanOrEqual(13);
    // au moins une semaine doit avoir somme des % ≈ 100 (les autres peuvent
    // etre vides si la fenetre calendrier deborde sur des semaines sans activite)
    const totals = m.composition.map(
      (w) => w.trail + w.route + w.sortie_longue + w.recuperation + w.autre,
    );
    const nonEmpty = totals.filter((t) => t > 0);
    expect(nonEmpty.length).toBeGreaterThanOrEqual(10);
    nonEmpty.forEach((t) => {
      expect(t).toBeGreaterThanOrEqual(95);
      expect(t).toBeLessThanOrEqual(105);
    });
  });

  it("compositionMeta expose 5 categories avec couleurs", () => {
    const m = buildProgressionVolumeModel({
      activities: [makeRun({ date: "2026-05-15", km: 10 })],
      referenceDate: new Date("2026-05-21"),
    });
    expect(Object.keys(m.compositionMeta)).toEqual(
      expect.arrayContaining(["trail", "route", "sortie_longue", "recuperation", "autre"]),
    );
    expect(m.compositionMeta.trail.color).toBeTruthy();
  });

  it("takeaways : message positif si distance >= +5%", () => {
    const ref = new Date("2026-05-21");
    const acts = [];
    // Courante : 10km/sem
    for (let w = 0; w < 52; w += 1) {
      const d = new Date(ref.getTime() - w * 7 * 86400000);
      acts.push(makeRun({ date: d.toISOString(), km: 10 }));
    }
    // Precedente : 5km/sem
    for (let w = 52; w < 104; w += 1) {
      const d = new Date(ref.getTime() - w * 7 * 86400000);
      acts.push(makeRun({ date: d.toISOString(), km: 5 }));
    }
    const m = buildProgressionVolumeModel({ activities: acts, referenceDate: ref });
    const dist = m.takeaways.find((t) => t.key === "distance");
    expect(dist?.tone).toBe("positive");
  });

  it("polarisation : hasData=false si aucune seance classifiee", () => {
    const m = buildProgressionVolumeModel({
      activities: [makeRun({ date: "2026-05-15", km: 10 })],
      referenceDate: new Date("2026-05-21"),
    });
    expect(m.polarisation.hasData).toBe(false);
  });

  it("compositionByIntensity : repartit la distance par intensite/semaine", () => {
    const ref = new Date("2026-05-21");
    const acts = [
      // semaine courante : 10km endurance (low) + 5km vma (high)
      { ...makeRun({ date: "2026-05-20", km: 10 }), userSessionType: "endurance_fond" },
      { ...makeRun({ date: "2026-05-19", km: 5 }), userSessionType: "vma_courte" },
    ];
    const m = buildProgressionVolumeModel({ activities: acts, referenceDate: ref });
    expect(Array.isArray(m.compositionByIntensity)).toBe(true);
    const nonEmpty = m.compositionByIntensity.filter((w) => (w.low + w.mid + w.high) > 0);
    expect(nonEmpty.length).toBeGreaterThanOrEqual(1);
    // 10km low / 15km total ≈ 67%, 5km high ≈ 33%
    const wk = nonEmpty[nonEmpty.length - 1];
    expect(wk.low).toBe(67);
    expect(wk.high).toBe(33);
    expect(m.compositionByIntensityMeta.low.color).toBeTruthy();
  });

  it("polarisation : repartit low/mid/high sur les seances classifiees", () => {
    const ref = new Date("2026-05-21");
    const acts = [];
    // 8 endurance (low), 2 tempo (mid) sur les 12 dernieres semaines
    for (let i = 0; i < 8; i += 1) {
      const d = new Date(ref.getTime() - i * 2 * 86400000);
      acts.push({ ...makeRun({ date: d.toISOString() }), userSessionType: "endurance_fond" });
    }
    for (let i = 0; i < 2; i += 1) {
      const d = new Date(ref.getTime() - (i * 2 + 1) * 86400000);
      acts.push({ ...makeRun({ date: d.toISOString() }), userSessionType: "tempo" });
    }
    const m = buildProgressionVolumeModel({ activities: acts, referenceDate: ref });
    expect(m.polarisation.hasData).toBe(true);
    expect(m.polarisation.total).toBe(10);
    expect(m.polarisation.easyPct).toBe(80); // 8/10 facile
    const low = m.polarisation.buckets.find((b) => b.key === "low");
    expect(low.count).toBe(8);
    expect(low.pct).toBe(80);
    expect(m.polarisation.byType[0].key).toBe("endurance_fond"); // trie par count desc
  });
});
