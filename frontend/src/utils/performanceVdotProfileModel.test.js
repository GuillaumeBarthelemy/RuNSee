import { describe, it, expect } from "vitest";
import { buildVdotProfileTabModel } from "./performanceVdotProfileModel.js";

// Builder helper : activite avec record best-effort.
function mkActivity({ id, distanceMeters, elapsedSeconds, dateISO, bestEffortName, hasGain = 0 }) {
  // Best efforts vivent dans rawJson.best_efforts (cf. getDetailedBestEfforts).
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
    // Champs derives normalement calcules par buildActivityItems :
    __distanceKm: distanceMeters / 1000,
    __movingSeconds: elapsedSeconds,
    __date: new Date(dateISO),
    __paceSecondsPerKm: elapsedSeconds / (distanceMeters / 1000),
    __elevationGain: hasGain,
  };
}

describe("buildVdotProfileTabModel", () => {
  it("retourne hasData=false si pas d'activites exploitables", () => {
    const model = buildVdotProfileTabModel({ scopeActivities: [] });
    expect(model.hasData).toBe(false);
    expect(model.emptyReason).toMatch(/activités/i);
  });

  it("construit profil 5D avec 5 km + 10 km recents", () => {
    const today = new Date("2026-05-21T10:00:00Z");
    const activities = [
      mkActivity({ id: "a1", distanceMeters: 5000, elapsedSeconds: 1200, dateISO: "2026-05-15T10:00:00Z", bestEffortName: "5k" }),
      mkActivity({ id: "a2", distanceMeters: 10000, elapsedSeconds: 2700, dateISO: "2026-05-10T10:00:00Z", bestEffortName: "10k" }),
    ];
    const model = buildVdotProfileTabModel({ scopeActivities: activities, referenceDate: today });
    expect(model.hasData).toBe(true);
    expect(model.profile5D).toHaveLength(5);
    const keys = model.profile5D.map((a) => a.key);
    expect(keys).toEqual(["vo2max", "vitesse", "seuil", "endurance", "muscular"]);
    // Tous les scores doivent etre entre 0 et 100
    model.profile5D.forEach((axis) => {
      expect(axis.score).toBeGreaterThanOrEqual(0);
      expect(axis.score).toBeLessThanOrEqual(100);
    });
  });

  it("axe endurance utilise Riegel si 5k + marathon dispo", () => {
    const today = new Date("2026-05-21T10:00:00Z");
    const activities = [
      mkActivity({ id: "a1", distanceMeters: 5000, elapsedSeconds: 1200, dateISO: "2026-05-15T10:00:00Z", bestEffortName: "5k" }),
      // Marathon 3h20 = 12000s, exposant Riegel = log(12000/1200)/log(42195/5000) = log(10)/log(8.44) ≈ 1.08
      mkActivity({ id: "a2", distanceMeters: 42195, elapsedSeconds: 12000, dateISO: "2026-04-10T10:00:00Z", bestEffortName: "marathon" }),
    ];
    const model = buildVdotProfileTabModel({ scopeActivities: activities, referenceDate: today });
    expect(model.hasData).toBe(true);
    const enduranceAxis = model.profile5D.find((a) => a.key === "endurance");
    expect(enduranceAxis.detail).toMatch(/Riegel/);
  });

  it("axe muscular utilise Garmin Hill + Endurance si snapshot fourni", () => {
    const today = new Date("2026-05-21T10:00:00Z");
    const activities = [
      mkActivity({ id: "a1", distanceMeters: 5000, elapsedSeconds: 1200, dateISO: "2026-05-15T10:00:00Z", bestEffortName: "5k" }),
    ];
    const garmin = { enduranceScore: 7000, hillScore: 75 };
    const model = buildVdotProfileTabModel({
      scopeActivities: activities,
      referenceDate: today,
      garminLatestFitnessSnapshot: garmin,
    });
    const muscular = model.profile5D.find((a) => a.key === "muscular");
    expect(muscular.source).toBe("garmin_hill_endurance");
    // Hill 75 + Endurance 7000 -> normalize Hill = 75, Endurance ~= 75 -> score ~75
    expect(muscular.score).toBeGreaterThan(60);
    expect(muscular.score).toBeLessThan(100);
  });

  it("axe muscular fallback Riegel si Garmin absent", () => {
    const today = new Date("2026-05-21T10:00:00Z");
    const activities = [
      mkActivity({ id: "a1", distanceMeters: 5000, elapsedSeconds: 1200, dateISO: "2026-05-15T10:00:00Z", bestEffortName: "5k" }),
      mkActivity({ id: "a2", distanceMeters: 42195, elapsedSeconds: 12000, dateISO: "2026-04-10T10:00:00Z", bestEffortName: "marathon" }),
    ];
    const model = buildVdotProfileTabModel({
      scopeActivities: activities,
      referenceDate: today,
    });
    const muscular = model.profile5D.find((a) => a.key === "muscular");
    expect(muscular.source).toBe("riegel");
  });

  it("limites de lecture : 3 entrees scientifiques", () => {
    const today = new Date("2026-05-21T10:00:00Z");
    const activities = [
      mkActivity({ id: "a1", distanceMeters: 5000, elapsedSeconds: 1200, dateISO: "2026-05-15T10:00:00Z", bestEffortName: "5k" }),
    ];
    const model = buildVdotProfileTabModel({ scopeActivities: activities, referenceDate: today });
    expect(model.limits).toHaveLength(3);
    const titles = model.limits.map((l) => l.title);
    expect(titles).toContain("Échantillon");
    expect(titles).toContain("Terrain");
    expect(titles).toContain("Variabilité physiologique");
  });

  it("takeaway : style coach mockup 'Ton X est ton meilleur atout'", () => {
    const today = new Date("2026-05-21T10:00:00Z");
    const activities = [
      mkActivity({ id: "a1", distanceMeters: 5000, elapsedSeconds: 1200, dateISO: "2026-05-15T10:00:00Z", bestEffortName: "5k" }),
    ];
    const model = buildVdotProfileTabModel({ scopeActivities: activities, referenceDate: today });
    expect(model.takeaway.paragraphs.length).toBeGreaterThanOrEqual(1);
    expect(model.takeaway.paragraphs[0]).toMatch(/Ton .+ est ton meilleur atout/);
  });
});
