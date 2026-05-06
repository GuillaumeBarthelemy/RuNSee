import { describe, expect, it } from "vitest";
import { findGlossaryEntry, GLOSSARY_CATEGORIES, GLOSSARY_ENTRIES } from "./glossary.js";

describe("glossary entries", () => {
  it("a au moins 21 entrees", () => {
    expect(GLOSSARY_ENTRIES.length).toBeGreaterThanOrEqual(21);
  });

  it("chaque entree a une cle unique", () => {
    const keys = GLOSSARY_ENTRIES.map((e) => e.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it("chaque entree a un term, un short et une definition non vides", () => {
    for (const entry of GLOSSARY_ENTRIES) {
      expect(entry.term).toBeTruthy();
      expect(entry.short).toBeTruthy();
      expect(entry.definition).toBeTruthy();
    }
  });

  it("chaque entree a une categorie listee", () => {
    for (const entry of GLOSSARY_ENTRIES) {
      expect(GLOSSARY_CATEGORIES).toContain(entry.category);
    }
  });

  it("le short reste raisonnablement court (< 200 caracteres)", () => {
    for (const entry of GLOSSARY_ENTRIES) {
      expect(entry.short.length).toBeLessThanOrEqual(200);
    }
  });

  it("contient les entrees canoniques pour la recuperation et les signaux avances", () => {
    const keys = new Set(GLOSSARY_ENTRIES.map((entry) => entry.key));
    [
      "vfc",
      "energyLevel",
      "gap",
      "aerobicDecoupling",
      "epoc",
      "trainingReadinessRunsee",
    ].forEach((key) => expect(keys.has(key)).toBe(true));
  });
});

describe("findGlossaryEntry", () => {
  it("retourne null pour une cle vide", () => {
    expect(findGlossaryEntry("")).toBeNull();
    expect(findGlossaryEntry(null)).toBeNull();
    expect(findGlossaryEntry(undefined)).toBeNull();
  });

  it("retrouve une entree par sa cle", () => {
    const vfc = findGlossaryEntry("vfc");
    expect(vfc).not.toBeNull();
    expect(vfc.term).toBe("VFC");
  });

  it("retrouve une entree par son alias (HRV → VFC)", () => {
    const fromAlias = findGlossaryEntry("HRV");
    expect(fromAlias).not.toBeNull();
    expect(fromAlias.key).toBe("vfc");
  });

  it("retrouve Body Battery via alias vers Energie", () => {
    const fromAlias = findGlossaryEntry("Body Battery");
    expect(fromAlias).not.toBeNull();
    expect(fromAlias.key).toBe("energyLevel");
  });

  it("retrouve une entree par son terme exact", () => {
    const fromTerm = findGlossaryEntry("Score sommeil");
    expect(fromTerm).not.toBeNull();
    expect(fromTerm.key).toBe("sleepScore");
  });

  it("retrouve l'ancien libelle Aptitude RunSee via alias", () => {
    const fromAlias = findGlossaryEntry("Aptitude RunSee");
    expect(fromAlias).not.toBeNull();
    expect(fromAlias.key).toBe("trainingReadinessRunsee");
    expect(fromAlias.term).toBe("Aptitude RunNSee");
  });

  it("est insensible a la casse", () => {
    expect(findGlossaryEntry("VFC")?.key).toBe("vfc");
    expect(findGlossaryEntry("vfc")?.key).toBe("vfc");
    expect(findGlossaryEntry("Vfc")?.key).toBe("vfc");
  });

  it("retourne null pour une cle inconnue", () => {
    expect(findGlossaryEntry("inexistant")).toBeNull();
  });
});
