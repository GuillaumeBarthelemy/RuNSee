import test from "node:test";
import assert from "node:assert/strict";
import { computeDanielsVdot } from "./vdotHistory.service.js";

test("computeDanielsVdot returns a plausible value for 5km 20:00", () => {
  // 5 km en 20 min : VDOT attendu ~49 (Daniels 1979)
  const v = computeDanielsVdot({ distanceMeters: 5000, elapsedSeconds: 1200 });
  assert.ok(v >= 48 && v <= 51, `Expected VDOT 48-51, got ${v}`);
});

test("computeDanielsVdot returns a plausible value for 10km 38:41", () => {
  // 10 km en 38:41 (2321s) : VDOT attendu ~53
  const v = computeDanielsVdot({ distanceMeters: 10000, elapsedSeconds: 2321 });
  assert.ok(v >= 51 && v <= 55, `Expected VDOT 51-55, got ${v}`);
});

test("computeDanielsVdot returns a plausible value for semi 1:29:47", () => {
  // 21097.5 m en 5387 s : VDOT attendu ~52
  const v = computeDanielsVdot({ distanceMeters: 21097.5, elapsedSeconds: 5387 });
  assert.ok(v >= 50 && v <= 55, `Expected VDOT 50-55, got ${v}`);
});

test("computeDanielsVdot returns 0 for invalid distance (< 1500m)", () => {
  assert.equal(computeDanielsVdot({ distanceMeters: 1000, elapsedSeconds: 240 }), 0);
});

test("computeDanielsVdot returns 0 for invalid distance (> 50km)", () => {
  assert.equal(computeDanielsVdot({ distanceMeters: 60000, elapsedSeconds: 15000 }), 0);
});

test("computeDanielsVdot returns 0 for too short duration", () => {
  assert.equal(computeDanielsVdot({ distanceMeters: 5000, elapsedSeconds: 60 }), 0);
});

test("computeDanielsVdot returns 0 for unrealistic pace (< 2:00/km)", () => {
  // 5 km en 5 min => 1:00/km, impossible
  assert.equal(computeDanielsVdot({ distanceMeters: 5000, elapsedSeconds: 300 }), 0);
});

test("computeDanielsVdot returns 0 for too slow pace (> 15:00/km)", () => {
  // 5 km en 5h, marche
  assert.equal(computeDanielsVdot({ distanceMeters: 5000, elapsedSeconds: 18000 }), 0);
});

test("computeDanielsVdot returns 0 for null inputs", () => {
  assert.equal(computeDanielsVdot({ distanceMeters: null, elapsedSeconds: null }), 0);
});
