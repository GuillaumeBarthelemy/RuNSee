/**
 * progressionRegularityModel.js — Modele metier pour l'onglet
 * `Progression > Régularité` (page 19 du mockup).
 *
 * Sections livrees :
 *   1. kpi : 4 cartes (Semaines actives / Serie actuelle / Sorties/sem / Jours actifs)
 *   2. heatmap : carte de regularite jour-par-jour sur l'annee (7 x 52)
 *   3. weeklyFrequency : bar chart 26 dernieres semaines + moy glissante 4 sem
 *   4. weekdayBreakdown : repartition % par jour de la semaine (Lun -> Dim)
 *   5. streakTimeline : liste des series de semaines consecutives actives
 *   6. takeaways : 4 messages contextualises (rail droit) + 1 conseil
 *   7. coachAdvice : footer
 */

import { isRunLikeActivity } from "./activityInsights.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ROLLING_WINDOW = 4;
const WEEKLY_FREQUENCY_WEEKS = 26;

function toFiniteNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function safeDate(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function dayKey(d) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }

// Lundi=0, Dim=6 (semaine ISO)
function weekdayIndex(d) {
  const w = d.getDay(); // 0=Dim, 1=Lun, ..., 6=Sam
  return w === 0 ? 6 : w - 1;
}
function startOfIsoWeek(d) {
  const day = startOfDay(d);
  const wi = weekdayIndex(day);
  return new Date(day.getTime() - wi * MS_PER_DAY);
}

function formatPct(n) {
  return `${Math.round(n).toString()} %`;
}
function formatNumber1(n) {
  const v = toFiniteNumber(n);
  return v.toFixed(1).replace(".", ",");
}
function formatDateLong(d) {
  if (!d) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
function formatDateShort(d, withYear = false) {
  if (!d) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "2-digit" } : {}),
  });
}

function rollingAverage(values, window = ROLLING_WINDOW) {
  return values.map((_, idx) => {
    const start = Math.max(0, idx - window + 1);
    const slice = values.slice(start, idx + 1);
    const sum = slice.reduce((s, v) => s + toFiniteNumber(v), 0);
    return slice.length ? sum / slice.length : 0;
  });
}

/**
 * 1. KPI : 4 cartes.
 */
function buildKpi(weeklyBuckets, perWeekActiveDays, currentStreakWeeks, streakStartDate) {
  const totalWeeks = weeklyBuckets.length;
  const activeWeeks = weeklyBuckets.filter((w) => w.count > 0).length;
  const pctWeeks = totalWeeks > 0 ? (activeWeeks / totalWeeks) * 100 : 0;

  const totalActivities = weeklyBuckets.reduce((s, w) => s + w.count, 0);
  const avgSortiesPerWeek = totalWeeks > 0 ? totalActivities / totalWeeks : 0;

  const avgActiveDays = perWeekActiveDays.length > 0
    ? perWeekActiveDays.reduce((s, v) => s + v, 0) / perWeekActiveDays.length
    : 0;

  return [
    {
      key: "weeks_active",
      label: "Semaines actives",
      iconKey: "calendar",
      value: activeWeeks,
      formattedValue: `${activeWeeks} / ${totalWeeks}`,
      hint: `${formatPct(pctWeeks)} du temps`,
      tone: pctWeeks >= 75 ? "positive" : pctWeeks >= 50 ? "neutral" : "warning",
    },
    {
      key: "current_streak",
      label: "Série actuelle",
      iconKey: "flame",
      value: currentStreakWeeks,
      formattedValue: `${currentStreakWeeks} semaine${currentStreakWeeks > 1 ? "s" : ""}`,
      hint: streakStartDate ? `Depuis le ${formatDateLong(streakStartDate)}` : "Aucune série",
      tone: currentStreakWeeks >= 4 ? "positive" : "neutral",
    },
    {
      key: "sorties_per_week",
      label: "Sorties / semaine",
      iconKey: "shoe",
      value: avgSortiesPerWeek,
      formattedValue: formatNumber1(avgSortiesPerWeek),
      hint: `Moyenne sur ${totalWeeks} semaines`,
      tone: avgSortiesPerWeek >= 3 ? "positive" : avgSortiesPerWeek >= 2 ? "neutral" : "warning",
    },
    {
      key: "active_days",
      label: "Jours actifs",
      iconKey: "check",
      value: avgActiveDays,
      formattedValue: `${formatNumber1(avgActiveDays)} / 7`,
      hint: "Jours différents en moyenne",
      tone: avgActiveDays >= 3.5 ? "positive" : avgActiveDays >= 2.5 ? "neutral" : "warning",
    },
  ];
}

/**
 * 2. Heatmap : pour chaque jour de l'annee, intensite (count d'activites + distance).
 *
 * Retourne 7 lignes (Lun-Dim) x N colonnes (semaines de l'annee) avec une cellule
 * { date, intensity 0..3 (0=none, 1=light, 2=moderate, 3=high) }.
 */
function buildHeatmap(activities, refDate, year) {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  // Calcule pour chaque jour la somme distance + count
  const dayStats = new Map();
  (Array.isArray(activities) ? activities : []).forEach((a) => {
    const d = safeDate(a?.startDateLocal || a?.startDate);
    if (d && d.getFullYear() === year) {
      const key = dayKey(d);
      const prev = dayStats.get(key) || { distance: 0, count: 0 };
      prev.distance += toFiniteNumber(a.distance) / 1000;
      prev.count += 1;
      dayStats.set(key, prev);
    }
  });
  // Determine seuils d'intensite (quartiles des distances > 0)
  const distances = [...dayStats.values()].map((v) => v.distance).filter((d) => d > 0).sort((a, b) => a - b);
  const q = (p) => distances[Math.floor((distances.length - 1) * p)] || 0;
  const thresholds = {
    light: q(0.33),
    moderate: q(0.66),
    high: q(0.9),
  };
  function intensity(d) {
    if (d <= 0) return 0;
    if (d <= thresholds.light) return 1;
    if (d <= thresholds.moderate) return 2;
    return 3;
  }

  // Genere la grille : 7 lignes (Lun-Dim) x ~53 colonnes (semaines)
  // Chaque colonne = semaine commencant le lundi
  const firstMonday = startOfIsoWeek(yearStart);
  // Si firstMonday est avant le 1er janvier, on commence la grille la
  const grid = [];
  let cursor = new Date(firstMonday);
  const rowsByWeekday = Array.from({ length: 7 }, () => []);
  while (cursor <= yearEnd) {
    for (let wi = 0; wi < 7; wi += 1) {
      const cellDate = new Date(cursor.getTime() + wi * MS_PER_DAY);
      const inYear = cellDate.getFullYear() === year;
      const isFuture = cellDate > refDate;
      const stats = inYear && !isFuture ? (dayStats.get(dayKey(cellDate)) || { distance: 0, count: 0 }) : null;
      rowsByWeekday[wi].push({
        date: cellDate,
        inYear,
        future: isFuture,
        intensity: stats ? intensity(stats.distance) : 0,
        distance: stats ? Number(stats.distance.toFixed(1)) : 0,
        count: stats ? stats.count : 0,
      });
    }
    cursor = new Date(cursor.getTime() + 7 * MS_PER_DAY);
  }
  grid.push(...rowsByWeekday);

  // Labels colonnes : mois (sur le premier jour du mois)
  const columnsCount = rowsByWeekday[0].length;
  const monthLabels = new Array(columnsCount).fill("");
  let lastMonth = -1;
  for (let c = 0; c < columnsCount; c += 1) {
    const date = rowsByWeekday[0][c].date;
    if (date.getMonth() !== lastMonth && date.getFullYear() === year) {
      monthLabels[c] = date.toLocaleDateString("fr-FR", { month: "short" });
      lastMonth = date.getMonth();
    }
  }

  return {
    year,
    rows: grid,
    weekdayLabels: ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."],
    monthLabels,
    legend: [
      { label: "Aucune activité", level: 0 },
      { label: "Activité légère", level: 1 },
      { label: "Activité modérée", level: 2 },
      { label: "Activité élevée", level: 3 },
    ],
  };
}

/**
 * Construit les buckets hebdomadaires sur une periode donnee.
 */
function buildWeeklyBuckets(activities, startDate, endDate) {
  const buckets = [];
  let cursor = startOfIsoWeek(startDate);
  const acts = Array.isArray(activities) ? activities : [];
  while (cursor <= endDate) {
    const next = new Date(cursor.getTime() + 7 * MS_PER_DAY);
    const inWeek = acts.filter((a) => {
      const d = safeDate(a?.startDateLocal || a?.startDate);
      return d && d >= cursor && d < next;
    });
    const days = new Set(inWeek.map((a) => {
      const d = safeDate(a?.startDateLocal || a?.startDate);
      return d ? dayKey(d) : null;
    }).filter(Boolean));
    buckets.push({
      start: new Date(cursor),
      end: new Date(next - 1),
      count: inWeek.length,
      activeDays: days.size,
    });
    cursor = next;
  }
  return buckets;
}

/**
 * 3. Frequence hebdomadaire — 26 dernieres semaines.
 */
function buildWeeklyFrequency(weeklyBuckets) {
  const slice = weeklyBuckets.slice(-WEEKLY_FREQUENCY_WEEKS);
  const counts = slice.map((b) => b.count);
  const rolling = rollingAverage(counts, ROLLING_WINDOW);
  return slice.map((b, i) => ({
    label: formatDateShort(b.start),
    count: counts[i],
    rolling: Number(rolling[i].toFixed(1)),
  }));
}

/**
 * 4. Repartition par jour de la semaine — % sorties.
 */
function buildWeekdayBreakdown(activities) {
  const buckets = [0, 0, 0, 0, 0, 0, 0];
  (Array.isArray(activities) ? activities : []).forEach((a) => {
    const d = safeDate(a?.startDateLocal || a?.startDate);
    if (d) buckets[weekdayIndex(d)] += 1;
  });
  const total = buckets.reduce((s, v) => s + v, 0);
  const labels = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  return labels.map((label, i) => ({
    label,
    count: buckets[i],
    percent: total > 0 ? Math.round((buckets[i] / total) * 100) : 0,
  }));
}

/**
 * 5. Timeline des series : detecte les sequences de semaines consecutives actives.
 */
function buildStreakTimeline(weeklyBuckets, refDate) {
  const streaks = [];
  let current = null;
  weeklyBuckets.forEach((b, idx) => {
    if (b.count > 0) {
      if (!current) {
        current = { start: b.start, end: b.end, weeks: 1, indices: [idx] };
      } else {
        current.end = b.end;
        current.weeks += 1;
        current.indices.push(idx);
      }
    } else if (current) {
      streaks.push(current);
      current = null;
    }
  });
  if (current) streaks.push(current);

  // Annote la serie courante (celle contenant refDate ou la derniere)
  // Affiche l'annee si streak s'etend sur plusieurs annees.
  const annotated = streaks.map((s) => {
    const isCurrent = refDate >= s.start && refDate <= s.end;
    const spansYears = s.start.getFullYear() !== s.end.getFullYear();
    return {
      ...s,
      isCurrent,
      label: `${formatDateShort(s.start, spansYears)} – ${formatDateShort(s.end, spansYears)}`,
      formattedDuration: isCurrent
        ? `${s.weeks} semaine${s.weeks > 1 ? "s" : ""} (en cours)`
        : `${s.weeks} semaine${s.weeks > 1 ? "s" : ""}`,
    };
  });

  return {
    streaks: annotated,
    // Pour la timeline visuelle : un tableau de cellules (semaines) avec activeFlag
    cells: weeklyBuckets.map((b) => ({
      start: b.start,
      active: b.count > 0,
    })),
  };
}

/**
 * Detecte la serie courante (suite ininterrompue se terminant a la semaine actuelle).
 */
function detectCurrentStreak(weeklyBuckets, refDate) {
  if (!weeklyBuckets.length) return { weeks: 0, startDate: null };
  // Trouve l'index de la semaine contenant refDate
  let lastActiveIdx = -1;
  for (let i = weeklyBuckets.length - 1; i >= 0; i -= 1) {
    const b = weeklyBuckets[i];
    if (refDate >= b.start) {
      lastActiveIdx = i;
      break;
    }
  }
  if (lastActiveIdx === -1) return { weeks: 0, startDate: null };
  // Si la semaine courante (partielle) est vide, on demarre la recherche
  // sur la semaine precedente — sinon on tronquerait artificiellement la serie.
  let startIdx = lastActiveIdx;
  if (!weeklyBuckets[startIdx].count && startIdx > 0) startIdx -= 1;
  if (!weeklyBuckets[startIdx].count) return { weeks: 0, startDate: null };
  let weeks = 0;
  let startDate = null;
  for (let i = startIdx; i >= 0; i -= 1) {
    if (weeklyBuckets[i].count > 0) {
      weeks += 1;
      startDate = weeklyBuckets[i].start;
    } else {
      break;
    }
  }
  return { weeks, startDate };
}

/**
 * 6. Takeaways "À retenir" contextualises.
 */
function buildTakeaways(kpi) {
  const items = [];
  const weeksActive = kpi.find((k) => k.key === "weeks_active");
  const streak = kpi.find((k) => k.key === "current_streak");
  const sorties = kpi.find((k) => k.key === "sorties_per_week");
  const activeDays = kpi.find((k) => k.key === "active_days");

  if (weeksActive) {
    const pct = Math.round((weeksActive.value / Math.max(1, Number(weeksActive.formattedValue.split(" / ")[1]))) * 100);
    items.push({
      key: "weeks_active",
      iconKey: "leaf",
      title: pct >= 80 ? "Très bonne régularité" : pct >= 60 ? "Bonne régularité" : "Régularité à consolider",
      text: pct >= 80
        ? `Tu as été actif ${pct} % des semaines sur cette période. Garde le cap !`
        : pct >= 60
          ? `${pct} % de semaines actives, une base solide à renforcer.`
          : `${pct} % de semaines actives. Vise une sortie hebdo régulière pour stabiliser ta progression.`,
      tone: pct >= 80 ? "positive" : pct >= 60 ? "neutral" : "warning",
    });
  }

  if (streak && streak.value > 0) {
    items.push({
      key: "current_streak",
      iconKey: "flame",
      title: "Série actuelle",
      text: `${streak.formattedValue} d'affilée : ${streak.value >= 4 ? "belle constance. Chaque semaine compte !" : "construis cette dynamique semaine après semaine."}`,
      tone: streak.value >= 4 ? "positive" : "neutral",
    });
  }

  if (sorties) {
    items.push({
      key: "sorties",
      iconKey: "shoe",
      title: "Sorties / semaine",
      text: `${sorties.formattedValue} en moyenne. ${sorties.value >= 3 ? "Une fréquence solide et équilibrée." : sorties.value >= 2 ? "Bonne base, envisage une sortie supplémentaire." : "Vise au moins 2 sorties par semaine pour progresser."}`,
      tone: sorties.value >= 3 ? "positive" : sorties.value >= 2 ? "neutral" : "warning",
    });
  }

  if (activeDays) {
    items.push({
      key: "active_days",
      iconKey: "calendar",
      title: "Jours d'entraînement",
      text: `${activeDays.formattedValue.split(" / ")[0]} jours différents en moyenne. ${activeDays.value >= 3.5 ? "Continue à varier tes jours pour progresser durablement." : "Varie davantage tes jours pour répartir la charge."}`,
      tone: activeDays.value >= 3.5 ? "positive" : "neutral",
    });
  }

  return items;
}

/**
 * Modele principal Régularité.
 */
export function buildProgressionRegularityModel({
  activities = [],
  referenceDate = null,
  periodDays = null, // si null -> 12 mois glissants
} = {}) {
  const ref = safeDate(referenceDate) || new Date();
  const runs = (Array.isArray(activities) ? activities : []).filter(isRunLikeActivity);
  if (runs.length === 0) {
    return {
      hasData: false,
      title: "Progression — Régularité",
      emptyReason: "Pas encore assez de sorties pour évaluer ta régularité.",
    };
  }

  // Periode d'analyse : par defaut 12 mois glissants
  const days = periodDays && periodDays > 0 ? periodDays : 365;
  const periodStart = startOfIsoWeek(new Date(ref.getTime() - days * MS_PER_DAY));
  const periodEnd = ref;

  // Buckets hebdomadaires sur la periode
  const weeklyBuckets = buildWeeklyBuckets(runs, periodStart, periodEnd);
  const perWeekActiveDays = weeklyBuckets.map((b) => b.activeDays);

  // Serie courante
  const { weeks: currentStreakWeeks, startDate: streakStartDate } = detectCurrentStreak(weeklyBuckets, ref);

  // KPIs
  const kpi = buildKpi(weeklyBuckets, perWeekActiveDays, currentStreakWeeks, streakStartDate);

  // Heatmap pour l'annee de ref
  const heatmap = buildHeatmap(runs, ref, ref.getFullYear());

  // Frequence hebdo (26 dernieres semaines)
  const weeklyFrequency = buildWeeklyFrequency(weeklyBuckets);

  // Repartition par jour
  const acts26w = runs.filter((a) => {
    const d = safeDate(a?.startDateLocal || a?.startDate);
    return d && d >= new Date(ref.getTime() - WEEKLY_FREQUENCY_WEEKS * 7 * MS_PER_DAY);
  });
  const weekdayBreakdown = buildWeekdayBreakdown(acts26w);

  // Timeline des series
  const streakTimeline = buildStreakTimeline(weeklyBuckets, ref);

  // Takeaways
  const takeaways = buildTakeaways(kpi);

  return {
    hasData: true,
    title: "Progression — Régularité",
    subtitle: "Suis ton évolution dans le temps et consolide ta régularité.",
    kpi,
    heatmap,
    weeklyFrequency,
    weekdayBreakdown,
    streakTimeline,
    takeaways,
    coachAdvice: "La régularité est ta meilleure alliée. Mieux vaut un peu chaque semaine qu'un beaucoup irrégulier.",
    tipCard: {
      title: "Le conseil",
      text: "La régularité l'emporte toujours sur l'intensité. Construis, semaine après semaine.",
    },
  };
}
