// Grade Adjusted Pace (GAP) base sur le modele de cout energetique de Minetti.
//
// Reference : Minetti AE, Moia C, Roi GS, Susta D, Ferretti G (2002).
//             Energy cost of walking and running at extreme uphill and downhill slopes.
//             Journal of Applied Physiology 93(3): 1039-1046.
//
// Le modele donne le cout metabolique C(g) en J/kg/m pour un gradient g (en fraction).
// On en deduit un facteur d'ajustement applique a l'allure pour estimer une allure
// equivalente plat. Cette implementation reste une approximation : sans flux GPS
// detaille, on derive un gradient moyen positif a partir du D+ et de la distance,
// puis on suppose une repartition symetrique montee / descente sur la sortie.

const FLAT_RUNNING_COST = 3.6; // J/kg/m, cout sur le plat selon Minetti.

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

// Cout energetique de la course a un gradient donne (sans dimension, fraction).
// Polynome Minetti 2002 valide entre -45 % et +45 %.
export function runningCostAtGrade(grade) {
  const g = Math.max(-0.45, Math.min(0.45, toFiniteNumber(grade)));
  return (
    155.4 * Math.pow(g, 5)
    - 30.4 * Math.pow(g, 4)
    - 43.3 * Math.pow(g, 3)
    + 46.3 * Math.pow(g, 2)
    + 19.5 * g
    + FLAT_RUNNING_COST
  );
}

// Multiplicateur d'allure pour un gradient donne.
// pace_plat = pace_pente × multiplicateur (multiplicateur < 1 pour les montees,
// > 1 pour les descentes legeres car on irait plus vite sur le plat a cout egal).
export function paceAdjustmentFactorForGrade(grade) {
  const cost = runningCostAtGrade(grade);
  if (cost <= 0) {
    return 1;
  }

  return FLAT_RUNNING_COST / cost;
}

// Ajustement moyen pour un parcours dont on ne connait que le gradient moyen
// positif (D+ / distance horizontale parcourue en montee). On suppose une
// repartition symetrique : la moitie de la distance grimpe au gradient g,
// l'autre moitie descend au gradient -g.
//
// Ce modele simplifie reste plus precis qu'un alignement strict sur le D+
// (qui sur-penalise systematiquement les sorties vallonnees alors qu'une partie
// de l'effort est compensee par les descentes).
export function averagePaceAdjustmentForLoop(grade) {
  const positiveGrade = Math.max(0, toFiniteNumber(grade));
  if (positiveGrade <= 0) {
    return 1;
  }

  const upCost = runningCostAtGrade(positiveGrade);
  const downCost = runningCostAtGrade(-positiveGrade);
  const meanCost = (upCost + downCost) / 2;

  if (meanCost <= 0) {
    return 1;
  }

  return FLAT_RUNNING_COST / meanCost;
}

// Convertit une allure observee (s/km) sur une sortie en allure ajustee plat (GAP).
//
// Inputs attendus :
//   - observedPaceSecondsPerKm : allure brute en secondes par km
//   - distanceMeters           : distance totale parcourue (m)
//   - elevationGainMeters      : denivele positif total (m)
//
// Si la sortie est trop courte, trop plate ou si les donnees sont absurdes,
// on renvoie l'allure brute (le GAP n'a pas de valeur ajoutee).
export function calculateGradeAdjustedPace({
  observedPaceSecondsPerKm = 0,
  distanceMeters = 0,
  elevationGainMeters = 0,
} = {}) {
  const pace = toFiniteNumber(observedPaceSecondsPerKm);
  const distance = toFiniteNumber(distanceMeters);
  const elevation = Math.max(0, toFiniteNumber(elevationGainMeters));

  if (pace <= 0 || distance < 1000) {
    return {
      paceSecondsPerKm: pace,
      gradeRatio: 0,
      adjustmentFactor: 1,
      hasAdjustment: false,
    };
  }

  // gradient moyen approxime : on suppose que la moitie de la distance correspond
  // a la montee (et l'autre moitie a la descente sur un parcours en boucle).
  const ascentDistance = distance / 2;
  const gradeRatio = ascentDistance > 0 ? elevation / ascentDistance : 0;

  // En dessous de 1 % de gradient moyen, l'ajustement est negligeable et risque
  // d'amplifier le bruit.
  if (gradeRatio < 0.01) {
    return {
      paceSecondsPerKm: pace,
      gradeRatio,
      adjustmentFactor: 1,
      hasAdjustment: false,
    };
  }

  const adjustmentFactor = averagePaceAdjustmentForLoop(gradeRatio);
  const adjustedPace = pace * adjustmentFactor;

  return {
    paceSecondsPerKm: Number(adjustedPace.toFixed(1)),
    gradeRatio,
    adjustmentFactor,
    hasAdjustment: true,
  };
}

// Helper utilise par les selecteurs de pace de reference / Critical Speed :
// extrait directement le pace ajuste d'une activite preparee, en se rabattant
// sur l'allure brute si les donnees ne permettent pas l'ajustement.
export function getActivityGradeAdjustedPaceSecondsPerKm(activity = {}) {
  const distance = toFiniteNumber(activity?.distance);
  const elevation = toFiniteNumber(activity?.totalElevationGain);
  const moving = toFiniteNumber(activity?.movingTime);

  if (distance <= 0 || moving <= 0) {
    return 0;
  }

  const observedPace = moving / (distance / 1000);
  const result = calculateGradeAdjustedPace({
    observedPaceSecondsPerKm: observedPace,
    distanceMeters: distance,
    elevationGainMeters: elevation,
  });

  return result.paceSecondsPerKm || observedPace;
}
