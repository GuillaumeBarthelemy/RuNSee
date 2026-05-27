import { describe, it, expect } from "vitest";
import { buildQualityBars } from "./dataQuality.js";

describe("buildQualityBars (Lot 4)", () => {
  it("retourne {total:0, bars:[]} sur payload null", () => {
    const r = buildQualityBars(null);
    expect(r.total).toBe(0);
    expect(r.bars).toEqual([]);
  });

  it("retourne {total:0, bars:[]} sur payload invalide", () => {
    expect(buildQualityBars(undefined).bars).toEqual([]);
    expect(buildQualityBars("nope").bars).toEqual([]);
  });

  it("construit 4 barres quand toutes les metriques sont presentes", () => {
    const payload = {
      total: 20,
      complete: { count: 20, pct: 100 },
      fc: { count: 18, pct: 90 },
      power: { count: 5, pct: 25 },
      altimetry: { count: 19, pct: 95 },
    };
    const r = buildQualityBars(payload);
    expect(r.total).toBe(20);
    expect(r.bars).toHaveLength(4);
    expect(r.bars.map((b) => b.key)).toEqual(["complete", "fc", "power", "altimetry"]);
  });

  it("omet la barre Puissance quand power: null", () => {
    const payload = {
      total: 20,
      complete: { count: 20, pct: 100 },
      fc: { count: 20, pct: 100 },
      power: null,
      altimetry: { count: 19, pct: 95 },
    };
    const r = buildQualityBars(payload);
    expect(r.bars).toHaveLength(3);
    expect(r.bars.map((b) => b.key)).toEqual(["complete", "fc", "altimetry"]);
  });

  it("attribue une couleur selon le seuil", () => {
    const mk = (pct) => buildQualityBars({
      total: 100,
      complete: { count: pct, pct },
      fc: null, power: null, altimetry: null,
    }).bars[0].color;
    expect(mk(95)).toBe("#15803d"); // >= 90 vert fonce
    expect(mk(75)).toBe("#22c55e"); // >= 70 vert clair
    expect(mk(60)).toBe("#eab308"); // >= 50 ambre
    expect(mk(30)).toBe("#f97316"); // < 50 orange
  });
});
