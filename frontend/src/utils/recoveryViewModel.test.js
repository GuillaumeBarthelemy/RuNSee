import { describe, expect, it } from "vitest";
import { buildRecoveryViewModel } from "./recoveryViewModel.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSnapshot(snapshotDate, overrides = {}) {
  return {
    snapshotDate,
    sleepScore: 75,
    hrvAvgMs: 55,
    restingHr: 48,
    stressAvg: 30,
    bodyBatteryMorning: 70,
    bodyBatteryEnd: 45,
    sleepDurationSeconds: 27000,
    ...overrides,
  };
}

/**
 * Build an array of N snapshots ending at `endDate` (YYYY-MM-DD).
 */
function buildSnapshots(count, endDate = "2026-05-04", overrides = {}) {
  const base = new Date(endDate);
  const result = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    result.push(makeSnapshot(key, overrides));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildRecoveryViewModel", () => {
  // Scenario 1 — empty / no data
  describe("when snapshots is empty", () => {
    it("returns hasData=false", () => {
      const vm = buildRecoveryViewModel([]);
      expect(vm.hasData).toBe(false);
    });

    it("returns coverage=0", () => {
      const vm = buildRecoveryViewModel([]);
      expect(vm.coverage).toBe(0);
    });

    it("returns null for all metrics", () => {
      const vm = buildRecoveryViewModel([]);
      expect(vm.sleep).toBeNull();
      expect(vm.hrv).toBeNull();
      expect(vm.restingHr).toBeNull();
      expect(vm.stress).toBeNull();
      expect(vm.bodyBattery).toBeNull();
    });
  });

  // Scenario 2 — null input
  describe("when snapshots is null/undefined", () => {
    it("returns hasData=false for null", () => {
      expect(buildRecoveryViewModel(null).hasData).toBe(false);
    });

    it("returns hasData=false for undefined", () => {
      expect(buildRecoveryViewModel(undefined).hasData).toBe(false);
    });
  });

  // Scenario 3 — normal dataset with enough baseline
  describe("with 56 snapshots (full baseline)", () => {
    const snapshots = buildSnapshots(56);
    const vm = buildRecoveryViewModel(snapshots);

    it("returns hasData=true", () => {
      expect(vm.hasData).toBe(true);
    });

    it("computes a sleepScore series of length 14", () => {
      expect(vm.sleep.series).toHaveLength(14);
    });

    it("all values in sleep.series are 75 (uniform test data)", () => {
      const nonNull = vm.sleep.series.filter((v) => v != null);
      expect(nonNull.every((v) => v === 75)).toBe(true);
    });

    it("coverage is 100%", () => {
      expect(vm.coverage).toBe(100);
    });

    it("confidenceLabel is 'Données fiables'", () => {
      expect(vm.confidenceLabel).toBe("Données fiables");
    });

    it("sleep.tone is neutral when recent avg equals baseline avg", () => {
      // All snapshots identical → deltaPct = 0 → neutral
      expect(vm.sleep.tone).toBe("neutral");
    });

    it("restingHr.tone is neutral when uniform data", () => {
      expect(vm.restingHr.tone).toBe("neutral");
    });
  });

  // Scenario 4 — good recovery signal (recent HRV higher than baseline)
  describe("with recent HRV improvement", () => {
    it("hrv.tone is 'good' when recent HRV is +10% above baseline", () => {
      // Build 56 days: first 48 at HRV=50, last 8 at HRV=60 (+20%)
      const base = buildSnapshots(48, "2026-04-26", { hrvAvgMs: 50 });
      const recent = buildSnapshots(8, "2026-05-04", { hrvAvgMs: 60 });
      const snapshots = [...base, ...recent];
      const vm = buildRecoveryViewModel(snapshots);
      expect(vm.hrv.tone).toBe("good");
    });
  });

  // Scenario 5 — warning signal (resting HR elevated)
  describe("with resting HR degradation", () => {
    it("restingHr.tone is 'warning' when recent 14-day avg HR is +8% above baseline", () => {
      // baseline (days -35 to -8): HR=48; recent 14 days: HR=52 → delta +8.3% > 5% threshold
      const base = buildSnapshots(42, "2026-04-20", { restingHr: 48 });
      const recent = buildSnapshots(14, "2026-05-04", { restingHr: 52 });
      const snapshots = [...base, ...recent];
      const vm = buildRecoveryViewModel(snapshots);
      expect(vm.restingHr.tone).toBe("warning");
    });
  });

  // Scenario 6 — partial data (sparse coverage)
  describe("with sparse sleep data (50% coverage)", () => {
    it("confidenceLabel is 'Données partielles'", () => {
      const snaps = buildSnapshots(14);
      // Zero out sleepScore for every other day
      const sparse = snaps.map((s, i) => ({
        ...s,
        sleepScore: i % 2 === 0 ? 75 : 0,
      }));
      const vm = buildRecoveryViewModel(sparse);
      expect(vm.confidenceLabel).toBe("Données partielles");
    });
  });

  // Scenario 7 — zero values treated as missing
  describe("zero values are treated as missing", () => {
    it("sleep.latestValue is null when last snapshot has sleepScore=0", () => {
      const snaps = buildSnapshots(14, "2026-05-04", { sleepScore: 0 });
      const vm = buildRecoveryViewModel(snaps);
      expect(vm.sleep.latestValue).toBeNull();
    });
  });

  // Scenario 8 — unsorted input
  describe("with unsorted snapshots", () => {
    it("still computes correctly after internal sort", () => {
      const sorted = buildSnapshots(20);
      // Shuffle
      const shuffled = [...sorted].sort(() => Math.random() - 0.5);
      const vmSorted = buildRecoveryViewModel(sorted);
      const vmShuffled = buildRecoveryViewModel(shuffled);
      expect(vmShuffled.sleep?.latestValue).toBe(vmSorted.sleep?.latestValue);
    });
  });
});
