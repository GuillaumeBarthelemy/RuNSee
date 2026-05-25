import { describe, it, expect } from "vitest";
import { buildRecordsModel } from "./performanceRecordsModel.js";

function mkAct({ id, dateISO, distM, secs, sport = "Run", name = "Run", elev = 0, prRank = 1 }) {
  const bestEfforts = [];
  // Generer un best effort automatique pour les distances cibles route
  const TARGETS = { 5000: "5k", 10000: "10k", 21097.5: "halfMarathon", 42195: "marathon" };
  if (TARGETS[distM]) {
    bestEfforts.push({ name: TARGETS[distM], distance: distM, elapsed_time: secs, elapsedTime: secs, pr_rank: prRank });
  }
  return {
    id,
    stravaActivityId: `s-${id}`,
    sportType: sport,
    type: sport,
    name,
    startDate: dateISO,
    startDateLocal: dateISO,
    distance: distM,
    movingTime: secs,
    elapsedTime: secs,
    elevationGain: elev,
    totalElevationGain: elev,
    rawJson: JSON.stringify({ best_efforts: bestEfforts }),
    prCount: 1,
    achievementCount: 1,
    __distanceKm: distM / 1000,
    __movingSeconds: secs,
    __date: new Date(dateISO),
    __paceSecondsPerKm: secs / (distM / 1000),
    __elevationGain: elev,
  };
}

describe("buildRecordsModel", () => {
  it("retourne hasData=false sans activites", () => {
    const m = buildRecordsModel({ scopeActivities: [] });
    expect(m.hasData).toBe(false);
  });

  it("construit records route 5k/10k", () => {
    const acts = [
      mkAct({ id: "1", dateISO: "2026-05-10", distM: 5000, secs: 1140 }),  // 19:00 5k
      mkAct({ id: "2", dateISO: "2026-05-08", distM: 5000, secs: 1170 }),  // 19:30 5k (precedent)
      mkAct({ id: "3", dateISO: "2026-05-15", distM: 10000, secs: 2321 }), // 38:41 10k
    ];
    const m = buildRecordsModel({ scopeActivities: acts });
    expect(m.hasData).toBe(true);
    expect(m.bestTimes.route).toHaveLength(2);
    const r5k = m.bestTimes.route.find((r) => r.key === "5k");
    expect(r5k.formattedValue).toBe("19:00");
    expect(r5k.previousElapsedSeconds).toBe(1170);
  });

  it("separe records trail des records route", () => {
    const acts = [
      mkAct({ id: "1", dateISO: "2026-05-10", distM: 10000, secs: 2321, sport: "Run", name: "Course route" }),
      mkAct({ id: "2", dateISO: "2026-05-15", distM: 11000, secs: 4500, sport: "TrailRun", name: "Trail matin", elev: 600 }),
      mkAct({ id: "3", dateISO: "2026-04-15", distM: 11500, secs: 4800, sport: "TrailRun", name: "Trail soir", elev: 700 }),
    ];
    const m = buildRecordsModel({ scopeActivities: acts });
    expect(m.bestTimes.route.length).toBeGreaterThan(0);
    expect(m.bestTimes.trail.length).toBeGreaterThan(0);
    const trail10k = m.bestTimes.trail.find((r) => r.key === "trail10k");
    expect(trail10k).toBeDefined();
  });

  it("genere record D+ max pour trail", () => {
    const acts = [
      mkAct({ id: "1", dateISO: "2026-05-15", distM: 15000, secs: 5400, sport: "TrailRun", name: "Trail", elev: 1200 }),
      mkAct({ id: "2", dateISO: "2026-04-15", distM: 12000, secs: 4500, sport: "TrailRun", name: "Trail", elev: 800 }),
    ];
    const m = buildRecordsModel({ scopeActivities: acts });
    const elev = m.bestTimes.trail.find((r) => r.key === "elevationMax");
    expect(elev).toBeDefined();
    expect(elev.value).toBe(1200);
    expect(elev.formattedValue).toBe("1200 m");
  });

  it("progression : calcule delta vs record precedent", () => {
    const acts = [
      mkAct({ id: "1", dateISO: "2026-05-10", distM: 5000, secs: 1140 }),
      mkAct({ id: "2", dateISO: "2026-05-08", distM: 5000, secs: 1200 }), // -60s ameliore
    ];
    const m = buildRecordsModel({ scopeActivities: acts });
    expect(m.progression).toHaveLength(1);
    expect(m.progression[0].evolutionSeconds).toBe(-60);
    expect(m.progression[0].tone).toBe("positive");
    expect(m.progression[0].formattedEvolution).toBe("-1:00");
  });

  it("historique : trie par date desc", () => {
    const acts = [
      mkAct({ id: "1", dateISO: "2026-05-10", distM: 5000, secs: 1140 }),
      mkAct({ id: "2", dateISO: "2026-05-08", distM: 5000, secs: 1200 }),
      mkAct({ id: "3", dateISO: "2026-04-15", distM: 10000, secs: 2321 }),
      mkAct({ id: "4", dateISO: "2026-04-01", distM: 10000, secs: 2400 }),
    ];
    const m = buildRecordsModel({ scopeActivities: acts });
    expect(m.history.length).toBeGreaterThanOrEqual(2);
    // Le plus recent en premier
    expect(m.history[0].date).toBe("2026-05-10");
  });

  it("conseil contient stat de records ameliores", () => {
    const acts = [
      mkAct({ id: "1", dateISO: "2026-05-10", distM: 5000, secs: 1140 }),
    ];
    const m = buildRecordsModel({ scopeActivities: acts });
    expect(m.coachAdvice).toBeDefined();
    expect(m.coachAdvice.length).toBeGreaterThan(20);
  });
});
