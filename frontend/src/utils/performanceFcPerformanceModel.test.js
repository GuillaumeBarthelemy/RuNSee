import { describe, it, expect } from "vitest";
import { buildFcPerformanceModel } from "./performanceFcPerformanceModel.js";

function mkRun({ id, dateISO, distM, secs, hrAvg, hrMax = null, decoupling = null, paceSec = null }) {
  const pace = paceSec || secs / (distM / 1000);
  return {
    id,
    stravaActivityId: `s-${id}`,
    sportType: "Run",
    type: "Run",
    name: `Run ${id}`,
    startDate: dateISO,
    startDateLocal: dateISO,
    distance: distM,
    movingTime: secs,
    elapsedTime: secs,
    averageHeartrate: hrAvg,
    maxHeartrate: hrMax,
    cardiacDecouplingPercent: decoupling,
    rawJson: JSON.stringify({ best_efforts: [] }),
    __distanceKm: distM / 1000,
    __movingSeconds: secs,
    __date: new Date(dateISO),
    __paceSecondsPerKm: pace,
    __elevationGain: 0,
  };
}

describe("buildFcPerformanceModel", () => {
  it("retourne hasData=false si pas d'activites recentes", () => {
    const m = buildFcPerformanceModel({ scopeActivities: [] });
    expect(m.hasData).toBe(false);
  });

  it("estime FC seuil depuis sessions T pace", () => {
    // VDOT 54 -> T pace ~244 s/km. Sessions a 240-250 s/km avec FC 165
    const today = new Date("2026-05-21");
    const runs = [
      mkRun({ id: "1", dateISO: "2026-05-15", distM: 10000, secs: 2440, hrAvg: 165 }), // pace 244, T
      mkRun({ id: "2", dateISO: "2026-05-10", distM: 8000, secs: 1960, hrAvg: 168 }),  // pace 245, T
    ];
    const m = buildFcPerformanceModel({
      scopeActivities: runs,
      vdotProfile: { hasData: true, vdot: 54 },
      referenceDate: today,
      settings: { heartRateMax: 192, restingHeartrate: 50 },
    });
    expect(m.hasData).toBe(true);
    expect(m.kpi.fcSeuil.value).toBeGreaterThan(150);
    expect(m.kpi.fcSeuil.value).toBeLessThan(180);
  });

  it("fallback FC seuil 88 % FC max si pas assez de sessions T", () => {
    const today = new Date("2026-05-21");
    const runs = [
      // Session facile, pas T
      mkRun({ id: "1", dateISO: "2026-05-15", distM: 5000, secs: 2100, hrAvg: 130 }), // pace 420
    ];
    const m = buildFcPerformanceModel({
      scopeActivities: runs,
      vdotProfile: { hasData: true, vdot: 54 },
      referenceDate: today,
      settings: { heartRateMax: 192 },
    });
    // 192 * 0.88 = 168.96 -> 169
    expect(m.kpi.fcSeuil.value).toBe(169);
    expect(m.kpi.fcSeuil.hint).toMatch(/88/);
  });

  it("FC max depuis settings utilisateur prioritaire", () => {
    const today = new Date("2026-05-21");
    const runs = [
      mkRun({ id: "1", dateISO: "2026-05-15", distM: 5000, secs: 1200, hrAvg: 170, hrMax: 188 }),
    ];
    const m = buildFcPerformanceModel({
      scopeActivities: runs,
      vdotProfile: { hasData: true, vdot: 54 },
      referenceDate: today,
      settings: { heartRateMax: 195 },
    });
    expect(m.kpi.fcMax.value).toBe(195);
    expect(m.kpi.fcMax.hint).toMatch(/réglages/i);
  });

  it("Derive cardiaque moyenne sur sorties longues", () => {
    const today = new Date("2026-05-21");
    const runs = [
      mkRun({ id: "1", dateISO: "2026-05-15", distM: 15000, secs: 4500, hrAvg: 155, decoupling: 4.5 }),
      mkRun({ id: "2", dateISO: "2026-05-10", distM: 20000, secs: 6300, hrAvg: 158, decoupling: 6.0 }),
    ];
    const m = buildFcPerformanceModel({
      scopeActivities: runs,
      vdotProfile: { hasData: true, vdot: 54 },
      referenceDate: today,
      settings: {},
    });
    expect(m.kpi.decoupling.value).toBeCloseTo(5.25, 1);
    expect(m.kpi.decoupling.sampleSize).toBe(2);
  });

  it("Sortie stable picks la plus recente avec decoupling", () => {
    const today = new Date("2026-05-21");
    const runs = [
      mkRun({ id: "old", dateISO: "2026-03-01", distM: 15000, secs: 4500, hrAvg: 150, decoupling: 4.0 }),
      mkRun({ id: "recent", dateISO: "2026-05-15", distM: 15000, secs: 4500, hrAvg: 155, decoupling: 5.5 }),
    ];
    const m = buildFcPerformanceModel({
      scopeActivities: runs,
      vdotProfile: { hasData: true, vdot: 54 },
      referenceDate: today,
      settings: {},
    });
    expect(m.stableSample).not.toBeNull();
    expect(m.stableSample.activityId).toMatch(/recent/);
  });

  it("Lecture effort coach commente decoupling < 5 % positivement", () => {
    const today = new Date("2026-05-21");
    const runs = [
      mkRun({ id: "1", dateISO: "2026-05-15", distM: 15000, secs: 4500, hrAvg: 150, decoupling: 3.5 }),
    ];
    const m = buildFcPerformanceModel({
      scopeActivities: runs,
      vdotProfile: { hasData: true, vdot: 54 },
      referenceDate: today,
      settings: { heartRateMax: 192 },
    });
    expect(m.readingParagraphs.some((p) => /excellent/i.test(p) || /3,5/i.test(p))).toBe(true);
  });

  it("FC repos affichee si dans settings", () => {
    const today = new Date("2026-05-21");
    const runs = [
      mkRun({ id: "1", dateISO: "2026-05-15", distM: 5000, secs: 1200, hrAvg: 170 }),
    ];
    const m = buildFcPerformanceModel({
      scopeActivities: runs,
      vdotProfile: { hasData: true, vdot: 54 },
      referenceDate: today,
      settings: { heartRateMax: 192, restingHeartrate: 48 },
    });
    expect(m.fcRepos).not.toBeNull();
    expect(m.fcRepos.value).toBe(48);
  });
});
