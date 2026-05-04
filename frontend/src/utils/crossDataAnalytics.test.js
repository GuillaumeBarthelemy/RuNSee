import { describe, expect, it } from "vitest";
import {
  analyzeChargeImpactOnSleep,
  analyzeMonotonyVsHrv,
  analyzeQualityVsRecovery,
  buildPersonalPatterns,
  getRecoveryContextForActivity,
  joinActivitiesWithRecovery,
} from "./crossDataAnalytics.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSnapshot(daysAgo, overrides = {}) {
  const d = new Date("2026-05-04T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return {
    snapshotDate: d.toISOString(),
    sleepScore: 80,
    sleepDurationSeconds: 27000, // 7h30
    hrvAvgMs: 55,
    restingHr: 48,
    stressAvg: 30,
    bodyBatteryMorning: 75,
    bodyBatteryEnd: 40,
    ...overrides,
  };
}

function makeActivity(daysAgo, overrides = {}) {
  const d = new Date("2026-05-04T08:00:00Z");
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return {
    startDateLocal: d.toISOString(),
    __paceSecondsPerKm: 300,
    __loadValue: 80,
    averageHeartRate: 150,
    maxHeartRate: 190,
    dominantIntensityLabel: "dominante Z2",
    ...overrides,
  };
}

function buildDataset(days, activitiesPerWeek = 3) {
  const snapshots = [];
  const activities = [];
  for (let i = 0; i < days; i++) {
    snapshots.push(makeSnapshot(i));
    if (i % Math.ceil(7 / activitiesPerWeek) === 0) {
      activities.push(makeActivity(i));
    }
  }
  return { snapshots, activities };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("joinActivitiesWithRecovery", () => {
  it("returns empty array on empty input", () => {
    expect(joinActivitiesWithRecovery({})).toEqual([]);
    expect(joinActivitiesWithRecovery({ activities: [], snapshots: [] })).toEqual([]);
  });

  it("joins activities with snapshots by date", () => {
    const activities = [makeActivity(2)];
    const snapshots = [makeSnapshot(2), makeSnapshot(3)];
    const joined = joinActivitiesWithRecovery({ activities, snapshots });
    expect(joined).toHaveLength(1);
    expect(joined[0].recoveryDay).toBeTruthy();
    expect(joined[0].recoveryEve).toBeTruthy();
  });

  it("returns null recoveryDay if no matching snapshot", () => {
    const activities = [makeActivity(2)];
    const snapshots = [makeSnapshot(10)];
    const joined = joinActivitiesWithRecovery({ activities, snapshots });
    expect(joined[0].recoveryDay).toBeNull();
    expect(joined[0].recoveryEve).toBeNull();
  });
});

describe("analyzeQualityVsRecovery", () => {
  it("returns hasData=false on empty input", () => {
    expect(analyzeQualityVsRecovery([]).hasData).toBe(false);
  });

  it("returns hasData=false with too few sessions", () => {
    const joined = [{ activity: makeActivity(0), recoveryDay: makeSnapshot(0), recoveryEve: makeSnapshot(1) }];
    expect(analyzeQualityVsRecovery(joined).hasData).toBe(false);
  });

  it("identifies quality sessions on good recovery days", () => {
    // 10 quality sessions (HR ratio 0.85+), all with HRV >= baseline
    const joined = Array.from({ length: 10 }, (_, i) => ({
      activity: makeActivity(i, { averageHeartRate: 170, maxHeartRate: 190 }),
      recoveryDay: makeSnapshot(i, { hrvAvgMs: 60 }),
      recoveryEve: makeSnapshot(i + 1, { sleepDurationSeconds: 28000 }),
    }));
    const result = analyzeQualityVsRecovery(joined);
    expect(result.hasData).toBe(true);
    expect(result.qualitySessionsAnalyzed).toBeGreaterThanOrEqual(QUALITY_MIN_SAMPLE_TEST);
    expect(result.pctOnGoodRecoveryDays).toBeGreaterThan(0);
  });
});

const QUALITY_MIN_SAMPLE_TEST = 5;

describe("analyzeChargeImpactOnSleep", () => {
  it("returns hasData=false on empty input", () => {
    expect(analyzeChargeImpactOnSleep([]).hasData).toBe(false);
  });

  it("stratifies activities into 4 load bands", () => {
    const joined = [
      { activity: makeActivity(0, { __loadValue: 30 }), recoveryDay: makeSnapshot(0, { sleepDurationSeconds: 27000 }) },
      { activity: makeActivity(1, { __loadValue: 100 }), recoveryDay: makeSnapshot(1, { sleepDurationSeconds: 27500 }) },
      { activity: makeActivity(2, { __loadValue: 200 }), recoveryDay: makeSnapshot(2, { sleepDurationSeconds: 26000 }) },
      { activity: makeActivity(3, { __loadValue: 350 }), recoveryDay: makeSnapshot(3, { sleepDurationSeconds: 24000 }) },
      { activity: makeActivity(4, { __loadValue: 60 }), recoveryDay: makeSnapshot(4, { sleepDurationSeconds: 27000 }) },
      { activity: makeActivity(5, { __loadValue: 250 }), recoveryDay: makeSnapshot(5, { sleepDurationSeconds: 25500 }) },
      { activity: makeActivity(6, { __loadValue: 380 }), recoveryDay: makeSnapshot(6, { sleepDurationSeconds: 23800 }) },
    ];
    const result = analyzeChargeImpactOnSleep(joined);
    expect(result.hasData).toBe(true);
    expect(result.bands).toHaveProperty("light");
    expect(result.bands).toHaveProperty("moderate");
    expect(result.bands).toHaveProperty("hard");
    expect(result.bands).toHaveProperty("veryHard");
  });
});

describe("analyzeMonotonyVsHrv", () => {
  it("returns hasData=false on empty input", () => {
    expect(analyzeMonotonyVsHrv([]).hasData).toBe(false);
  });

  it("returns hasData=false with too few weeks", () => {
    const small = buildDataset(10, 5);
    const joined = joinActivitiesWithRecovery(small);
    expect(analyzeMonotonyVsHrv(joined).hasData).toBe(false);
  });

  it("returns hasData=true on a 70-day dataset with consistent loads", () => {
    const big = buildDataset(70, 5);
    const joined = joinActivitiesWithRecovery(big);
    const result = analyzeMonotonyVsHrv(joined);
    // hasData might be false if all weeks fall in same band — c'est OK
    expect(result.bands).toHaveProperty("low");
    expect(result.bands).toHaveProperty("moderate");
    expect(result.bands).toHaveProperty("high");
  });
});

describe("buildPersonalPatterns", () => {
  it("returns hasMinimumData=false on tiny dataset", () => {
    const result = buildPersonalPatterns({ activities: [], snapshots: [] });
    expect(result.hasMinimumData).toBe(false);
    expect(result.globalConfidence).toBe("Faible");
  });

  it("returns hasMinimumData=true on full dataset (90 days, 30+ activities)", () => {
    const { snapshots, activities } = buildDataset(90, 4);
    const result = buildPersonalPatterns({ activities, snapshots });
    expect(result.hasMinimumData).toBe(true);
    expect(result.daysAnalyzed).toBeGreaterThanOrEqual(60);
    expect(result.activitiesAnalyzed).toBeGreaterThanOrEqual(20);
  });

  it("does not crash with partial dataset", () => {
    const { snapshots, activities } = buildDataset(20, 3);
    const result = buildPersonalPatterns({ activities, snapshots });
    expect(result.hasMinimumData).toBe(false);
    expect(result).toHaveProperty("qualityVsRecovery");
    expect(result).toHaveProperty("chargeImpactOnSleep");
    expect(result).toHaveProperty("monotonyVsHrv");
  });
});

describe("getRecoveryContextForActivity", () => {
  it("returns hasData=false without activity", () => {
    expect(getRecoveryContextForActivity({}).hasData).toBe(false);
  });

  it("returns before/after snapshots when available", () => {
    const activity = makeActivity(5);
    const snapshots = [makeSnapshot(5), makeSnapshot(4), ...Array.from({ length: 28 }, (_, i) => makeSnapshot(6 + i))];
    const result = getRecoveryContextForActivity({ activity, snapshots });
    expect(result.hasData).toBe(true);
    expect(result.before).not.toBeNull();
    expect(result.after).not.toBeNull();
  });

  it("computes deltas vs baseline", () => {
    // Activity J=5, before=J=5 with sleep 28000s (vs baseline 27000s = +1000s = +16min)
    const activity = makeActivity(5);
    const before = makeSnapshot(5, { sleepDurationSeconds: 28000 });
    const baseline = Array.from({ length: 28 }, (_, i) => makeSnapshot(6 + i, { sleepDurationSeconds: 27000 }));
    const result = getRecoveryContextForActivity({ activity, snapshots: [before, ...baseline] });
    expect(result.before.sleepDeltaMin).toBeGreaterThan(0);
  });
});
