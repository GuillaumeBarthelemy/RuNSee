import { describe, it, expect } from "vitest";
import { buildProgressionRegularityModel } from "./progressionRegularityModel.js";

function makeRun({ date, km = 10 }) {
  return {
    sportType: "Run",
    type: "Run",
    startDateLocal: date,
    startDate: date,
    distance: km * 1000,
    movingTime: 3600,
    totalElevationGain: 50,
    averageHeartrate: 150,
  };
}

describe("buildProgressionRegularityModel", () => {
  it("hasData=false si pas d'activites", () => {
    const m = buildProgressionRegularityModel({ activities: [] });
    expect(m.hasData).toBe(false);
  });

  it("retourne 4 KPIs", () => {
    const ref = new Date("2026-05-21");
    const acts = [];
    for (let w = 0; w < 20; w += 1) {
      acts.push(makeRun({ date: new Date(ref.getTime() - w * 7 * 86400000).toISOString() }));
    }
    const m = buildProgressionRegularityModel({ activities: acts, referenceDate: ref });
    expect(m.hasData).toBe(true);
    expect(m.kpi).toHaveLength(4);
    const keys = m.kpi.map((k) => k.key);
    expect(keys).toEqual(["weeks_active", "current_streak", "sorties_per_week", "active_days"]);
  });

  it("heatmap : 7 rows + monthLabels + legend", () => {
    const m = buildProgressionRegularityModel({
      activities: [makeRun({ date: "2026-03-15" })],
      referenceDate: new Date("2026-05-21"),
    });
    expect(m.heatmap.rows).toHaveLength(7);
    expect(m.heatmap.weekdayLabels).toHaveLength(7);
    expect(m.heatmap.legend).toHaveLength(4);
  });

  it("weeklyFrequency : <= 26 points avec count + rolling", () => {
    const ref = new Date("2026-05-21");
    const acts = [];
    for (let w = 0; w < 30; w += 1) {
      acts.push(makeRun({ date: new Date(ref.getTime() - w * 7 * 86400000).toISOString() }));
    }
    const m = buildProgressionRegularityModel({ activities: acts, referenceDate: ref });
    expect(m.weeklyFrequency.length).toBeLessThanOrEqual(26);
    expect(m.weeklyFrequency.length).toBeGreaterThan(10);
    expect(m.weeklyFrequency[0]).toHaveProperty("count");
    expect(m.weeklyFrequency[0]).toHaveProperty("rolling");
  });

  it("weekdayBreakdown : 7 jours avec %", () => {
    const m = buildProgressionRegularityModel({
      activities: [
        makeRun({ date: "2026-05-04" }), // lundi
        makeRun({ date: "2026-05-11" }), // lundi
        makeRun({ date: "2026-05-15" }), // vendredi
      ],
      referenceDate: new Date("2026-05-21"),
    });
    expect(m.weekdayBreakdown).toHaveLength(7);
    const lundi = m.weekdayBreakdown.find((d) => d.label === "Lundi");
    expect(lundi.percent).toBeGreaterThan(0);
  });

  it("streakTimeline : streaks + cells", () => {
    const ref = new Date("2026-05-21");
    const acts = [];
    for (let w = 0; w < 5; w += 1) {
      acts.push(makeRun({ date: new Date(ref.getTime() - w * 7 * 86400000).toISOString() }));
    }
    const m = buildProgressionRegularityModel({ activities: acts, referenceDate: ref });
    expect(m.streakTimeline.streaks.length).toBeGreaterThan(0);
    expect(m.streakTimeline.cells.length).toBeGreaterThan(0);
  });

  it("takeaways : 4 messages contextualises", () => {
    const ref = new Date("2026-05-21");
    const acts = [];
    for (let w = 0; w < 20; w += 1) {
      acts.push(makeRun({ date: new Date(ref.getTime() - w * 7 * 86400000).toISOString() }));
    }
    const m = buildProgressionRegularityModel({ activities: acts, referenceDate: ref });
    expect(m.takeaways).toHaveLength(4);
  });
});
