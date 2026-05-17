import { describe, expect, it } from "vitest";
import {
  buildPerformanceOverviewModel,
  getCanonicalPerformanceActivities,
} from "./performanceOverviewModel.js";

function activity(overrides = {}) {
  return {
    id: overrides.id || `a-${Math.random()}`,
    name: overrides.name || "Course route",
    sportType: overrides.sportType || "Run",
    startDateLocal: overrides.startDateLocal || "2026-05-01T10:00:00.000Z",
    distance: overrides.distance ?? 10000,
    movingTime: overrides.movingTime ?? 3000,
    elapsedTime: overrides.elapsedTime ?? overrides.movingTime ?? 3000,
    totalElevationGain: overrides.totalElevationGain ?? 40,
    averageHeartrate: overrides.averageHeartrate ?? 150,
    maxHeartrate: overrides.maxHeartrate ?? 172,
    isMerged: overrides.isMerged ?? false,
    ...overrides,
  };
}

describe("getCanonicalPerformanceActivities", () => {
  it("exclut les activites merged pour eviter le double comptage Garmin/Strava", () => {
    const activities = [
      activity({ id: "strava", sourceProvider: "strava" }),
      activity({ id: "garmin-merged", sourceProvider: "garmin", isMerged: true }),
    ];

    expect(getCanonicalPerformanceActivities(activities)).toHaveLength(1);
    expect(getCanonicalPerformanceActivities(activities)[0].id).toBe("strava");
  });
});

describe("buildPerformanceOverviewModel", () => {
  it("construit les signaux uniquement a partir des activites canoniques", () => {
    const periodActivities = [
      activity({ id: "current-1", startDateLocal: "2026-05-01T10:00:00.000Z", movingTime: 2500, averageHeartrate: 148 }),
      activity({ id: "current-2", startDateLocal: "2026-05-03T10:00:00.000Z", movingTime: 2600, averageHeartrate: 150 }),
      activity({ id: "current-3", startDateLocal: "2026-05-05T10:00:00.000Z", movingTime: 2700, averageHeartrate: 151 }),
      activity({ id: "merged", startDateLocal: "2026-05-05T11:00:00.000Z", isMerged: true }),
    ];
    const previousActivities = [
      activity({ id: "prev-1", startDateLocal: "2026-04-22T10:00:00.000Z", movingTime: 2800, averageHeartrate: 152 }),
      activity({ id: "prev-2", startDateLocal: "2026-04-24T10:00:00.000Z", movingTime: 2850, averageHeartrate: 153 }),
      activity({ id: "prev-3", startDateLocal: "2026-04-26T10:00:00.000Z", movingTime: 2900, averageHeartrate: 154 }),
    ];
    const scopeActivities = [...previousActivities, ...periodActivities];

    const model = buildPerformanceOverviewModel({
      periodActivities,
      scopeActivities,
      range: {
        startDate: new Date("2026-04-29T00:00:00.000Z"),
        endDate: new Date("2026-05-06T00:00:00.000Z"),
      },
      settings: {
        efficiencyMinDurationMinutes: 20,
        efficiencyMaxElevationPerKm: 25,
        efficiencyExcludeTrail: true,
      },
    });

    expect(model.canonicalCounts.period).toBe(3);
    expect(model.canonicalCounts.excludedMergedPeriod).toBe(1);
    expect(model.metrics.find((entry) => entry.key === "economy")?.hasData).toBe(true);
  });

  it("ne force pas le bloc economie si les garde-fous ne sont pas respectes", () => {
    const periodActivities = [
      activity({ id: "short-1", movingTime: 600, averageHeartrate: 148 }),
      activity({ id: "short-2", movingTime: 700, averageHeartrate: 150 }),
      activity({ id: "short-3", movingTime: 800, averageHeartrate: 151 }),
    ];

    const model = buildPerformanceOverviewModel({
      periodActivities,
      scopeActivities: periodActivities,
      range: {
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-06T00:00:00.000Z"),
      },
    });

    expect(model.metrics.find((entry) => entry.key === "economy")?.hasData).toBe(false);
  });
});
