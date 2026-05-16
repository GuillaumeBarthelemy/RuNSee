/**
 * analyticsTrends.js — Helpers spécifiques à l'onglet Tendances (PDF page 9).
 *
 * Fonctions :
 *  - buildMonthlyTrendsMatrix : agrège 4 métriques par mois en un seul pass
 *  - buildPeriodComparison    : current vs previous (même durée)
 *  - buildRegularityStats     : jours actifs, série max, % régularité
 *  - buildHeatmapMatrix       : grille jours × mois pour la heatmap calendrier
 *
 * Aucune dépendance UI. Tests unitaires bienvenus.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function localDateKey(d) {
  if (!(d instanceof Date)) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date) {
  return date.toLocaleDateString("fr-FR", { month: "short" });
}

function activityDate(a) {
  const raw = a?.startDateLocal || a?.startDate || a?.start_date;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// 1. Monthly trends matrix
// ---------------------------------------------------------------------------

/**
 * Construit la série mensuelle avec 4 métriques calculées en un seul pass.
 *
 * @param {Array} activities
 * @param {Object} options
 * @param {Date} options.endDate
 * @param {number} options.months  Nombre de mois à inclure (incluant le mois courant)
 * @returns {Array<{ key, label, periodStart, periodEnd, distanceKm, durationHours, elevationGain, runs }>}
 */
export function buildMonthlyTrendsMatrix(activities = [], options = {}) {
  const end = options.endDate instanceof Date ? new Date(options.endDate) : new Date();
  const months = Math.max(1, Number(options.months) || 12);

  // Construit la grille de mois (du plus ancien au plus récent)
  const buckets = [];
  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

  for (let i = months - 1; i >= 0; i--) {
    const ref = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const periodStart = startOfMonth(ref);
    const periodEnd = endOfMonth(ref);
    buckets.push({
      key: monthKey(periodStart),
      label: monthLabel(periodStart),
      year: periodStart.getFullYear(),
      periodStart,
      periodEnd,
      distanceKm: 0,
      durationHours: 0,
      elevationGain: 0,
      runs: 0,
    });
  }

  // Index par clé pour O(1) lookup
  const byKey = new Map(buckets.map((b) => [b.key, b]));

  for (const a of activities) {
    const d = activityDate(a);
    if (!d) continue;
    const k = monthKey(d);
    const b = byKey.get(k);
    if (!b) continue;
    const distanceMeters = safeNum(a.distance);
    b.distanceKm += distanceMeters / 1000;
    b.durationHours += safeNum(a.movingTime) / 3600;
    b.elevationGain += safeNum(a.totalElevationGain);
    b.runs += 1;
  }

  // Arrondis pour affichage stable
  for (const b of buckets) {
    b.distanceKm = Math.round(b.distanceKm * 10) / 10;
    b.durationHours = Math.round(b.durationHours * 10) / 10;
    b.elevationGain = Math.round(b.elevationGain);
  }

  return buckets;
}

// ---------------------------------------------------------------------------
// 2. Period comparison (current vs previous, even duration)
// ---------------------------------------------------------------------------

/**
 * Calcule current vs previous sur 4 métriques.
 * "Previous" = même durée juste avant la période courante.
 *
 * @param {Array} activities
 * @param {{ start: Date, end: Date }} currentRange
 * @returns {{
 *   current: { distanceKm, durationHours, elevationGain, runs },
 *   previous: { distanceKm, durationHours, elevationGain, runs, rangeLabel },
 *   delta: { distanceKm, durationHours, elevationGain, runs },  // valeurs absolues
 *   deltaPct: { distanceKm, durationHours, elevationGain, runs },
 *   rangeLabel: string,
 *   previousRangeLabel: string,
 * }}
 */
export function buildPeriodComparison(activities = [], currentRange = {}) {
  const start = currentRange.start instanceof Date ? startOfDay(currentRange.start) : null;
  const end = currentRange.end instanceof Date ? endOfDay(currentRange.end) : null;
  if (!start || !end) {
    return { current: null, previous: null, delta: null, deltaPct: null, rangeLabel: "", previousRangeLabel: "" };
  }
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);

  const acc = (rangeStart, rangeEnd) => {
    const stats = { distanceKm: 0, durationHours: 0, elevationGain: 0, runs: 0 };
    for (const a of activities) {
      const d = activityDate(a);
      if (!d) continue;
      if (d >= rangeStart && d <= rangeEnd) {
        stats.distanceKm += safeNum(a.distance) / 1000;
        stats.durationHours += safeNum(a.movingTime) / 3600;
        stats.elevationGain += safeNum(a.totalElevationGain);
        stats.runs += 1;
      }
    }
    return {
      distanceKm: Math.round(stats.distanceKm * 10) / 10,
      durationHours: Math.round(stats.durationHours * 10) / 10,
      elevationGain: Math.round(stats.elevationGain),
      runs: stats.runs,
    };
  };
  const current = acc(start, end);
  const previous = acc(prevStart, prevEnd);

  const delta = {
    distanceKm: Math.round((current.distanceKm - previous.distanceKm) * 10) / 10,
    durationHours: Math.round((current.durationHours - previous.durationHours) * 10) / 10,
    elevationGain: current.elevationGain - previous.elevationGain,
    runs: current.runs - previous.runs,
  };
  const pct = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);
  const deltaPct = {
    distanceKm: pct(current.distanceKm, previous.distanceKm),
    durationHours: pct(current.durationHours, previous.durationHours),
    elevationGain: pct(current.elevationGain, previous.elevationGain),
    runs: pct(current.runs, previous.runs),
  };

  const fmtRange = (s, e) => {
    const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
    if (sameMonth) {
      return `${s.getDate()}-${e.getDate()} ${s.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}`;
    }
    return `${s.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;
  };

  return {
    current,
    previous,
    delta,
    deltaPct,
    rangeLabel: fmtRange(start, end),
    previousRangeLabel: fmtRange(prevStart, prevEnd),
  };
}

// ---------------------------------------------------------------------------
// 2bis. Rolling 30-day comparison — évite le biais du mois courant partiel.
// Compare la fenêtre "30 derniers jours" à la fenêtre "30 jours précédents".
// Toutes les fenêtres font 30 jours, donc les deltas sont honnêtes même
// au milieu du mois calendaire.
// ---------------------------------------------------------------------------

const MS_PER_DAY_ROLLING = MS_PER_DAY;

export function buildRolling30Comparison(activities = [], endDate = new Date()) {
  const e = endDate instanceof Date ? new Date(endDate) : new Date();
  e.setHours(23, 59, 59, 999);
  const startCurrent = new Date(e.getTime() - 29 * MS_PER_DAY_ROLLING);
  startCurrent.setHours(0, 0, 0, 0);
  const endPrevious = new Date(startCurrent.getTime() - 1);
  const startPrevious = new Date(endPrevious.getTime() - 29 * MS_PER_DAY_ROLLING);
  startPrevious.setHours(0, 0, 0, 0);

  function aggregate(start, end) {
    let distanceKm = 0, durationHours = 0, elevationGain = 0, runs = 0;
    const activeDays = new Set();
    for (const a of activities) {
      const d = activityDate(a);
      if (!d) continue;
      if (d < start || d > end) continue;
      distanceKm += safeNum(a.distance) / 1000;
      durationHours += safeNum(a.movingTime) / 3600;
      elevationGain += safeNum(a.totalElevationGain);
      runs += 1;
      activeDays.add(localDateKey(startOfDay(d)));
    }
    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      durationHours: Math.round(durationHours * 10) / 10,
      elevationGain: Math.round(elevationGain),
      runs,
      activeDays: activeDays.size,
      regularityPercent: Math.round((activeDays.size / 30) * 100),
      // Fréquence hebdo lissée sur 30 jours = runs / (30/7)
      frequencyPerWeek: Math.round((runs / (30 / 7)) * 10) / 10,
    };
  }

  const current = aggregate(startCurrent, e);
  const previous = aggregate(startPrevious, endPrevious);

  function pct(cur, prev) {
    return prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;
  }

  return {
    current,
    previous,
    deltaPct: {
      distanceKm: pct(current.distanceKm, previous.distanceKm),
      durationHours: pct(current.durationHours, previous.durationHours),
      elevationGain: pct(current.elevationGain, previous.elevationGain),
      runs: pct(current.runs, previous.runs),
      regularity: current.regularityPercent - previous.regularityPercent, // en points (pas %)
      frequencyPerWeek: Math.round((current.frequencyPerWeek - previous.frequencyPerWeek) * 10) / 10,
    },
  };
}

// ---------------------------------------------------------------------------
// 3. Regularity stats (active days, longest streak)
// ---------------------------------------------------------------------------

/**
 * Calcule jours actifs, streak max, et % régularité pour une période.
 *
 * @returns {{
 *   totalDays: number,
 *   activeDays: number,
 *   regularityPercent: number,
 *   longestStreak: number,
 *   longestStreakStart: Date|null,
 *   longestStreakEnd: Date|null,
 * }}
 */
export function buildRegularityStats(activities = [], range = {}) {
  const start = range.start instanceof Date ? startOfDay(range.start) : null;
  const end = range.end instanceof Date ? endOfDay(range.end) : null;
  if (!start || !end) {
    return {
      totalDays: 0, activeDays: 0, regularityPercent: 0,
      longestStreak: 0, longestStreakStart: null, longestStreakEnd: null,
    };
  }

  // Set des jours actifs
  const activeSet = new Set();
  for (const a of activities) {
    const d = activityDate(a);
    if (!d) continue;
    const dd = startOfDay(d);
    if (dd >= start && dd <= end) {
      activeSet.add(localDateKey(dd));
    }
  }

  const totalDays = Math.round((endOfDay(end).getTime() - startOfDay(start).getTime()) / MS_PER_DAY) + 1;
  const activeDays = activeSet.size;
  const regularityPercent = totalDays > 0 ? Math.round((activeDays / totalDays) * 100) : 0;

  // Streak max
  let longestStreak = 0;
  let currentStreak = 0;
  let currentStreakStart = null;
  let longestStreakStart = null;
  let longestStreakEnd = null;

  for (let t = start.getTime(); t <= end.getTime(); t += MS_PER_DAY) {
    const d = new Date(t);
    if (activeSet.has(localDateKey(d))) {
      if (currentStreak === 0) currentStreakStart = new Date(d);
      currentStreak += 1;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        longestStreakStart = new Date(currentStreakStart);
        longestStreakEnd = new Date(d);
      }
    } else {
      currentStreak = 0;
      currentStreakStart = null;
    }
  }

  return {
    totalDays,
    activeDays,
    regularityPercent,
    longestStreak,
    longestStreakStart,
    longestStreakEnd,
  };
}

// ---------------------------------------------------------------------------
// 4. Heatmap matrix : jours × mois
// ---------------------------------------------------------------------------

/**
 * Construit la matrice pour heatmap calendrier.
 * Couvre nMonths mois finissant à `endDate`, organisé en colonnes par semaine.
 *
 * @returns {{
 *   months: Array<{ label, year, startCol, endCol }>,
 *   columns: Array<{ weekStart: Date, days: Array<{ date: Date, level: 0|1|2|3 }> }>
 *     level 0=aucune, 1=légère, 2=1 sortie, 3=2+ sorties
 * }}
 */
export function buildHeatmapMatrix(activities = [], options = {}) {
  const end = options.endDate instanceof Date ? endOfDay(options.endDate) : endOfDay(new Date());
  const nMonths = Math.max(1, Number(options.months) || 6);
  // Début = 1er du mois (end - nMonths + 1)
  const startMonth = new Date(end.getFullYear(), end.getMonth() - nMonths + 1, 1);

  // Compte activités par jour + détails (distance/durée) pour tooltip riche
  const statsByDay = new Map(); // key -> { count, hasSubstantial, distanceKm, durationMinutes }
  for (const a of activities) {
    const d = activityDate(a);
    if (!d) continue;
    const dd = startOfDay(d);
    if (dd < startMonth || dd > end) continue;
    const key = localDateKey(dd);
    const entry = statsByDay.get(key) || { count: 0, hasSubstantial: false, distanceKm: 0, durationMinutes: 0 };
    entry.count += 1;
    const movingMin = safeNum(a.movingTime) / 60;
    entry.durationMinutes += movingMin;
    entry.distanceKm += safeNum(a.distance) / 1000;
    if (movingMin >= 30) entry.hasSubstantial = true;
    statsByDay.set(key, entry);
  }

  function classify(entry) {
    if (!entry || entry.count === 0) return 0;
    if (entry.count >= 2) return 3;
    if (entry.hasSubstantial) return 2;
    return 1;
  }

  // Génère les colonnes hebdo : aligner sur lundi
  // Trouve le lundi <= startMonth
  const firstMonday = new Date(startMonth);
  const dayOfWeek = (firstMonday.getDay() + 6) % 7; // L=0, D=6
  firstMonday.setDate(firstMonday.getDate() - dayOfWeek);
  firstMonday.setHours(0, 0, 0, 0);

  const columns = [];
  const monthsTracking = new Map(); // monthKey -> { firstCol, lastCol }
  let cursor = new Date(firstMonday);
  let colIdx = 0;
  while (cursor <= end) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(cursor);
      day.setDate(cursor.getDate() + i);
      if (day < startMonth || day > end) {
        days.push({ date: day, level: -1, count: 0, distanceKm: 0, durationMinutes: 0 });
      } else {
        const key = localDateKey(day);
        const entry = statsByDay.get(key);
        days.push({
          date: day,
          level: classify(entry),
          count: entry?.count || 0,
          distanceKm: Math.round((entry?.distanceKm || 0) * 10) / 10,
          durationMinutes: Math.round(entry?.durationMinutes || 0),
        });
      }
      // Track les colonnes par mois pour le label entête
      if (day >= startMonth && day <= end) {
        const mk = monthKey(day);
        const t = monthsTracking.get(mk) || { firstCol: colIdx, lastCol: colIdx, label: monthLabel(day), year: day.getFullYear() };
        t.lastCol = colIdx;
        monthsTracking.set(mk, t);
      }
    }
    columns.push({ weekStart: new Date(cursor), days });
    cursor = new Date(cursor.getTime() + 7 * MS_PER_DAY);
    colIdx += 1;
  }

  const monthsHeader = Array.from(monthsTracking.values()).map((t) => ({
    label: t.label,
    year: t.year,
    startCol: t.firstCol,
    endCol: t.lastCol,
  }));

  return { months: monthsHeader, columns };
}
