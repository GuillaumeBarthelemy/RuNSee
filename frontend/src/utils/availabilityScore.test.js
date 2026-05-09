import { describe, expect, it } from "vitest";
import { computeAvailabilityScore, normalizeTsb } from "./availabilityScore.js";

describe("normalizeTsb", () => {
  it("retourne null sur valeur invalide", () => {
    expect(normalizeTsb(null)).toBeNull();
    expect(normalizeTsb(undefined)).toBeNull();
    expect(normalizeTsb(NaN)).toBeNull();
  });

  it("100 sur l'optimum +5 à +25", () => {
    expect(normalizeTsb(5)).toBe(100);
    expect(normalizeTsb(15)).toBe(100);
    expect(normalizeTsb(25)).toBe(100);
  });

  it("80 sur la zone neutre [-10, +5)", () => {
    expect(normalizeTsb(0)).toBe(80);
    expect(normalizeTsb(-5)).toBe(80);
  });

  it("60 si désentraînement (> +25)", () => {
    expect(normalizeTsb(30)).toBe(60);
    expect(normalizeTsb(50)).toBe(60);
  });

  it("50 si pression -30 à -10", () => {
    expect(normalizeTsb(-15)).toBe(50);
    expect(normalizeTsb(-25)).toBe(50);
  });

  it("25 si surcharge < -30", () => {
    expect(normalizeTsb(-40)).toBe(25);
  });
});

describe("computeAvailabilityScore", () => {
  it("retourne hasData=false si aucune source", () => {
    const result = computeAvailabilityScore({});
    expect(result.hasData).toBe(false);
    expect(result.score).toBeNull();
  });

  it("calcule le composite quand les deux sources sont presentes", () => {
    // Aptitude 80 (haut), TSB 15 (optimum -> 100)
    // Score = 0.6*80 + 0.4*100 = 48 + 40 = 88
    const result = computeAvailabilityScore({ readinessScore: 80, tsb: 15 });
    expect(result.hasData).toBe(true);
    expect(result.score).toBe(88);
    expect(result.label).toBe("Prêt");
    expect(result.tone).toBe(1);
  });

  it("retourne aptitude seule si TSB absent", () => {
    const result = computeAvailabilityScore({ readinessScore: 65, tsb: null });
    expect(result.hasData).toBe(true);
    expect(result.score).toBe(65);
    expect(result.label).toBe("Disponible");
  });

  it("retourne TSB normalise seul si aptitude absente", () => {
    const result = computeAvailabilityScore({ readinessScore: null, tsb: 15 });
    expect(result.hasData).toBe(true);
    expect(result.score).toBe(100);
  });

  it("score bas en cas de surcharge", () => {
    // Aptitude 30 (faible), TSB -35 (surcharge -> 25)
    // Score = 0.6*30 + 0.4*25 = 18 + 10 = 28
    const result = computeAvailabilityScore({ readinessScore: 30, tsb: -35 });
    expect(result.score).toBe(28);
    expect(result.label).toBe("Faible");
    expect(result.tone).toBe(4);
  });

  it("clamp readiness hors bornes", () => {
    const result = computeAvailabilityScore({ readinessScore: 150, tsb: 15 });
    // 150 → clamped à 100, score = 0.6*100 + 0.4*100 = 100
    expect(result.score).toBe(100);
  });
});
