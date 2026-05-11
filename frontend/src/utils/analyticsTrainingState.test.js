import { describe, it, expect } from "vitest";
import { computeTrainingStateScore } from "./analyticsTrainingState.js";

describe("computeTrainingStateScore", () => {
  it("retourne null sans erreur si aucun signal dispo", () => {
    const r = computeTrainingStateScore({});
    expect(r.score).toBeNull();
    expect(r.label).toBe("Données insuffisantes");
    expect(r.tone).toBe(3);
    expect(r.contributions).toEqual([]);
    expect(r.missingSignals).toHaveLength(4);
  });

  it("calcule un score 'Construction optimale' avec tous signaux au top", () => {
    const r = computeTrainingStateScore({
      tsb: 15,              // dans 5..25 → 100
      acwr: 1.1,            // sweet spot → 100
      monotony: 1.2,        // < 1.5 → 100
      hrvDeltaPct: 12,      // ≥ +10 → 100
    });
    expect(r.score).toBe(100);
    expect(r.label).toBe("Construction optimale");
    expect(r.tone).toBe(1);
    expect(r.missingSignals).toEqual([]);
    expect(r.contributions).toHaveLength(4);
  });

  it("renormalise les poids si VFC absente", () => {
    const r = computeTrainingStateScore({
      tsb: 15,            // sub 100, weight 40
      acwr: 1.1,          // sub 100, weight 30
      monotony: 1.2,      // sub 100, weight 15
      hrvDeltaPct: null,  // absent
    });
    // Renormalisation : poids total 85, donc poids relatifs 47/35/18 (arrondi).
    expect(r.score).toBe(100); // tous à 100 → quel que soit le poids
    expect(r.missingSignals).toEqual(["hrvDelta"]);
    expect(r.contributions).toHaveLength(3);
  });

  it("classifie 'Alerte' sur signaux dégradés", () => {
    const r = computeTrainingStateScore({
      tsb: -35,             // < -30 → 15
      acwr: 2.0,            // > 1.8 → 25
      monotony: 2.8,        // > 2.5 → 20
      hrvDeltaPct: -20,     // < -15 → 15
    });
    expect(r.tone).toBeGreaterThanOrEqual(4);
    expect(r.score).toBeLessThan(35);
    expect(r.label).toBe("Alerte");
  });

  it("classifie 'Vigilance' sur signaux mixtes modérés", () => {
    const r = computeTrainingStateScore({
      tsb: -8,              // -10..-5 → 65
      acwr: 1.4,            // 1.3..1.5 → 75
      monotony: 2.0,        // 1.8..2.2 → 60
      hrvDeltaPct: -5,      // -8..-3 → 50
    });
    // Poids 40/30/15/15 → 0.4*65 + 0.3*75 + 0.15*60 + 0.15*50 = 26+22.5+9+7.5 = 65
    expect(r.score).toBe(65);
    expect(r.label).toBe("Bonne forme"); // 65 = seuil basse de "Bonne forme"
  });

  it("ne crashe pas sur des valeurs non-finite", () => {
    const r = computeTrainingStateScore({
      tsb: NaN,
      acwr: Infinity,
      monotony: -5,         // négatif refusé
      hrvDeltaPct: undefined,
    });
    expect(r.score).toBeNull();
    expect(r.tone).toBe(3);
  });

  it("inclut la source scientifique dans chaque contribution", () => {
    const r = computeTrainingStateScore({ tsb: 10 });
    expect(r.contributions[0].source).toMatch(/Coggan/);
  });

  it("expose les poids relatifs réels (somme=100) après renormalisation", () => {
    const r = computeTrainingStateScore({ tsb: 10, acwr: 1.0 });
    const sumWeights = r.contributions.reduce((s, c) => s + c.weight, 0);
    // Tolérance arrondi : ±1
    expect(sumWeights).toBeGreaterThanOrEqual(99);
    expect(sumWeights).toBeLessThanOrEqual(101);
  });
});
