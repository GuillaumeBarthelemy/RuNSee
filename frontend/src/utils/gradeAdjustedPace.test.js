import { describe, expect, it } from "vitest";
import {
  averagePaceAdjustmentForLoop,
  calculateGradeAdjustedPace,
  paceAdjustmentFactorForGrade,
  runningCostAtGrade,
} from "./gradeAdjustedPace.js";

describe("runningCostAtGrade (Minetti 2002)", () => {
  it("retourne ~3.6 J/kg/m sur le plat (gradient 0)", () => {
    expect(runningCostAtGrade(0)).toBeCloseTo(3.6, 1);
  });

  it("est plus eleve en montee qu'a plat", () => {
    expect(runningCostAtGrade(0.05)).toBeGreaterThan(3.6); // 5%
    expect(runningCostAtGrade(0.10)).toBeGreaterThan(runningCostAtGrade(0.05));
    expect(runningCostAtGrade(0.20)).toBeGreaterThan(runningCostAtGrade(0.10));
  });

  it("clamp les pentes au-dela de 45 %", () => {
    const c1 = runningCostAtGrade(0.50);
    const c2 = runningCostAtGrade(0.45);
    expect(c1).toBeCloseTo(c2, 1); // clampe à 0.45
  });

  it("est plus faible en descente legere qu'a plat (point bas vers -10%)", () => {
    // Selon Minetti, le coût atteint son minimum vers -10% de pente
    expect(runningCostAtGrade(-0.10)).toBeLessThan(3.6);
  });

  it("remonte sur descentes raides (> 25 % de pente negative)", () => {
    // En descente très raide, le coût remonte (freinage musculaire excentrique)
    expect(runningCostAtGrade(-0.40)).toBeGreaterThan(runningCostAtGrade(-0.10));
  });
});

describe("paceAdjustmentFactorForGrade", () => {
  it("retourne 1 sur le plat", () => {
    expect(paceAdjustmentFactorForGrade(0)).toBeCloseTo(1, 2);
  });

  it("retourne < 1 en montee (allure ajustee plus rapide)", () => {
    expect(paceAdjustmentFactorForGrade(0.10)).toBeLessThan(1);
  });

  it("retourne > 1 en descente legere (allure ajustee plus lente)", () => {
    expect(paceAdjustmentFactorForGrade(-0.10)).toBeGreaterThan(1);
  });
});

describe("averagePaceAdjustmentForLoop", () => {
  it("retourne 1 si pas de denivele", () => {
    expect(averagePaceAdjustmentForLoop(0)).toBe(1);
  });

  it("compense partiellement les montees par les descentes", () => {
    // Sur une boucle 5% : la montée pénalise mais la descente compense
    const factor = averagePaceAdjustmentForLoop(0.05);
    expect(factor).toBeLessThan(1);
    expect(factor).toBeGreaterThan(paceAdjustmentFactorForGrade(0.05));
  });
});

describe("calculateGradeAdjustedPace (cas réels)", () => {
  it("retourne hasAdjustment=false sur sortie courte", () => {
    const result = calculateGradeAdjustedPace({
      observedPaceSecondsPerKm: 300,
      distanceMeters: 500,
      elevationGainMeters: 50,
    });
    expect(result.hasAdjustment).toBe(false);
    expect(result.paceSecondsPerKm).toBe(300);
  });

  it("retourne hasAdjustment=false sur terrain plat (< 1% gradient)", () => {
    const result = calculateGradeAdjustedPace({
      observedPaceSecondsPerKm: 300,
      distanceMeters: 10000,
      elevationGainMeters: 30, // 0.6% moyen → trop plat
    });
    expect(result.hasAdjustment).toBe(false);
  });

  it("ajuste l'allure d'une sortie vallonnee", () => {
    // 10 km avec 200 m de D+ : gradient moyen 4% sur la moitié = sensible
    const result = calculateGradeAdjustedPace({
      observedPaceSecondsPerKm: 360, // 6 min/km
      distanceMeters: 10000,
      elevationGainMeters: 200,
    });
    expect(result.hasAdjustment).toBe(true);
    expect(result.paceSecondsPerKm).toBeLessThan(360); // équivalent plat = plus rapide
    expect(result.adjustmentFactor).toBeLessThan(1);
  });

  it("renvoie pace=0 si entree invalide", () => {
    const result = calculateGradeAdjustedPace({
      observedPaceSecondsPerKm: 0,
      distanceMeters: 5000,
      elevationGainMeters: 100,
    });
    expect(result.paceSecondsPerKm).toBe(0);
    expect(result.hasAdjustment).toBe(false);
  });

  it("comparaison Strava : Trail vallonné", () => {
    // Sortie typique trail : 8 km / 400m D+ / 50min (375 s/km)
    // Strava typiquement : ~340-355 s/km en GAP
    const result = calculateGradeAdjustedPace({
      observedPaceSecondsPerKm: 375,
      distanceMeters: 8000,
      elevationGainMeters: 400,
    });
    expect(result.hasAdjustment).toBe(true);
    expect(result.paceSecondsPerKm).toBeLessThan(375);
    // GAP plausible : entre 320 et 360 s/km
    expect(result.paceSecondsPerKm).toBeGreaterThan(310);
    expect(result.paceSecondsPerKm).toBeLessThan(365);
  });
});
