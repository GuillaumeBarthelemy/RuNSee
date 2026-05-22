import { describe, it, expect } from "vitest";
import { buildAlluresReferenceModel } from "./performanceAlluresReferenceModel.js";
import { DANIELS_PACE_INTENSITIES } from "./runningPerformance.js";

// VDOT 54 typique d'un coureur 10k 39:00. Helper fake profile.
function fakeVdotProfile(vdot = 54) {
  // Reuse Daniels paces builder via buildVdotProfile would need records.
  // On simule directement la structure attendue.
  const paces = DANIELS_PACE_INTENSITIES.map((entry) => ({
    ...entry,
    // pace formula : seconds/km decreases with intensity. Pour VDOT 54, on hardcode
    // des valeurs realistes pour le test.
    paceSecondsPerKm: {
      E: 355, // ~5:55/km
      M: 273, // ~4:33/km
      T: 244, // ~4:04/km
      I: 226, // ~3:46/km (≈ VMA)
      R: 210, // ~3:30/km
    }[entry.key] || 0,
  }));

  const racePredictions = [
    { key: "5k", label: "5 km", distanceMeters: 5000, predictedSeconds: 1058, paceSecondsPerKm: 211 }, // 17:38
    { key: "10k", label: "10 km", distanceMeters: 10000, predictedSeconds: 2225, paceSecondsPerKm: 222 }, // 37:05
    { key: "halfMarathon", label: "Semi-marathon", distanceMeters: 21097.5, predictedSeconds: 4920, paceSecondsPerKm: 233 },
    { key: "marathon", label: "Marathon", distanceMeters: 42195, predictedSeconds: 10260, paceSecondsPerKm: 243 },
  ];

  return {
    hasData: true,
    vdot,
    paces,
    racePredictions,
  };
}

describe("buildAlluresReferenceModel", () => {
  it("retourne hasData=false si vdotProfile manquant ou vide", () => {
    expect(buildAlluresReferenceModel({ vdotProfile: null }).hasData).toBe(false);
    expect(buildAlluresReferenceModel({ vdotProfile: { hasData: false } }).hasData).toBe(false);
  });

  it("construit 7 paceCards avec Daniels + race predictions", () => {
    const model = buildAlluresReferenceModel({ vdotProfile: fakeVdotProfile(54) });
    expect(model.hasData).toBe(true);
    expect(model.paceCards).toHaveLength(7);
    const keys = model.paceCards.map((c) => c.key);
    expect(keys).toEqual(["facile", "endurance", "marathon", "seuil", "10k", "5k", "1k"]);
  });

  it("Allure facile = Daniels E pace", () => {
    const model = buildAlluresReferenceModel({ vdotProfile: fakeVdotProfile(54) });
    const facile = model.paceCards.find((c) => c.key === "facile");
    expect(facile.paceSecondsPerKm).toBe(355);
    expect(facile.formattedPace).toBe("5:55");
  });

  it("Seuil = Daniels T pace", () => {
    const model = buildAlluresReferenceModel({ vdotProfile: fakeVdotProfile(54) });
    const seuil = model.paceCards.find((c) => c.key === "seuil");
    expect(seuil.paceSecondsPerKm).toBe(244);
    expect(seuil.formattedPace).toBe("4:04");
  });

  it("1 km = Daniels I pace (intervalles courts)", () => {
    const model = buildAlluresReferenceModel({ vdotProfile: fakeVdotProfile(54) });
    const oneK = model.paceCards.find((c) => c.key === "1k");
    expect(oneK.paceSecondsPerKm).toBe(226);
    expect(oneK.zone).toBe("Zone Z5");
  });

  it("Delta VMA negatif pour allures rapides (1k, 5k)", () => {
    const model = buildAlluresReferenceModel({ vdotProfile: fakeVdotProfile(54) });
    const oneK = model.paceCards.find((c) => c.key === "1k");
    // 1k pace (226) = VMA (226) -> delta 0 ou tres proche
    expect(Math.abs(oneK.vmaDeltaSeconds)).toBeLessThan(2);
    const cinqK = model.paceCards.find((c) => c.key === "5k");
    // 5k pace (211) < VMA (226) -> delta negatif (plus rapide que VMA)
    expect(cinqK.vmaDeltaSeconds).toBeLessThan(0);
  });

  it("comparisonRows : ecart vs allure facile (negative pour rapide)", () => {
    const model = buildAlluresReferenceModel({ vdotProfile: fakeVdotProfile(54) });
    expect(model.comparisonRows).toHaveLength(7);
    const facile = model.comparisonRows.find((r) => r.key === "facile");
    expect(facile.deltaSeconds).toBe(0);
    const seuil = model.comparisonRows.find((r) => r.key === "seuil");
    expect(seuil.deltaSeconds).toBe(244 - 355); // -111s
    expect(seuil.formattedDelta).toMatch(/^-/);
  });

  it("equivalences : 5 lignes 1k/5k/10k/Semi/Marathon avec plages", () => {
    const model = buildAlluresReferenceModel({ vdotProfile: fakeVdotProfile(54) });
    expect(model.equivalences).toHaveLength(5);
    const fiveK = model.equivalences.find((r) => r.key === "5k");
    expect(fiveK.formattedDistance).toBe("5,00 km");
    expect(fiveK.formattedPaceRange).toMatch(/^\d+:\d{2} - \d+:\d{2}$/);
  });

  it("zones : 5 zones Daniels Z1-Z5 avec couleurs", () => {
    const model = buildAlluresReferenceModel({ vdotProfile: fakeVdotProfile(54) });
    expect(model.zones).toHaveLength(5);
    const zoneKeys = model.zones.map((z) => z.key);
    expect(zoneKeys).toEqual(["z1", "z2", "z3", "z4", "z5"]);
    expect(model.zones.find((z) => z.key === "z1").formattedRange).toMatch(/^≤ /);
  });

  it("usageTips : 4 conseils coach", () => {
    const model = buildAlluresReferenceModel({ vdotProfile: fakeVdotProfile(54) });
    expect(model.usageTips).toHaveLength(4);
    expect(model.usageTips[0].title).toBe("Adapte selon le terrain");
  });

  it("warning : texte obligatoire spec section 9.5", () => {
    const model = buildAlluresReferenceModel({ vdotProfile: fakeVdotProfile(54) });
    expect(model.warning).toMatch(/^Ces allures sont des repères/);
  });

  it("thresholdEvolution : hasData=false si pas assez de snapshots", () => {
    const model = buildAlluresReferenceModel({
      vdotProfile: fakeVdotProfile(54),
      vdotHistory: { snapshots: [] },
    });
    expect(model.thresholdEvolution.hasData).toBe(false);
  });

  it("thresholdEvolution : hasData=true avec >=2 snapshots dans 30j", () => {
    const today = new Date("2026-05-21");
    const model = buildAlluresReferenceModel({
      vdotProfile: fakeVdotProfile(54),
      vdotHistory: {
        snapshots: [
          { date: "2026-05-01", vdotValue: 53.5 },
          { date: "2026-05-10", vdotValue: 54.0 },
          { date: "2026-05-20", vdotValue: 54.5 },
        ],
      },
      referenceDate: today,
    });
    expect(model.thresholdEvolution.hasData).toBe(true);
    expect(model.thresholdEvolution.points.length).toBe(3);
    // VDOT en hausse -> T pace decrease -> tone positive
    expect(model.thresholdEvolution.summary.tone).toBe("positive");
  });
});
