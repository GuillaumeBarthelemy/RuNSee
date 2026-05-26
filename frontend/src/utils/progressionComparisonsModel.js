/**
 * progressionComparisonsModel.js — Modele metier pour l'onglet
 * `Progression > Comparaisons` (page 20 du mockup).
 *
 * Sections livrees :
 *   1. kpi : 4 cartes (vs N-1 / vs 12 dernieres sem / Trail specifique / Équilibre route-trail)
 *   2. monthlyComparison : line chart 12 mois annee courante vs N-1 + footer (cumul + projection)
 *   3. twelveWeeksComparison : bar chart 12 sem courantes vs precedentes + footer (ecart)
 *   4. sportBreakdown : 2 donuts (annee courante vs N-1) + evolution par sport
 *   5. terrainElevation : progress bars D+ et D+/km annee courante vs N-1
 *   6. progressItems : "Ce qui progresse" (verts)
 *   7. watchItems : "À surveiller" (orange)
 *   8. coachAdvice : conseil du coach
 */

import { isRunLikeActivity } from "./activityInsights.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WEEKS_WINDOW = 12;

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
function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

function formatKm(n) {
  const v = toFiniteNumber(n);
  if (v <= 0) return "—";
  return `${Math.round(v).toLocaleString("fr-FR").replace(/\s/g, " ")} km`;
}
function formatMeters(n) {
  const v = Math.round(toFiniteNumber(n));
  if (v <= 0) return "—";
  return `${v.toLocaleString("fr-FR").replace(/\s/g, " ")} m`;
}
function formatSignedPercent(v) {
  const n = toFiniteNumber(v);
  if (Math.abs(n) < 0.5) return "0 %";
  const sign = n > 0 ? "+" : "-";
  return `${sign}${Math.abs(n).toFixed(0)} %`;
}
function formatSignedKm(v) {
  const n = toFiniteNumber(v);
  if (Math.abs(n) < 0.5) return "+0 km";
  const sign = n > 0 ? "+" : "-";
  return `${sign}${Math.round(Math.abs(n)).toLocaleString("fr-FR").replace(/\s/g, " ")} km`;
}
function formatSignedMeters(v) {
  const n = toFiniteNumber(v);
  if (Math.abs(n) < 0.5) return "+0 m";
  const sign = n > 0 ? "+" : "-";
  return `${sign}${Math.round(Math.abs(n)).toLocaleString("fr-FR").replace(/\s/g, " ")} m`;
}
function formatSignedPts(v) {
  const n = toFiniteNumber(v);
  if (Math.abs(n) < 0.5) return "0 pt";
  const sign = n > 0 ? "+" : "-";
  return `${sign}${Math.abs(n).toFixed(0)} pts`;
}
function deltaPct(curr, prev) {
  if (prev <= 0) return 0;
  return ((curr - prev) / prev) * 100;
}

function activitiesInRange(activities, start, end) {
  return (Array.isArray(activities) ? activities : []).filter((a) => {
    const d = safeDate(a?.startDateLocal || a?.startDate);
    return d && d >= start && d <= end;
  });
}

function totalKm(acts) {
  return acts.reduce((s, a) => s + toFiniteNumber(a.distance) / 1000, 0);
}
function totalElev(acts) {
  return acts.reduce((s, a) => s + toFiniteNumber(a.totalElevationGain ?? a.elevationGain), 0);
}

/**
 * Categorise une activite (trail / course / randonnee / autre).
 */
function categorizeSport(activity) {
  const sport = String(activity?.sportType || activity?.type || "").toLowerCase();
  const km = toFiniteNumber(activity?.distance) / 1000;
  const elev = toFiniteNumber(activity?.totalElevationGain ?? activity?.elevationGain);
  const elevPerKm = km > 0 ? elev / km : 0;
  if (sport.includes("trail") || elevPerKm >= 30) return "trail";
  if (sport === "run" || sport === "virtualrun") return "course";
  if (sport.includes("hike") || sport.includes("walk")) return "randonnee";
  return "autre";
}

const SPORT_META = {
  trail: { label: "Trail", color: "#15803d" },
  course: { label: "Course à pied", color: "#1268f3" },
  randonnee: { label: "Randonnée", color: "#a855f7" },
  autre: { label: "Autres", color: "#94a3b8" },
};

/**
 * 1. KPI : 4 cartes.
 */
function buildKpi(currentYearActs, prevYearActs, last12wActs, prev12wActs, refDate) {
  const prevYear = refDate.getFullYear() - 1;
  const prevMonthName = new Date(prevYear, refDate.getMonth(), 1).toLocaleDateString("fr-FR", { month: "long" });

  // Volume YTD vs YTD N-1
  const currKm = totalKm(currentYearActs);
  const prevKm = totalKm(prevYearActs);
  const ytdDelta = deltaPct(currKm, prevKm);

  // Volume 12 dernieres sem vs 12 sem precedentes
  const last12wKm = totalKm(last12wActs);
  const prev12wKm = totalKm(prev12wActs);
  const w12Delta = deltaPct(last12wKm, prev12wKm);

  // Trail specifique (annee courante)
  const trailKm = totalKm(currentYearActs.filter((a) => categorizeSport(a) === "trail"));
  const trailPctNow = currKm > 0 ? (trailKm / currKm) * 100 : 0;
  const prevTrailKm = totalKm(prevYearActs.filter((a) => categorizeSport(a) === "trail"));
  const trailPctPrev = prevKm > 0 ? (prevTrailKm / prevKm) * 100 : 0;
  const trailDeltaPts = trailPctNow - trailPctPrev;

  // Équilibre route/trail (annee courante) — route = course + autre
  const routeKm = totalKm(currentYearActs.filter((a) => {
    const c = categorizeSport(a);
    return c === "course" || c === "autre";
  }));
  const trailRouteTotal = routeKm + trailKm;
  const routePct = trailRouteTotal > 0 ? Math.round((routeKm / trailRouteTotal) * 100) : 0;
  const trailPct = trailRouteTotal > 0 ? 100 - routePct : 0;
  // Delta : evolution du % trail vs N-1
  const prevRouteKm = totalKm(prevYearActs.filter((a) => {
    const c = categorizeSport(a);
    return c === "course" || c === "autre";
  }));
  const prevTrailRouteTotal = prevRouteKm + prevTrailKm;
  const prevTrailPct = prevTrailRouteTotal > 0 ? (prevTrailKm / prevTrailRouteTotal) * 100 : 0;
  const balanceDeltaPts = trailPct - prevTrailPct;

  return [
    {
      key: "vs_n1",
      iconKey: "trend",
      label: `vs N-1 (${prevMonthName} ${prevYear})`,
      formattedValue: formatSignedPercent(ytdDelta),
      sublabel: "Volume",
      formattedHint: formatSignedKm(currKm - prevKm),
      tone: ytdDelta >= 0 ? "positive" : "warning",
    },
    {
      key: "vs_12w",
      iconKey: "clock",
      label: "vs 12 dernières semaines",
      formattedValue: formatSignedPercent(w12Delta),
      sublabel: "Volume",
      formattedHint: formatSignedKm(last12wKm - prev12wKm),
      tone: w12Delta >= 0 ? "positive" : "warning",
    },
    {
      key: "trail_specific",
      iconKey: "mountain",
      label: "Trail spécifique",
      formattedValue: `${Math.round(trailPctNow)} %`,
      sublabel: "du volume",
      formattedHint: `${formatSignedPts(trailDeltaPts)} vs N-1`,
      tone: trailDeltaPts >= 0 ? "positive" : "warning",
    },
    {
      key: "balance",
      iconKey: "balance",
      label: "Équilibre route / trail",
      formattedValue: `${routePct} % / ${trailPct} %`,
      sublabel: "Route / Trail",
      formattedHint: `${formatSignedPts(balanceDeltaPts)} trail vs N-1`,
      tone: balanceDeltaPts >= 0 ? "positive" : "warning",
    },
  ];
}

/**
 * 2. Comparaison mensuelle : 12 mois annee courante vs N-1.
 */
function buildMonthlyComparison(activities, refDate) {
  const year = refDate.getFullYear();
  const prevYear = year - 1;
  function monthsKm(y) {
    const arr = new Array(12).fill(0);
    activities.forEach((a) => {
      const d = safeDate(a?.startDateLocal || a?.startDate);
      if (d && d.getFullYear() === y) arr[d.getMonth()] += toFiniteNumber(a.distance) / 1000;
    });
    return arr.map((v) => Number(v.toFixed(1)));
  }
  const labels = ["Jan.", "Fév.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
  const currMonths = monthsKm(year);
  const prevMonths = monthsKm(prevYear);
  // current line tronquee aux mois ecoules pour eviter chute a zero
  const lastMonthIdx = refDate.getMonth();
  const points = labels.map((label, i) => ({
    label,
    current: i <= lastMonthIdx ? currMonths[i] : null,
    previous: prevMonths[i],
  }));

  // YTD cumul courant + N-1 ; projection annuelle
  const ytdCurrent = currMonths.slice(0, lastMonthIdx + 1).reduce((s, v) => s + v, 0);
  const ytdPrev = prevMonths.slice(0, lastMonthIdx + 1).reduce((s, v) => s + v, 0);
  const totalPrev = prevMonths.reduce((s, v) => s + v, 0);
  // Projection annuelle : extrapole le rythme YTD jusqu'a fin annee
  const daysElapsed = Math.max(1, Math.floor((refDate - startOfYear(refDate)) / MS_PER_DAY) + 1);
  const totalDays = 365;
  const projection = ytdCurrent > 0 ? (ytdCurrent / daysElapsed) * totalDays : 0;
  return {
    year,
    prevYear,
    points,
    ytdCurrent,
    ytdPrev,
    totalPrev,
    projection,
    formattedYtdCurrent: formatKm(ytdCurrent),
    formattedYtdPrev: formatKm(ytdPrev),
    formattedYtdDelta: formatSignedPercent(deltaPct(ytdCurrent, ytdPrev)),
    ytdDeltaTone: ytdCurrent >= ytdPrev ? "positive" : "warning",
    formattedProjection: formatKm(projection),
    formattedTotalPrev: formatKm(totalPrev),
    formattedProjectionDelta: formatSignedPercent(deltaPct(projection, totalPrev)),
    projectionDeltaTone: projection >= totalPrev ? "positive" : "warning",
    ytdMonthLabel: `${labels[0].replace(".", "")} – ${labels[lastMonthIdx].replace(".", "")}`,
  };
}

/**
 * 3. Bloc 12 semaines : comparaison 12 dernieres sem vs 12 sem precedentes.
 */
function buildTwelveWeeksComparison(activities, refDate) {
  // Bucket par semaine ISO (lundi)
  function weekStart(d) {
    const day = startOfDay(d);
    const wDay = day.getDay();
    const offset = wDay === 0 ? 6 : wDay - 1;
    return new Date(day.getTime() - offset * MS_PER_DAY);
  }
  // Liste les 24 dernieres semaines
  const lastWeekStart = weekStart(refDate);
  const buckets = [];
  for (let i = 23; i >= 0; i -= 1) {
    const start = new Date(lastWeekStart.getTime() - i * 7 * MS_PER_DAY);
    const end = new Date(start.getTime() + 7 * MS_PER_DAY - 1);
    const inWeek = activities.filter((a) => {
      const d = safeDate(a?.startDateLocal || a?.startDate);
      return d && d >= start && d <= end;
    });
    buckets.push({ start, weekNumber: 0, km: totalKm(inWeek) });
  }
  // Numerote semaines : on prend ISO week of the year
  function isoWeek(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  }
  buckets.forEach((b) => { b.weekNumber = isoWeek(b.start); });

  const current = buckets.slice(12); // 12 dernieres
  const previous = buckets.slice(0, 12); // 12 d'avant
  const currentKm = current.reduce((s, b) => s + b.km, 0);
  const previousKm = previous.reduce((s, b) => s + b.km, 0);
  const delta = currentKm - previousKm;
  const deltaPctVal = deltaPct(currentKm, previousKm);

  // Chart points : superpose current[i] vs previous[i] sur les memes labels (semaines courantes)
  const points = current.map((b, i) => ({
    label: `S${b.weekNumber}`,
    current: Number(b.km.toFixed(1)),
    previous: Number((previous[i]?.km ?? 0).toFixed(1)),
  }));

  return {
    points,
    currentLabel: `Période actuelle (sem. ${current[0].weekNumber}-${current[current.length - 1].weekNumber})`,
    previousLabel: `Période précédente (sem. ${previous[0].weekNumber}-${previous[previous.length - 1].weekNumber})`,
    formattedCurrent: formatKm(currentKm),
    formattedPrevious: formatKm(previousKm),
    formattedDelta: formatSignedKm(delta),
    formattedDeltaPct: formatSignedPercent(deltaPctVal),
    deltaTone: deltaPctVal >= 0 ? "positive" : "warning",
  };
}

/**
 * 4. Repartition par sport — 2 donuts (annee courante / N-1) + evolutions.
 */
function buildSportBreakdown(currentYearActs, prevYearActs, refDate) {
  function breakdown(acts) {
    const totals = { trail: 0, course: 0, randonnee: 0, autre: 0 };
    acts.forEach((a) => {
      const cat = categorizeSport(a);
      totals[cat] += toFiniteNumber(a.distance) / 1000;
    });
    const total = Object.values(totals).reduce((s, v) => s + v, 0);
    const items = ["trail", "course", "randonnee", "autre"].map((key) => ({
      key,
      label: SPORT_META[key].label,
      color: SPORT_META[key].color,
      km: Number(totals[key].toFixed(1)),
      percent: total > 0 ? Math.round((totals[key] / total) * 100) : 0,
    }));
    return { items, total };
  }
  const year = refDate.getFullYear();
  const current = breakdown(currentYearActs);
  const previous = breakdown(prevYearActs);

  // Évolutions par sport (pts)
  const evolutions = current.items.map((it) => {
    const prev = previous.items.find((p) => p.key === it.key) || { percent: 0 };
    const delta = it.percent - prev.percent;
    return {
      key: it.key,
      label: it.label,
      formattedDelta: `${formatSignedPts(delta)}`,
      tone: delta >= 0 ? "positive" : "warning",
    };
  });

  return {
    current: { ...current, label: `${year}`, subLabel: `1 janv. – ${refDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` },
    previous: { ...previous, label: `${year - 1}`, subLabel: `1 janv. – 31 déc.` },
    evolutions,
  };
}

/**
 * 5. Terrain & denivelé : D+ et D+/km, annee courante vs N-1.
 */
function buildTerrainElevation(currentYearActs, prevYearActs) {
  const currKm = totalKm(currentYearActs);
  const prevKm = totalKm(prevYearActs);
  const currElev = totalElev(currentYearActs);
  const prevElev = totalElev(prevYearActs);
  const currElevPerKm = currKm > 0 ? currElev / currKm : 0;
  const prevElevPerKm = prevKm > 0 ? prevElev / prevKm : 0;
  return {
    elevation: {
      title: "Dénivelé positif",
      unit: "m",
      curr: currElev,
      prev: prevElev,
      formattedCurr: formatMeters(currElev),
      formattedPrev: formatMeters(prevElev),
      formattedDelta: formatSignedPercent(deltaPct(currElev, prevElev)),
      formattedDeltaAbs: formatSignedMeters(currElev - prevElev),
      tone: currElev >= prevElev ? "positive" : "warning",
    },
    elevationPerKm: {
      title: "Dénivelé / km",
      unit: "m/km",
      curr: currElevPerKm,
      prev: prevElevPerKm,
      formattedCurr: `${Math.round(currElevPerKm)} m/km`,
      formattedPrev: `${Math.round(prevElevPerKm)} m/km`,
      formattedDelta: formatSignedPercent(deltaPct(currElevPerKm, prevElevPerKm)),
      formattedDeltaAbs: `${currElevPerKm >= prevElevPerKm ? "+" : "-"}${Math.round(Math.abs(currElevPerKm - prevElevPerKm))} m/km`,
      tone: currElevPerKm >= prevElevPerKm ? "positive" : "warning",
    },
  };
}

/**
 * 6. + 7. Insights contextualises.
 */
function buildInsights({ kpi, terrainElevation }) {
  const progress = [];
  const watch = [];

  // Volume YTD
  const ytd = kpi.find((k) => k.key === "vs_n1");
  if (ytd) {
    if (ytd.tone === "positive") {
      progress.push(`Volume en hausse de ${ytd.formattedValue} vs N-1, avec une belle dynamique depuis janvier.`);
    } else {
      watch.push(`Volume en baisse de ${ytd.formattedValue} vs N-1, surveille l'evolution sur les prochaines semaines.`);
    }
  }

  // Trail
  const trail = kpi.find((k) => k.key === "trail_specific");
  if (trail) {
    if (trail.tone === "positive") {
      progress.push(`Plus de trail (${trail.formattedHint}) et un meilleur ratio dénivelé / km (${terrainElevation.elevationPerKm.formattedDelta}).`);
    } else {
      watch.push(`Répartition route / trail encore perfectible : vise ${Math.max(60, Math.round(trail.formattedValue.replace(/\D/g, "")))} % trail selon ton objectif.`);
    }
  }

  // 12 weeks
  const w12 = kpi.find((k) => k.key === "vs_12w");
  if (w12) {
    if (w12.tone === "positive") {
      progress.push(`Régularité en progression sur les 12 dernières semaines (${w12.formattedValue}).`);
    } else {
      watch.push(`Charge des 12 dernières semaines : ${w12.formattedValue}, reste à l'écoute de ton corps.`);
    }
  }

  // À surveiller fallback
  if (watch.length === 0) {
    watch.push("Pense à intégrer des phases de récupération active toutes les 3 à 4 semaines.");
  }
  if (progress.length === 0) {
    progress.push("Reste régulier semaine après semaine pour construire une dynamique durable.");
  }

  return { progress, watch };
}

/**
 * Modele principal.
 */
export function buildProgressionComparisonsModel({
  activities = [],
  referenceDate = null,
} = {}) {
  const ref = safeDate(referenceDate) || new Date();
  const runs = (Array.isArray(activities) ? activities : []).filter(isRunLikeActivity);
  if (runs.length === 0) {
    return {
      hasData: false,
      title: "Progression — Comparaisons",
      emptyReason: "Pas encore assez de sorties pour comparer tes périodes.",
    };
  }

  // Fenetres temporelles
  const yearStart = startOfYear(ref);
  const prevYearStart = new Date(ref.getFullYear() - 1, 0, 1);
  const prevYearSameDate = new Date(ref.getFullYear() - 1, ref.getMonth(), ref.getDate(), 23, 59, 59);
  const prevYearEnd = endOfYear(new Date(ref.getFullYear() - 1, 0, 1));

  const currentYearActs = activitiesInRange(runs, yearStart, ref);
  // Pour YoY equitable on prend N-1 jusqu'a meme date
  const prevYearActsYtd = activitiesInRange(runs, prevYearStart, prevYearSameDate);
  // Pour le total N-1 (donuts) on prend annee complete
  const prevYearActsFull = activitiesInRange(runs, prevYearStart, prevYearEnd);

  // 12 weeks windows
  const last12wStart = new Date(ref.getTime() - WEEKS_WINDOW * 7 * MS_PER_DAY);
  const prev12wStart = new Date(last12wStart.getTime() - WEEKS_WINDOW * 7 * MS_PER_DAY);
  const last12wActs = activitiesInRange(runs, last12wStart, ref);
  const prev12wActs = activitiesInRange(runs, prev12wStart, last12wStart);

  const kpi = buildKpi(currentYearActs, prevYearActsYtd, last12wActs, prev12wActs, ref);
  const monthlyComparison = buildMonthlyComparison(runs, ref);
  const twelveWeeksComparison = buildTwelveWeeksComparison(runs, ref);
  const sportBreakdown = buildSportBreakdown(currentYearActs, prevYearActsFull, ref);
  const terrainElevation = buildTerrainElevation(currentYearActs, prevYearActsYtd);

  const insights = buildInsights({ kpi, terrainElevation });

  return {
    hasData: true,
    title: "Progression — Comparaisons",
    kpi,
    monthlyComparison,
    twelveWeeksComparison,
    sportBreakdown,
    terrainElevation,
    progressItems: insights.progress,
    watchItems: insights.watch,
    coachAdvice: "Continue sur cette lancée et structure tes prochaines semaines avec une semaine allégée toutes les 3 à 4 semaines pour assimiler la charge.",
  };
}
