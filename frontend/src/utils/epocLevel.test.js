import { describe, expect, it } from "vitest";
import { classifyEpoc, extractEpocFromGarminPayload } from "./epocLevel.js";

describe("classifyEpoc", () => {
  it("retourne hasData=false sur valeur invalide", () => {
    expect(classifyEpoc(null).hasData).toBe(false);
    expect(classifyEpoc(undefined).hasData).toBe(false);
    expect(classifyEpoc(0).hasData).toBe(false);
    expect(classifyEpoc(-10).hasData).toBe(false);
  });

  it("classe Leger si < 30 mL/kg", () => {
    const result = classifyEpoc(20);
    expect(result.level).toBe("Léger");
    expect(result.tone).toBe(1);
  });

  it("classe Modere entre 30 et 90", () => {
    expect(classifyEpoc(50).level).toBe("Modéré");
    expect(classifyEpoc(80).level).toBe("Modéré");
    expect(classifyEpoc(50).tone).toBe(2);
  });

  it("classe Eleve entre 90 et 150", () => {
    expect(classifyEpoc(100).level).toBe("Élevé");
    expect(classifyEpoc(140).level).toBe("Élevé");
    expect(classifyEpoc(100).tone).toBe(4);
  });

  it("classe Tres eleve si >= 150", () => {
    expect(classifyEpoc(150).level).toBe("Très élevé");
    expect(classifyEpoc(200).level).toBe("Très élevé");
    expect(classifyEpoc(150).tone).toBe(5);
  });

  it("retourne un recoveryHoursLabel coherent", () => {
    expect(classifyEpoc(20).recoveryHoursLabel).toContain("rapide");
    expect(classifyEpoc(120).recoveryHoursLabel).toContain("24");
    expect(classifyEpoc(200).recoveryHoursLabel).toContain("36");
  });
});

describe("extractEpocFromGarminPayload", () => {
  it("retourne null si payload vide", () => {
    expect(extractEpocFromGarminPayload(null)).toBeNull();
    expect(extractEpocFromGarminPayload({})).toBeNull();
  });

  it("extrait depuis cle 'epoc'", () => {
    expect(extractEpocFromGarminPayload({ epoc: 95 })).toBe(95);
  });

  it("extrait depuis summaryDTO.epoc", () => {
    expect(extractEpocFromGarminPayload({ summaryDTO: { epoc: 110 } })).toBe(110);
  });
});
