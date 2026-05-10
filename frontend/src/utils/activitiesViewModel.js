/**
 * activitiesViewModel.js
 *
 * View model pour la page Activités (PDF page 6).
 * Calculs purs basés sur les utils existants — aucun nouveau backend.
 *
 * Helpers exportés :
 *  - getActivityProviderLabel(activity) → "Strava" | "Garmin" | "Strava + Garmin"
 *  - getActivityIntensity(activity)     → "facile" | "moderee" | "intense" | null
 *  - groupActivitiesByDate(activities)  → [{ key, label, items, dateLabel }]
 *  - computePeriodKpis(activities)      → { count, distanceMeters, hours,
 *                                            elevationMeters, avgHr }
 *  - computeSportDistribution(activities) → [{ sport, count, distanceMeters }]
 *  - selectBestActivity(activities)     → activité la plus longue (distance) ou null
 *  - computeWeeklySummary(activities, weekStartDay) → { distanceMeters, hours, count }
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ============================================================================
// Provider / source
// ============================================================================

export function getActivityProviderLabel(activity = {}) {
  const sourceProvider = String(activity?.sourceProvider || "strava").toLowerCase();
  const hasGarmin = Array.isArray(activity?.providerEnrichments)
    ? activity.providerEnrichments.some((e) => String(e?.providerCode || "").includes("garmin"))
    : Boolean(activity?.hasExternalEnrichment);

  if (sourceProvider === "garmin") return "Garmin";
  return hasGarmin ? "Strava + Garmin" : "Strava";
}

export function getActivityProviderKey(activity = {}) {
  const label = getActivityProviderLabel(activity);
  if (label === "Strava + Garmin") return "merged";
  if (label === "Garmin") return "garmin";
  return "strava";
}

// ============================================================================
// Intensité — classification scientifique basée sur les zones FC personnelles
// ============================================================================
//
// Méthode (par ordre de priorité) :
//   1. Zones FC personnelles (heartRateZone2Max, heartRateZone3Max) → ACSM
//   2. % FCmax personnelle (heartRateMax) → seuils 70 % / 85 % (ACSM)
//   3. Aucune référence configurée → null (badge masqué, pas de seuil inventé)
//
// Mapping 5 zones → 3 niveaux selon Seiler (2010), modèle polarisé :
//   - Facile  : Z1–Z2 (≤ Z2Max)        → endurance fondamentale, ~80 % du volume
//   - Modérée : Z3 (Z2Max → Z3Max)     → tempo, sub-seuil
//   - Intense : Z4–Z5 (> Z3Max)        → seuil + VO2max, ~20 % du volume
//
// Refs :
//   - ACSM (2018), Guidelines for Exercise Testing and Prescription, 10e éd.
//   - Seiler S. (2010), Int J Sports Physiol Perform 5(3):276–291
//   - Jamnick NA et al. (2020), Sports Med 50(10):1729–1756

export function getActivityIntensity(activity = {}, settings = null) {
  const avgHr = Number(activity?.averageHeartrate);
  if (!Number.isFinite(avgHr) || avgHr <= 0) return null;

  // Méthode 1 : zones FC personnelles (priorité)
  const z2Max = Number(settings?.heartRateZone2Max);
  const z3Max = Number(settings?.heartRateZone3Max);
  if (Number.isFinite(z2Max) && Number.isFinite(z3Max) && z2Max > 0 && z3Max > z2Max) {
    if (avgHr <= z2Max) return "facile";
    if (avgHr <= z3Max) return "moderee";
    return "intense";
  }

  // Méthode 2 : % FCmax personnelle (ACSM)
  const fcmax = Number(settings?.heartRateMax);
  if (Number.isFinite(fcmax) && fcmax > 0) {
    const pct = avgHr / fcmax;
    if (pct <= 0.70) return "facile";
    if (pct <= 0.85) return "moderee";
    return "intense";
  }

  // Méthode 3 : aucune référence → pas de classification
  return null;
}

/**
 * Indique si la classification d'intensité est disponible pour les settings courants.
 * Sert au filtre Intensité (afficher un message si l'utilisateur n'a pas configuré).
 */
export function hasIntensityReference(settings = null) {
  if (!settings) return false;
  const z2 = Number(settings.heartRateZone2Max);
  const z3 = Number(settings.heartRateZone3Max);
  if (Number.isFinite(z2) && Number.isFinite(z3) && z2 > 0 && z3 > z2) return true;
  const fcmax = Number(settings.heartRateMax);
  return Number.isFinite(fcmax) && fcmax > 0;
}

export const INTENSITY_LABELS = {
  facile: "Facile",
  moderee: "Modérée",
  intense: "Intense",
};

// ============================================================================
// Groupement par date (Aujourd'hui / Hier / Cette semaine / dates absolues)
// ============================================================================

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getActivityDate(activity) {
  const raw = activity?.startDate || activity?.startDateLocal || activity?.startTime;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateLabel(date) {
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function groupActivitiesByDate(activities = [], referenceDate = new Date()) {
  if (!Array.isArray(activities) || activities.length === 0) return [];
  const refStart = startOfDay(referenceDate);
  const groups = new Map();

  for (const a of activities) {
    const date = getActivityDate(a);
    if (!date) continue;
    const dStart = startOfDay(date);
    const diffDays = Math.round((refStart - dStart) / MS_PER_DAY);

    let key;
    let label;
    if (diffDays === 0) {
      key = "today";
      label = "Aujourd'hui";
    } else if (diffDays === 1) {
      key = "yesterday";
      label = "Hier";
    } else if (diffDays > 1 && diffDays < 7) {
      key = `d-${diffDays}`;
      label = formatDateLabel(date);
    } else {
      // Plus ancien : grouper par date absolue
      key = `abs-${dStart.toISOString().slice(0, 10)}`;
      label = formatDateLabel(date);
    }

    if (!groups.has(key)) {
      groups.set(key, { key, label, items: [], _sortDate: dStart.getTime() });
    }
    groups.get(key).items.push(a);
  }

  // Tri : plus récent d'abord
  return Array.from(groups.values())
    .sort((a, b) => b._sortDate - a._sortDate)
    .map((g) => ({ key: g.key, label: g.label, items: g.items }));
}

// ============================================================================
// KPI période (Sorties / Distance totale / Dénivelé+ / Temps total / FC moy.)
// ============================================================================

export function computePeriodKpis(activities = []) {
  let count = 0;
  let distanceMeters = 0;
  let totalSeconds = 0;
  let elevationMeters = 0;
  let hrSum = 0;
  let hrCount = 0;

  for (const a of activities) {
    count += 1;
    const d = Number(a?.distance);
    if (Number.isFinite(d) && d > 0) distanceMeters += d;
    const t = Number(a?.movingTime);
    if (Number.isFinite(t) && t > 0) totalSeconds += t;
    const e = Number(a?.totalElevationGain);
    if (Number.isFinite(e) && e > 0) elevationMeters += e;
    const hr = Number(a?.averageHeartrate);
    if (Number.isFinite(hr) && hr > 0) {
      hrSum += hr;
      hrCount += 1;
    }
  }

  return {
    count,
    distanceMeters,
    hours: totalSeconds / 3600,
    elevationMeters,
    avgHr: hrCount > 0 ? hrSum / hrCount : null,
  };
}

// ============================================================================
// Répartition par sport
// ============================================================================

export function computeSportDistribution(activities = []) {
  const map = new Map();
  for (const a of activities) {
    const sport = String(a?.sportType || a?.type || "Autre");
    if (!map.has(sport)) map.set(sport, { sport, count: 0, distanceMeters: 0 });
    const entry = map.get(sport);
    entry.count += 1;
    const d = Number(a?.distance);
    if (Number.isFinite(d) && d > 0) entry.distanceMeters += d;
  }
  return Array.from(map.values()).sort((a, b) => b.distanceMeters - a.distanceMeters);
}

// ============================================================================
// Meilleure sortie (règle stable : plus longue distance dans l'échantillon)
// Renvoie null si pas de distance exploitable → "Données insuffisantes"
// ============================================================================

export function selectBestActivity(activities = []) {
  let best = null;
  let bestDist = 0;
  for (const a of activities) {
    const d = Number(a?.distance);
    if (Number.isFinite(d) && d > bestDist) {
      bestDist = d;
      best = a;
    }
  }
  return best;
}

// ============================================================================
// Vue hebdomadaire — semaine courante (lundi par défaut)
// ============================================================================

export function computeWeeklySummary(activities = [], { referenceDate = new Date(), weekStartDay = 1 } = {}) {
  const ref = startOfDay(referenceDate);
  // weekStartDay : 0 = dimanche, 1 = lundi (défaut)
  const dayOfWeek = ref.getDay(); // 0 = dim
  const offsetToStart = (dayOfWeek - weekStartDay + 7) % 7;
  const weekStart = new Date(ref.getTime() - offsetToStart * MS_PER_DAY);

  let count = 0;
  let distanceMeters = 0;
  let totalSeconds = 0;
  let elevationMeters = 0;

  for (const a of activities) {
    const d = getActivityDate(a);
    if (!d) continue;
    if (d < weekStart) continue;
    count += 1;
    const dist = Number(a?.distance);
    if (Number.isFinite(dist) && dist > 0) distanceMeters += dist;
    const t = Number(a?.movingTime);
    if (Number.isFinite(t) && t > 0) totalSeconds += t;
    const e = Number(a?.totalElevationGain);
    if (Number.isFinite(e) && e > 0) elevationMeters += e;
  }

  return { count, distanceMeters, hours: totalSeconds / 3600, elevationMeters };
}
