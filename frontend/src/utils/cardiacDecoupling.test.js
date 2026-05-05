import { describe, expect, it } from "vitest";
import { calculateCardiacDecoupling } from "./cardiacDecoupling.js";

function makeSplit(distance, speed, hr) {
  return { distance, averageSpeed: speed, averageHeartrate: hr };
}

describe("calculateCardiacDecoupling", () => {
  it("retourne hasData=false sur tableau vide", () => {
    const result = calculateCardiacDecoupling([]);
    expect(result.hasData).toBe(false);
    expect(result.decouplingPercent).toBeNull();
  });

  it("retourne hasData=false avec moins de 2 splits valides", () => {
    const result = calculateCardiacDecoupling([makeSplit(1000, 3, 150)]);
    expect(result.hasData).toBe(false);
  });

  it("ignore les splits trop courts (< 500m)", () => {
    const splits = [
      makeSplit(300, 3, 150),
      makeSplit(400, 3, 150),
      makeSplit(200, 3, 150),
    ];
    expect(calculateCardiacDecoupling(splits).hasData).toBe(false);
  });

  it("ignore les splits avec FC ou speed = 0", () => {
    const splits = [
      makeSplit(1000, 3, 0),
      makeSplit(1000, 0, 150),
      makeSplit(1000, 3, 150),
    ];
    expect(calculateCardiacDecoupling(splits).hasData).toBe(false); // 1 valide seulement
  });

  it("calcule un decoupling positif (derive cardiaque)", () => {
    // 1ère moitié : 3 m/s @ 150 bpm → EF=0.020
    // 2nde moitié : 3 m/s @ 165 bpm → EF=0.0182 → derive ~ 9 %
    const splits = [
      makeSplit(1000, 3, 148),
      makeSplit(1000, 3, 152),
      makeSplit(1000, 3, 162),
      makeSplit(1000, 3, 168),
    ];
    const result = calculateCardiacDecoupling(splits);
    expect(result.hasData).toBe(true);
    expect(result.decouplingPercent).toBeGreaterThan(5);
    expect(result.decouplingPercent).toBeLessThan(15);
  });

  it("calcule un decoupling proche de 0 sur sortie stable", () => {
    const splits = [
      makeSplit(1000, 3, 150),
      makeSplit(1000, 3, 150),
      makeSplit(1000, 3, 150),
      makeSplit(1000, 3, 150),
    ];
    const result = calculateCardiacDecoupling(splits);
    expect(result.hasData).toBe(true);
    expect(Math.abs(result.decouplingPercent)).toBeLessThan(1);
  });

  it("decoupling negatif si FC baisse en 2nde moitie (echauffement)", () => {
    // FC haute en 1ère moitié (chaud), basse en 2nde
    const splits = [
      makeSplit(1000, 3, 165),
      makeSplit(1000, 3, 162),
      makeSplit(1000, 3, 152),
      makeSplit(1000, 3, 148),
    ];
    const result = calculateCardiacDecoupling(splits);
    expect(result.decouplingPercent).toBeLessThan(0);
  });

  it("ponderation par distance", () => {
    // 2 km à 3 m/s puis 1 km à 4 m/s → 1ère moitié dominée par les 2 km
    const splits = [
      makeSplit(2000, 3, 150),
      makeSplit(1000, 4, 150),
      makeSplit(1000, 3, 155),
      makeSplit(1000, 3, 155),
    ];
    const result = calculateCardiacDecoupling(splits);
    expect(result.hasData).toBe(true);
    expect(result.sampleSize).toBe(4);
  });
});
