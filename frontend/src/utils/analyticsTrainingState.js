/**
 * analyticsTrainingState.js
 *
 * Score composite d'état d'entraînement (0-100) pour l'onglet Vue d'ensemble
 * de la page Analyse. Agrège 4 signaux scientifiquement validés :
 *
 *   - TSB (forme)       : Coggan & Allen 2010 (Training and Racing with a Power Meter, 2e éd.)
 *   - ACWR EWMA         : Gabbett TJ 2016 (Br J Sports Med 50(5):273–280) ;
 *                         variante EWMA : Williams 2017 (Br J Sports Med 51(3):209–210)
 *   - Foster Monotony   : Foster CC 1998 (Med Sci Sports Exerc 30(7):1164–1168)
 *   - Delta VFC % vs    : Plews & Laursen 2013 (Sports Med 43(9):773–781) ;
 *     repère 7j           Buchheit M 2014 (Front Physiol 5:73)
 *
 * Chaque signal est mappé à un sub-score 0-100 selon ses zones publiées.
 * Le score final = moyenne pondérée des sub-scores disponibles.
 *
 * Règles V5 :
 *   - Aucun signal n'est inventé. Si un signal manque, on renormalise les
 *     poids sur ceux disponibles (jamais de valeur par défaut fictive).
 *   - Si aucun signal n'est disponible, on retourne `{ score: null }` et
 *     l'UI doit afficher un état vide propre, pas "0/100".
 *
 * Pondération (signaux disponibles) :
 *   TSB 40 · ACWR 30 · Monotony 15 · VFC delta 15
 *
 * Classification finale :
 *   ≥ 80 : "Construction optimale"     (tone 1)
 *   65-80: "Bonne forme"                (tone 2)
 *   50-65: "Vigilance"                  (tone 3)
 *   35-50: "Surcharge probable"         (tone 4)
 *   < 35 : "Alerte"                     (tone 5)
 */

// ---------------------------------------------------------------------------
// Sub-scores normalisés 0-100 par signal
// ---------------------------------------------------------------------------

/**
 * TSB (Training Stress Balance) — Coggan & Allen.
 * Zones (en points TSB) :
 *   +5 à +25  : fenêtre optimale "fit & fresh"          → 100
 *   -5 à +5   : équilibré                                → 80
 *   +25 à +40 : forme mais détraining naissant           → 70
 *   -10 à -5  : charge active modérée                    → 65
 *   -20 à -10 : fatigue marquée                          → 50
 *   > +40     : détraining marqué                        → 45
 *   -30 à -20 : surcharge probable                       → 30
 *   < -30     : alerte                                   → 15
 */
function tsbSubScore(tsb) {
  if (!Number.isFinite(tsb)) return null;
  if (tsb >= 5 && tsb <= 25) return 100;
  if (tsb >= -5 && tsb < 5) return 80;
  if (tsb > 25 && tsb <= 40) return 70;
  if (tsb >= -10 && tsb < -5) return 65;
  if (tsb >= -20 && tsb < -10) return 50;
  if (tsb > 40) return 45;
  if (tsb >= -30 && tsb < -20) return 30;
  return 15;
}

/**
 * ACWR (Acute:Chronic Workload Ratio) — Gabbett 2016 sweet spot 0.8–1.3.
 *   0.8 à 1.3  : sweet spot, adaptation optimale                    → 100
 *   0.5 à 0.8  : sous-charge légère (build progressif)              → 75
 *   1.3 à 1.5  : surcharge contrôlée, à surveiller                  → 75
 *   1.5 à 1.8  : risque blessure majoré (Gabbett "danger zone")     → 50
 *   0.3 à 0.5  : sous-charge marquée / détraining                   → 50
 *   > 1.8      : zone danger blessure                                → 25
 *   < 0.3      : détraining sévère                                   → 25
 */
function acwrSubScore(acwr) {
  if (!Number.isFinite(acwr) || acwr < 0) return null;
  if (acwr >= 0.8 && acwr <= 1.3) return 100;
  if (acwr >= 0.5 && acwr < 0.8) return 75;
  if (acwr > 1.3 && acwr <= 1.5) return 75;
  if (acwr >= 0.3 && acwr < 0.5) return 50;
  if (acwr > 1.5 && acwr <= 1.8) return 50;
  return 25;
}

/**
 * Foster Monotony — index de monotonie de charge sur 7j.
 *   < 1.5  : variabilité saine, séances rythmées          → 100
 *   1.5-1.8: monotonie modérée                            → 80
 *   1.8-2.2: vigilance (Foster threshold)                 → 60
 *   2.2-2.5: élevée (risque cumulatif)                    → 40
 *   > 2.5  : danger (Foster 1998 "high strain risk")      → 20
 */
function monotonySubScore(monotony) {
  if (!Number.isFinite(monotony) || monotony <= 0) return null;
  if (monotony < 1.5) return 100;
  if (monotony < 1.8) return 80;
  if (monotony < 2.2) return 60;
  if (monotony < 2.5) return 40;
  return 20;
}

/**
 * Delta VFC en % vs repère 7j — Plews & Laursen.
 *   ≥ +10 % : excellente adaptation                       → 100
 *   +3 à +10: positif, supercompensation                  → 85
 *   -3 à +3 : stable, normal                              → 70
 *   -8 à -3 : légère dégradation                          → 50
 *   -15 à -8: à surveiller (charge ou stress externe)     → 30
 *   < -15 % : alerte (signe Plews dépression VFC marquée) → 15
 */
function hrvDeltaSubScore(deltaPct) {
  if (!Number.isFinite(deltaPct)) return null;
  if (deltaPct >= 10) return 100;
  if (deltaPct >= 3) return 85;
  if (deltaPct >= -3) return 70;
  if (deltaPct >= -8) return 50;
  if (deltaPct >= -15) return 30;
  return 15;
}

// ---------------------------------------------------------------------------
// Classification finale du score 0-100 → libellé + tone
// ---------------------------------------------------------------------------

function classifyTrainingState(score) {
  if (!Number.isFinite(score)) return { label: "Données insuffisantes", tone: 3 };
  if (score >= 80) return { label: "Construction optimale", tone: 1 };
  if (score >= 65) return { label: "Bonne forme",           tone: 2 };
  if (score >= 50) return { label: "Vigilance",             tone: 3 };
  if (score >= 35) return { label: "Surcharge probable",    tone: 4 };
  return                  { label: "Alerte",                tone: 5 };
}

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

/**
 * Calcule le score composite d'état d'entraînement (0-100).
 *
 * @param {Object} input
 * @param {number|null} input.tsb        — TSB en points (summary.tsb)
 * @param {number|null} input.acwr       — ACWR EWMA (loadDynamicsProfile.acwrEwma.value)
 * @param {number|null} input.monotony   — Monotony Foster (loadVarianceModel.monotony)
 * @param {number|null} input.hrvDeltaPct — Delta VFC % (recoveryVm.hrv.deltaPct)
 * @returns {{
 *   score: number|null,           // 0-100 ou null si aucun signal dispo
 *   label: string,                // ex: "Bonne forme"
 *   tone: 1|2|3|4|5,
 *   contributions: Array<{ key, label, weight, value, subScore, source }>,
 *   missingSignals: string[],
 * }}
 */
export function computeTrainingStateScore({
  tsb = null,
  acwr = null,
  monotony = null,
  hrvDeltaPct = null,
} = {}) {
  const signals = [
    {
      key: "tsb",
      label: "Forme (TSB)",
      weight: 40,
      raw: tsb,
      subScore: tsbSubScore(tsb),
      source: "Coggan & Allen 2010",
    },
    {
      key: "acwr",
      label: "Charge actuelle vs base (ACWR)",
      weight: 30,
      raw: acwr,
      subScore: acwrSubScore(acwr),
      source: "Gabbett 2016 ; Williams 2017 EWMA",
    },
    {
      key: "monotony",
      label: "Variabilité charge (Foster)",
      weight: 15,
      raw: monotony,
      subScore: monotonySubScore(monotony),
      source: "Foster 1998",
    },
    {
      key: "hrvDelta",
      label: "Tendance VFC",
      weight: 15,
      raw: hrvDeltaPct,
      subScore: hrvDeltaSubScore(hrvDeltaPct),
      source: "Plews & Laursen 2013",
    },
  ];

  const present = signals.filter((s) => s.subScore != null);
  const missing = signals.filter((s) => s.subScore == null).map((s) => s.key);

  if (present.length === 0) {
    return {
      score: null,
      label: "Données insuffisantes",
      tone: 3,
      contributions: [],
      missingSignals: missing,
    };
  }

  // Renormalisation des poids sur les signaux présents
  const weightSum = present.reduce((s, x) => s + x.weight, 0);
  const score = present.reduce((s, x) => s + (x.subScore * x.weight) / weightSum, 0);
  const rounded = Math.round(score);
  const { label, tone } = classifyTrainingState(rounded);

  return {
    score: rounded,
    label,
    tone,
    contributions: present.map((s) => ({
      key: s.key,
      label: s.label,
      weight: Math.round((s.weight / weightSum) * 100),
      value: s.raw,
      subScore: s.subScore,
      source: s.source,
    })),
    missingSignals: missing,
  };
}
