import { describe, it, expect } from "vitest";
import { buildProgressionOverviewModel } from "./progressionOverviewModel.js";

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

describe("buildProgressionOverviewModel", () => {
  it("hasData=false si pas d'activites", () => {
    const m = buildProgressionOverviewModel({ activities: [] });
    expect(m.hasData).toBe(false);
  });

  it("retourne 6 KPI cumul annuel avec sparklines", () => {
    const ref = new Date("2026-05-21");
    const acts = [];
    for (let i = 0; i < 30; i += 1) {
      acts.push(makeRun({ date: new Date(2026, 0, 1 + i * 4).toISOString(), km: 10 }));
    }
    const m = buildProgressionOverviewModel({ activities: acts, referenceDate: ref });
    expect(m.hasData).toBe(true);
    expect(m.cumulAnnuel).toHaveLength(6);
    const keys = m.cumulAnnuel.map((k) => k.key);
    expect(keys).toEqual(["distance", "time", "elevation", "count", "activeDays", "avgHr"]);
    // Sparklines tronquees aux mois ecoules (refDate = mai -> 5 mois)
    expect(m.cumulAnnuel[0].sparkline.length).toBe(5);
  });

  it("weeklyVolume expose points + valeur courante", () => {
    const ref = new Date("2026-05-21");
    const acts = [];
    for (let w = 0; w < 20; w += 1) {
      acts.push(makeRun({ date: new Date(ref.getTime() - w * 7 * 86400000).toISOString(), km: 15 }));
    }
    const m = buildProgressionOverviewModel({ activities: acts, referenceDate: ref });
    expect(m.weeklyVolume.points.length).toBeGreaterThan(0);
    expect(m.weeklyVolume.current).toBeTruthy();
    expect(m.weeklyVolume.current.formattedValue).toMatch(/km/);
  });

  it("cumulativeProgress : 3 progress bars avec %", () => {
    const ref = new Date("2026-05-21");
    const acts = [makeRun({ date: "2026-03-01", km: 500 })];
    const m = buildProgressionOverviewModel({
      activities: acts,
      referenceDate: ref,
      goals: { distanceKm: 1000, durationHours: 100, elevationM: 5000 },
    });
    expect(m.cumulativeProgress).toHaveLength(3);
    const dist = m.cumulativeProgress.find((c) => c.key === "distance");
    expect(dist.percent).toBe(50);
  });

  it("highlights : 3 items (best month, longest run, max elev)", () => {
    const ref = new Date("2026-05-21");
    const acts = [
      makeRun({ date: "2026-04-15", km: 30, elevM: 800 }),
      makeRun({ date: "2026-03-10", km: 10, elevM: 200 }),
    ];
    const m = buildProgressionOverviewModel({ activities: acts, referenceDate: ref });
    expect(m.highlights).toHaveLength(3);
    const longest = m.highlights.find((h) => h.key === "longestRun");
    expect(longest.mainText).toMatch(/30/);
  });

  it("monthlyProgression : tronque aux mois ecoules (mai -> 5 mois)", () => {
    const m = buildProgressionOverviewModel({
      activities: [makeRun({ date: "2026-03-15", km: 10 })],
      referenceDate: new Date("2026-05-21"),
    });
    expect(m.monthlyProgression.points).toHaveLength(5);
    expect(m.monthlyProgression.points[2].distanceKm).toBeGreaterThan(0);
  });

  it("regularity : percent + weeks array + bestStreak", () => {
    const ref = new Date("2026-05-21");
    const acts = [];
    // 1 sortie par semaine sur 10 sem consecutives
    for (let w = 0; w < 10; w += 1) {
      acts.push(makeRun({ date: new Date(2026, 0, 7 + w * 7).toISOString(), km: 10 }));
    }
    const m = buildProgressionOverviewModel({ activities: acts, referenceDate: ref });
    expect(m.regularity.percent).toBeGreaterThanOrEqual(0);
    expect(m.regularity.weeks).toHaveLength(52);
    expect(m.regularity.bestStreak).toBeGreaterThanOrEqual(8);
  });

  it("longTermTrends : 3 sparklines (charge, volume, D+)", () => {
    const m = buildProgressionOverviewModel({
      activities: [makeRun({ date: "2026-03-15", km: 10 })],
      referenceDate: new Date("2026-05-21"),
    });
    expect(m.longTermTrends).toHaveLength(3);
    // 1 seule annee avec data dans la fixture (2026) → 1 point apres filtrage
    expect(m.longTermTrends[0].points.length).toBeGreaterThanOrEqual(1);
  });

  it("yearOverYearCharts : 3 charts avec lignes current/previous/objective", () => {
    const m = buildProgressionOverviewModel({
      activities: [makeRun({ date: "2026-03-15", km: 10 })],
      referenceDate: new Date("2026-05-21"),
    });
    expect(m.yearOverYearCharts).toHaveLength(3);
    const dist = m.yearOverYearCharts.find((c) => c.key === "distance");
    // Tronque aux semaines ecoulees (refDate = 21 mai -> ~semaine 20)
    expect(dist.points.length).toBeGreaterThan(15);
    expect(dist.points.length).toBeLessThanOrEqual(22);
    expect(dist.points[0]).toHaveProperty("current");
    expect(dist.points[0]).toHaveProperty("previous");
    expect(dist.points[0]).toHaveProperty("objective");
  });
});
