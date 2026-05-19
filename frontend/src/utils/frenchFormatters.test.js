import { describe, it, expect } from "vitest";
import {
  formatDecimalFr,
  formatIntegerFr,
  formatPercentFr,
  formatPaceFr,
  formatDurationMmSsFr,
  formatDurationHmFr,
  formatSignedDecimalFr,
  formatDateRangeFr,
} from "./frenchFormatters.js";

const NBSP = String.fromCharCode(160);

describe("frenchFormatters", () => {
  it("formatDecimalFr utilise la virgule francaise", () => {
    expect(formatDecimalFr(1.08, 2)).toBe("1,08");
    expect(formatDecimalFr(56.4, 1)).toBe("56,4");
    expect(formatDecimalFr(0, 2)).toBe("0,00");
  });

  it("formatDecimalFr retourne em-dash si invalide", () => {
    expect(formatDecimalFr(null)).toBe("—");
    expect(formatDecimalFr(undefined)).toBe("—");
    expect(formatDecimalFr(NaN)).toBe("—");
  });

  it("formatIntegerFr groupe avec espace francaise", () => {
    const result = formatIntegerFr(1234567);
    // Le format peut utiliser espace simple ou insecable selon Node version
    expect(result.replace(/\s/g, "")).toBe("1234567");
  });

  it("formatPercentFr ajoute espace insecable avant %", () => {
    expect(formatPercentFr(74, 0)).toBe(`74${NBSP}%`);
    expect(formatPercentFr(74.5, 1)).toBe(`74,5${NBSP}%`);
  });

  it("formatPaceFr sans zero-padding initial avec espace avant /km", () => {
    // 5:12/km = 312 sec/km
    expect(formatPaceFr(312)).toBe(`5:12${NBSP}/km`);
    // 4:35/km = 275 sec/km
    expect(formatPaceFr(275)).toBe(`4:35${NBSP}/km`);
  });

  it("formatPaceFr gere les valeurs nulles", () => {
    expect(formatPaceFr(0)).toBe("—");
    expect(formatPaceFr(null)).toBe("—");
  });

  it("formatDurationMmSsFr toujours MM:SS avec zero-padding", () => {
    expect(formatDurationMmSsFr(1680)).toBe("28:00");
    expect(formatDurationMmSsFr(3370)).toBe("56:10");
    expect(formatDurationMmSsFr(280)).toBe("04:40");
    expect(formatDurationMmSsFr(150)).toBe("02:30");
  });

  it("formatDurationHmFr format Hh MM pour > 1h", () => {
    expect(formatDurationHmFr(1.833)).toBe(`1h${NBSP}50`); // 1h 50
    expect(formatDurationHmFr(9.8)).toBe(`9h${NBSP}48`); // 9h 48
  });

  it("formatDurationHmFr format M min pour < 1h", () => {
    expect(formatDurationHmFr(0.5)).toBe(`30${NBSP}min`);
  });

  it("formatSignedDecimalFr ajoute signe + ou -", () => {
    expect(formatSignedDecimalFr(1.2, 1)).toBe("+1,2");
    expect(formatSignedDecimalFr(-0.5, 1)).toBe("-0,5");
    expect(formatSignedDecimalFr(0, 1)).toBe("0,0");
  });

  it("formatDateRangeFr regroupe si meme mois", () => {
    const s = new Date(2025, 3, 30); // 30 avr
    const e = new Date(2025, 4, 4);  // 4 mai
    const result = formatDateRangeFr(s, e);
    expect(result).toMatch(/30 avr/);
    expect(result).toMatch(/4 mai/);
  });
});
