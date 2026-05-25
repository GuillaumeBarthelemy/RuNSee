import { describe, it, expect } from "vitest";
import { resolveMasterVdot } from "./vdotConsolidation.js";

describe("resolveMasterVdot — affichage Garmin + calculs ponderes (revise 2026-05-22)", () => {
  it("Display = Garmin si dispo, Calculs = 70/30", () => {
    const result = resolveMasterVdot({
      vdotProfile: { hasData: true, vdot: 53 },
      vdotHistory: { latestSnapshot: { source: "garmin", vdotValue: 56 } },
    });
    // Affichage : VO2max Garmin
    expect(result.displayValue).toBe(56);
    expect(result.displaySource).toBe("garmin");
    // Calculs : ponderes 53*0.7 + 56*0.3 = 53.9
    expect(result.calculationValue).toBeCloseTo(53.9, 1);
    expect(result.calculationSource).toBe("weighted");
  });

  it("Garmin seul : affichage = calculs = Garmin", () => {
    const result = resolveMasterVdot({
      vdotProfile: null,
      vdotHistory: { latestSnapshot: { source: "garmin", vdotValue: 56 } },
    });
    expect(result.displayValue).toBe(56);
    expect(result.calculationValue).toBe(56);
    expect(result.displaySource).toBe("garmin");
    expect(result.calculationSource).toBe("garmin");
  });

  it("Daniels seul : affichage = calculs = Daniels", () => {
    const result = resolveMasterVdot({
      vdotProfile: { hasData: true, vdot: 53 },
      vdotHistory: null,
    });
    expect(result.displayValue).toBe(53);
    expect(result.calculationValue).toBe(53);
    expect(result.displaySource).toBe("daniels_internal");
    expect(result.calculationSource).toBe("daniels_internal");
  });

  it("Rien dispo : displayValue=0, calculationValue=0", () => {
    const result = resolveMasterVdot({});
    expect(result.displayValue).toBe(0);
    expect(result.calculationValue).toBe(0);
    expect(result.displaySource).toBe("unavailable");
  });

  it("Alias retro-compat : value = calculationValue", () => {
    const result = resolveMasterVdot({
      vdotProfile: { hasData: true, vdot: 53 },
      vdotHistory: { latestSnapshot: { source: "garmin", vdotValue: 56 } },
    });
    expect(result.value).toBe(result.calculationValue);
    expect(result.source).toBe(result.calculationSource);
  });

  it("Garmin > Daniels : affichage Garmin haut, calculs proches Daniels", () => {
    const result = resolveMasterVdot({
      vdotProfile: { hasData: true, vdot: 50 },
      vdotHistory: { latestSnapshot: { source: "garmin", vdotValue: 60 } },
    });
    expect(result.displayValue).toBe(60); // Headline ambitieux
    expect(result.calculationValue).toBeCloseTo(53, 1); // Calculs realistes
  });
});
