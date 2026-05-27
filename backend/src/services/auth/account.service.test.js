/* eslint-env node */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validatePassword } from "./user-auth.service.js";

// Tests unitaires `validatePassword` — couvre la politique durcie Lot 1 :
//   - longueur min 10
//   - max 256
//   - 3 categories sur 4 (upper, lower, digit, special)
//   - blacklist top mots de passe

describe("validatePassword (Lot 1 password policy)", () => {
  it("rejette si moins de 10 caracteres", () => {
    assert.throws(() => validatePassword("Ab1!ab1"), /Password too short/);
    assert.throws(() => validatePassword("Ab1!Ab1A"), /Password too short/);
  });

  it("rejette si plus de 256 caracteres", () => {
    const huge = "A1!".repeat(100) + "abcdefghij"; // > 256
    assert.throws(() => validatePassword(huge), /Password too long/);
  });

  it("rejette si moins de 3 categories", () => {
    // 2 categories : minuscule + chiffre seulement
    assert.throws(() => validatePassword("abcdefghij0123"), /not complex enough/);
    // 2 categories : minuscule + majuscule
    assert.throws(() => validatePassword("AbcdefghIJKL"), /not complex enough/);
  });

  it("accepte 3 categories sur 4 (sans special)", () => {
    const value = validatePassword("MotDePasse2026");
    assert.equal(value, "MotDePasse2026");
  });

  it("accepte les 4 categories", () => {
    const value = validatePassword("M0nSuperPwd!");
    assert.equal(value, "M0nSuperPwd!");
  });

  it("rejette les mots de passe trop courants", () => {
    // La blacklist matche exactement (lowercase). Entrees suffisamment
    // longues pour passer la verif de longueur (>= 10) ET de complexite
    // (3 categories) puis tomber sur le blacklist.
    assert.throws(() => validatePassword("Password123"), /too common/i);
    assert.throws(() => validatePassword("Password1"), /too short/i); // 9 chars
  });

  it("blacklist insensible a la casse", () => {
    // 'Password123' lowercased = 'password123' qui est dans la blacklist.
    // Doit passer la verif de complexite (Upper+lower+digit = 3 categories)
    // avant d'arriver au blacklist.
    assert.throws(() => validatePassword("Password123"), /too common/i);
  });

  it("rejette les entrees vides ou null", () => {
    assert.throws(() => validatePassword(""), /too short/);
    assert.throws(() => validatePassword(null), /too short/);
    assert.throws(() => validatePassword(undefined), /too short/);
  });
});
