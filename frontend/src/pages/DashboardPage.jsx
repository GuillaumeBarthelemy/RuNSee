import { useEffect, useMemo, useState } from "react";
import AppShell from "../layouts/AppShell.jsx";
import CoachAdviceBar from "../components/visuals/alpine/CoachAdviceBar.jsx";
import KpiCardCompact from "../components/visuals/alpine/KpiCardCompact.jsx";
import KpiChartCard from "../components/visuals/alpine/KpiChartCard.jsx";
import RecoveryKpiCard from "../components/visuals/alpine/RecoveryKpiCard.jsx";
import SuggestedWorkoutCard from "../components/visuals/alpine/SuggestedWorkoutCard.jsx";
import TodayReadingCard from "../components/visuals/alpine/TodayReadingCard.jsx";
import useActivityViewModel from "../hooks/useActivityViewModel.js";
import useRaceObjectives from "../hooks/useRaceObjectives.js";
import { getGarminRecoverySnapshots } from "../services/externalProvider.service.js";
import { filterActivities, RUN_SPORT_GROUP_LABEL } from "../utils/activityAggregations.js";
import { buildTodayConfidence } from "../utils/analysisConfidence.js";
import { buildAnalyticsDateRange } from "../utils/analyticsPeriods.js";
import {
  buildDashboardDecisionSummary,
} from "../utils/performanceNarratives.js";
import { buildRecoveryViewModel } from "../utils/recoveryViewModel.js";
import { buildTrainingLoadStateModel } from "../utils/trainingMetrics.js";
import { buildTrailContextSummary } from "../utils/trailProfile.js";
import { computeAvailabilityScore } from "../utils/availabilityScore.js";
import { buildSuggestedWorkout } from "../utils/dashboardSuggestedWorkout.js";
import {
  load7dTone,
  readinessTone,
  restingHrDeltaTone,
  sleepScoreTone,
} from "../utils/tonePicker.js";

const TODAY_PERIOD_PRESET = "7d";
const RECOVERY_SNAPSHOT_DAYS = 56;
const DEFAULT_TODAY_SPORT_GROUP = RUN_SPORT_GROUP_LABEL;
const CHART_DAYS = 14;

// ---------------------------------------------------------------------------
// Helpers locaux
// ---------------------------------------------------------------------------

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(value, amount) {
  const date = toDate(value) || new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function dateKey(value) {
  const d = toDate(value);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Agrège distance/durée/dénivelé par jour pour les 14 derniers jours.
 * Retourne un tableau [{ dateKey, distanceKm, hours, elevationGain }].
 */
function aggregateByDayLastN(activities = [], referenceDate = new Date(), days = 14) {
  const buckets = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(referenceDate, -i);
    buckets.set(dateKey(d), { dateKey: dateKey(d), distanceKm: 0, hours: 0, elevationGain: 0 });
  }
  for (const activity of activities) {
    const aDate = toDate(activity.startDateLocal || activity.startDate);
    if (!aDate) continue;
    const key = dateKey(aDate);
    if (!buckets.has(key)) continue;
    const b = buckets.get(key);
    const distanceMeters = toNumber(activity.distance);
    b.distanceKm += distanceMeters > 1000 ? distanceMeters / 1000 : distanceMeters;
    const movingSec = toNumber(activity.movingTime || activity.movingSeconds);
    b.hours += movingSec / 3600;
    b.elevationGain += Math.max(0, toNumber(activity.totalElevationGain || activity.elevationGain));
  }
  return Array.from(buckets.values());
}

/**
 * Format durée en "Xh32" depuis un nombre d'heures.
 */
function formatHours(hours) {
  if (hours == null || !Number.isFinite(hours) || hours <= 0) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} min`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

/**
 * Format delta heures (+0h32, -0h12) depuis un delta en heures.
 */
function formatHoursDelta(deltaHours) {
  if (deltaHours == null || !Number.isFinite(deltaHours) || deltaHours === 0) return "";
  const sign = deltaHours > 0 ? "+" : "-";
  const abs = Math.abs(deltaHours);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  if (h === 0) return `${sign}${m} min`;
  return `${sign}${h}h${String(m).padStart(2, "0")}`;
}

/**
 * Format delta entier signé (+4, -2, +421 m).
 */
function formatSignedInt(delta, unit = "") {
  if (delta == null || !Number.isFinite(delta)) return "";
  const sign = delta > 0 ? "+" : delta < 0 ? "-" : "";
  return `${sign}${Math.abs(Math.round(delta))}${unit ? ` ${unit}` : ""}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const {
    error,
    isLoading,
    safeActivities,
    options,
    trainingAnalyticsSettings,
  } = useActivityViewModel({ includeActivities: true });
  const { activeRace } = useRaceObjectives();
  const [recoverySnapshotData, setRecoverySnapshotData] = useState(null);

  useEffect(() => {
    let ignore = false;
    getGarminRecoverySnapshots({ days: RECOVERY_SNAPSHOT_DAYS })
      .then((data) => {
        if (!ignore) setRecoverySnapshotData(data || null);
      })
      .catch(() => { if (!ignore) setRecoverySnapshotData(null); });
    return () => { ignore = true; };
  }, []);

  const todayRange = buildAnalyticsDateRange({ preset: TODAY_PERIOD_PRESET });
  const trendStartDate = useMemo(() => addDays(todayRange.end, -55), [todayRange.end]);

  const dashboardActivities = useMemo(
    () => filterActivities(
      safeActivities,
      { search: "", sportGroup: DEFAULT_TODAY_SPORT_GROUP, dateFrom: todayRange.dateFrom, dateTo: todayRange.dateTo },
      { groupSports: true },
    ),
    [safeActivities, todayRange.dateFrom, todayRange.dateTo],
  );

  const dashboardScopeActivities = useMemo(
    () => filterActivities(
      safeActivities,
      { search: "", sportGroup: DEFAULT_TODAY_SPORT_GROUP, dateFrom: "", dateTo: "" },
      { groupSports: true },
    ),
    [safeActivities],
  );

  const trainingLoadModel = useMemo(
    () => buildTrainingLoadStateModel(dashboardScopeActivities, {
      startDate: todayRange.start,
      endDate: todayRange.end,
      granularity: "daily",
      weekStartsOn: options.userWeekStartsOn,
      settings: trainingAnalyticsSettings,
    }),
    [dashboardScopeActivities, options.userWeekStartsOn, todayRange.end, todayRange.start, trainingAnalyticsSettings],
  );

  const trendLoadModel = useMemo(
    () => buildTrainingLoadStateModel(dashboardScopeActivities, {
      startDate: trendStartDate,
      endDate: todayRange.end,
      granularity: "daily",
      weekStartsOn: options.userWeekStartsOn,
      settings: trainingAnalyticsSettings,
    }),
    [dashboardScopeActivities, options.userWeekStartsOn, todayRange.end, trainingAnalyticsSettings, trendStartDate],
  );

  const recoverySnapshots = useMemo(
    () => (Array.isArray(recoverySnapshotData?.snapshots) ? recoverySnapshotData.snapshots : []),
    [recoverySnapshotData],
  );

  const recoveryVm = useMemo(
    () => buildRecoveryViewModel(recoverySnapshots),
    [recoverySnapshots],
  );

  const dashboardDecisionModel = useMemo(
    () => buildDashboardDecisionSummary(trainingLoadModel, trendLoadModel, { recoverySnapshots }),
    [recoverySnapshots, trainingLoadModel, trendLoadModel],
  );

  const todayConfidence = useMemo(
    () => buildTodayConfidence({
      activities: dashboardActivities,
      loadModel: trainingLoadModel,
      recoverySnapshots,
      referenceDate: todayRange.end,
      duplicateFree: true,
    }),
    [dashboardActivities, recoverySnapshots, todayRange.end, trainingLoadModel],
  );

  const trailContext = useMemo(
    () => buildTrailContextSummary(dashboardScopeActivities, {
      referenceDate: todayRange.end,
      activeRace,
    }),
    [activeRace, dashboardScopeActivities, todayRange.end],
  );

  // --- Données graphes 14 j ---
  const chartData14j = useMemo(() => {
    const all = Array.isArray(trendLoadModel?.chartData) ? trendLoadModel.chartData : [];
    return all.slice(-CHART_DAYS);
  }, [trendLoadModel]);

  const dailyVolumeBuckets = useMemo(
    () => aggregateByDayLastN(dashboardScopeActivities, todayRange.end, CHART_DAYS),
    [dashboardScopeActivities, todayRange.end],
  );

  // --- Calculs KPI haut (mockup) ---
  const summary = trainingLoadModel?.summary || {};
  const tsbValue  = toNumber(summary.tsb);

  // ATL = Fatigue aiguë (Banister, fenêtre 7 j)
  const fatigueValue = toNumber(summary.atl);
  const atlDelta     = summary.atlDeltaValue ?? null;

  // Charge 7j cumulée (conservée pour la suggestion et les histos bruts)
  const charge7d = useMemo(() => {
    const last7 = chartData14j.slice(-7);
    return last7.reduce((sum, p) => sum + toNumber(p?.load), 0);
  }, [chartData14j]);

  // Volume agrégé sur 7j (compact bandeau) et 14j (KpiChartCard valeur)
  // → cohérence : compact affiche période "7 j", chart affiche total "14 j"
  const last7DaysAgg = useMemo(() => {
    const last7 = dailyVolumeBuckets.slice(-7);
    const prev7 = dailyVolumeBuckets.slice(-14, -7);
    const sumHours    = last7.reduce((s, b) => s + b.hours, 0);
    const sumDistance = last7.reduce((s, b) => s + b.distanceKm, 0);
    const sumElevation = last7.reduce((s, b) => s + b.elevationGain, 0);
    const prevHours    = prev7.reduce((s, b) => s + b.hours, 0);
    const prevDistance = prev7.reduce((s, b) => s + b.distanceKm, 0);
    const prevElevation = prev7.reduce((s, b) => s + b.elevationGain, 0);
    return {
      hours: sumHours,
      distanceKm: sumDistance,
      elevation: sumElevation,
      hoursDelta: sumHours - prevHours,
      distanceDelta: sumDistance - prevDistance,
      elevationDelta: sumElevation - prevElevation,
    };
  }, [dailyVolumeBuckets]);

  // Agrégats 14j pour KpiChartCard Volume et Dénivelé (valeur = même période que le graphe)
  const last14DaysAgg = useMemo(() => {
    const hours    = dailyVolumeBuckets.reduce((s, b) => s + b.hours, 0);
    const distanceKm = dailyVolumeBuckets.reduce((s, b) => s + b.distanceKm, 0);
    const elevation  = dailyVolumeBuckets.reduce((s, b) => s + b.elevationGain, 0);
    return { hours, distanceKm, elevation };
  }, [dailyVolumeBuckets]);

  // deltaCharge/deltaFatigue supprimés — remplacés par summary.ctlDeltaValue / summary.atlDeltaValue

  // Échelles + ticks pour les graphes Volume/Dénivelé (axe Y dynamique)
  const volumeChartScale = useMemo(() => {
    const peak = Math.max(0.5, ...dailyVolumeBuckets.map((b) => b.hours || 0));
    // Arrondi 0.5h supérieur pour avoir un max "rond"
    const max = Math.max(1, Math.ceil(peak * 2) / 2);
    return {
      max,
      ticks: [
        { value: max, label: formatHours(max) },
        { value: max / 2, label: formatHours(max / 2) },
        { value: 0, label: "0" },
      ],
    };
  }, [dailyVolumeBuckets]);

  const elevationChartScale = useMemo(() => {
    const peak = Math.max(100, ...dailyVolumeBuckets.map((b) => b.elevationGain || 0));
    // Arrondi 100m supérieur
    const max = Math.ceil(peak / 100) * 100;
    return {
      max,
      ticks: [
        { value: max, label: `${max}` },
        { value: max / 2, label: `${Math.round(max / 2)}` },
        { value: 0, label: "0" },
      ],
    };
  }, [dailyVolumeBuckets]);

  // Récupération (Aptitude RuNSee 0-100)
  const readinessScore = recoveryVm?.readiness?.score ?? null;
  const readinessTone1 = readinessScore != null ? readinessTone(readinessScore) : 3;

  // Disponibilité (composite Aptitude × TSB normalisé) — V6 validé
  // Calcul direct (pas de useMemo) car le helper est pur et léger.
  const availability = computeAvailabilityScore({ readinessScore, tsb: tsbValue });

  // Séance suggérée — orientation prudente sans valeurs inventées
  const suggestedWorkout = buildSuggestedWorkout({
    readinessScore,
    fatigueValue,
    charge7d,
  });

  // Tone du verdict pour TodayReadingCard
  const verdictTone = useMemo(() => {
    const t = dashboardDecisionModel?.recommendation?.tone;
    if (t === "positive") return 1;
    if (t === "warning") return 4;
    if (t === "negative") return 5;
    return 3;
  }, [dashboardDecisionModel]);

  return (
    <AppShell title="Aujourd'hui 👋">
      {error ? <div className="alert alert-error section">{error}</div> : null}
      {isLoading && !dashboardActivities.length ? (
        <div className="card section">Chargement des activités...</div>
      ) : null}

      {/* === Grille 6 KpiCardCompact === */}
      <section className="alpine-today-kpi-grid">
        <KpiCardCompact
          icon={<svg viewBox="0 0 24 24" fill="none"><path d="M3 17 L9 11 L13 14 L21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /><path d="M16 6 H21 V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
          label="Charge (7 j)"
          value={charge7d > 0 ? Math.round(charge7d) : "—"}
          unit="pts"
          hint={charge7d >= 600 ? "Très chargé" : charge7d >= 400 ? "Dense" : charge7d >= 200 ? "Standard" : "Léger"}
          delta=""
          tone={load7dTone(charge7d)}
        />
        <KpiCardCompact
          icon={<svg viewBox="0 0 24 24" fill="none"><path d="M3 17 L8 12 L12 14 L21 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
          label="Fatigue"
          value={fatigueValue > 0 ? Math.round(fatigueValue) : "—"}
          unit="pts"
          hint={fatigueValue >= 60 ? "Élevée" : fatigueValue >= 35 ? "Modérée" : "Basse"}
          delta={atlDelta != null ? `${formatSignedInt(atlDelta)} vs hier` : ""}
          tone={fatigueValue >= 60 ? 4 : fatigueValue >= 35 ? 3 : 2}
        />
        <KpiCardCompact
          icon={<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="13" width="3" height="7" fill="currentColor" /><rect x="10" y="9" width="3" height="11" fill="currentColor" /><rect x="16" y="5" width="3" height="15" fill="currentColor" /></svg>}
          label="Volume (7 j)"
          value={formatHours(last7DaysAgg.hours)}
          hint={last7DaysAgg.distanceKm > 0
            ? `${last7DaysAgg.distanceKm.toFixed(1)} km · ${last7DaysAgg.hours >= 6 ? "Bon" : last7DaysAgg.hours >= 3 ? "Standard" : "Léger"}`
            : (last7DaysAgg.hours >= 6 ? "Bon" : last7DaysAgg.hours >= 3 ? "Standard" : "Léger")}
          delta={last7DaysAgg.hoursDelta !== 0 ? `${formatHoursDelta(last7DaysAgg.hoursDelta)} vs sem. passée` : ""}
          tone={last7DaysAgg.hours >= 6 ? 1 : last7DaysAgg.hours >= 3 ? 2 : 3}
        />
        <KpiCardCompact
          icon={<svg viewBox="0 0 24 24" fill="none"><path d="M3 19 L8 12 L12 16 L17 8 L21 19 Z" fill="currentColor" /></svg>}
          label="Dénivelé (7 j)"
          value={`${Math.round(last7DaysAgg.elevation).toLocaleString("fr-FR")}`}
          unit="m"
          hint={last7DaysAgg.elevation >= 1000 ? "Bon" : last7DaysAgg.elevation >= 300 ? "Modéré" : "Faible"}
          delta={last7DaysAgg.elevationDelta !== 0 ? `${formatSignedInt(last7DaysAgg.elevationDelta, "m")} vs sem. passée` : ""}
          tone={last7DaysAgg.elevation >= 1000 ? 1 : last7DaysAgg.elevation >= 300 ? 2 : 3}
        />
        <KpiCardCompact
          label="Récupération"
          value={readinessScore != null ? `${readinessScore}` : "—"}
          unit="%"
          hint={readinessScore != null
            ? readinessScore >= 75 ? "Très bonne" : readinessScore >= 50 ? "Correcte" : readinessScore >= 25 ? "Limitée" : "Faible"
            : "Donnée Garmin"}
          tone={readinessTone1}
          gauge={{ value: readinessScore, tone: readinessTone1 }}
        />
        <KpiCardCompact
          label="Disponibilité"
          value={availability.score != null ? `${availability.score}` : "—"}
          unit="%"
          hint={availability.label}
          tone={availability.tone}
          gauge={{ value: availability.score, tone: availability.tone }}
        />
      </section>

      {/* === Lecture du jour === */}
      <TodayReadingCard
        title={dashboardDecisionModel?.recommendation?.label
          || dashboardDecisionModel?.insight
          || "Lecture du jour à compléter"}
        description={
          dashboardDecisionModel?.insight && dashboardDecisionModel?.insight !== dashboardDecisionModel?.recommendation?.label
            ? dashboardDecisionModel.insight
            : `${dashboardDecisionModel?.charge?.label ? `Charge ${dashboardDecisionModel.charge.label.toLowerCase()}` : ""}${dashboardDecisionModel?.fatigue?.label ? `, fatigue ${dashboardDecisionModel.fatigue.label.toLowerCase()}` : ""}.`
        }
        tone={verdictTone}
        confidenceLevel={todayConfidence?.level || "insufficient"}
        linkTo="/analytics"
      />

      {/* === Grille 4 KpiChartCard avec graphes 14 j ===
          Couleurs des tracés FIXES selon mockup (vert charge, bleu fatigue, bleu volume,
          vert dénivelé) — indépendantes du tone du KPI qui ne pilote que le hint. */}
      <section className="alpine-today-charts-grid">
        <KpiChartCard
          label="Charge d'entraînement"
          value={charge7d > 0 ? Math.round(charge7d) : "—"}
          unit="pts"
          hint={charge7d >= 600 ? "Très chargé" : charge7d >= 400 ? "Dense" : charge7d >= 200 ? "Standard" : "Léger"}
          delta=""
          tone={load7dTone(charge7d)}
          chart={{
            type: "line",
            data: chartData14j.map((p) => toNumber(p?.load)),
            color: "var(--al-success, #35a853)",
          }}
          axisLabels={["-14 j", "", "", "", "", "", "", "Aujourd'hui"]}
          footnote="Charge journalière (TRIMP). Continue progressivement."
        />
        <KpiChartCard
          label="Fatigue (ATL)"
          value={fatigueValue > 0 ? Math.round(fatigueValue) : "—"}
          unit="pts"
          hint={fatigueValue >= 60 ? "Élevée" : fatigueValue >= 35 ? "Modérée" : "Basse"}
          delta={atlDelta != null ? `${formatSignedInt(atlDelta)} vs hier` : ""}
          tone={fatigueValue >= 60 ? 4 : fatigueValue >= 35 ? 3 : 2}
          chart={{
            type: "line",
            data: chartData14j.map((p) => toNumber(p?.atl)),
            color: "var(--al-primary, #1268f3)",
          }}
          axisLabels={["-14 j", "", "", "", "", "", "", "Aujourd'hui"]}
          footnote="Fatigue aiguë sur 14 jours. Écoute ton corps."
        />
        <KpiChartCard
          label="Volume (14 j)"
          value={formatHours(last14DaysAgg.hours)}
          hint={last14DaysAgg.distanceKm > 0
            ? `${last14DaysAgg.distanceKm.toFixed(1)} km · ${last14DaysAgg.hours >= 10 ? "Bon volume" : "Standard"}`
            : (last14DaysAgg.hours >= 10 ? "Bon volume" : "Standard")}
          delta={last7DaysAgg.hoursDelta !== 0 ? `${formatHoursDelta(last7DaysAgg.hoursDelta)} vs sem. passée` : ""}
          tone={last14DaysAgg.hours >= 10 ? 1 : last14DaysAgg.hours >= 5 ? 2 : 3}
          chart={{
            type: "bar",
            data: dailyVolumeBuckets.map((b) => b.hours),
            color: "var(--al-primary, #1268f3)",
            min: 0,
            max: volumeChartScale.max,
            yAxis: { ticks: volumeChartScale.ticks },
          }}
          axisLabels={["-14 j", "", "", "", "", "", "", "Aujourd'hui"]}
          footnote="Total 14 derniers jours. Delta vs semaine précédente."
        />
        <KpiChartCard
          label="Dénivelé (14 j)"
          value={`${Math.round(last14DaysAgg.elevation).toLocaleString("fr-FR")}`}
          unit="m D+"
          hint={last14DaysAgg.elevation >= 2000 ? "Bon" : last14DaysAgg.elevation >= 600 ? "Modéré" : "Faible"}
          delta={last7DaysAgg.elevationDelta !== 0 ? `${formatSignedInt(last7DaysAgg.elevationDelta, "m")} vs sem. passée` : ""}
          tone={last14DaysAgg.elevation >= 2000 ? 1 : last14DaysAgg.elevation >= 600 ? 2 : 3}
          chart={{
            type: "bar",
            data: dailyVolumeBuckets.map((b) => b.elevationGain),
            color: "var(--al-success, #35a853)",
            min: 0,
            max: elevationChartScale.max,
            yAxis: { ticks: elevationChartScale.ticks },
          }}
          axisLabels={["-14 j", "", "", "", "", "", "", "Aujourd'hui"]}
          footnote="Total 14 derniers jours. Delta vs semaine précédente."
        />
      </section>

      {/* === Section bas : structure PDF page 5 (5 cartes) ===
          Récupération + Sommeil + FC repos + Disponibilité + Sortie suggérée.
          La VFC apparaît en hint de la carte Récupération (donnée secondaire).
          Lien "Voir le détail" → Analyse > Sommeil & récupération. */}
      <section className="alpine-today-recovery-row">
        <RecoveryKpiCard
          icon={<svg viewBox="0 0 24 24" fill="none"><path d="M12 4 L4 13 L12 22 L20 13 Z" fill="currentColor" /></svg>}
          label="Récupération"
          value={readinessScore != null ? `${readinessScore}` : "—"}
          unit="%"
          hint={readinessScore != null
            ? readinessScore >= 75 ? "Très bonne" : readinessScore >= 50 ? "Correcte" : readinessScore >= 25 ? "Limitée" : "Faible"
            : "Donnée Garmin"}
          delta={recoveryVm?.hrv?.recentAvg != null
            ? `VFC ${Math.round(recoveryVm.hrv.recentAvg)} ms`
            : ""}
          tone={readinessTone1}
          gaugeValue={readinessScore}
          linkTo="/analytics"
        />
        <RecoveryKpiCard
          icon={<svg viewBox="0 0 24 24" fill="none"><path d="M21 13 a8 8 0 1 1 -10 -10 a6.5 6.5 0 0 0 10 10 Z" fill="currentColor" /></svg>}
          label="Sommeil"
          value={recoveryVm?.sleep?.recentAvg != null ? `${Math.round(recoveryVm.sleep.recentAvg)}` : "—"}
          unit="/100"
          hint={recoveryVm?.sleep?.recentAvg != null
            ? recoveryVm.sleep.recentAvg >= 75 ? "Bonne qualité" : "À surveiller"
            : "Donnée absente"}
          delta={recoveryVm?.sleep?.deltaPct != null
            ? `${formatSignedInt(recoveryVm.sleep.deltaPct, "%")} vs repère`
            : ""}
          tone={recoveryVm?.sleep?.recentAvg != null ? sleepScoreTone(recoveryVm.sleep.recentAvg) : 3}
          chartData={Array.isArray(recoveryVm?.sleep?.series) ? recoveryVm.sleep.series.slice(-CHART_DAYS) : null}
          chartType="bar"
          linkTo="/analytics"
        />
        <RecoveryKpiCard
          icon={<svg viewBox="0 0 24 24" fill="none"><path d="M12 21 s-7 -5 -7 -11 a4 4 0 0 1 7 -2 a4 4 0 0 1 7 2 c0 6 -7 11 -7 11 Z" fill="currentColor" /></svg>}
          label="Fréquence cardiaque au repos"
          value={recoveryVm?.restingHr?.recentAvg != null ? `${Math.round(recoveryVm.restingHr.recentAvg)}` : "—"}
          unit="bpm"
          hint={recoveryVm?.restingHr?.recentAvg != null ? "Dans la norme" : "Donnée absente"}
          delta={recoveryVm?.restingHr?.deltaPct != null
            ? `${formatSignedInt(recoveryVm.restingHr.deltaPct, "%")} vs repère`
            : ""}
          tone={recoveryVm?.restingHr?.deltaPct != null ? restingHrDeltaTone(recoveryVm.restingHr.deltaPct) : 3}
          chartData={Array.isArray(recoveryVm?.restingHr?.series) ? recoveryVm.restingHr.series.slice(-CHART_DAYS) : null}
          chartType="line"
          linkTo="/analytics"
        />
        <RecoveryKpiCard
          icon={<svg viewBox="0 0 24 24" fill="none"><path d="M12 3 L4 7 L12 11 L20 7 Z M4 12 L12 16 L20 12 M4 17 L12 21 L20 17" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="round" /></svg>}
          label="Disponibilité"
          value={availability.score != null ? `${availability.score}` : "—"}
          unit="%"
          hint={availability.label}
          delta=""
          tone={availability.tone}
          gaugeValue={availability.score}
          linkTo="/analytics"
        />
        <SuggestedWorkoutCard
          title={suggestedWorkout.title}
          subtitle={suggestedWorkout.subtitle}
          tags={suggestedWorkout.tags}
          durationRange={suggestedWorkout.durationRange}
          terrain={suggestedWorkout.terrain}
          isPlaceholder={suggestedWorkout.isPlaceholder}
          linkTo="/analytics"
        />
      </section>

      {/* === Conseil du jour === */}
      <CoachAdviceBar
        tone={dashboardDecisionModel?.recommendation?.tone === "negative" ? "warning"
          : dashboardDecisionModel?.recommendation?.tone === "positive" ? "success"
          : "info"}
        icon="🏔️"
      >
        {dashboardDecisionModel?.recommendation?.label
          || dashboardDecisionModel?.insight
          || "Une sortie en endurance fondamentale renforce ta base sans ajouter de fatigue excessive."}
        {trailContext?.shouldShow && trailContext?.context ? ` ${trailContext.context}` : ""}
      </CoachAdviceBar>
    </AppShell>
  );
}
