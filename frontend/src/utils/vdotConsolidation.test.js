import { describe, it, expect } from "vitest";
import { resolveMasterVdot } from "./vdotConsolidation.js";

describe("resolveMasterVdot — regle 70/30 partagee", () => {
  it("applique 70% Daniels + 30% Garmin si les 2 dispos", () => {
    const result = resolveMasterVdot({
      vdotProfile: { hasData: true, vdot: 53 },
      vdotHistory: {
        latestSnapshot: { source: "garmin", vdotValue: 56 },
      },
    });
    // 53 * 0.7 + 56 * 0.3 = 37.1 + 16.8 = 53.9
    expect(result.value).toBeCloseTo(53.9, 1);
    expect(result.source).toBe("weighted");
    expect(result.danielsVdot).toBe(53);
    expect(result.garminVdot).toBe(56);
  });

  it("fallback Garmin si Daniels indispo", () => {
    const result = resolveMasterVdot({
      vdotProfile: null,
      vdotHistory: { latestSnapshot: { source: "garmin", vdotValue: 56 } },
    });
    expect(result.value).toBe(56);
    expect(result.source).toBe("garmin");
  });

  it("fallback Daniels si Garmin indispo", () => {
    const result = resolveMasterVdot({
      vdotProfile: { hasData: true, vdot: 53 },
      vdotHistory: null,
    });
    expect(result.value).toBe(53);
    expect(result.source).toBe("daniels_internal");
  });

  it("ignore vdotHistory si source != garmin", () => {
    const result = resolveMasterVdot({
      vdotProfile: { hasData: true, vdot: 53 },
      vdotHistory: { latestSnapshot: { source: "internal", vdotValue: 55 } },
    });
    expect(result.value).toBe(53);
    expect(result.source).toBe("daniels_internal");
  });

  it("source='unavailable' si rien", () => {
    const result = resolveMasterVdot({});
    expect(result.value).toBe(0);
    expect(result.source).toBe("unavailable");
  });

  it("ponderation : si Daniels = Garmin -> meme valeur", () => {
    const result = resolveMasterVdot({
      vdotProfile: { hasData: true, vdot: 55 },
      vdotHistory: { latestSnapshot: { source: "garmin", vdotValue: 55 } },
    });
    expect(result.value).toBeCloseTo(55, 1);
  });

  it("ponderation : gap important Daniels << Garmin -> proche Daniels", () => {
    const result = resolveMasterVdot({
      vdotProfile: { hasData: true, vdot: 50 },
      vdotHistory: { latestSnapshot: { source: "garmin", vdotValue: 60 } },
    });
    // 50 * 0.7 + 60 * 0.3 = 35 + 18 = 53
    expect(result.value).toBeCloseTo(53, 1);
  });
});
