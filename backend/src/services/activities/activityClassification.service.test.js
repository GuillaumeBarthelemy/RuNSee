/* eslint-env node */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SESSION_TYPES,
  SESSION_MARKERS,
  suggestSessionType,
  deserializeMarkers,
} from "./activityClassification.service.js";

describe("Taxonomie classification (Lot Activity)", () => {
  it("expose au moins 12 types canoniques", () => {
    assert.ok(Object.keys(SESSION_TYPES).length >= 12);
  });

  it("chaque type a un label + intensity", () => {
    for (const [key, def] of Object.entries(SESSION_TYPES)) {
      assert.ok(def.label, `type ${key} doit avoir un label`);
      assert.ok(["low", "mid", "high", "none"].includes(def.intensity));
    }
  });

  it("expose au moins 6 marqueurs", () => {
    assert.ok(Object.keys(SESSION_MARKERS).length >= 6);
  });
});

describe("suggestSessionType heuristiques", () => {
  it("workoutType Strava 1 = competition", () => {
    assert.equal(suggestSessionType({ workoutType: 1, movingTime: 1800, distance: 5000 }), "competition");
  });

  it("workoutType Strava 11 = competition (ride)", () => {
    assert.equal(suggestSessionType({ workoutType: 11 }), "competition");
  });

  it("> 90 min ET > 18 km -> sortie longue", () => {
    const a = { movingTime: 100 * 60, distance: 20000, averageHeartrate: 145 };
    assert.equal(suggestSessionType(a, { fcMax: 190 }), "sortie_longue");
  });

  it("ratio D+/km > 50 -> cote", () => {
    const a = { movingTime: 60 * 60, distance: 8000, totalElevationGain: 500 };
    assert.equal(suggestSessionType(a), "cote");
  });

  it("FC < 68% FCmax et < 45 min -> recuperation", () => {
    const a = { movingTime: 30 * 60, distance: 5000, averageHeartrate: 120 };
    assert.equal(suggestSessionType(a, { fcMax: 190 }), "recuperation");
  });

  it("FC max > 92% FCmax + duree < 40 min -> vma_courte", () => {
    const a = {
      movingTime: 35 * 60,
      distance: 7000,
      averageHeartrate: 160,
      maxHeartrate: 180, // 94.7%
    };
    assert.equal(suggestSessionType(a, { fcMax: 190 }), "vma_courte");
  });

  it("FC max > 92% FCmax + duree >= 40 min -> vma_longue", () => {
    const a = {
      movingTime: 55 * 60,
      distance: 10000,
      averageHeartrate: 165,
      maxHeartrate: 180,
    };
    assert.equal(suggestSessionType(a, { fcMax: 190 }), "vma_longue");
  });

  it("FC moyenne en zone tempo (78-88%) -> tempo", () => {
    const a = {
      movingTime: 45 * 60,
      distance: 9000,
      averageHeartrate: 160, // 84%
      maxHeartrate: 170,
    };
    assert.equal(suggestSessionType(a, { fcMax: 190 }), "tempo");
  });

  it("FC moyenne >= 88% FCmax (sans pic VMA) -> seuil", () => {
    const a = {
      movingTime: 40 * 60,
      distance: 9000,
      averageHeartrate: 170, // 89%
      maxHeartrate: 173,     // 91% (NON > 92% pour ne pas declencher VMA)
    };
    assert.equal(suggestSessionType(a, { fcMax: 190 }), "seuil");
  });

  it("fallback duree >= 60 min sans FC -> endurance_fond", () => {
    assert.equal(suggestSessionType({ movingTime: 70 * 60, distance: 10000 }), "endurance_fond");
  });

  it("activite vide -> null", () => {
    assert.equal(suggestSessionType({}), null);
  });
});

describe("deserializeMarkers", () => {
  it("parse un JSON valide", () => {
    assert.deepEqual(deserializeMarkers('["specifique","club"]'), ["specifique", "club"]);
  });

  it("retourne [] sur null/vide", () => {
    assert.deepEqual(deserializeMarkers(null), []);
    assert.deepEqual(deserializeMarkers(""), []);
    assert.deepEqual(deserializeMarkers(undefined), []);
  });

  it("retourne [] sur JSON invalide", () => {
    assert.deepEqual(deserializeMarkers("not json"), []);
    assert.deepEqual(deserializeMarkers('"string"'), []);
  });
});
