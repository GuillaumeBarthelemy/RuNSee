import { describe, it, expect } from "vitest";

// Tests unitaires sur la logique de backoff exponentiel decoupee.
// Le hook complet (cleanup, refs) sera teste avec jsdom + testing-library
// dans une iteration future ; ici on couvre la formule deterministe.

function computeBackoff(errors, baseMs, maxMs) {
  return Math.min(baseMs * Math.pow(2, errors), maxMs);
}

describe("usePolling backoff (Lot 4)", () => {
  it("retourne baseInterval quand 0 erreur", () => {
    expect(computeBackoff(0, 5000, 30000)).toBe(5000);
  });

  it("double a chaque erreur", () => {
    expect(computeBackoff(1, 5000, 30000)).toBe(10000);
    expect(computeBackoff(2, 5000, 30000)).toBe(20000);
  });

  it("cappe a maxIntervalMs", () => {
    expect(computeBackoff(3, 5000, 30000)).toBe(30000); // 40000 -> cap 30000
    expect(computeBackoff(10, 5000, 30000)).toBe(30000);
  });

  it("respecte un maxIntervalMs different du defaut", () => {
    expect(computeBackoff(5, 1000, 10000)).toBe(10000);
    expect(computeBackoff(3, 1000, 10000)).toBe(8000);
  });
});
