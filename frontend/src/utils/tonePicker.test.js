import { describe, expect, it } from "vitest";
import {
  clampTone,
  decouplingTone,
  energyLevelTone,
  freshnessTone,
  load7dTone,
  pickTone,
  readinessTone,
  restingHrDeltaTone,
  sleepScoreTone,
  stressTone,
  toneCssBgVar,
  toneCssVar,
  vfcDeltaTone,
} from "./tonePicker.js";

describe("clampTone", () => {
  it("retourne la valeur si dans [1,5]", () => {
    expect(clampTone(1)).toBe(1);
    expect(clampTone(3)).toBe(3);
    expect(clampTone(5)).toBe(5);
  });

  it("clamp les valeurs hors bornes", () => {
    expect(clampTone(0)).toBe(1);
    expect(clampTone(-1)).toBe(1);
    expect(clampTone(6)).toBe(5);
    expect(clampTone(100)).toBe(5);
  });

  it("arrondit les decimales", () => {
    expect(clampTone(2.4)).toBe(2);
    expect(clampTone(2.6)).toBe(3);
  });

  it("retourne 3 (neutre) pour les valeurs invalides", () => {
    expect(clampTone(null)).toBe(3);
    expect(clampTone(undefined)).toBe(3);
    expect(clampTone(NaN)).toBe(3);
  });
});

describe("pickTone", () => {
  const thresholds = [
    { from: 0, to: 50, tone: 5 },
    { from: 50, to: 70, tone: 4 },
    { from: 70, to: 85, tone: 2 },
    { from: 85, to: 101, tone: 1 },
  ];

  it("retourne le tone de la zone qui contient la valeur", () => {
    expect(pickTone(20, thresholds)).toBe(5);
    expect(pickTone(60, thresholds)).toBe(4);
    expect(pickTone(75, thresholds)).toBe(2);
    expect(pickTone(95, thresholds)).toBe(1);
  });

  it("retourne le fallback si aucune zone ne matche", () => {
    expect(pickTone(200, thresholds, 3)).toBe(3);
  });

  it("retourne le fallback pour null/undefined", () => {
    expect(pickTone(null, thresholds)).toBe(3);
    expect(pickTone(undefined, thresholds)).toBe(3);
  });

  it("gere les zones avec from/to infinis", () => {
    const open = [
      { from: -Infinity, to: 0, tone: 5 },
      { from: 100, to: Infinity, tone: 1 },
    ];
    expect(pickTone(-50, open)).toBe(5);
    expect(pickTone(500, open)).toBe(1);
  });
});

describe("sleepScoreTone", () => {
  it("classe correctement les seuils sommeil", () => {
    expect(sleepScoreTone(40)).toBe(5);  // alerte
    expect(sleepScoreTone(60)).toBe(4);  // vigilance
    expect(sleepScoreTone(80)).toBe(2);  // bon
    expect(sleepScoreTone(95)).toBe(1);  // très bon
  });
});

describe("vfcDeltaTone", () => {
  it("delta tres negatif = alerte", () => {
    expect(vfcDeltaTone(-15)).toBe(5);
  });

  it("delta legerement negatif = vigilance", () => {
    expect(vfcDeltaTone(-5)).toBe(4);
  });

  it("delta autour de 0 = neutre", () => {
    expect(vfcDeltaTone(0)).toBe(3);
    expect(vfcDeltaTone(2)).toBe(3);
  });

  it("delta positif = bon ou tres bon", () => {
    expect(vfcDeltaTone(7)).toBe(2);
    expect(vfcDeltaTone(15)).toBe(1);
  });
});

describe("restingHrDeltaTone (en pourcentage, lower-is-better)", () => {
  it("hausse forte FC repos = alerte", () => {
    expect(restingHrDeltaTone(8)).toBe(5);
  });

  it("hausse legere FC repos = vigilance", () => {
    expect(restingHrDeltaTone(4)).toBe(4);
  });

  it("variation faible = neutre (zone normale)", () => {
    expect(restingHrDeltaTone(0)).toBe(3);
    expect(restingHrDeltaTone(-1)).toBe(3);
    expect(restingHrDeltaTone(2)).toBe(3);
  });

  it("baisse moderee FC repos = bon", () => {
    expect(restingHrDeltaTone(-4)).toBe(2);
  });

  it("baisse forte FC repos = tres bon (base aerobie qui se renforce)", () => {
    expect(restingHrDeltaTone(-8)).toBe(1);
  });
});

describe("readinessTone", () => {
  it("classe correctement", () => {
    expect(readinessTone(20)).toBe(5);
    expect(readinessTone(40)).toBe(4);
    expect(readinessTone(60)).toBe(3);
    expect(readinessTone(85)).toBe(1);
  });
});

describe("freshnessTone (TSB)", () => {
  it("surcharge = alerte", () => {
    expect(freshnessTone(-40)).toBe(5);
  });

  it("zone optimale +5 a +25 = tres bon", () => {
    expect(freshnessTone(15)).toBe(1);
  });

  it("desentrainement > +25 = vigilance", () => {
    expect(freshnessTone(35)).toBe(4);
  });
});

describe("load7dTone", () => {
  it("bloc leger = neutre", () => {
    expect(load7dTone(150)).toBe(3);
  });

  it("bloc tres charge = alerte", () => {
    expect(load7dTone(700)).toBe(5);
  });
});

describe("stressTone (lower-is-better)", () => {
  it("stress bas = tres bon", () => {
    expect(stressTone(15)).toBe(1);
  });

  it("stress haut = alerte", () => {
    expect(stressTone(85)).toBe(5);
  });
});

describe("decouplingTone", () => {
  it("derive < 2% = tres bon", () => {
    expect(decouplingTone(1)).toBe(1);
  });

  it("derive > 8% = alerte", () => {
    expect(decouplingTone(10)).toBe(5);
  });
});

describe("energyLevelTone", () => {
  it("energie basse = alerte", () => {
    expect(energyLevelTone(20)).toBe(5);
  });

  it("energie haute = tres bon", () => {
    expect(energyLevelTone(85)).toBe(1);
  });
});

describe("toneCssVar / toneCssBgVar", () => {
  it("retourne la variable CSS appropriee", () => {
    expect(toneCssVar(1)).toBe("var(--tone-1)");
    expect(toneCssVar(5)).toBe("var(--tone-5)");
    expect(toneCssBgVar(3)).toBe("var(--tone-3-bg)");
  });

  it("clamp les tones hors bornes", () => {
    expect(toneCssVar(0)).toBe("var(--tone-1)");
    expect(toneCssVar(99)).toBe("var(--tone-5)");
  });
});
