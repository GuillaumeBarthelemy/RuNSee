import { describe, it, expect } from "vitest";
import { computeHrvCv } from "./recoveryAdvanced.js";

describe("computeHrvCv", () => {
  it("retourne null si série trop courte (< 5 valeurs valides)", () => {
    const r = computeHrvCv([45, 46, 44]);
    expect(r.cv).toBeNull();
    expect(r.label).toBe("Données insuffisantes");
  });

  it("classifie 'Stable' si CV < 6 %", () => {
    // Série très stable : 45 ± 1 sur 7 jours
    const series = [45, 46, 45, 44, 46, 45, 45];
    const r = computeHrvCv(series, 7);
    expect(r.cv).toBeLessThan(6);
    expect(r.tone).toBe(1);
    expect(r.label).toBe("Stable");
    expect(r.nValid).toBe(7);
  });

  it("classifie 'Modéré' si CV entre 6 et 10 %", () => {
    // Série modérément variable : mean ~45, SD ~3.5 → CV ~7.8 %
    const series = [40, 50, 42, 48, 44, 47, 43];
    const r = computeHrvCv(series, 7);
    expect(r.cv).toBeGreaterThanOrEqual(6);
    expect(r.cv).toBeLessThan(10);
    expect(r.tone).toBe(2);
  });

  it("classifie 'Instable' si CV entre 10 et 15 %", () => {
    // Série assez variable : mean ~45, SD ~5.5 → CV ~12 %
    const series = [38, 52, 40, 50, 45, 38, 50];
    const r = computeHrvCv(series, 7);
    expect(r.cv).toBeGreaterThanOrEqual(10);
    expect(r.cv).toBeLessThan(15);
    expect(r.tone).toBe(4);
  });

  it("classifie 'Très instable' si CV >= 15 %", () => {
    const series = [30, 60, 25, 65, 28, 62, 35];
    const r = computeHrvCv(series, 7);
    expect(r.cv).toBeGreaterThanOrEqual(15);
    expect(r.tone).toBe(5);
    expect(r.label).toBe("Très instable — alerte");
  });

  it("ignore les valeurs nulles/négatives", () => {
    const series = [45, null, 46, 0, 44, undefined, 46, 45, 45];
    const r = computeHrvCv(series, 9);
    // 6 valeurs valides → calcul possible
    expect(r.nValid).toBe(6);
    expect(r.cv).not.toBeNull();
  });

  it("retourne moyenne et SD arrondis", () => {
    const series = [40, 40, 40, 40, 40, 40, 40];
    const r = computeHrvCv(series, 7);
    expect(r.mean).toBe(40);
    expect(r.sd).toBe(0);
    expect(r.cv).toBe(0);
    expect(r.tone).toBe(1);
  });
});
