import { describe, expect, it } from "vitest";
import { getRecoveryContextForActivity } from "./crossDataAnalytics.js";

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
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

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
