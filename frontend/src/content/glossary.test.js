import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findGlossaryEntry, GLOSSARY_CATEGORIES, GLOSSARY_ENTRIES } from "./glossary.js";

const SRC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Scan recursif des sources (jsx/js hors tests/node_modules) pour extraire
// toutes les cles glossaire referencees : `glossaryKey="x"`, `termKey="x"`
// (props JSX) et `glossaryKey: "x"` (objets de config tooltip).
function collectSourceFiles(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const fullPath = join(dir, name);
    if (statSync(fullPath).isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (!/\.(jsx?|tsx?)$/.test(name)) continue;
    if (/\.test\.(jsx?|tsx?)$/.test(name)) continue;
    files.push(fullPath);
  }
  return files;
}

function collectReferencedGlossaryKeys() {
  const pattern = /(?:termKey|glossaryKey)\s*[=:]\s*"([A-Za-z0-9_-]+)"/g;
  const refs = new Map(); // key -> Set(fichiers)
  for (const file of collectSourceFiles(SRC_DIR)) {
    const content = readFileSync(file, "utf8");
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const key = match[1];
      if (!refs.has(key)) refs.set(key, new Set());
      refs.get(key).add(file.replace(SRC_DIR, "src"));
    }
  }
  return refs;
}

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

  it("toute cle glossaire referencee dans le code pointe vers une ancre reelle", () => {
    const keys = new Set(GLOSSARY_ENTRIES.map((entry) => entry.key));
    const referenced = collectReferencedGlossaryKeys();
    const broken = [];
    for (const [key, files] of referenced) {
      // L'ancre /glossaire#key cible entry.key : on verifie la cle exacte.
      if (!keys.has(key)) {
        broken.push(`${key} (refs: ${[...files].join(", ")})`);
      }
    }
    expect(broken, `Liens glossaire morts:\n${broken.join("\n")}`).toEqual([]);
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
