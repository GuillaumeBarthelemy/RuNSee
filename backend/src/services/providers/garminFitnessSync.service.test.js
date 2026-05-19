import test from "node:test";
import assert from "node:assert/strict";
import { extractFitnessSnapshotFromPayload } from "./garminFitnessSync.service.js";

test("extracts VO2max running from generic.vo2MaxPreciseValue", () => {
  const payload = {
    generic: { vo2MaxPreciseValue: 56.5, vo2MaxValue: 56, fitnessAge: 35 },
    cycling: { vo2MaxPreciseValue: 47.2 },
    heatAltitudeAcclimation: {
      heatAcclimationPercentage: 12,
      altitudeAcclimationPercentage: 5,
    },
  };
  const result = extractFitnessSnapshotFromPayload(payload, "2026-05-19");
  assert.equal(result.vo2MaxRunning, 56.5);
  assert.equal(result.vo2MaxCycling, 47.2);
  assert.equal(result.fitnessAge, 35);
  assert.equal(result.heatAcclimationPercent, 12);
  assert.equal(result.altitudeAcclimationPercent, 5);
  assert.equal(result.dataQuality, "complete");
  assert.equal(result.snapshotDate.toISOString().slice(0, 10), "2026-05-19");
});

test("falls back to vo2MaxValue when precise value is missing", () => {
  const payload = { generic: { vo2MaxValue: 54 } };
  const result = extractFitnessSnapshotFromPayload(payload, "2026-05-19");
  assert.equal(result.vo2MaxRunning, 54);
  assert.equal(result.vo2MaxCycling, null);
  assert.equal(result.dataQuality, "complete");
});

test("returns partial quality when no VO2max present", () => {
  const payload = { generic: { fitnessAge: 40 } };
  const result = extractFitnessSnapshotFromPayload(payload, "2026-05-19");
  assert.equal(result.vo2MaxRunning, null);
  assert.equal(result.fitnessAge, 40);
  assert.equal(result.dataQuality, "partial");
});

test("handles null payload gracefully", () => {
  const result = extractFitnessSnapshotFromPayload(null, "2026-05-19");
  assert.equal(result.vo2MaxRunning, null);
  assert.equal(result.dataQuality, "partial");
  assert.equal(result.snapshotDate.toISOString().slice(0, 10), "2026-05-19");
});

test("handles non-object payload gracefully", () => {
  const result = extractFitnessSnapshotFromPayload("garbage", "2026-05-19");
  assert.equal(result.vo2MaxRunning, null);
  assert.equal(result.dataQuality, "partial");
});

test("supports alternate field names (vo2max, vO2MaxValue)", () => {
  const payload = {
    generic: { vo2max: 52 },
  };
  const result = extractFitnessSnapshotFromPayload(payload, "2026-05-19");
  assert.equal(result.vo2MaxRunning, 52);
});

test("ignores non-numeric values cleanly", () => {
  const payload = {
    generic: { vo2MaxPreciseValue: "N/A", fitnessAge: "unknown" },
  };
  const result = extractFitnessSnapshotFromPayload(payload, "2026-05-19");
  assert.equal(result.vo2MaxRunning, null);
  assert.equal(result.fitnessAge, null);
  assert.equal(result.dataQuality, "partial");
});
