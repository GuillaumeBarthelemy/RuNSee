/**
 * polarizationIndex.js
 *
 * Indice de polarisation de l'entraînement (PI).
 *
 * Ref scientifique :
 *   Treff G, Winkert K, Sareban M, Steinacker JM, Sperlich B (2019).
 *   "The Polarization-Index: A Simple Calculation to Distinguish Polarized
 *    From Non-polarized Training Intensity Distributions",
 *   Front Physiol 10:707.
 *
 * Formule :
 *   PI = log10 ( (% Z1 × % Z3) / (% Z2)² )
 *
 * Interprétation :
 *   PI ≥ 2.0  : distribution **polarisée** (typique élite endurance)
 *   0 ≤ PI < 2: distribution **pyramidale** (typique amateur progressant)
 *   PI < 0    : distribution **threshold-dominant** (saturation Z2)
 *
 * Limites :
 *   - Si % Z2 = 0, PI tend vers +∞ → traité comme polarisation maximale
 *     mais affichée avec un repère "très polarisé".
 *   - Si % Z1 = 0 ou % Z3 = 0 → PI tend vers -∞ → "threshold-dominant".
 *
 * Règle V5 : aucun signal n'est inventé. Si les pourcentages sont
 * incohérents (somme << 100), on retourne `null`.
 */

const EPSILON = 0.0001;

function pct(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Calcule le Polarization Index de Treff 2019.
 *
 * @param {Object} input
 * @param {number} input.z1Pct - % de charge ou durée en zone 1 (facile)
 * @param {number} input.z2Pct - % en zone 2 (modérée / threshold)
 * @param {number} input.z3Pct - % en zone 3 (intense)
 * @returns {{
 *   index: number|null,             // PI arrondi 0.01
 *   level: "polarized"|"pyramidal"|"threshold"|null,
 *   label: string,                  // libellé FR
 *   tone: 1|2|3|4|5,
 *   note: string,                   // commentaire éducatif
 * }}
 */
export function computePolarizationIndex({ z1Pct, z2Pct, z3Pct } = {}) {
  const z1 = pct(z1Pct);
  const z2 = pct(z2Pct);
  const z3 = pct(z3Pct);

  if (z1 == null || z2 == null || z3 == null) {
    return {
      index: null,
      level: null,
      label: "Données insuffisantes",
      tone: 3,
      note: "Configurez vos zones FC pour évaluer la polarisation.",
    };
  }

  const total = z1 + z2 + z3;
  // Sanity check : la somme doit être proche de 100% (tolérance 5%)
  if (total < 95 || total > 105) {
    return {
      index: null,
      level: null,
      label: "Données incohérentes",
      tone: 3,
      note: "La distribution des zones ne totalise pas 100 %.",
    };
  }

  // Cas dégénérés
  if (z2 < EPSILON) {
    // Pas de zone 2 → polarisation extrême
    return {
      index: Number.POSITIVE_INFINITY,
      level: "polarized",
      label: "Très polarisée",
      tone: 1,
      note: "Aucune charge en zone modérée — distribution extrêmement polarisée.",
    };
  }

  if (z1 < EPSILON || z3 < EPSILON) {
    // Pas de zone 1 ou pas de zone 3 → threshold-dominant
    return {
      index: Number.NEGATIVE_INFINITY,
      level: "threshold",
      label: "Concentrée seuil",
      tone: 4,
      note: "Une zone manque — distribution centrée sur la zone modérée (saturation possible).",
    };
  }

  const raw = Math.log10((z1 * z3) / (z2 * z2));
  const idx = Math.round(raw * 100) / 100;

  let level, label, tone, note;
  if (idx >= 2.0) {
    level = "polarized";
    label = "Polarisée";
    tone = 1;
    note = "Distribution polarisée — fort temps en facile + qualités courtes intenses.";
  } else if (idx >= 0) {
    level = "pyramidal";
    label = "Pyramidale";
    tone = 2;
    note = "Distribution pyramidale — base large, intensités présentes mais zone modérée importante.";
  } else {
    level = "threshold";
    label = "Concentrée seuil";
    tone = 4;
    note = "Concentration en zone modérée — risque de saturation, varier l'intensité.";
  }

  return { index: idx, level, label, tone, note };
}
