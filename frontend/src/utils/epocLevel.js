// Dette d'oxygène (EPOC) — Phase H3.
//
// La valeur brute Garmin (mL/kg) n'est pas intuitive pour la prise de décision.
// On la convertit en niveau qualitatif (Léger / Modéré / Élevé / Très élevé)
// avec un temps de récupération recommandé.
//
// Référence concept : Børsheim & Bahr (2003) Sports Medicine.
// Algorithme propriétaire Firstbeat : Saalasti et al. (2007) — partiellement publié.
//
// Seuils issus de GLOSSAIRE.md entrée "epoc".

/**
 * Convertit une valeur EPOC brute (mL/kg) en niveau qualitatif.
 *
 * @param {number|null} valueRawMlKg - valeur brute Garmin (peut être null)
 * @returns {{
 *   level: "Léger" | "Modéré" | "Élevé" | "Très élevé" | null,
 *   tone: 1..5,
 *   recoveryHoursLabel: string,
 *   description: string,
 *   hasData: boolean
 * }}
 */
export function classifyEpoc(valueRawMlKg) {
  const value = Number(valueRawMlKg);
  if (!Number.isFinite(value) || value <= 0) {
    return {
      level: null,
      tone: 3,
      recoveryHoursLabel: "—",
      description: "Donnée Garmin non disponible.",
      hasData: false,
    };
  }

  if (value < 30) {
    return {
      level: "Léger",
      tone: 1,
      recoveryHoursLabel: "récupération rapide",
      description: "Effort facile, récupération attendue dans l'heure.",
      hasData: true,
    };
  }

  if (value < 90) {
    return {
      level: "Modéré",
      tone: 2,
      recoveryHoursLabel: "quelques heures",
      description: "Effort soutenu mais sans dette importante.",
      hasData: true,
    };
  }

  if (value < 150) {
    return {
      level: "Élevé",
      tone: 4,
      recoveryHoursLabel: "≈ 24 h",
      description: "Bloc dense, prévois une journée plus calme avant la prochaine intensité.",
      hasData: true,
    };
  }

  return {
    level: "Très élevé",
    tone: 5,
    recoveryHoursLabel: "≥ 36 h",
    description: "Effort très exigeant, prends 1 à 2 jours de récupération active avant de relancer.",
    hasData: true,
  };
}

/**
 * Helper : extrait l'EPOC depuis un payload Garmin enrichi.
 * Cherche les clés courantes Firstbeat dans le payload.
 */
export function extractEpocFromGarminPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  // Clés possibles selon la structure de l'API Garmin non officielle
  return payload.epoc
    || payload.EPOC
    || payload.aerobicEffectEpoc
    || payload?.summaryDTO?.epoc
    || null;
}
