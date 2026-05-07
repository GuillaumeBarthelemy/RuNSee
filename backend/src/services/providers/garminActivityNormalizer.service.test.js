import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCanonicalActivityDataFromGarmin,
  isSupportedGarminActivityType,
  normalizeGarminActivity,
} from "./garminActivityNormalizer.service.js";
import { findBestActivityProviderMatch } from "./activityProviderMatching.service.js";

const rawGarminRun = {
  activityId: 12345,
  activityName: "Sortie Garmin",
  activityType: { typeKey: "running" },
  startTimeGMT: "2026-05-07T06:00:00.000Z",
  startTimeLocal: "2026-05-07T08:00:00",
  distance: 10020,
  duration: 2400,
  movingDuration: 2380,
  elevationGain: 52,
  averageHR: 148,
  maxHR: 181,
  calories: 740,
};

test("normalizes a Garmin run-like activity into a canonical candidate", () => {
  const normalized = normalizeGarminActivity(rawGarminRun);

  assert.equal(normalized.providerActivityId, "12345");
  assert.equal(normalized.sourceProvider, "garmin");
  assert.equal(normalized.sourceActivityId, "12345");
  assert.equal(normalized.sportType, "Run");
  assert.equal(normalized.supported, true);
  assert.equal(normalized.distance, 10020);
  assert.equal(normalized.averageHR, 148);
});

test("keeps hiking as supported but separate from running", () => {
  const normalized = normalizeGarminActivity({
    ...rawGarminRun,
    activityId: "hike-1",
    activityType: { typeKey: "hiking" },
  });

  assert.equal(isSupportedGarminActivityType({ activityType: { typeKey: "hiking" } }), true);
  assert.equal(normalized.type, "Hike");
  assert.equal(normalized.sportType, "Hike");
});

test("builds canonical Activity data without requiring Strava fields", () => {
  const normalized = normalizeGarminActivity(rawGarminRun);
  const canonical = buildCanonicalActivityDataFromGarmin("user-1", normalized, rawGarminRun);

  assert.equal(canonical.appUserId, "user-1");
  assert.equal(canonical.athleteId, null);
  assert.equal(canonical.stravaActivityId, null);
  assert.equal(canonical.sourceProvider, "garmin");
  assert.equal(canonical.sourceActivityId, "12345");
  assert.equal(canonical.name, "Sortie Garmin");
});

test("matches a close Strava activity as exact and rejects ambiguous candidates", () => {
  const normalized = normalizeGarminActivity(rawGarminRun);
  const exactActivity = {
    id: "strava-1",
    startDate: "2026-05-07T06:00:30.000Z",
    distance: 10000,
    movingTime: 2405,
    type: "Run",
    sportType: "Run",
  };

  const exact = findBestActivityProviderMatch(normalized, [exactActivity]);
  assert.equal(exact.status, "exact");
  assert.equal(exact.candidate.activity.id, "strava-1");

  const ambiguous = findBestActivityProviderMatch(normalized, [
    exactActivity,
    {
      ...exactActivity,
      id: "strava-2",
      startDate: "2026-05-07T06:01:00.000Z",
    },
  ]);
  assert.equal(ambiguous.status, "ambiguous");
});
