import { describe, it, expect } from "vitest";
import { buildVdotProfileTabModel } from "./performanceVdotProfileModel.js";

function mkActivity({ id, distanceMeters, elapsedSeconds, dateISO, bestEffortName, hasGain = 0 }) {
  const bestEfforts = bestEffortName ? [{
    name: bestEffortName,
    distance: distanceMeters,
    elapsed_time: elapsedSeconds,
    elapsedTime: elapsedSeconds,
    pr_rank: 1,
  }] : [];
  return {
    id,
    stravaActivityId: `s-${id}`,
    sportType: "Run",
    type: "Run",
    name: `Run ${id}`,
    startDate: dateISO,
    startDateLocal: dateISO,
    distance: distanceMeters,
    movingTime: elapsedSeconds,
    elapsedTime: elapsedSeconds,
    elevationGain: hasGain,
    rawJson: JSON.stringify({ best_efforts: bestEfforts }),
    prCount: 1,
    achievementCount: 1,
    __distanceKm: distanceMeters / 1000,
    __movingSeconds: elapsedSeconds,
    __date: new Date(dateISO),
    __paceSecondsPerKm: elapsedSeconds / (distanceMeters / 1000),
    __elevationGain: hasGain,
  };
}

describe("buildVdotProfileTabModel — refonte methodologique (fenetre 365j + axes centres master VDOT)", () => {
  it("retourne hasData=false si pas d'activites exploitables", () => {
    const model = buildVdotProfileTabModel({ scopeActivities: [] });
    expect(model.hasData).toBe(false);
  });

  it("integre les records anciens jusqu'a 365 jours (avant: 90j filtrant tout)", () => {
    // Cas reel utilisateur : 5k 19:00 il y a ~600j (trop ancien, exclu),
    // 10k 38:41 il y a ~430j (trop ancien, exclu),
    // semi 1:29:47 il y a ~410j (trop ancien, exclu),
    // mais on prend les 365 derniers jours -> tous exclus.
    // Reformule : 5k a 11 mois (~330j), 10k a 4 mois, semi a 6 mois.
    const today = new Date("2026-05-21T10:00:00Z");
    const activities = [
      mkActivity({ id: "5k", distanceMeters: 5000, elapsedSeconds: 1140, dateISO: "2025-06-21T10:00:00Z", bestEffortName: "5k" }), // 5k 19:00, 11 mois
      mkActivity({ id: "10k", distanceMeters: 10000, elapsedSeconds: 2321, dateISO: "2026-01-21T10:00:00Z", bestEffortName: "10k" }), // 10k 38:41, 4 mois
      mkActivity({ id: "semi", distanceMeters: 21097.5, elapsedSeconds: 5387, dateISO: "2025-11-21T10:00:00Z", bestEffortName: "halfMarathon" }), // semi 1:29:47, 6 mois
    ];
    const model = buildVdotProfileTabModel({ scopeActivities: activities, referenceDate: today });
    expect(model.hasData).toBe(true);
    // Avec fenetre 365j, les 3 records sont pris.
    const vitesseAxis = model.profile5D.find((a) => a.key === "vitesse");
    expect(vitesseAxis.score).toBeGreaterThan(0); // Vitesse non-vide (avant: 0)
    expect(vitesseAxis.detail).toMatch(/5 km/);
  });

  it("normalise les axes RELATIVEMENT au master VDOT (50 = equilibre)", () => {
    // Coureur 5k-specialiste : 5k VDOT > master VDOT consolide
    const today = new Date("2026-05-21T10:00:00Z");
    const activities = [
      // 5k 19:00 -> VDOT ~56
      mkActivity({ id: "5k", distanceMeters: 5000, elapsedSeconds: 1140, dateISO: "2026-05-15T10:00:00Z", bestEffortName: "5k" }),
      // marathon 4:30:00 -> VDOT ~38 (relativement faible) -> tirera master a la baisse
      mkActivity({ id: "marathon", distanceMeters: 42195, elapsedSeconds: 16200, dateISO: "2026-04-15T10:00:00Z", bestEffortName: "marathon" }),
    ];
    const model = buildVdotProfileTabModel({ scopeActivities: activities, referenceDate: today });
    const vitesseAxis = model.profile5D.find((a) => a.key === "vitesse");
    // Vitesse > 50 car 5k VDOT > master VDOT consolide.
    expect(vitesseAxis.score).toBeGreaterThan(50);
    // VO2max axis = 50 par definition (master vs master).
    const vo2Axis = model.profile5D.find((a) => a.key === "vo2max");
    expect(vo2Axis.score).toBe(50);
  });

  it("VO2max axis est toujours = 50 (reference centrale)", () => {
    const today = new Date("2026-05-21T10:00:00Z");
    const activities = [
      mkActivity({ id: "5k", distanceMeters: 5000, elapsedSeconds: 1200, dateISO: "2026-05-15T10:00:00Z", bestEffortName: "5k" }),
    ];
    const model = buildVdotProfileTabModel({ scopeActivities: activities, referenceDate: today });
    expect(model.profile5D.find((a) => a.key === "vo2max").score).toBe(50);
  });

  it("axe muscular utilise Garmin Hill + Endurance si snapshot fourni", () => {
    const today = new Date("2026-05-21T10:00:00Z");
    const activities = [
      mkActivity({ id: "5k", distanceMeters: 5000, elapsedSeconds: 1200, dateISO: "2026-05-15T10:00:00Z", bestEffortName: "5k" }),
    ];
    const garmin = { enduranceScore: 7000, hillScore: 75 };
    const model = buildVdotProfileTabModel({
      scopeActivities: activities,
      referenceDate: today,
      garminLatestFitnessSnapshot: garmin,
    });
    const muscular = model.profile5D.find((a) => a.key === "muscular");
    expect(muscular.source).toBe("garmin_hill_endurance");
    expect(muscular.score).toBeGreaterThan(60);
  });

  it("axe endurance utilise Riegel quand 5k + marathon disponibles", () => {
    const today = new Date("2026-05-21T10:00:00Z");
    const activities = [
      mkActivity({ id: "5k", distanceMeters: 5000, elapsedSeconds: 1200, dateISO: "2026-05-15T10:00:00Z", bestEffortName: "5k" }),
      mkActivity({ id: "marathon", distanceMeters: 42195, elapsedSeconds: 12000, dateISO: "2026-04-10T10:00:00Z", bestEffortName: "marathon" }),
    ];
    const model = buildVdotProfileTabModel({ scopeActivities: activities, referenceDate: today });
    const enduranceAxis = model.profile5D.find((a) => a.key === "endurance");
    expect(enduranceAxis.detail).toMatch(/Riegel/);
  });

  it("limites de lecture : 3 entrees", () => {
    const today = new Date("2026-05-21T10:00:00Z");
    const activities = [
      mkActivity({ id: "5k", distanceMeters: 5000, elapsedSeconds: 1200, dateISO: "2026-05-15T10:00:00Z", bestEffortName: "5k" }),
    ];
    const model = buildVdotProfileTabModel({ scopeActivities: activities, referenceDate: today });
    expect(model.limits).toHaveLength(3);
  });

  it("takeaway : style coach mockup 'Ton X est ton meilleur atout'", () => {
    const today = new Date("2026-05-21T10:00:00Z");
    const activities = [
      mkActivity({ id: "5k", distanceMeters: 5000, elapsedSeconds: 1200, dateISO: "2026-05-15T10:00:00Z", bestEffortName: "5k" }),
    ];
    const model = buildVdotProfileTabModel({ scopeActivities: activities, referenceDate: today });
    expect(model.takeaway.paragraphs.length).toBeGreaterThanOrEqual(1);
    expect(model.takeaway.paragraphs[0]).toMatch(/Ton .+ est ton meilleur atout/);
  });
});
