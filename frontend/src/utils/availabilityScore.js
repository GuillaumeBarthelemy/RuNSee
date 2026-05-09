/**
 * availabilityScore.js
 *
 * Calcul du score "Disponibilité" RunNSee — composite Récupération × Fraîcheur.
 *
 * Formule :
 *   Disponibilité = 0.6 × Aptitude RunNSee + 0.4 × TSB normalisé
 *
 * - Aptitude RunNSee : score 0-100 issu de `recoveryViewModel.readiness.score`
 *   (combinaison sommeil, VFC, FC repos, stress, énergie)
 *   Référence : Plews et al. (2013) Sports Medicine, Buchheit (2014) Frontiers
 *   in Physiology, Le Meur et al. (2013) Med Sci Sports Exerc.
 *
 * - TSB normalisé : Training Stress Balance mappé sur [0, 100]
 *   Référence : Banister (1991), Coggan & Allen (2019) PMC TrainingPeaks.
 *   Optimum +5 à +25 (zone "frais et préparé") → 100
 *   Surfatigue -30 à -10 → 50
 *   Surcharge < -30 → 25
 *   Désentraînement > +25 → 60 (capacité OK mais base s'érode)
 *
 * Le score est qualitatif (capacité du jour à délivrer une séance exigeante)
 * et complémentaire à Récupération (état physiologique). Tant que la formule
 * n'est pas validée par revue scientifique externe, l'UI doit l'afficher avec
 * mention "estimation" et tooltip pédagogique.
 */

/**
 * Normalise le TSB sur une échelle 0-100.
 * @param {number|null} tsb
 * @returns {number|null}
 */
export function normalizeTsb(tsb) {
  if (tsb == null || !Number.isFinite(Number(tsb))) return null;
  const v = Number(tsb);

  if (v >= 5 && v <= 25) return 100;            // optimum compétition
  if (v > 25) return 60;                         // désentraînement potentiel
  if (v >= -10 && v < 5) return 80;              // zone neutre, capacité OK
  if (v >= -30 && v < -10) return 50;            // pression élevée
  return 25;                                     // surcharge, repos recommandé
}

/**
 * Calcule la Disponibilité RunNSee (0-100).
 *
 * @param {Object} args
 * @param {number|null} args.readinessScore — score Aptitude 0-100
 * @param {number|null} args.tsb — Training Stress Balance (CTL - ATL)
 * @returns {{ score: number|null, label: string, tone: number, hasData: boolean }}
 */
export function computeAvailabilityScore({ readinessScore = null, tsb = null } = {}) {
  const safeReadiness = readinessScore != null && Number.isFinite(Number(readinessScore))
    ? Math.min(100, Math.max(0, Number(readinessScore)))
    : null;
  const tsbNorm = normalizeTsb(tsb);

  // Si aucune source disponible, retourner sans données
  if (safeReadiness == null && tsbNorm == null) {
    return { score: null, label: "Données insuffisantes", tone: 3, hasData: false };
  }

  // Si une seule source disponible, on l'utilise telle quelle (poids redistribué)
  let score;
  if (safeReadiness != null && tsbNorm != null) {
    score = Math.round(0.6 * safeReadiness + 0.4 * tsbNorm);
  } else if (safeReadiness != null) {
    score = Math.round(safeReadiness);
  } else {
    score = Math.round(tsbNorm);
  }

  return {
    score,
    label: scoreToLabel(score),
    tone: scoreToTone(score),
    hasData: true,
  };
}

/**
 * Label qualitatif de la Disponibilité.
 */
function scoreToLabel(score) {
  if (score == null) return "—";
  if (score >= 80) return "Prêt";
  if (score >= 60) return "Disponible";
  if (score >= 40) return "Limitée";
  if (score >= 20) return "Faible";
  return "Repos recommandé";
}

/**
 * Tone Alpine Light 1..5 selon score Disponibilité.
 */
function scoreToTone(score) {
  if (score == null) return 3;
  if (score >= 80) return 1;
  if (score >= 60) return 2;
  if (score >= 40) return 3;
  if (score >= 20) return 4;
  return 5;
}
