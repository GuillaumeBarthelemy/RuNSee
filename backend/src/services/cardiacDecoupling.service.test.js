import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateCardiacDecouplingPercent,
  extractStravaSplitsFromPayload,
} from "./cardiacDecoupling.service.js";

describe("calculateCardiacDecouplingPercent", () => {
  it("retourne null si aucun split valide", () => {
    assert.equal(calculateCardiacDecouplingPercent([]), null);
    assert.equal(calculateCardiacDecouplingPercent(null), null);
  });

  it("retourne null si splits trop courts (< 500 m)", () => {
    const splits = [
      { distance: 300, averageSpeed: 3, averageHeartrate: 150 },
      { distance: 400, averageSpeed: 3, averageHeartrate: 152 },
    ];
    assert.equal(calculateCardiacDecouplingPercent(splits), null);
  });

  it("retourne null si un seul split valide", () => {
    const splits = [
      { distance: 1000, averageSpeed: 3, averageHeartrate: 150 },
    ];
    assert.equal(calculateCardiacDecouplingPercent(splits), null);
  });

  it("calcule un decoupling positif quand la FC monte plus vite que l'allure", () => {
    // 4 splits : 1ère moitié EF = 3/150 = 0.02 ; 2ème moitié EF = 3/170 ≈ 0.01765
    // Decoupling = (0.02 - 0.01765) / 0.02 = 11.76 %
    const splits = [
      { distance: 1000, averageSpeed: 3, averageHeartrate: 150 },
      { distance: 1000, averageSpeed: 3, averageHeartrate: 150 },
      { distance: 1000, averageSpeed: 3, averageHeartrate: 170 },
      { distance: 1000, averageSpeed: 3, averageHeartrate: 170 },
    ];
    const result = calculateCardiacDecouplingPercent(splits);
    assert.ok(result !== null);
    assert.ok(result > 10 && result < 13, `expected ~11.76, got ${result}`);
  });

  it("retourne ~0 si EF constant entre les deux moitiés", () => {
    const splits = [
      { distance: 1000, averageSpeed: 3, averageHeartrate: 150 },
      { distance: 1000, averageSpeed: 3, averageHeartrate: 150 },
      { distance: 1000, averageSpeed: 3, averageHeartrate: 150 },
      { distance: 1000, averageSpeed: 3, averageHeartrate: 150 },
    ];
    const result = calculateCardiacDecouplingPercent(splits);
    assert.equal(result, 0);
  });

  it("supporte snake_case (Strava API native)", () => {
    const splits = [
      { distance: 1000, average_speed: 3, average_heartrate: 150 },
      { distance: 1000, average_speed: 3, average_heartrate: 150 },
      { distance: 1000, average_speed: 3, average_heartrate: 170 },
      { distance: 1000, average_speed: 3, average_heartrate: 170 },
    ];
    const result = calculateCardiacDecouplingPercent(splits);
    assert.ok(result !== null && result > 5);
  });
});

describe("extractStravaSplitsFromPayload", () => {
  it("retourne tableau vide si payload null", () => {
    assert.deepEqual(extractStravaSplitsFromPayload(null), []);
    assert.deepEqual(extractStravaSplitsFromPayload({}), []);
  });

  it("privilégie splits_metric", () => {
    const payload = {
      splits_metric: [{ distance: 1000, average_speed: 3, average_heartrate: 150 }],
      splits_standard: [{ distance: 1609, average_speed: 3.2, average_heartrate: 152 }],
    };
    const result = extractStravaSplitsFromPayload(payload);
    assert.equal(result.length, 1);
    assert.equal(result[0].distance, 1000);
  });

  it("fallback splits_standard si pas de splits_metric", () => {
    const payload = {
      splits_standard: [{ distance: 1609, average_speed: 3.2, average_heartrate: 152 }],
    };
    const result = extractStravaSplitsFromPayload(payload);
    assert.equal(result.length, 1);
  });

  it("supporte aussi splitsMetric camelCase", () => {
    const payload = {
      splitsMetric: [{ distance: 1000, averageSpeed: 3, averageHeartrate: 150 }],
    };
    const result = extractStravaSplitsFromPayload(payload);
    assert.equal(result.length, 1);
  });
});
