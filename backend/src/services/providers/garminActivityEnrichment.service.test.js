import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findBestStravaMatch,
  getGarminRecoveryTimeHours,
  normalizeGarminActivity,
  scoreGarminMatch,
} from "./garminActivityEnrichment.service.js";

const STRAVA_BASE = {
  id: 1,
  stravaActivityId: "s1",
  name: "Run",
  sportType: "Run",
  startDate: "2026-05-04T10:00:00.000Z",
  startDateLocal: "2026-05-04T10:00:00.000Z",
  distance: 10000,
  movingTime: 2400,
};

const GARMIN_BASE = {
  activityId: 123,
  activityName: "Run",
  activityType: { typeKey: "running" },
  startTimeLocal: "2026-05-04T10:00:30.000Z",
  distance: 10020,
  movingDuration: 2410,
};

describe("Garmin activity matching", () => {
  it("matches exactly when start times are within 60 seconds", () => {
    const match = findBestStravaMatch(GARMIN_BASE, [STRAVA_BASE]);
    assert.equal(match.status, "matched_exact");
    assert.equal(match.candidate.stravaActivity.stravaActivityId, "s1");
  });

  it("matches tolerated when the activity is close but not exact", () => {
    const match = findBestStravaMatch(
      { ...GARMIN_BASE, startTimeLocal: "2026-05-04T10:05:00.000Z" },
      [STRAVA_BASE],
    );
    assert.equal(match.status, "matched_tolerated");
  });

  it("refuses ambiguous matches", () => {
    const secondStrava = {
      ...STRAVA_BASE,
      id: 2,
      stravaActivityId: "s2",
      startDate: "2026-05-04T10:01:00.000Z",
      startDateLocal: "2026-05-04T10:01:00.000Z",
    };
    const match = findBestStravaMatch(GARMIN_BASE, [STRAVA_BASE, secondStrava]);
    assert.equal(match.status, "ambiguous");
  });

  it("refuses distance that differs too much", () => {
    const score = scoreGarminMatch(STRAVA_BASE, { ...GARMIN_BASE, distance: 7000 });
    assert.equal(score, null);
  });

  it("refuses duration that differs too much", () => {
    const score = scoreGarminMatch(STRAVA_BASE, { ...GARMIN_BASE, movingDuration: 1700 });
    assert.equal(score, null);
  });
});

describe("Garmin activity normalization", () => {
  it("keeps negative performance condition", () => {
    const normalized = normalizeGarminActivity({
      ...GARMIN_BASE,
      performanceCondition: -4,
    });
    assert.equal(normalized.performanceCondition, -4);
  });

  it("keeps Training Effect equal to zero", () => {
    const normalized = normalizeGarminActivity({
      ...GARMIN_BASE,
      aerobicTrainingEffect: 0,
      anaerobicTrainingEffectScore: 0,
    });
    assert.equal(normalized.aerobicTrainingEffect, 0);
    assert.equal(normalized.anaerobicTrainingEffect, 0);
  });

  it("normalizes recovery time candidates to hours", () => {
    assert.equal(getGarminRecoveryTimeHours({ recoveryTimeInHours: 12 }), 12);
    assert.equal(getGarminRecoveryTimeHours({ recoveryTimeMinutes: 90 }), 1.5);
    assert.equal(getGarminRecoveryTimeHours({ recoveryTimeSeconds: 7200 }), 2);
    assert.equal(getGarminRecoveryTimeHours({ recoveryTime: 24 }), 24);
  });
});
