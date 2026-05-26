/**
 * progressionOverviewModel.js — Modele metier pour l'onglet
 * `Progression > Vue d'ensemble` (page 17 du mockup, spec section 7).
 *
 * Sections livrees :
 *   1. cumulAnnuel : 6 KPI annuels (distance/temps/D+/activites/jours actifs/FC moy)
 *      avec sparkline 12 mois et delta vs annee precedente
 *   2. weeklyVolume : courbe Volume hebdo + moy glissante 4 sem (annee courante)
 *   3. cumulativeProgress : 3 progress bars Distance/Temps/D+ vs objectifs annuels
 *   4. highlights : Meilleur mois / Plus longue sortie / D+ le plus eleve
 *   5. monthlyProgression : bar chart 12 mois (distance + D+)
 *   6. regularity : % jours actifs, calendar mini, meilleure serie
 *   7. longTermTrends : 3 sparklines (charge, volume annuel, D+ annuel) — multi-annees
 *   8. yearOverYearCharts : 3 charts cumules (Distance/D+/Temps) 2025 vs 2024 vs objectif
 *   9. tip : conseil du jour
 */

import { buildWeeklySeries } from "./activityAggregations.js";
import { isRunLikeActivity } from "./activityInsights.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ROLLING_WINDOW = 4;

const DEFAULT_GOALS = {
  distanceKm: 2000,
  durationHours: 200,
  elevationM: 12000,
};

function toFiniteNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function safeDate(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
function startOfYear(d) { return new Date(d.getFullYear(), 0, 1); }
function endOfYear(d) { return new Date(d.getFullYear(), 11, 31, 23, 59, 59); }
function formatKm(n) {
  const v = toFiniteNumber(n);
  if (v <= 0) return "—";
  return `${Math.round(v).toLocaleString("fr-FR").replace(/\s/g, " ")} km`;
}
function formatHM(hours) {
  const v = Math.max(0, toFiniteNumber(hours));
  if (v <= 0) return "—";
  const h = Math.floor(v);
  const m = Math.round((v - h) * 60);
  return `${h} h ${String(m).padStart(2, "0")}`;
}
function formatMeters(n) {
  const v = Math.round(toFiniteNumber(n));
  if (v <= 0) return "—";
  return `${v.toLocaleString("fr-FR").replace(/\s/g, " ")} m`;
}
function formatInt(n) {
  const v = Math.round(toFiniteNumber(n));
  return v.toLocaleString("fr-FR").replace(/\s/g, " ");
}
function formatSignedPercent(p) {
  const v = toFiniteNumber(p);
  if (Math.abs(v) < 0.5) return "0 %";
  const sign = v > 0 ? "+" : "-";
  return `${sign}${Math.abs(v).toFixed(0)} %`;
}
function formatSignedBpm(v) {
  const n = toFiniteNumber(v);
  if (Math.abs(n) < 0.5) return "0 bpm";
  const sign = n > 0 ? "+" : "-";
  return `${sign}${Math.abs(n).toFixed(0)} bpm`;
}

function rollingAverage(values, window = ROLLING_WINDOW) {
  return values.map((_, idx) => {
    const start = Math.max(0, idx - window + 1);
    const slice = values.slice(start, idx + 1);
    const sum = slice.reduce((s, v) => s + toFiniteNumber(v), 0);
    return slice.length ? sum / slice.length : 0;
  });
}

function deltaPct(a, b) {
  if (b <= 0) return 0;
  return ((a - b) / b) * 100;
}

function activitiesInRange(activities, start, end) {
  return (Array.isArray(activities) ? activities : []).filter((a) => {
    const d = safeDate(a?.startDateLocal || a?.startDate);
    return d && d >= start && d <= end;
  });
}

/**
 * 1. Cumul annuel — 6 KPIs avec sparklines mois.
 */
function buildCumulAnnuel(activities, refDate) {
  const yearStart = startOfYear(refDate);
  const yearEnd = endOfYear(refDate);
  const prevYearStart = startOfYear(new Date(refDate.getFullYear() - 1, 0, 1));
  const prevYearEnd = endOfYear(new Date(refDate.getFullYear() - 1, 0, 1));

  const currentActs = activitiesInRange(activities, yearStart, yearEnd);
  const prevActs = activitiesInRange(activities, prevYearStart, prevYearEnd);

  const totalKm = (acts) => acts.reduce((s, a) => s + toFiniteNumber(a.distance) / 1000, 0);
  const totalHours = (acts) => acts.reduce((s, a) => s + toFiniteNumber(a.movingTime) / 3600, 0);
  const totalElev = (acts) => acts.reduce((s, a) => s + toFiniteNumber(a.totalElevationGain ?? a.elevationGain), 0);
  const activeDays = (acts) => new Set(
    acts.map((a) => {
      const d = safeDate(a?.startDateLocal || a?.startDate);
      return d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : null;
    }).filter(Boolean),
  ).size;
  const avgHr = (acts) => {
    const withHr = acts.filter((a) => toFiniteNumber(a.averageHeartrate) > 0);
    if (!withHr.length) return 0;
    return withHr.reduce((s, a) => s + toFiniteNumber(a.averageHeartrate), 0) / withHr.length;
  };

  // Sparklines : mois ecoulés uniquement (de janvier au mois en cours inclus)
  // pour eviter la "chute a zero" sur les mois futurs.
  const lastMonthIdx = refDate.getMonth(); // 0..11
  function monthlySpark(metricFn) {
    const arr = new Array(lastMonthIdx + 1).fill(0);
    currentActs.forEach((a) => {
      const d = safeDate(a?.startDateLocal || a?.startDate);
      if (d && d.getFullYear() === refDate.getFullYear() && d.getMonth() <= lastMonthIdx) {
        arr[d.getMonth()] += metricFn(a);
      }
    });
    return arr.map((v, i) => ({ x: i, y: Number(v.toFixed(1)) }));
  }

  const curr = {
    distance: totalKm(currentActs),
    hours: totalHours(currentActs),
    elev: totalElev(currentActs),
    count: currentActs.length,
    activeDays: activeDays(currentActs),
    avgHr: avgHr(currentActs),
  };
  const prev = {
    distance: totalKm(prevActs),
    hours: totalHours(prevActs),
    elev: totalElev(prevActs),
    count: prevActs.length,
    activeDays: activeDays(prevActs),
    avgHr: avgHr(prevActs),
  };

  const prevYear = refDate.getFullYear() - 1;
  return [
    {
      key: "distance",
      label: "Distance",
      iconKey: "location",
      formattedValue: formatKm(curr.distance),
      formattedDelta: `${formatSignedPercent(deltaPct(curr.distance, prev.distance))} vs ${prevYear}`,
      tone: curr.distance >= prev.distance ? "positive" : "warning",
      sparkline: monthlySpark((a) => toFiniteNumber(a.distance) / 1000),
      color: "#1268f3",
    },
    {
      key: "time",
      label: "Temps",
      iconKey: "clock",
      formattedValue: formatHM(curr.hours),
      formattedDelta: `${formatSignedPercent(deltaPct(curr.hours, prev.hours))} vs ${prevYear}`,
      tone: curr.hours >= prev.hours ? "positive" : "warning",
      sparkline: monthlySpark((a) => toFiniteNumber(a.movingTime) / 3600),
      color: "#7c3aed",
    },
    {
      key: "elevation",
      label: "Dénivelé+",
      iconKey: "mountain",
      formattedValue: formatMeters(curr.elev),
      formattedDelta: `${formatSignedPercent(deltaPct(curr.elev, prev.elev))} vs ${prevYear}`,
      tone: curr.elev >= prev.elev ? "positive" : "warning",
      sparkline: monthlySpark((a) => toFiniteNumber(a.totalElevationGain ?? a.elevationGain)),
      color: "#a855f7",
    },
    {
      key: "count",
      label: "Activités",
      iconKey: "runner",
      formattedValue: formatInt(curr.count),
      formattedDelta: `${formatSignedPercent(deltaPct(curr.count, prev.count))} vs ${prevYear}`,
      tone: curr.count >= prev.count ? "positive" : "warning",
      sparkline: monthlySpark(() => 1),
      color: "#f97316",
    },
    {
      key: "activeDays",
      label: "Jours actifs",
      iconKey: "calendar",
      formattedValue: formatInt(curr.activeDays),
      formattedDelta: `${formatSignedPercent(deltaPct(curr.activeDays, prev.activeDays))} vs ${prevYear}`,
      tone: curr.activeDays >= prev.activeDays ? "positive" : "warning",
      // Sparkline jours actifs par mois
      sparkline: (() => {
        const arr = new Array(lastMonthIdx + 1).fill(null).map(() => new Set());
        currentActs.forEach((a) => {
          const d = safeDate(a?.startDateLocal || a?.startDate);
          if (d && d.getFullYear() === refDate.getFullYear() && d.getMonth() <= lastMonthIdx) {
            arr[d.getMonth()].add(d.getDate());
          }
        });
        return arr.map((set, i) => ({ x: i, y: set.size }));
      })(),
      color: "#eab308",
    },
    {
      key: "avgHr",
      label: "FC moyenne",
      iconKey: "heart",
      formattedValue: curr.avgHr > 0 ? `${Math.round(curr.avgHr)} bpm` : "—",
      formattedDelta: prev.avgHr > 0 && curr.avgHr > 0
        ? `${formatSignedBpm(curr.avgHr - prev.avgHr)} vs ${prevYear}`
        : "—",
      // FC en baisse = signe d'amelioration cardiaque -> positive
      tone: curr.avgHr > 0 && prev.avgHr > 0
        ? (curr.avgHr <= prev.avgHr ? "positive" : "warning")
        : "neutral",
      sparkline: (() => {
        const sums = new Array(lastMonthIdx + 1).fill(0);
        const counts = new Array(lastMonthIdx + 1).fill(0);
        currentActs.forEach((a) => {
          const d = safeDate(a?.startDateLocal || a?.startDate);
          const hr = toFiniteNumber(a.averageHeartrate);
          if (d && d.getFullYear() === refDate.getFullYear() && hr > 0 && d.getMonth() <= lastMonthIdx) {
            sums[d.getMonth()] += hr;
            counts[d.getMonth()] += 1;
          }
        });
        return sums.map((s, i) => ({ x: i, y: counts[i] > 0 ? Math.round(s / counts[i]) : 0 }));
      })(),
      color: "#ef4444",
    },
  ];
}

/**
 * 2. Volume hebdomadaire — line + moy glissante 4 sem.
 */
function buildWeeklyVolume(activities, refDate) {
  const yearStart = startOfYear(refDate);
  const series = buildWeeklySeries(activities, {
    metric: "distanceKm",
    startDate: yearStart,
    endDate: refDate,
    weeks: 200,
    grouping: "calendar",
  });
  const values = series.map((s) => toFiniteNumber(s.value));
  const rolling = rollingAverage(values, ROLLING_WINDOW);
  const points = series.map((s, idx) => ({
    label: s.shortLabel || s.period,
    value: Number(values[idx].toFixed(1)),
    rolling: Number(rolling[idx].toFixed(1)),
  }));
  // On retient la derniere semaine ayant au moins une activite (la semaine en
  // cours est souvent partielle -> on prefere afficher S-1 si la courante est vide).
  let currentIdx = -1;
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (points[i].value > 0) { currentIdx = i; break; }
  }
  if (currentIdx === -1) currentIdx = points.length - 1;
  const currentPoint = points[currentIdx];
  return {
    points,
    current: currentPoint
      ? {
          weekLabel: currentPoint.label,
          formattedValue: `${currentPoint.value.toFixed(1).replace(".", ",")} km`,
          formattedRolling: `${currentPoint.rolling.toFixed(1).replace(".", ",")} km`,
          weekIndex: currentIdx + 1,
        }
      : null,
  };
}

/**
 * 3. Cumulatif depuis 1er janvier — 3 progress bars vs objectifs.
 */
function buildCumulativeProgress(activities, refDate, goals) {
  const yearStart = startOfYear(refDate);
  const acts = activitiesInRange(activities, yearStart, refDate);
  const totals = {
    distanceKm: acts.reduce((s, a) => s + toFiniteNumber(a.distance) / 1000, 0),
    durationHours: acts.reduce((s, a) => s + toFiniteNumber(a.movingTime) / 3600, 0),
    elevationM: acts.reduce((s, a) => s + toFiniteNumber(a.totalElevationGain ?? a.elevationGain), 0),
  };
  function pct(value, goal) {
    if (goal <= 0) return 0;
    return Math.min(999, Math.round((value / goal) * 100));
  }
  return [
    {
      key: "distance",
      label: "Distance",
      iconKey: "location",
      value: totals.distanceKm,
      goal: goals.distanceKm,
      formattedValue: formatKm(totals.distanceKm),
      formattedGoal: formatKm(goals.distanceKm),
      percent: pct(totals.distanceKm, goals.distanceKm),
      color: "#1268f3",
    },
    {
      key: "time",
      label: "Temps",
      iconKey: "clock",
      value: totals.durationHours,
      goal: goals.durationHours,
      formattedValue: formatHM(totals.durationHours),
      formattedGoal: formatHM(goals.durationHours),
      percent: pct(totals.durationHours, goals.durationHours),
      color: "#7c3aed",
    },
    {
      key: "elevation",
      label: "Dénivelé+",
      iconKey: "mountain",
      value: totals.elevationM,
      goal: goals.elevationM,
      formattedValue: formatMeters(totals.elevationM),
      formattedGoal: formatMeters(goals.elevationM),
      percent: pct(totals.elevationM, goals.elevationM),
      color: "#a855f7",
    },
  ];
}

/**
 * 4. Faits marquants — meilleur mois, plus longue sortie, D+ max.
 */
function buildHighlights(activities, refDate) {
  const yearStart = startOfYear(refDate);
  const acts = activitiesInRange(activities, yearStart, refDate);

  // Meilleur mois (en distance)
  const monthly = new Array(12).fill(0);
  acts.forEach((a) => {
    const d = safeDate(a?.startDateLocal || a?.startDate);
    if (d) monthly[d.getMonth()] += toFiniteNumber(a.distance) / 1000;
  });
  let bestMonthIdx = -1;
  let bestMonthVal = 0;
  monthly.forEach((v, i) => {
    if (v > bestMonthVal) { bestMonthVal = v; bestMonthIdx = i; }
  });
  const monthName = bestMonthIdx >= 0
    ? new Date(refDate.getFullYear(), bestMonthIdx, 1).toLocaleDateString("fr-FR", { month: "long" })
    : null;

  // Plus longue sortie
  let longestRun = null;
  acts.forEach((a) => {
    const dist = toFiniteNumber(a.distance);
    if (!longestRun || dist > toFiniteNumber(longestRun.distance)) longestRun = a;
  });
  // D+ max
  let maxElevRun = null;
  acts.forEach((a) => {
    const elev = toFiniteNumber(a.totalElevationGain ?? a.elevationGain);
    if (!maxElevRun || elev > toFiniteNumber(maxElevRun.totalElevationGain ?? maxElevRun.elevationGain)) {
      maxElevRun = a;
    }
  });

  function formatDate(d) {
    if (!d) return "";
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }

  return [
    {
      key: "bestMonth",
      iconKey: "trophy",
      title: "Meilleur mois",
      mainText: monthName ? monthName.charAt(0).toUpperCase() + monthName.slice(1) : "—",
      sideText: bestMonthVal > 0 ? formatKm(bestMonthVal) : "",
    },
    {
      key: "longestRun",
      iconKey: "ruler",
      title: "Plus longue sortie",
      mainText: longestRun ? `${(toFiniteNumber(longestRun.distance) / 1000).toFixed(1).replace(".", ",")} km` : "—",
      sideText: longestRun ? formatDate(safeDate(longestRun.startDateLocal || longestRun.startDate)) : "",
    },
    {
      key: "maxElev",
      iconKey: "mountain",
      title: "D+ le plus élevé",
      mainText: maxElevRun ? formatMeters(toFiniteNumber(maxElevRun.totalElevationGain ?? maxElevRun.elevationGain)) : "—",
      sideText: maxElevRun ? formatDate(safeDate(maxElevRun.startDateLocal || maxElevRun.startDate)) : "",
    },
  ];
}

/**
 * 5. Progression mensuelle — 12 mois bar chart (distance + D+).
 */
function buildMonthlyProgression(activities, refDate) {
  const year = refDate.getFullYear();
  const acts = activitiesInRange(activities, startOfYear(refDate), endOfYear(refDate));
  const monthsKm = new Array(12).fill(0);
  const monthsElev = new Array(12).fill(0);
  acts.forEach((a) => {
    const d = safeDate(a?.startDateLocal || a?.startDate);
    if (d) {
      monthsKm[d.getMonth()] += toFiniteNumber(a.distance) / 1000;
      monthsElev[d.getMonth()] += toFiniteNumber(a.totalElevationGain ?? a.elevationGain);
    }
  });
  const labels = ["Jan.", "Fév.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
  // Tronque aux mois ecoules (inclus le mois en cours)
  const lastMonthIdx = refDate.getMonth();
  return {
    year,
    points: labels.slice(0, lastMonthIdx + 1).map((label, i) => ({
      label,
      distanceKm: Number(monthsKm[i].toFixed(1)),
      elevationM: Math.round(monthsElev[i]),
    })),
  };
}

/**
 * 6. Régularité — % jours actifs (annee courante), meilleure serie de semaines.
 */
function buildRegularity(activities, refDate) {
  const yearStart = startOfYear(refDate);
  const acts = activitiesInRange(activities, yearStart, refDate);
  const activeDays = new Set();
  acts.forEach((a) => {
    const d = safeDate(a?.startDateLocal || a?.startDate);
    if (d) activeDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  });
  const daysSinceStart = Math.max(1, Math.floor((refDate - yearStart) / MS_PER_DAY) + 1);
  const expectedActiveDays = Math.floor(daysSinceStart * (4 / 7)); // hypothese 4 jours / semaine
  const percent = expectedActiveDays > 0
    ? Math.min(100, Math.round((activeDays.size / expectedActiveDays) * 100))
    : 0;

  // Calendrier mini sur 52 semaines : si >=1 sortie sem -> active
  const weeks = [];
  for (let w = 0; w < 52; w += 1) {
    const start = new Date(yearStart.getTime() + w * 7 * MS_PER_DAY);
    const end = new Date(start.getTime() + 7 * MS_PER_DAY);
    if (start > refDate) {
      weeks.push({ active: false, future: true });
      continue;
    }
    const hasAct = acts.some((a) => {
      const d = safeDate(a?.startDateLocal || a?.startDate);
      return d && d >= start && d < end;
    });
    weeks.push({ active: hasAct, future: false });
  }

  // Meilleure serie : nb max de semaines consecutives actives
  let bestStreak = 0;
  let curStreak = 0;
  weeks.forEach((w) => {
    if (w.active) {
      curStreak += 1;
      if (curStreak > bestStreak) bestStreak = curStreak;
    } else if (!w.future) {
      curStreak = 0;
    }
  });
  // Semaines actives ce mois
  const weeksActiveCurrent = weeks.filter((w) => w.active).length;

  return {
    percent,
    activeDays: activeDays.size,
    expectedDays: expectedActiveDays,
    weeks,
    bestStreak,
    activeWeeks: weeksActiveCurrent,
  };
}

/**
 * 7. Tendances long terme — 3 sparklines multi-annees (charge, volume, D+).
 *
 * Charge d'entrainement annuel = somme des loads (TRIMP estime). Si pas de FC
 * on retombe sur distance*intensite. Pour la 1ere version, on utilise distance
 * comme proxy (la valeur Charge sera enrichie quand on aura plus d'historique).
 */
function buildLongTermTrends(activities, refDate) {
  const currentYear = refDate.getFullYear();
  const years = [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear];

  function totalsForYear(year) {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);
    const acts = activitiesInRange(activities, start, end);
    return {
      year,
      distanceKm: acts.reduce((s, a) => s + toFiniteNumber(a.distance) / 1000, 0),
      elevationM: acts.reduce((s, a) => s + toFiniteNumber(a.totalElevationGain ?? a.elevationGain), 0),
      // Charge proxy : distance*intensite (utilise distance*1.1 si HR moyenne dispo)
      chargeProxy: acts.reduce((s, a) => {
        const km = toFiniteNumber(a.distance) / 1000;
        const hr = toFiniteNumber(a.averageHeartrate);
        const intensity = hr > 150 ? 1.3 : hr > 130 ? 1.1 : 0.9;
        return s + km * intensity;
      }, 0),
    };
  }

  // On ne garde que les annees ayant au moins une sortie pour eviter les
  // sparklines en "cloche" quand l'historique est court.
  const data = years
    .map(totalsForYear)
    .filter((d) => d.distanceKm > 0 || d.elevationM > 0);
  if (data.length === 0) {
    return [
      { key: "charge", label: "Charge d'entraînement", formattedValue: "—", formattedDelta: "", tone: "neutral", points: [], color: "#15803d" },
      { key: "volume", label: "Volume annuel (km)", formattedValue: "—", formattedDelta: "", tone: "neutral", points: [], color: "#1268f3" },
      { key: "elevation", label: "Dénivelé annuel", formattedValue: "—", formattedDelta: "", tone: "neutral", points: [], color: "#a855f7" },
    ];
  }
  const last = data[data.length - 1];
  const prev = data.length >= 2 ? data[data.length - 2] : { ...last, year: last.year - 1, distanceKm: 0, elevationM: 0, chargeProxy: 0 };

  function trendCard(key, label, fieldName, formatter, color) {
    const points = data.map((d) => ({ x: d.year, y: Number(d[fieldName].toFixed(1)) }));
    const currentValue = last[fieldName];
    const prevValue = prev[fieldName];
    const delta = deltaPct(currentValue, prevValue);
    return {
      key,
      label,
      formattedValue: formatter(currentValue),
      formattedDelta: prevValue > 0
        ? `${formatSignedPercent(delta)} vs ${prev.year}`
        : `${last.year}`,
      tone: delta >= 0 ? "positive" : "warning",
      points,
      color,
    };
  }

  return [
    trendCard("charge", "Charge d'entraînement", "chargeProxy", (v) => formatInt(v), "#15803d"),
    trendCard("volume", "Volume annuel (km)", "distanceKm", (v) => formatKm(v), "#1268f3"),
    trendCard("elevation", "Dénivelé annuel", "elevationM", (v) => formatMeters(v), "#a855f7"),
  ];
}

/**
 * 8. Year-over-Year cumulative charts (Distance / D+ / Temps).
 * Pour chaque jour de l'annee, somme cumulee depuis 1er janvier.
 */
function buildYearOverYearCharts(activities, refDate, goals) {
  const currentYear = refDate.getFullYear();
  const prevYear = currentYear - 1;

  function cumulativeSeries(year, fieldFn) {
    const yearStart = new Date(year, 0, 1);
    const acts = activitiesInRange(activities, yearStart, new Date(year, 11, 31, 23, 59, 59))
      .sort((a, b) => {
        const da = safeDate(a?.startDateLocal || a?.startDate);
        const db = safeDate(b?.startDateLocal || b?.startDate);
        return da - db;
      });
    // Sample par semaine pour reduire taille
    const samples = [];
    for (let w = 0; w < 52; w += 1) {
      const sampleDate = new Date(yearStart.getTime() + w * 7 * MS_PER_DAY);
      const total = acts
        .filter((a) => {
          const d = safeDate(a?.startDateLocal || a?.startDate);
          return d && d <= sampleDate;
        })
        .reduce((s, a) => s + fieldFn(a), 0);
      samples.push({ week: w, value: Number(total.toFixed(1)) });
    }
    return samples;
  }

  // Semaine ISO en cours (0-based depuis le 1er janvier).
  const currentYearStart = new Date(currentYear, 0, 1);
  const currentWeekIdx = Math.min(
    51,
    Math.floor((refDate - currentYearStart) / (7 * MS_PER_DAY)),
  );

  function buildChart(key, label, fieldFn, goal, formatter, color) {
    const current = cumulativeSeries(currentYear, fieldFn);
    const previous = cumulativeSeries(prevYear, fieldFn);
    // Goal line : interpolation lineaire 0 -> goal sur 52 semaines
    // Tronque toutes les series aux semaines ecoulees pour ne pas afficher
    // l'axe S22-S52 vide (la comparaison N-1 reste visible sur la meme fenetre).
    const points = current.slice(0, currentWeekIdx + 1).map((c, i) => ({
      week: c.week,
      label: `S${i + 1}`,
      current: c.value,
      previous: previous[i]?.value ?? null,
      objective: goal > 0 ? Number(((goal * (i + 1)) / 52).toFixed(1)) : null,
    }));
    return {
      key,
      label,
      formattedCurrent: formatter(current[currentWeekIdx]?.value || 0),
      points,
      color,
      colorPrevious: "#94a3b8",
      colorObjective: "#cbd5e1",
    };
  }

  return [
    buildChart("distance", "Distance cumulée (km)", (a) => toFiniteNumber(a.distance) / 1000, goals.distanceKm, (v) => formatKm(v), "#1268f3"),
    buildChart("elevation", "Dénivelé cumulé (m)", (a) => toFiniteNumber(a.totalElevationGain ?? a.elevationGain), goals.elevationM, (v) => formatMeters(v), "#a855f7"),
    buildChart("time", "Temps cumulé (h)", (a) => toFiniteNumber(a.movingTime) / 3600, goals.durationHours, (v) => formatHM(v), "#7c3aed"),
  ];
}

/**
 * Modele principal Progression > Vue d'ensemble.
 */
export function buildProgressionOverviewModel({
  activities = [],
  referenceDate = null,
  goals = DEFAULT_GOALS,
} = {}) {
  const ref = safeDate(referenceDate) || new Date();
  const runs = (Array.isArray(activities) ? activities : []).filter(isRunLikeActivity);
  if (runs.length === 0) {
    return {
      hasData: false,
      title: "Progression — Vue d'ensemble",
      emptyReason: "Pas encore assez de sorties pour construire ta vue d'ensemble.",
    };
  }

  const goalsResolved = { ...DEFAULT_GOALS, ...(goals || {}) };

  return {
    hasData: true,
    title: "Progression — Vue d'ensemble",
    cumulAnnuel: buildCumulAnnuel(runs, ref),
    weeklyVolume: buildWeeklyVolume(runs, ref),
    cumulativeProgress: buildCumulativeProgress(runs, ref, goalsResolved),
    highlights: buildHighlights(runs, ref),
    monthlyProgression: buildMonthlyProgression(runs, ref),
    regularity: buildRegularity(runs, ref),
    longTermTrends: buildLongTermTrends(runs, ref),
    yearOverYearCharts: buildYearOverYearCharts(runs, ref, goalsResolved),
    tip: "La progression est la somme de petites actions répétées chaque jour.",
  };
}

export { DEFAULT_GOALS };
