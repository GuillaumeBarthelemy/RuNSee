import { describe, it, expect } from "vitest";
import {
  buildPeriodPaceAdjustedSummary,
  buildPeriodDecouplingSummary,
  buildPeriodEpocSummary,
  buildOverviewTakeaways,
} from "./analyticsFocus.js";

describe("buildPeriodPaceAdjustedSummary", () => {
  it("retourne hasData=false si pas de summary", () => {
    const r = buildPeriodPaceAdjustedSummary({});
    expect(r.hasData).toBe(false);
    expect(r.tone).toBe(3);
  });

  it("classifie 'En nette amélioration' si delta >= 5 %", () => {
    const r = buildPeriodPaceAdjustedSummary({ summary: { deltaPercent: 7.2, value: 0.05, previousValue: 0.0466, activityCount: 12 } });
    expect(r.hasData).toBe(true);
    expect(r.deltaPercent).toBe(7.2);
    expect(r.tone).toBe(1);
    expect(r.label).toMatch(/nette amélioration/i);
  });

  it("classifie 'Recul marqué' si delta < -5 %", () => {
    const r = buildPeriodPaceAdjustedSummary({ summary: { deltaPercent: -8.4, value: 0.04, previousValue: 0.044, activityCount: 6 } });
    expect(r.tone).toBe(5);
    expect(r.label).toMatch(/recul marqué/i);
  });
});

describe("buildPeriodDecouplingSummary", () => {
  it("retourne hasData=false si aucun decoupling sur la période", () => {
    const r = buildPeriodDecouplingSummary([{ name: "A", movingTime: 3600 }]);
    expect(r.hasData).toBe(false);
    expect(r.label).toMatch(/disponible par activité/i);
  });

  it("pondère par durée", () => {
    const activities = [
      { name: "A", movingTime: 3600, decouplingPercent: 2 },   // 1h, decoupling 2 %
      { name: "B", movingTime: 7200, decouplingPercent: 6 },   // 2h, decoupling 6 %
    ];
    const r = buildPeriodDecouplingSummary(activities);
    expect(r.hasData).toBe(true);
    // Moyenne pondérée = (2*3600 + 6*7200) / (3600+7200) = (7200 + 43200) / 10800 = 4.67
    expect(r.averagePercent).toBeCloseTo(4.67, 1);
    expect(r.sampleSize).toBe(2);
  });

  it("classifie 'Très bonne endurance' si < 2 %", () => {
    const r = buildPeriodDecouplingSummary([{ movingTime: 3600, decouplingPercent: 1.2 }]);
    expect(r.tone).toBe(1);
    expect(r.label).toMatch(/très bonne/i);
  });

  it("classifie 'Dérive élevée' si >= 8 %", () => {
    const r = buildPeriodDecouplingSummary([{ movingTime: 3600, decouplingPercent: 10 }]);
    expect(r.tone).toBe(5);
  });
});

describe("buildPeriodEpocSummary", () => {
  it("retourne hasData=false sans données EPOC", () => {
    const r = buildPeriodEpocSummary([{ movingTime: 3600 }]);
    expect(r.hasData).toBe(false);
    expect(r.distribution).toEqual([]);
  });

  it("agrège distribution pondérée par durée", () => {
    const activities = [
      { movingTime: 3600, epoc: 20 },    // Léger (<30)
      { movingTime: 3600, epoc: 50 },    // Modéré (30-89)
      { movingTime: 7200, epoc: 100 },   // Élevé (90-149)
    ];
    const r = buildPeriodEpocSummary(activities);
    expect(r.hasData).toBe(true);
    expect(r.sampleSize).toBe(3);
    expect(r.distribution).toHaveLength(3);
    // Total durée 14400, Élevé = 7200 → 50 %
    const eleve = r.distribution.find((d) => d.level === "Élevé");
    expect(eleve.pct).toBe(50);
    // Tone majoritaire = Élevé (tone 4)
    expect(r.tone).toBe(4);
  });

  it("supporte providerEnrichments[].epoc", () => {
    const activities = [
      { movingTime: 3600, providerEnrichments: [{ providerCode: "garmin", epoc: 100 }] },
    ];
    const r = buildPeriodEpocSummary(activities);
    expect(r.hasData).toBe(true);
    expect(r.averageMlKg).toBe(100);
  });

  it("agrège recoveryTime Garmin pondéré durée", () => {
    const activities = [
      { movingTime: 3600, epoc: 50, recoveryTime: 3600 },    // 1h récup pour 1h activité
      { movingTime: 7200, epoc: 100, recoveryTime: 18000 },  // 5h récup pour 2h activité
    ];
    const r = buildPeriodEpocSummary(activities);
    // weightedSumRecovery = 3600*3600 + 18000*7200 = 12 960 000 + 129 600 000 = 142 560 000
    // weightTotal = 10 800
    // moyenne = 142 560 000 / 10 800 = 13 200 sec = 3h 40
    expect(r.averageRecoverySeconds).toBe(13200);
    expect(r.averageRecoveryLabel).toMatch(/3h\s*40/);
  });

  it("averageRecoverySeconds null si aucun recoveryTime", () => {
    const r = buildPeriodEpocSummary([{ movingTime: 3600, epoc: 50 }]);
    expect(r.averageRecoverySeconds).toBeNull();
    expect(r.averageRecoveryLabel).toBeNull();
  });

  it("ignore activités sans durée ou sans EPOC", () => {
    const r = buildPeriodEpocSummary([
      { movingTime: 0, epoc: 50 },
      { movingTime: 3600, epoc: 0 },
    ]);
    expect(r.hasData).toBe(false);
  });
});

describe("buildOverviewTakeaways", () => {
  it("retourne 3 bullets toujours (charge, fatigue, volume)", () => {
    const bullets = buildOverviewTakeaways({});
    expect(bullets).toHaveLength(3);
    expect(bullets.map((b) => b.key)).toEqual(["charge", "fatigue", "volume"]);
  });

  it("Charge maîtrisée si 200..400", () => {
    const b = buildOverviewTakeaways({ charge7d: 300 });
    const charge = b.find((x) => x.key === "charge");
    expect(charge.tone).toBe(2);
    expect(charge.title).toMatch(/maîtrisée/i);
  });

  it("Charge très élevée si >= 600", () => {
    const b = buildOverviewTakeaways({ charge7d: 612 });
    expect(b[0].tone).toBe(5);
  });

  it("Fatigue élevée si >= 60", () => {
    const b = buildOverviewTakeaways({ fatigueValue: 78 });
    expect(b[1].tone).toBe(4);
    expect(b[1].title).toMatch(/élevée/i);
  });

  it("Volume en hausse si delta > 0.25 h", () => {
    const b = buildOverviewTakeaways({ volumeHours: 10, volumeHoursDelta: 1.5 });
    expect(b[2].tone).toBe(1);
    expect(b[2].title).toMatch(/hausse/i);
  });

  it("Volume en baisse si delta < -0.25 h", () => {
    const b = buildOverviewTakeaways({ volumeHours: 5, volumeHoursDelta: -1.0 });
    expect(b[2].tone).toBe(4);
  });
});
