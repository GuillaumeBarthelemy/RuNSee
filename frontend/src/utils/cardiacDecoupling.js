// Dérive cardiaque (Pa:Hr decoupling) — Phase H2.
//
// Indicateur d'endurance aérobie : compare le ratio allure/FC entre la
// première et la seconde moitié d'une sortie. Sur du foncier stable, ta FC
// devrait rester stable pour une allure stable. Une dérive > 5% suggère que
// l'effort dépassait ta capacité aérobie pour la durée de la sortie.
//
// Référence : Allen & Coggan (2010), Training and Racing with a Power Meter.
// Méthode pratique reconnue (TrainingPeaks), validation empirique en course.
//
// Calcul : EF (Efficiency Factor) = vitesse / FC moyenne sur chaque moitié.
//   Decoupling = (EF_1ere - EF_2eme) / EF_1ere × 100
// Une perte d'EF positive = dérive (la FC monte plus vite que l'allure).
//
// Inputs :
// - splits : array de splits Strava avec averageSpeed (m/s) et averageHeartrate (bpm)
//   ou directement laps Garmin avec mêmes propriétés
//
// Limitations :
// - Nécessite au moins 2 splits avec FC > 0 et speed > 0
// - Ignore les splits trop courts (< 500 m) qui faussent la moyenne
// - Sur du fractionné dur, l'indicateur n'est pas significatif

const MIN_SPLIT_DISTANCE_M = 500;

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

/**
 * Calcule la dérive cardiaque sur une activité à partir de ses splits.
 *
 * @param {Array} splits - liste de splits avec { distance, averageSpeed, averageHeartrate }
 * @returns {{
 *   decouplingPercent: number | null,
 *   firstHalfEf: number | null,
 *   secondHalfEf: number | null,
 *   hasData: boolean,
 *   sampleSize: number
 * }}
 */
export function calculateCardiacDecoupling(splits = []) {
  const valid = (Array.isArray(splits) ? splits : []).filter((split) => {
    const distance = toFiniteNumber(split?.distance);
    const speed = toFiniteNumber(split?.averageSpeed);
    const hr = toFiniteNumber(split?.averageHeartrate);
    return distance >= MIN_SPLIT_DISTANCE_M && speed > 0 && hr > 0;
  });

  if (valid.length < 2) {
    return {
      decouplingPercent: null,
      firstHalfEf: null,
      secondHalfEf: null,
      hasData: false,
      sampleSize: valid.length,
    };
  }

  // Découpe en deux moitiés (par index pour préserver l'ordre temporel)
  const midpoint = Math.floor(valid.length / 2);
  const firstHalf = valid.slice(0, midpoint);
  const secondHalf = valid.slice(midpoint);

  if (firstHalf.length === 0 || secondHalf.length === 0) {
    return {
      decouplingPercent: null,
      firstHalfEf: null,
      secondHalfEf: null,
      hasData: false,
      sampleSize: valid.length,
    };
  }

  // Pondération par distance pour ne pas sur-représenter les splits courts
  const meanEf = (group) => {
    const totalDist = group.reduce((acc, s) => acc + toFiniteNumber(s.distance), 0);
    if (totalDist <= 0) return 0;
    const weighted = group.reduce((acc, s) => {
      const ef = toFiniteNumber(s.averageSpeed) / toFiniteNumber(s.averageHeartrate);
      return acc + ef * toFiniteNumber(s.distance);
    }, 0);
    return weighted / totalDist;
  };

  const ef1 = meanEf(firstHalf);
  const ef2 = meanEf(secondHalf);

  if (ef1 <= 0 || ef2 <= 0) {
    return {
      decouplingPercent: null,
      firstHalfEf: null,
      secondHalfEf: null,
      hasData: false,
      sampleSize: valid.length,
    };
  }

  // Decoupling = baisse d'EF en pourcentage. Positif = dérive (FC monte > allure).
  const decouplingPercent = ((ef1 - ef2) / ef1) * 100;

  return {
    decouplingPercent: Math.round(decouplingPercent * 10) / 10,
    firstHalfEf: ef1,
    secondHalfEf: ef2,
    hasData: true,
    sampleSize: valid.length,
  };
}

/**
 * Helper : extrait les splits d'un payload détaillé Strava et calcule la dérive.
 */
export function calculateCardiacDecouplingFromPayload(detailedPayload) {
  if (!detailedPayload) {
    return { decouplingPercent: null, hasData: false, sampleSize: 0 };
  }
  const splits = detailedPayload.splits_metric
    || detailedPayload.splits
    || detailedPayload.laps
    || [];
  return calculateCardiacDecoupling(splits);
}
