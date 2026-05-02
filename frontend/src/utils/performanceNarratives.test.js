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
  baselineDays = 21,
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

  it("does not compare HRV or resting HR before a 14-day baseline", () => {
    const profile = buildRecoveryDecisionProfile(buildSnapshots({
      baselineDays: 5,
      baseline: { hrvAvgMs: 62, restingHr: 45 },
      recent: { hrvAvgMs: 48, restingHr: 52 },
    }));

    expect(profile.hasData).toBe(false);
    expect(profile.detail).toBe("Donnees Garmin trop recentes pour produire une lecture fiable.");
    expect(profile.factors[0]).toBe("Baseline en cours de constitution (5/14 jours).");
  });

  it("keeps absolute recovery signals usable while the baseline is still building", () => {
    const profile = buildRecoveryDecisionProfile(buildSnapshots({
      baselineDays: 8,
      baseline: { sleepScore: 72 },
      recent: { sleepScore: 50, stressAvg: 62 },
    }));

    expect(profile.hasData).toBe(true);
    expect(profile.factors).toContain("Baseline en cours de constitution (8/14 jours).");
    expect(profile.limitingFactor).toBe("Sommeil faible");
  });

  it("flags a strong HRV drop as a fragile recovery signal", () => {
    const profile = buildRecoveryDecisionProfile(buildSnapshots({
      baseline: { hrvAvgMs: 65, restingHr: 46 },
      recent: { hrvAvgMs: 50, restingHr: 46 },
    }));

    expect(profile.hasData).toBe(true);
    expect(profile.tone).toBe("negative");
    expect(profile.limitingFactor).toBe("Variabilite cardiaque basse");
  });

  it("flags a resting heart-rate rise as a fragile recovery signal", () => {
    const profile = buildRecoveryDecisionProfile(buildSnapshots({
      baseline: { hrvAvgMs: 60, restingHr: 44 },
      recent: { hrvAvgMs: 60, restingHr: 51 },
    }));

    expect(profile.tone).toBe("negative");
    expect(profile.limitingFactor).toBe("FC repos elevee");
  });

  it("keeps poor sleep as a warning when it is the only degraded signal", () => {
    const profile = buildRecoveryDecisionProfile(buildSnapshots({
      baseline: { sleepScore: 80 },
      recent: { sleepScore: 52 },
    }));

    expect(profile.tone).toBe("warning");
    expect(profile.limitingFactor).toBe("Sommeil faible");
  });

  it("detects a positive recovery context from converging favourable signals", () => {
    const profile = buildRecoveryDecisionProfile(buildSnapshots({
      baseline: { hrvAvgMs: 58, restingHr: 49, sleepScore: 72, stressAvg: 40, bodyBatteryMorning: 55 },
      recent: { hrvAvgMs: 64, restingHr: 45, sleepScore: 82, stressAvg: 24, bodyBatteryMorning: 76 },
    }));

    expect(profile.tone).toBe("positive");
    expect(profile.label).toBe("Solide");
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
