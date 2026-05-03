import { describe, expect, it } from "vitest";
import {
  adjustRecommendationWithRecovery,
  buildRecoveryDecisionProfile,
} from "./performanceNarratives.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const ANCHOR_DATE = new Date("2026-05-01T00:00:00.000Z");

function formatDateDaysBefore(daysBefore) {
  return new Date(ANCHOR_DATE.getTime() - (daysBefore * DAY_MS)).toISOString().slice(0, 10);
}

function buildSnapshots({
  baselineDays = 28,
  recentDays = 7,
  baseline = {},
  recent = {},
} = {}) {
  const snapshots = [];

  for (let daysBefore = baselineDays + recentDays - 1; daysBefore >= recentDays; daysBefore -= 1) {
    snapshots.push({
      date: formatDateDaysBefore(daysBefore),
      ...baseline,
    });
  }

  for (let daysBefore = recentDays - 1; daysBefore >= 0; daysBefore -= 1) {
    snapshots.push({
      date: formatDateDaysBefore(daysBefore),
      ...recent,
    });
  }

  return snapshots;
}

describe("buildRecoveryDecisionProfile", () => {
  it("returns no data when Garmin snapshots are absent", () => {
    const profile = buildRecoveryDecisionProfile([]);

    expect(profile.hasData).toBe(false);
    expect(profile.limitingFactor).toBe("Charge uniquement");
  });

  it("does not compare HRV or resting HR before a 21-day baseline", () => {
    const profile = buildRecoveryDecisionProfile(buildSnapshots({
      baselineDays: 5,
      baseline: { hrvAvgMs: 62, restingHr: 45 },
      recent: { hrvAvgMs: 48, restingHr: 52 },
    }));

    expect(profile.hasData).toBe(false);
    expect(profile.detail).toBe("Donnees Garmin trop recentes pour produire une lecture fiable.");
    expect(profile.factors[0]).toBe("Baseline en cours de constitution (5/21 jours).");
  });

  it("keeps absolute recovery signals usable while the baseline is still building", () => {
    const profile = buildRecoveryDecisionProfile(buildSnapshots({
      baselineDays: 14,
      baseline: { sleepScore: 75 },
      recent: { sleepScore: 45, stressAvg: 70 },
    }));

    expect(profile.hasData).toBe(true);
    expect(profile.factors).toContain("Baseline en cours de constitution (14/21 jours).");
    expect(profile.limitingFactor).toBe("Sommeil faible");
  });

  it("flags a strong HRV drop (-23 percent) as a fragile recovery signal when no Garmin status is provided", () => {
    const profile = buildRecoveryDecisionProfile(buildSnapshots({
      baseline: { hrvAvgMs: 65, restingHr: 46 },
      recent: { hrvAvgMs: 50, restingHr: 46 },
    }));

    expect(profile.hasData).toBe(true);
    expect(profile.tone).toBe("negative");
    expect(profile.limitingFactor).toBe("Variabilite cardiaque basse");
  });

  it("does not flag HRV drop when Garmin reports BALANCED on the recent week", () => {
    // Cas reel : HRV recente plus basse que la baseline RunNSee, mais Garmin
    // confirme que c'est dans la zone normale personnelle. On respecte Garmin.
    const profile = buildRecoveryDecisionProfile(buildSnapshots({
      baseline: { hrvAvgMs: 56, restingHr: 50 },
      recent: { hrvAvgMs: 48, restingHr: 50, hrvStatus: "BALANCED" },
    }));

    expect(profile.hasData).toBe(true);
    expect(profile.tone).not.toBe("negative");
    expect(profile.factors.some((factor) => factor.includes("equilibree selon Garmin"))).toBe(true);
    // Aucune mention "en retrait" ne doit apparaitre.
    expect(profile.factors.every((factor) => !factor.includes("en retrait"))).toBe(true);
  });

  it("does flag HRV when Garmin reports POOR on multiple days", () => {
    const profile = buildRecoveryDecisionProfile(buildSnapshots({
      baseline: { hrvAvgMs: 55, restingHr: 50 },
      recent: { hrvAvgMs: 48, restingHr: 50, hrvStatus: "POOR" },
    }));

    expect(profile.tone).toBe("negative");
    expect(profile.limitingFactor).toBe("Variabilite cardiaque tres basse");
  });

  it("ignores resting HR rise when absolute value stays low (under 55 bpm)", () => {
    // Cas reel : FC repos passe de 47 a 51 (delta +4) mais reste tres basse.
    // +4 etait une alerte avant. Maintenant on tolere car la valeur absolue
    // reste excellente.
    const profile = buildRecoveryDecisionProfile(buildSnapshots({
      baseline: { hrvAvgMs: 60, restingHr: 47 },
      recent: { hrvAvgMs: 60, restingHr: 51 },
    }));

    expect(profile.tone).not.toBe("negative");
    expect(profile.factors.every((factor) => !factor.includes("FC repos en hausse"))).toBe(true);
  });

  it("flags a real resting HR rise (+7 bpm) as a fragile recovery signal", () => {
    const profile = buildRecoveryDecisionProfile(buildSnapshots({
      baseline: { hrvAvgMs: 60, restingHr: 56 },
      recent: { hrvAvgMs: 60, restingHr: 63 },
    }));

    expect(profile.tone).toBe("negative");
    expect(profile.limitingFactor).toBe("FC repos elevee");
  });

  it("keeps poor sleep (score < 50) as a warning when it is the only degraded signal", () => {
    const profile = buildRecoveryDecisionProfile(buildSnapshots({
      baseline: { sleepScore: 80 },
      recent: { sleepScore: 45 },
    }));

    expect(profile.tone).toBe("warning");
    expect(profile.limitingFactor).toBe("Sommeil faible");
  });

  it("does not flag a sleep score of 70 (within the neutral band)", () => {
    const profile = buildRecoveryDecisionProfile(buildSnapshots({
      baseline: { sleepScore: 78 },
      recent: { sleepScore: 70 },
    }));

    // 70 est dans la zone neutre (50-80), pas de penalite ni de bonus.
    expect(profile.factors.every((factor) => !factor.includes("Sommeil faible"))).toBe(true);
  });

  it("flags a very high stress (>= 75) as a critical recovery signal", () => {
    const profile = buildRecoveryDecisionProfile(buildSnapshots({
      baseline: { sleepScore: 75, stressAvg: 35 },
      recent: { sleepScore: 75, stressAvg: 78 },
    }));

    expect(profile.tone).toBe("negative");
    expect(profile.limitingFactor).toBe("Stress tres eleve");
  });

  it("detects a positive recovery context from converging favourable signals", () => {
    const profile = buildRecoveryDecisionProfile(buildSnapshots({
      baseline: { hrvAvgMs: 55, restingHr: 49, sleepScore: 72, stressAvg: 40, bodyBatteryMorning: 55 },
      recent: { hrvAvgMs: 62, restingHr: 45, sleepScore: 82, stressAvg: 24, bodyBatteryMorning: 76 },
    }));

    expect(profile.tone).toBe("positive");
    expect(profile.label).toBe("Solide");
  });

  it("uses 7-day window for HRV (not 3-day) to smooth daily volatility", () => {
    // Snapshot recent : 4 jours bons + 3 jours mauvais. Sur 3 jours seulement,
    // le verdict serait "HRV basse". Sur 7 jours, la moyenne reste neutre.
    const snapshots = buildSnapshots({
      baselineDays: 28,
      baseline: { hrvAvgMs: 55 },
      recent: { hrvAvgMs: 55 },
    });
    // Modifier les 3 derniers jours pour simuler une chute ponctuelle.
    snapshots.slice(-3).forEach((snapshot) => { snapshot.hrvAvgMs = 42; });
    snapshots.slice(-7, -3).forEach((snapshot) => { snapshot.hrvAvgMs = 58; });

    const profile = buildRecoveryDecisionProfile(snapshots);
    // Moyenne 7j ~ (4*58 + 3*42)/7 = 51.1, baseline 55, delta -7%.
    // Avec les nouveaux seuils (-10/-15), -7% reste neutre.
    expect(profile.tone).not.toBe("negative");
  });
});

describe("adjustRecommendationWithRecovery", () => {
  it("adapts the recommendation to the most relevant recovery limiter", () => {
    expect(adjustRecommendationWithRecovery(
      { label: "Seance possible", tone: "neutral" },
      { hasData: true, tone: "negative", limitingFactor: "Sommeil faible" },
    ).label).toContain("Sommeil defavorable");

    expect(adjustRecommendationWithRecovery(
      { label: "Seance possible", tone: "neutral" },
      { hasData: true, tone: "negative", limitingFactor: "Variabilite cardiaque basse" },
    ).label).toContain("Variabilite cardiaque");

    expect(adjustRecommendationWithRecovery(
      { label: "Seance possible", tone: "neutral" },
      { hasData: true, tone: "negative", limitingFactor: "Stress eleve" },
    ).label).toContain("Stress eleve");

    expect(adjustRecommendationWithRecovery(
      { label: "Repos conseille", tone: "negative" },
      { hasData: true, tone: "warning", limitingFactor: "Recuperation inegale" },
    ).tone).toBe("negative");

    expect(adjustRecommendationWithRecovery(
      { label: "Etat stable", tone: "neutral" },
      { hasData: true, tone: "positive", limitingFactor: "Aucun signal bloquant" },
      { summary: { tsb: 8 } },
    ).label).toContain("Fraicheur et recuperation favorables");

    expect(adjustRecommendationWithRecovery(
      { label: "Etat stable", tone: "neutral" },
      { hasData: false, tone: "positive", limitingFactor: "Aucun signal bloquant" },
    ).label).toBe("Etat stable");
  });
});
