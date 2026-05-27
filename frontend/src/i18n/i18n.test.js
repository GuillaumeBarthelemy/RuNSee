import { describe, it, expect, beforeEach } from "vitest";
import { t, getLocale, setLanguage } from "./i18n.js";

describe("i18n (Lot 7)", () => {
  beforeEach(() => {
    setLanguage("fr");
  });

  it("default locale = fr", () => {
    expect(getLocale()).toBe("fr");
  });

  it("resout une cle hierarchique", () => {
    expect(t("common.save")).toBe("Enregistrer");
    expect(t("auth.login")).toBe("Se connecter");
  });

  it("change de locale via setLanguage", () => {
    setLanguage("en");
    expect(t("common.save")).toBe("Save");
    expect(t("auth.login")).toBe("Sign in");
  });

  it("fallback sur cle manquante", () => {
    expect(t("does.not.exist", "Defaut")).toBe("Defaut");
  });

  it("retourne la cle si pas de fallback ni traduction", () => {
    expect(t("does.not.exist")).toBe("does.not.exist");
  });

  it("ignore une langue inconnue (fallback fr)", () => {
    setLanguage("xx");
    expect(getLocale()).toBe("fr");
    expect(t("common.save")).toBe("Enregistrer");
  });
});
