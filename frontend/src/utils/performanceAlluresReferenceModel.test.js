import { describe, it, expect } from "vitest";
import { buildAlluresReferenceModel } from "./performanceAlluresReferenceModel.js";

// Le modele recalcule paces + racePredictions depuis le master VDOT en interne.
// Fixture minimaliste : on fournit juste le VDOT.
function fakeVdotProfile(vdot = 54) {
  return { hasData: true, vdot };
}

describe("buildAlluresReferenceModel", () => {
  it("retourne hasData=false si vdotProfile manquant ou vide", () => {
    expect(buildAlluresReferenceModel({ vdotProfile: null }).hasData).toBe(false);
    expect(buildAlluresReferenceModel({ vdotProfile: { hasData: false } }).hasData).toBe(false);
  });

  it("construit 7 paceCards avec Daniels + race predictions", () => {
    const model = buildAlluresReferenceModel({ vdotProfile: fakeVdotProfile(54) });
    expect(model.hasData).toBe(true);
    expect(model.paceCards).toHaveLength(7);
    const keys = model.paceCards.map((c) => c.key);
    expect(keys).toEqual(["facile", "endurance", "marathon", "seuil", "10k", "5k", "1k"]);
  });

  it("Allure facile : pace Daniels E coherente pour VDOT 54 (5:00-6:30/km)", () => {
    const model = buildAlluresReferenceModel({ vdotProfile: fakeVdotProfile(54) });
    const facile = model.paceCards.find((c) => c.key === "facile");
    expect(facile.paceSecondsPerKm).toBeGreaterThan(280); // > 4:40
    expect(facile.paceSecondsPerKm).toBeLessThan(420);    // < 7:00
    expect(facile.formattedPace).toMatch(/^\d:\d{2}$/);
  });

  it("Ordre allures : facile > endurance > marathon > seuil > 10k > 5k > 1k (lent -> rapide)", () => {
    const model = buildAlluresReferenceModel({ vdotProfile: fakeVdotProfile(54) });
    const paces = model.paceCards.map((c) => c.paceSecondsPerKm);
    for (let i = 0; i < paces.length - 1; i += 1) {
      expect(paces[i]).toBeGreaterThanOrEqual(paces[i + 1]);
    }
  });

  it("1 km zone Z5 (intervalles courts)", () => {
    const model = buildAlluresReferenceModel({ vdotProfile: fakeVdotProfile(54) });
    const oneK = model.paceCards.find((c) => c.key === "1k");
    expect(oneK.zone).toBe("Zone Z5");
    expect(oneK.paceSecondsPerKm).toBeGreaterThan(0);
  });

  it("Delta VMA : 5k et 1k au-dessus ou egal a VMA (delta proche 0 ou negatif)", () => {
    const model = buildAlluresReferenceModel({ vdotProfile: fakeVdotProfile(54) });
    const oneK = model.paceCards.find((c) => c.key === "1k");
    // 1k = I pace = VMA -> delta 0 par definition
    expect(Math.abs(oneK.vmaDeltaSeconds)).toBeLessThan(2);
    const cinqK = model.paceCards.find((c) => c.key === "5k");
    // 5k pace proche de VMA (Daniels : 5k race ~ vVO2max, +/-10s)
    expect(Math.abs(cinqK.vmaDeltaSeconds)).toBeLessThan(15);
  });

  it("comparisonRows : facile delta=0, autres negatifs (plus rapides)", () => {
    const model = buildAlluresReferenceModel({ vdotProfile: fakeVdotProfile(54) });
    expect(model.comparisonRows).toHaveLength(7);
    const facile = model.comparisonRows.find((r) => r.key === "facile");
    expect(facile.deltaSeconds).toBe(0);
    const seuil = model.comparisonRows.find((r) => r.key === "seuil");
    expect(seuil.deltaSeconds).toBeLessThan(0);
    expect(seuil.formattedDelta).toMatch(/^-/);
  });

  it("Affichage Garmin prioritaire + Calculs ponderes (mix 70/30)", () => {
    const model = buildAlluresReferenceModel({
      vdotProfile: fakeVdotProfile(53),
      vdotHistory: {
        latestSnapshot: { date: "2026-05-21", vdotValue: 56, source: "garmin" },
        snapshots: [{ date: "2026-05-21", vdotValue: 56, source: "garmin" }],
      },
    });
    // Display : Garmin (56) — ce que voit l'utilisateur
    expect(model.vdotValue).toBe(56);
    expect(model.vdotSource).toBe("garmin");
    // Subtitle mentionne VO2max + Garmin
    expect(model.subtitle).toMatch(/Garmin/);
  });

  it("Fallback Daniels seul si pas de Garmin", () => {
    const model = buildAlluresReferenceModel({ vdotProfile: fakeVdotProfile(53) });
    expect(model.vdotValue).toBe(53);
    expect(model.vdotSource).toBe("daniels_internal");
  });

  it("Fallback Garmin seul si pas de Daniels", () => {
    const model = buildAlluresReferenceModel({
      vdotProfile: null,
      vdotHistory: {
        latestSnapshot: { date: "2026-05-21", vdotValue: 56, source: "garmin" },
      },
    });
    expect(model.vdotValue).toBe(56);
    expect(model.vdotSource).toBe("garmin");
  });

  it("equivalences : 5 lignes 1k/5k/10k/Semi/Marathon avec plages", () => {
    const model = buildAlluresReferenceModel({ vdotProfile: fakeVdotProfile(54) });
    expect(model.equivalences).toHaveLength(5);
    const fiveK = model.equivalences.find((r) => r.key === "5k");
    expect(fiveK.formattedDistance).toBe("5,00 km");
    expect(fiveK.formattedPaceRange).toMatch(/^\d+:\d{2} - \d+:\d{2}$/);
  });

  it("zones : 5 zones Daniels Z1-Z5 avec couleurs", () => {
    const model = buildAlluresReferenceModel({ vdotProfile: fakeVdotProfile(54) });
    expect(model.zones).toHaveLength(5);
    const zoneKeys = model.zones.map((z) => z.key);
    expect(zoneKeys).toEqual(["z1", "z2", "z3", "z4", "z5"]);
    expect(model.zones.find((z) => z.key === "z1").formattedRange).toMatch(/^≤ /);
  });

  it("usageTips : 4 conseils coach", () => {
    const model = buildAlluresReferenceModel({ vdotProfile: fakeVdotProfile(54) });
    expect(model.usageTips).toHaveLength(4);
    expect(model.usageTips[0].title).toBe("Adapte selon le terrain");
  });

  it("warning : texte obligatoire spec section 9.5", () => {
    const model = buildAlluresReferenceModel({ vdotProfile: fakeVdotProfile(54) });
    expect(model.warning).toMatch(/^Ces allures sont des repères/);
  });

  it("thresholdEvolution : hasData=false si pas assez de snapshots", () => {
    const model = buildAlluresReferenceModel({
      vdotProfile: fakeVdotProfile(54),
      vdotHistory: { snapshots: [] },
    });
    expect(model.thresholdEvolution.hasData).toBe(false);
  });

  it("thresholdEvolution : hasData=true avec >=2 snapshots dans 30j", () => {
    const today = new Date("2026-05-21");
    const model = buildAlluresReferenceModel({
      vdotProfile: fakeVdotProfile(54),
      vdotHistory: {
        snapshots: [
          { date: "2026-05-01", vdotValue: 53.5 },
          { date: "2026-05-10", vdotValue: 54.0 },
          { date: "2026-05-20", vdotValue: 54.5 },
        ],
      },
      referenceDate: today,
    });
    expect(model.thresholdEvolution.hasData).toBe(true);
    expect(model.thresholdEvolution.points.length).toBe(3);
    // VDOT en hausse -> T pace decrease -> tone positive
    expect(model.thresholdEvolution.summary.tone).toBe("positive");
  });
});
