import { describe, expect, it } from "vitest";
import {
  buildActivityTrailConfidence,
  buildAnalyticsConfidence,
  buildConfidenceResult,
  buildObjectiveConfidence,
  buildPerformanceConfidence,
  buildTodayConfidence,
} from "./analysisConfidence.js";

const referenceDate = new Date("2026-05-09T12:00:00.000Z");

function activity(overrides = {}) {
  return {
    startDate: "2026-05-08T08:00:00.000Z",
    sportType: "Run",
    distance: 10000,
    movingTime: 3000,
    averageHeartrate: 145,
    maxHeartrate: 172,
    totalElevationGain: 120,
    totalElevationLoss: 110,
    splitsMetric: [{ distance: 1000 }],
    ...overrides,
  };
}

describe("analysis confidence", () => {
  it("returns high confidence when checks are complete", () => {
    const result = buildConfidenceResult({
      scope: "test",
      checks: [
        { id: "a", passed: true, weight: 50, positive: "A" },
        { id: "b", passed: true, weight: 50, positive: "B" },
      ],
    });

    expect(result.level).toBe("high");
    expect(result.score).toBe(100);
    expect(result.positiveSignals).toContain("A");
  });

  it("returns insufficient when no signal is exploitable", () => {
    const result = buildConfidenceResult({
      checks: [
        { id: "a", passed: false, weight: 50, missing: "Manquant" },
      ],
    });

    expect(result.level).toBe("insufficient");
    expect(result.missingData).toContain("Manquant");
  });

  it("grades today as medium when recovery is absent but activity and load are present", () => {
    const result = buildTodayConfidence({
      activities: [activity(), activity({ startDate: "2026-05-07T08:00:00.000Z" })],
      loadModel: { summary: { periodLoad: 120 } },
      recoverySnapshots: [],
      referenceDate,
    });

    expect(result.level).toBe("medium");
    expect(result.warnings.concat(result.missingData).join(" ")).toContain("Recovery");
  });

  it("grades today as low or insufficient when recent activities are missing", () => {
    const result = buildTodayConfidence({
      activities: [activity({ startDate: "2026-04-01T08:00:00.000Z" })],
      loadModel: {},
      recoverySnapshots: [],
      referenceDate,
    });

    expect(["low", "insufficient"]).toContain(result.level);
  });

  it("grades analytics from period size and coverage", () => {
    const result = buildAnalyticsConfidence({
      periodActivities: Array.from({ length: 8 }, (_, index) => activity({ startDate: `2026-05-0${(index % 8) + 1}T08:00:00.000Z` })),
      trailModel: { hasData: true },
      recoverySnapshots: [{ calendarDate: "2026-05-08" }],
      referenceDate,
    });

    expect(result.level).toBe("high");
  });

  it("keeps performance confidence medium with a single useful record", () => {
    const result = buildPerformanceConfidence({
      activities: [activity(), activity({ startDate: "2026-04-20T08:00:00.000Z" })],
      vdotProfile: { hasData: true },
      bestEfforts: { records: [{ elapsedSeconds: 2400, isAvailable: true }] },
      referenceDate,
    });

    expect(["medium", "low"]).toContain(result.level);
    expect(result.warnings.join(" ")).toContain("Un seul");
  });

  it("grades objective as low when the objective is incomplete", () => {
    const result = buildObjectiveConfidence({
      race: null,
      profile: { hasRace: false },
      activities: [],
      recoverySnapshots: [],
      referenceDate,
    });

    expect(result.level).toBe("insufficient");
  });

  it("keeps trail confidence low when downhill data is absent", () => {
    const result = buildActivityTrailConfidence({
      activity: activity({ totalElevationLoss: 0, splitsMetric: [] }),
      trailProfile: { hasData: true, hasTrailContext: true, elevationGain: 600, elevationLoss: 0 },
    });

    expect(["low", "medium"]).toContain(result.level);
    expect(result.missingData.concat(result.warnings).join(" ")).toContain("D-");
  });
});
