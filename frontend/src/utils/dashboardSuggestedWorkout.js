/**
 * dashboardSuggestedWorkout.js
 *
 * View model prudent pour la "Sortie suggérée" du Dashboard.
 * NE PAS INVENTER de valeurs numériques chiffrées.
 * Retourne une orientation (titre, effort, plage de durée, terrain)
 * ou un placeholder si les données sont insuffisantes.
 *
 * Inputs : { readinessScore, fatigueValue, charge7d }
 * Output : {
 *   title        : string,
 *   subtitle     : string,
 *   tags         : string[],
 *   durationRange: string|null,  // "35 à 50 min" — jamais de km exact
 *   terrain      : string|null,  // "terrain souple si possible"
 *   isPlaceholder: boolean,      // true = données insuffisantes
 * }
 */
// charge7d est reservé pour une logique future (détecter surcharge semaine)
// eslint-disable-next-line no-unused-vars
export function buildSuggestedWorkout({ readinessScore, fatigueValue, charge7d }) {
  const hasReadiness = readinessScore != null && Number.isFinite(readinessScore);
  const hasFatigue   = fatigueValue   != null && Number.isFinite(fatigueValue);

  // Données insuffisantes
  if (!hasReadiness && !hasFatigue) {
    return {
      title: "Suggestion à affiner",
      subtitle: "Données insuffisantes pour proposer une séance fiable",
      tags: [],
      durationRange: null,
      terrain: null,
      isPlaceholder: true,
    };
  }

  const rec = hasReadiness ? readinessScore : 50;
  const fat = hasFatigue   ? fatigueValue   : 0;

  // Repos ou mobilité
  if (rec < 25 || fat >= 75) {
    return {
      title: "Repos ou mobilité",
      subtitle: "Fatigue élevée — priorité à la récupération active",
      tags: ["Récupération", "Mobilité"],
      durationRange: "15 à 30 min",
      terrain: "Étirements ou marche légère",
      isPlaceholder: false,
    };
  }

  // Footing très facile
  if (rec < 50 || fat >= 55) {
    return {
      title: "Footing très facile",
      subtitle: "État modéré — garder l'effort bas",
      tags: ["Zone 1", "Récupération active"],
      durationRange: "25 à 40 min",
      terrain: "Terrain plat, allure très confortable",
      isPlaceholder: false,
    };
  }

  // Endurance fondamentale
  if (rec < 75 || fat >= 35) {
    return {
      title: "Sortie Endurance",
      subtitle: "Charge maîtrisée — bonne fenêtre pour l'endurance",
      tags: ["Zone 2", "Endurance"],
      durationRange: "45 à 70 min",
      terrain: "Terrain souple si possible",
      isPlaceholder: false,
    };
  }

  // État favorable — sortie qualitative possible
  return {
    title: "Sortie qualitative",
    subtitle: "Récupération correcte — fenêtre favorable",
    tags: ["Zone 2", "Zone 3"],
    durationRange: "55 à 80 min",
    terrain: "Dénivelé modéré possible",
    isPlaceholder: false,
  };
}
