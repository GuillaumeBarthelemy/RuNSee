import test from "node:test";
import assert from "node:assert/strict";
import {
  extractFitnessSnapshotFromPayload,
  extractEnduranceSnapshotFromPayload,
} from "./garminFitnessSync.service.js";

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

test("unwraps array-shaped payload (Garmin get_max_metrics returns [{...}])", () => {
  const payload = [
    {
      userId: 117821269,
      generic: { calendarDate: "2026-05-18", vo2MaxPreciseValue: 56.4, vo2MaxValue: 56 },
      cycling: null,
      heatAltitudeAcclimation: { heatAcclimationPercentage: 0, altitudeAcclimationPercentage: 0 },
    },
  ];
  const result = extractFitnessSnapshotFromPayload(payload, "2026-05-18");
  assert.equal(result.vo2MaxRunning, 56.4);
  assert.equal(result.dataQuality, "complete");
});

test("returns partial when array payload is empty (Garmin pas de data pour ce jour)", () => {
  const result = extractFitnessSnapshotFromPayload([], "2026-05-19");
  assert.equal(result.vo2MaxRunning, null);
  assert.equal(result.dataQuality, "partial");
});

// --- Lot Performance V5 VDOT&profil — Endurance Score + Hill Score ---

test("extractEndurance: parse Endurance Score + Hill Score (objets)", () => {
  const endurance = { overallScore: 6800, classification: "Excellent" };
  const hill = { overallScore: 72, classification: "Strong" };
  const result = extractEnduranceSnapshotFromPayload(endurance, hill, "2026-05-21");
  assert.equal(result.enduranceScore, 6800);
  assert.equal(result.enduranceScoreLevel, "Excellent");
  assert.equal(result.hillScore, 72);
  assert.equal(result.hillScoreLevel, "Strong");
  assert.equal(result.snapshotDate.toISOString().slice(0, 10), "2026-05-21");
});

test("extractEndurance: unwrap array payload", () => {
  const result = extractEnduranceSnapshotFromPayload(
    [{ overallScore: 5200, classification: "Trained" }],
    [{ overallScore: 45, classification: "Established" }],
    "2026-05-21",
  );
  assert.equal(result.enduranceScore, 5200);
  assert.equal(result.hillScore, 45);
});

test("extractEndurance: nulls quand payload manquant", () => {
  const result = extractEnduranceSnapshotFromPayload(null, null, "2026-05-21");
  assert.equal(result.enduranceScore, null);
  assert.equal(result.enduranceScoreLevel, null);
  assert.equal(result.hillScore, null);
  assert.equal(result.hillScoreLevel, null);
});

test("extractEndurance: shape alternative (score/level)", () => {
  const endurance = { score: 7100, level: "Superior" };
  const hill = { hill_score: 88, feedback: "Athlete" };
  const result = extractEnduranceSnapshotFromPayload(endurance, hill, "2026-05-21");
  assert.equal(result.enduranceScore, 7100);
  assert.equal(result.enduranceScoreLevel, "Superior");
  assert.equal(result.hillScore, 88);
  assert.equal(result.hillScoreLevel, "Athlete");
});
