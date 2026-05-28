import { describe, it, expect } from "vitest";
import { resolveActivitySessionTag } from "./activitySessionTag.js";

describe("resolveActivitySessionTag (Lot B)", () => {
  it("priorise la classification user confirmee sur le label auto", () => {
    const tag = resolveActivitySessionTag({
      userSessionType: "tempo",
      userClassifiedAt: "2026-05-28T10:00:00Z",
      estimatedSessionLabel: "Endurance",
    });
    expect(tag.source).toBe("user");
    expect(tag.label).toContain("Tempo");
    expect(tag.isAuto).toBe(false);
    expect(tag.tone).toBe("warning"); // tempo = warning
  });

  it("ajoute le suffixe ·auto si non confirmee", () => {
    const tag = resolveActivitySessionTag({
      userSessionType: "endurance_fond",
      userClassifiedAt: null,
    });
    expect(tag.source).toBe("user");
    expect(tag.isAuto).toBe(true);
    expect(tag.label).toContain("·auto");
    expect(tag.tone).toBe("positive"); // endurance = success -> positive
  });

  it("retombe sur le label auto-estime si pas de classification", () => {
    const tag = resolveActivitySessionTag({
      estimatedSessionLabel: "Seuil",
      sessionTypeTone: "warning",
    });
    expect(tag.source).toBe("auto");
    expect(tag.label).toBe("Seuil");
    expect(tag.tone).toBe("warning");
    expect(tag.isAuto).toBe(true);
  });

  it("retourne null si aucune info", () => {
    expect(resolveActivitySessionTag({})).toBeNull();
    expect(resolveActivitySessionTag()).toBeNull();
  });

  it("type inconnu -> retombe sur auto puis null", () => {
    expect(resolveActivitySessionTag({ userSessionType: "inexistant" })).toBeNull();
    const tag = resolveActivitySessionTag({ userSessionType: "inexistant", estimatedSessionLabel: "X" });
    expect(tag.source).toBe("auto");
  });
});
