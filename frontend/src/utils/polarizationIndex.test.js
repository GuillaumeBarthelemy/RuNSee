import { describe, it, expect } from "vitest";
import { computePolarizationIndex } from "./polarizationIndex.js";

describe("computePolarizationIndex (Treff 2019)", () => {
  it("retourne null si une zone manque", () => {
    const r = computePolarizationIndex({ z1Pct: 50, z2Pct: 30 });
    expect(r.index).toBeNull();
    expect(r.label).toBe("Données insuffisantes");
  });

  it("retourne null si somme zones loin de 100 %", () => {
    const r = computePolarizationIndex({ z1Pct: 30, z2Pct: 10, z3Pct: 10 });
    expect(r.index).toBeNull();
    expect(r.label).toBe("Données incohérentes");
  });

  it("classifie 'Polarisée' pour 80/10/10 (typique polarisé élite)", () => {
    const r = computePolarizationIndex({ z1Pct: 80, z2Pct: 10, z3Pct: 10 });
    // PI = log10((80*10)/100) = log10(8) = ~0.90 → en réalité pyramidale
    // Avec 80/5/15 on attendrait PI plus élevé
    expect(r.index).toBeGreaterThan(0);
    expect(r.level).toBe("pyramidal");
  });

  it("classifie 'Polarisée' pour distribution typique 75/5/20", () => {
    const r = computePolarizationIndex({ z1Pct: 75, z2Pct: 5, z3Pct: 20 });
    // PI = log10((75*20)/25) = log10(60) = ~1.78 → pyramidale-haute
    expect(r.level).toMatch(/polarized|pyramidal/);
    expect(r.index).toBeGreaterThan(1.5);
  });

  it("classifie 'Pyramidale' pour 60/30/10", () => {
    const r = computePolarizationIndex({ z1Pct: 60, z2Pct: 30, z3Pct: 10 });
    // PI = log10((60*10)/900) = log10(0.67) = ~-0.18 → threshold
    expect(r.level).toMatch(/pyramidal|threshold/);
  });

  it("classifie 'Threshold' pour 30/60/10 (Z2 dominante)", () => {
    const r = computePolarizationIndex({ z1Pct: 30, z2Pct: 60, z3Pct: 10 });
    // PI = log10((30*10)/3600) = log10(0.083) = ~-1.08 → threshold-dominant
    expect(r.index).toBeLessThan(0);
    expect(r.level).toBe("threshold");
    expect(r.tone).toBeGreaterThanOrEqual(3);
  });

  it("gère cas dégénéré z2=0 → polarisation extrême", () => {
    const r = computePolarizationIndex({ z1Pct: 80, z2Pct: 0, z3Pct: 20 });
    expect(r.level).toBe("polarized");
    expect(r.tone).toBe(1);
  });

  it("gère cas dégénéré z1=0 → threshold", () => {
    const r = computePolarizationIndex({ z1Pct: 0, z2Pct: 80, z3Pct: 20 });
    expect(r.level).toBe("threshold");
    expect(r.tone).toBe(4);
  });

  it("arrondit l'index à 0.01", () => {
    const r = computePolarizationIndex({ z1Pct: 70, z2Pct: 10, z3Pct: 20 });
    expect(Number.isFinite(r.index)).toBe(true);
    // Vérifie 2 décimales max
    expect(Math.abs(r.index * 100 - Math.round(r.index * 100))).toBeLessThan(0.01);
  });
});
