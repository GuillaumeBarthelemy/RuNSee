import { describe, it, expect } from "vitest";
import { buildSessionPolarisation, countQualitySessions } from "./sessionPolarisation.js";

const REF = new Date("2026-05-28");

function act(date, type) {
  return { startDate: date, userSessionType: type };
}

describe("buildSessionPolarisation", () => {
  it("hasData=false si aucune seance classifiee", () => {
    const r = buildSessionPolarisation([act("2026-05-27", null)], { referenceDate: REF });
    expect(r.hasData).toBe(false);
  });

  it("repartit low/mid/high (modele 80/20)", () => {
    const acts = [
      ...Array.from({ length: 8 }, (_, i) => act(`2026-05-2${i % 8}`, "endurance_fond")),
      act("2026-05-20", "tempo"),
      act("2026-05-19", "vma_courte"),
    ];
    const r = buildSessionPolarisation(acts, { referenceDate: REF });
    expect(r.hasData).toBe(true);
    expect(r.total).toBe(10);
    expect(r.easyPct).toBe(80);
    expect(r.buckets.find((b) => b.key === "low").count).toBe(8);
    expect(r.buckets.find((b) => b.key === "mid").count).toBe(1);
    expect(r.buckets.find((b) => b.key === "high").count).toBe(1);
    expect(r.byType[0].key).toBe("endurance_fond");
  });

  it("exclut les seances hors fenetre", () => {
    const acts = [
      act("2026-05-27", "endurance_fond"),       // dans fenetre
      act("2026-01-01", "vma_courte"),           // > 12 sem avant
    ];
    const r = buildSessionPolarisation(acts, { weeks: 12, referenceDate: REF });
    expect(r.total).toBe(1);
  });
});

describe("countQualitySessions", () => {
  it("null si aucune classification", () => {
    expect(countQualitySessions([act("2026-05-27", null)], { referenceDate: REF })).toBeNull();
  });

  it("compte les types qualite (vma/seuil/tempo/cote/fartlek/competition)", () => {
    const acts = [
      act("2026-05-27", "endurance_fond"), // non qualite
      act("2026-05-26", "vma_courte"),     // qualite
      act("2026-05-25", "seuil"),          // qualite
      act("2026-05-24", "recuperation"),   // non qualite
    ];
    const r = countQualitySessions(acts, { referenceDate: REF });
    expect(r.count).toBe(2);
    expect(r.total).toBe(4);
    expect(r.sharePct).toBe(50);
  });
});
