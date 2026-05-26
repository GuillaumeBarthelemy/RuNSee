import { describe, it, expect } from "vitest";
import { buildProgressionComparisonsModel } from "./progressionComparisonsModel.js";

function makeRun({ date, km = 10, elevM = 100, sport = "Run" }) {
  return {
    sportType: sport,
    type: sport,
    startDateLocal: date,
    startDate: date,
    distance: km * 1000,
    movingTime: 3600,
    totalElevationGain: elevM,
    averageHeartrate: 150,
  };
}

describe("buildProgressionComparisonsModel", () => {
  it("hasData=false si pas d'activites", () => {
    expect(buildProgressionComparisonsModel({ activities: [] }).hasData).toBe(false);
  });

  it("retourne 4 KPIs", () => {
    const ref = new Date("2026-05-21");
    const acts = [];
    for (let i = 0; i < 30; i += 1) {
      acts.push(makeRun({ date: new Date(2026, 0, 1 + i * 4).toISOString() }));
      acts.push(makeRun({ date: new Date(2025, 0, 1 + i * 4).toISOString(), km: 7 }));
    }
    const m = buildProgressionComparisonsModel({ activities: acts, referenceDate: ref });
    expect(m.hasData).toBe(true);
    expect(m.kpi).toHaveLength(4);
    const keys = m.kpi.map((k) => k.key);
    expect(keys).toEqual(["vs_n1", "vs_12w", "trail_specific", "balance"]);
  });

  it("monthlyComparison : 12 mois + footer YTD + projection", () => {
    const ref = new Date("2026-05-21");
    const acts = [];
    for (let i = 0; i < 12; i += 1) {
      acts.push(makeRun({ date: new Date(2026, i % 5, 1).toISOString(), km: 10 }));
      acts.push(makeRun({ date: new Date(2025, i % 12, 1).toISOString(), km: 8 }));
    }
    const m = buildProgressionComparisonsModel({ activities: acts, referenceDate: ref });
    expect(m.monthlyComparison.points).toHaveLength(12);
    expect(m.monthlyComparison.formattedYtdCurrent).toMatch(/km/);
    expect(m.monthlyComparison.formattedProjection).toMatch(/km/);
  });

  it("twelveWeeksComparison : points + ecart", () => {
    const ref = new Date("2026-05-21");
    const acts = [];
    for (let w = 0; w < 24; w += 1) {
      acts.push(makeRun({ date: new Date(ref.getTime() - w * 7 * 86400000).toISOString() }));
    }
    const m = buildProgressionComparisonsModel({ activities: acts, referenceDate: ref });
    expect(m.twelveWeeksComparison.points).toHaveLength(12);
    expect(m.twelveWeeksComparison.formattedDelta).toMatch(/\+|-/);
  });

  it("sportBreakdown : 2 donuts (current + previous) avec 4 categories", () => {
    const m = buildProgressionComparisonsModel({
      activities: [
        makeRun({ date: "2026-03-15", sport: "TrailRun", km: 20 }),
        makeRun({ date: "2026-04-15", sport: "Run", km: 10 }),
        makeRun({ date: "2025-04-15", sport: "Run", km: 8 }),
      ],
      referenceDate: new Date("2026-05-21"),
    });
    expect(m.sportBreakdown.current.items).toHaveLength(4);
    expect(m.sportBreakdown.previous.items).toHaveLength(4);
    expect(m.sportBreakdown.evolutions).toHaveLength(4);
  });

  it("terrainElevation : 2 metriques (D+ et D+/km)", () => {
    const m = buildProgressionComparisonsModel({
      activities: [
        makeRun({ date: "2026-03-15", km: 10, elevM: 500 }),
        makeRun({ date: "2025-03-15", km: 10, elevM: 300 }),
      ],
      referenceDate: new Date("2026-05-21"),
    });
    expect(m.terrainElevation.elevation).toBeTruthy();
    expect(m.terrainElevation.elevationPerKm).toBeTruthy();
    expect(m.terrainElevation.elevation.tone).toBe("positive");
  });

  it("progressItems + watchItems : au moins 1 element chacun", () => {
    const m = buildProgressionComparisonsModel({
      activities: [
        makeRun({ date: "2026-03-15" }),
        makeRun({ date: "2025-03-15", km: 8 }),
      ],
      referenceDate: new Date("2026-05-21"),
    });
    expect(m.progressItems.length).toBeGreaterThanOrEqual(1);
    expect(m.watchItems.length).toBeGreaterThanOrEqual(1);
  });
});
