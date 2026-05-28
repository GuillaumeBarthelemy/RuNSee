import { describe, it, expect } from "vitest";
import { buildRecoveryDailySeries } from "./analyticsRecovery.js";

describe("buildRecoveryDailySeries — recoveryPct fallback (bug 0%)", () => {
  it("utilise bodyBatteryMax quand trainingReadinessScore est null", () => {
    const end = new Date("2026-05-28T12:00:00");
    const snapshots = [
      {
        date: "2026-05-28",
        sleepDurationSeconds: 28800, // 8h
        trainingReadinessScore: null,
        bodyBatteryMax: 72,
      },
    ];
    const series = buildRecoveryDailySeries(snapshots, end, 1);
    const day = series[series.length - 1];
    expect(day.recoveryPct).toBe(72); // PAS 0
    expect(day.sleepHours).toBe(8);
  });

  it("privilegie trainingReadinessScore quand present", () => {
    const end = new Date("2026-05-28T12:00:00");
    const snapshots = [
      { date: "2026-05-28", trainingReadinessScore: 85, bodyBatteryMax: 72 },
    ];
    const series = buildRecoveryDailySeries(snapshots, end, 1);
    expect(series[series.length - 1].recoveryPct).toBe(85);
  });

  it("recoveryPct null si les deux sont absents", () => {
    const end = new Date("2026-05-28T12:00:00");
    const snapshots = [
      { date: "2026-05-28", sleepDurationSeconds: 28800 },
    ];
    const series = buildRecoveryDailySeries(snapshots, end, 1);
    expect(series[series.length - 1].recoveryPct).toBeNull();
  });
});
