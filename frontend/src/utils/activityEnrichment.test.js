import { describe, expect, it } from "vitest";
import {
  buildActivityEnrichmentModel,
  classifyPerformanceCondition,
  classifyTrainingEffect,
  formatRecoveryTime,
  matchActivityByTimestamp,
} from "./activityEnrichment.js";

describe("classifyTrainingEffect", () => {
  it("retourne null sur valeur invalide", () => {
    expect(classifyTrainingEffect(null)).toBeNull();
    expect(classifyTrainingEffect(-1)).toBeNull();
  });

  it("classe les paliers Firstbeat", () => {
    expect(classifyTrainingEffect(0).label).toBe("Aucun effet");
    expect(classifyTrainingEffect(0.5).label).toBe("Aucun effet");
    expect(classifyTrainingEffect(1.5).label).toBe("Récupération active");
    expect(classifyTrainingEffect(2.5).label).toBe("Maintien");
    expect(classifyTrainingEffect(3.5).label).toBe("Amélioration");
    expect(classifyTrainingEffect(4.5).label).toBe("Forte amélioration");
    expect(classifyTrainingEffect(5).label).toBe("Surcharge");
  });
});

describe("classifyPerformanceCondition", () => {
  it("classe les paliers", () => {
    expect(classifyPerformanceCondition(-15).label).toBe("Forme dégradée");
    expect(classifyPerformanceCondition(-5).label).toBe("Forme limitée");
    expect(classifyPerformanceCondition(0).label).toBe("Forme normale");
    expect(classifyPerformanceCondition(5).label).toBe("Bonne forme");
    expect(classifyPerformanceCondition(15).label).toBe("Très bonne forme");
  });

  it("formate la valeur signée correctement", () => {
    expect(classifyPerformanceCondition(5).valueLabel).toBe("+5");
    expect(classifyPerformanceCondition(-5).valueLabel).toBe("-5");
  });
});

describe("formatRecoveryTime", () => {
  it("retourne null sur valeur invalide", () => {
    expect(formatRecoveryTime(null)).toBeNull();
    expect(formatRecoveryTime(0)).toBeNull();
  });

  it("formate les heures < 24h", () => {
    expect(formatRecoveryTime(12)).toBe("12 h");
    expect(formatRecoveryTime(8)).toBe("8 h");
  });

  it("formate les jours >= 24h", () => {
    expect(formatRecoveryTime(48)).toBe("2 j");
    expect(formatRecoveryTime(36)).toBe("1.5 j");
  });
});

describe("buildActivityEnrichmentModel", () => {
  it("retourne null si payload vide", () => {
    expect(buildActivityEnrichmentModel(null)).toBeNull();
    expect(buildActivityEnrichmentModel({})).toBeNull();
  });

  it("retourne null si aucune métrique pertinente", () => {
    const result = buildActivityEnrichmentModel({ activityId: 123 });
    expect(result).toBeNull();
  });

  it("construit le modele complet", () => {
    const result = buildActivityEnrichmentModel({
      activityId: 12345,
      aerobicTrainingEffect: 3.2,
      aerobicTrainingEffectMessage: "Améliore ta tolérance aérobie",
      anaerobicTrainingEffect: 1.5,
      vO2MaxValue: 52.1,
      performanceCondition: 5,
      recoveryHeartRate: 28,
      epoc: 95,
    });
    expect(result).not.toBeNull();
    expect(result.aerobicTrainingEffect.classification.label).toBe("Amélioration");
    expect(result.anaerobicTrainingEffect.classification.label).toBe("Récupération active");
    expect(result.vo2max).toBe(52.1);
    expect(result.performanceCondition.classification.label).toBe("Bonne forme");
    expect(result.epoc).toBe(95);
  });

  it("conserve les valeurs nulles ou negatives utiles", () => {
    const result = buildActivityEnrichmentModel({
      activityId: 12345,
      aerobicTrainingEffect: 0,
      anaerobicTrainingEffect: 0,
      performanceCondition: -4,
      recoveryTime: 36,
      epoc: 0,
    });

    expect(result).not.toBeNull();
    expect(result.aerobicTrainingEffect.value).toBe(0);
    expect(result.anaerobicTrainingEffect.value).toBe(0);
    expect(result.performanceCondition.classification.label).toContain("limit");
    expect(result.recoveryTime).toBe(36);
    expect(result.epoc).toBe(0);
  });
});

describe("matchActivityByTimestamp", () => {
  it("retourne null sans donnees", () => {
    expect(matchActivityByTimestamp(null, [])).toBeNull();
    expect(matchActivityByTimestamp("2026-05-04T10:00:00Z", [])).toBeNull();
  });

  it("matche dans la fenetre de tolerance (±10 min defaut)", () => {
    const activities = [
      { activityId: 1, startTimeLocal: "2026-05-04T10:05:00" },
      { activityId: 2, startTimeLocal: "2026-05-04T15:00:00" },
    ];
    const match = matchActivityByTimestamp("2026-05-04T10:00:00", activities);
    expect(match?.activityId).toBe(1);
  });

  it("ne matche pas hors fenetre", () => {
    const activities = [
      { activityId: 1, startTimeLocal: "2026-05-04T10:30:00" },
    ];
    const match = matchActivityByTimestamp("2026-05-04T10:00:00", activities);
    expect(match).toBeNull();
  });

  it("retourne le meilleur match (plus proche)", () => {
    const activities = [
      { activityId: 1, startTimeLocal: "2026-05-04T10:08:00" }, // 8 min
      { activityId: 2, startTimeLocal: "2026-05-04T10:02:00" }, // 2 min
    ];
    const match = matchActivityByTimestamp("2026-05-04T10:00:00", activities);
    expect(match?.activityId).toBe(2);
  });
});
