import { useMemo } from "react";
import AnalyticsFiltersBar from "../components/AnalyticsFiltersBar.jsx";
import AppShell from "../layouts/AppShell.jsx";
import KpiGrid from "../components/KpiGrid.jsx";
import WeeklyVolumeChart from "../components/WeeklyVolumeChart.jsx";
import PerformanceTrendChart from "../components/PerformanceTrendChart.jsx";
import RecentActivitiesCard from "../components/RecentActivitiesCard.jsx";
import useActivityViewModel from "../hooks/useActivityViewModel.js";
import { filterActivities } from "../utils/activityAggregations.js";
import { buildCurrentAccountModel } from "../utils/accountPresentation.js";
import { buildDashboardSnapshot, formatPace } from "../utils/activityInsights.js";
import { buildAnalyticsDateRange, getAnalyticsPresetLabel } from "../utils/analyticsPeriods.js";

function buildTooltip({ role, calculation, interpretation, extra = "" }) {
  return [
    { label: "En bref", text: role },
    { label: "Calcul", text: calculation },
    { label: "Lecture", text: extra ? `${interpretation} ${extra}` : interpretation },
  ].filter(Boolean);
}

const DASHBOARD_SECTION_INFO = {
  filters: buildTooltip({
    role: "Piloter tout le tableau de bord avec une seule periode et un seul perimetre sport.",
    calculation:
      "Tous les KPI et graphiques du tableau de bord sont recalcules sur la meme selection de dates, de sports et de recherche.",
    interpretation:
      "Vous comparez ainsi des blocs vraiment alignes entre eux.",
  }),
  weeklyVolume: buildTooltip({
    role: "Lire le volume semaine par semaine sur des semaines calendaires.",
    calculation:
      "Chaque barre correspond a une semaine du lundi au dimanche. Le tableau de bord s'appuie sur le perimetre sport/recherche actif, puis regroupe les activites par semaine. La ligne pointillee est une moyenne glissante sur 4 semaines.",
    interpretation:
      "Les barres montrent les pics de volume. La ligne aide a lire la tendance de fond sans se laisser tromper par une seule grosse semaine.",
  }),
  performanceTrend: buildTooltip({
    role: "Suivre l'evolution de l'allure moyenne et de la FC moyenne dans le temps.",
    calculation:
      "Chaque point resume une semaine. L'allure est ponderee par le temps de deplacement. La FC moyenne est ponderee par le temps des activites qui ont une mesure cardio.",
    interpretation:
      "Utile pour voir si votre vitesse repere change et si l'effort cardio evolue en meme temps.",
    extra: "L'allure n'est visible que sur les activites qui ont une allure exploitable.",
  }),
};

const DASHBOARD_KPI_INFO = {
  distanceWeek: buildTooltip({
    role: "Mesurer la distance de la semaine la plus recente affichee.",
    calculation:
      "On additionne les kilometres de la semaine la plus recente du tableau de bord, du lundi au dimanche. Si la semaine n'est pas terminee, la valeur est une semaine en cours a date.",
    interpretation:
      "Permet de voir tout de suite si le volume monte, baisse ou reste stable.",
  }),
  timeWeek: buildTooltip({
    role: "Mesurer le temps de deplacement de la semaine la plus recente affichee.",
    calculation:
      "On additionne le temps de deplacement de la semaine la plus recente, du lundi au dimanche. Si la semaine n'est pas terminee, la valeur est une semaine en cours a date.",
    interpretation:
      "Tres utile quand l'allure varie beaucoup d'une seance a l'autre.",
  }),
  elevationWeek: buildTooltip({
    role: "Mesurer le denivele positif de la semaine la plus recente affichee.",
    calculation:
      "On additionne le D+ de la semaine la plus recente, du lundi au dimanche. Si la semaine n'est pas terminee, la valeur est une semaine en cours a date.",
    interpretation:
      "Aide a distinguer une semaine vraiment vallonnee d'une semaine plus roulante.",
  }),
  sessionsWeek: buildTooltip({
    role: "Mesurer le nombre de seances de la semaine la plus recente affichee.",
    calculation:
      "On compte les activites de la semaine la plus recente, du lundi au dimanche. Si la semaine n'est pas terminee, la valeur est une semaine en cours a date.",
    interpretation:
      "Plus le chiffre monte, plus la pratique recente est dense.",
  }),
  paceWeek: buildTooltip({
    role: "Donner une allure moyenne repere sur la semaine la plus recente.",
    calculation:
      "On calcule une allure moyenne ponderee par le temps sur les activites qui ont une allure exploitable dans la semaine la plus recente.",
    interpretation:
      "A lire comme un repere global, pas comme un record de performance.",
    extra: "Surtout utile sur un perimetre course / trail.",
  }),
  loadWeek: buildTooltip({
    role: "Mesurer la charge de la semaine la plus recente affichee.",
    calculation:
      "On additionne la charge des seances de la semaine. Si un suffer score existe, on l'utilise. Sinon, on prend un proxy simple base sur distance + D+/100.",
    interpretation:
      "Permet de voir vite si la semaine recente a ete plus lourde ou plus legere.",
  }),
  loadVariation: buildTooltip({
    role: "Comparer la charge recente a la semaine precedente.",
    calculation:
      "Formule simple : variation % = (charge semaine actuelle - charge semaine precedente) / charge semaine precedente.",
    interpretation:
      "Une hausse rapide peut signaler un bloc de charge. Une baisse nette peut signaler une semaine plus legere.",
  }),
  fitness: buildTooltip({
    role: "Mesurer la base de travail construite sur plusieurs semaines.",
    calculation:
      "On prend une moyenne de charge sur 4 semaines pour lisser les variations de court terme.",
    interpretation:
      "Plus la valeur est haute, plus votre base d'entrainement recente est solide.",
  }),
  fatigue: buildTooltip({
    role: "Mesurer la charge tres recente.",
    calculation:
      "On regarde la charge accumulee sur les 7 derniers jours, quel que soit le passage entre deux semaines calendaires.",
    interpretation:
      "Plus la valeur est haute, plus la sollicitation recente est forte.",
  }),
  freshness: buildTooltip({
    role: "Lire l'equilibre entre base et fatigue recente.",
    calculation:
      "Formule simple : forme = fitness - fatigue.",
    interpretation:
      "Au-dessus de zero, vous etes plutot frais. En dessous de zero, la fatigue recente prend davantage de place.",
  }),
};

function formatDelta(value, suffix = "") {
  const numeric = Number(value || 0);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toLocaleString("fr-FR", {
    minimumFractionDigits: suffix === "%" ? 1 : 0,
    maximumFractionDigits: suffix === "%" ? 1 : 1,
  })}${suffix ? ` ${suffix}` : ""}`.trim();
}

function formatDistance(value) {
  return `${Number(value || 0).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

function formatHours(value) {
  return `${Number(value || 0).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h`;
}

function formatElevation(value) {
  return `${Math.round(Number(value || 0)).toLocaleString("fr-FR")} m`;
}

function getTrendTone(direction, overload) {
  if (overload) return "warning";
  if (direction === "up") return "positive";
  if (direction === "down") return "negative";
  return "neutral";
}

function getDirectionLabel(direction) {
  if (direction === "up") return "Charge en hausse";
  if (direction === "down") return "Charge en baisse";
  return "Charge stable";
}

export default function DashboardPage() {
  const {
    athlete,
    error,
    isLoading,
    safeActivities,
    filters,
    options,
    availableSports,
    setFilter,
    resetFilters,
    setOption,
  } = useActivityViewModel({ includeActivities: true });

  const account = useMemo(
    () => buildCurrentAccountModel({ athlete, options }),
    [athlete, options],
  );

  const dashboardRange = useMemo(
    () => buildAnalyticsDateRange({
      preset: options.dashboardPeriodPreset,
      customDateFrom: options.dashboardCustomDateFrom,
      customDateTo: options.dashboardCustomDateTo,
    }),
    [options.dashboardCustomDateFrom, options.dashboardCustomDateTo, options.dashboardPeriodPreset],
  );

  const dashboardFilters = useMemo(
    () => ({
      ...filters,
      dateFrom: dashboardRange.dateFrom,
      dateTo: dashboardRange.dateTo,
    }),
    [dashboardRange.dateFrom, dashboardRange.dateTo, filters],
  );

  const dashboardActivities = useMemo(
    () => filterActivities(safeActivities, dashboardFilters, { groupSports: options.groupSports }),
    [dashboardFilters, options.groupSports, safeActivities],
  );

  const dashboardScopeActivities = useMemo(
    () =>
      filterActivities(
        safeActivities,
        { ...filters, dateFrom: "", dateTo: "" },
        { groupSports: options.groupSports },
      ),
    [filters, options.groupSports, safeActivities],
  );

  const snapshot = useMemo(
    () => buildDashboardSnapshot(dashboardScopeActivities, {
      weeks: Math.max(4, Math.ceil(dashboardRange.days / 7)),
      recentLimit: 6,
      startDate: dashboardRange.start,
      endDate: dashboardRange.end,
    }),
    [dashboardRange.days, dashboardRange.end, dashboardRange.start, dashboardScopeActivities],
  );

  const currentWeek = snapshot.currentWeek || {};
  const previousWeek = snapshot.previousWeek || {};
  const loadSummary = snapshot.loadSummary || {};
  const scopeLabel = filters.sportGroup === "all" ? "toutes les activites" : filters.sportGroup;
  const searchNote = filters.search ? ` Recherche active : "${filters.search}".` : "";
  const scopeNote = `Perimetre actuel : ${scopeLabel}.${searchNote} Tableau de bord aligne sur ${getAnalyticsPresetLabel(options.dashboardPeriodPreset)}.`;
  const currentWeekIsPartial = Boolean(currentWeek?.weekEnd && dashboardRange.end < currentWeek.weekEnd);
  const currentWeekHint = currentWeek.label
    ? (currentWeekIsPartial ? `${currentWeek.label} · a date` : currentWeek.label)
    : "Semaine courante";

  const mainKpis = [
    {
      label: "Distance semaine",
      value: formatDistance(currentWeek.distanceKm),
      trend: `vs sem. prec. ${formatDelta((currentWeek.distanceKm || 0) - (previousWeek.distanceKm || 0), "km")}`,
      trendTone: (currentWeek.distanceKm || 0) >= (previousWeek.distanceKm || 0) ? "positive" : "negative",
      hint: currentWeekHint,
      info: DASHBOARD_KPI_INFO.distanceWeek,
    },
    {
      label: "Temps semaine",
      value: formatHours(currentWeek.movingHours),
      trend: `vs sem. prec. ${formatDelta((currentWeek.movingHours || 0) - (previousWeek.movingHours || 0), "h")}`,
      trendTone: (currentWeek.movingHours || 0) >= (previousWeek.movingHours || 0) ? "positive" : "negative",
      hint: "Volume deplacement",
      info: DASHBOARD_KPI_INFO.timeWeek,
    },
    {
      label: "D+ semaine",
      value: formatElevation(currentWeek.elevationGain),
      trend: `vs sem. prec. ${formatDelta((currentWeek.elevationGain || 0) - (previousWeek.elevationGain || 0), "m")}`,
      trendTone: (currentWeek.elevationGain || 0) >= (previousWeek.elevationGain || 0) ? "positive" : "negative",
      hint: "Charge terrain",
      info: DASHBOARD_KPI_INFO.elevationWeek,
    },
    {
      label: "Seances",
      value: currentWeek.count || 0,
      trend: `vs sem. prec. ${formatDelta((currentWeek.count || 0) - (previousWeek.count || 0))}`,
      trendTone: (currentWeek.count || 0) >= (previousWeek.count || 0) ? "positive" : "negative",
      hint: "Nombre d'activites",
      info: DASHBOARD_KPI_INFO.sessionsWeek,
    },
    {
      label: "Allure moyenne",
      value: formatPace(currentWeek.averagePaceSecondsPerKm),
      trend: previousWeek.averagePaceSecondsPerKm
        ? `sem. prec. ${formatPace(previousWeek.averagePaceSecondsPerKm)}`
        : "Pas de reference",
      trendTone: currentWeek.averagePaceSecondsPerKm > 0
        && previousWeek.averagePaceSecondsPerKm > 0
        && currentWeek.averagePaceSecondsPerKm <= previousWeek.averagePaceSecondsPerKm
        ? "positive"
        : "neutral",
      hint: "Allure ponderee",
      info: DASHBOARD_KPI_INFO.paceWeek,
    },
  ];

  const loadKpis = [
    {
      label: "Charge semaine",
      value: `${Number(loadSummary.currentWeekLoad || 0).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pts`,
      trend: loadSummary.previousWeekLoad
        ? `sem. prec. ${Number(loadSummary.previousWeekLoad).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pts`
        : "Pas de reference",
      trendTone: getTrendTone(loadSummary.direction, loadSummary.overload),
      hint: "Proxy suffer score ou distance + D+/100",
      info: DASHBOARD_KPI_INFO.loadWeek,
    },
    {
      label: "Variation charge",
      value: Number.isFinite(loadSummary.deltaPercent)
        ? `${loadSummary.deltaPercent > 0 ? "+" : ""}${loadSummary.deltaPercent.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
        : "-",
      trend: getDirectionLabel(loadSummary.direction),
      trendTone: getTrendTone(loadSummary.direction, loadSummary.overload),
      hint: loadSummary.overload ? "Alerte surcharge > +20%" : "Variation vs semaine precedente",
      info: DASHBOARD_KPI_INFO.loadVariation,
    },
    {
      label: "Fitness 4 sem.",
      value: `${Number(loadSummary.fitness || 0).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pts`,
      hint: "Moyenne charge 4 semaines",
      compact: true,
      info: DASHBOARD_KPI_INFO.fitness,
    },
    {
      label: "Fatigue 7 j",
      value: `${Number(loadSummary.fatigue || 0).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pts`,
      hint: "Charge recente",
      compact: true,
      info: DASHBOARD_KPI_INFO.fatigue,
    },
    {
      label: "Forme",
      value: `${Number(loadSummary.freshness || 0).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pts`,
      trend: loadSummary.freshness >= 0 ? "Frais" : "Charge residuelle",
      trendTone: loadSummary.freshness >= 0 ? "positive" : "negative",
      hint: "Fitness - fatigue",
      compact: true,
      info: DASHBOARD_KPI_INFO.freshness,
    },
  ];

  const handleDashboardPresetChange = (preset) => {
    if (preset === "custom") {
      setOption("dashboardPeriodPreset", "custom");
      if (!options.dashboardCustomDateFrom) {
        setOption("dashboardCustomDateFrom", dashboardRange.dateFrom);
      }
      if (!options.dashboardCustomDateTo) {
        setOption("dashboardCustomDateTo", dashboardRange.dateTo);
      }
      return;
    }

    setOption("dashboardPeriodPreset", preset);
  };

  const handleDashboardCustomDateChange = (name, value) => {
    setOption("dashboardPeriodPreset", "custom");
    const targetName = name === "analyticsCustomDateFrom" ? "dashboardCustomDateFrom" : "dashboardCustomDateTo";
    setOption(targetName, value);
  };

  const handleResetDashboard = () => {
    resetFilters();
    setOption("groupSports", true);
    setOption("dashboardPeriodPreset", "30d");
    setOption("dashboardCustomDateFrom", "");
    setOption("dashboardCustomDateTo", "");
  };

  return (
    <AppShell
      eyebrow="Tableau de bord"
      title="Tableau de bord"
      subtitle={`Vue de pilotage rapide sur ${scopeLabel}, filtree sur ${getAnalyticsPresetLabel(options.dashboardPeriodPreset)}.${searchNote}`}
      account={account}
    >
      {error ? <div className="alert alert-error section">{error}</div> : null}
      {isLoading && !dashboardActivities.length ? <div className="card section">Chargement des activites...</div> : null}

      <div className="section">
        <AnalyticsFiltersBar
          title="Filtres d'analyse"
          subtitle="Le tableau de bord reprend le meme pilotage de periode et de perimetre que l'onglet Analyses, avec un demarrage rapide sur 30 jours."
          infoTitle="Filtres d'analyse"
          infoContent={DASHBOARD_SECTION_INFO.filters}
          resetLabel="Reinitialiser le tableau de bord"
          preset={options.dashboardPeriodPreset}
          rangeLabel={dashboardRange.label}
          customDateFrom={options.dashboardCustomDateFrom}
          customDateTo={options.dashboardCustomDateTo}
          customDateFromOptionName="dashboardCustomDateFrom"
          customDateToOptionName="dashboardCustomDateTo"
          search={filters.search}
          sportGroup={filters.sportGroup}
          groupSports={options.groupSports}
          availableSports={availableSports}
          filteredCount={dashboardActivities.length}
          totalCount={dashboardScopeActivities.length}
          onPresetChange={handleDashboardPresetChange}
          onCustomDateChange={handleDashboardCustomDateChange}
          onSearchChange={(value) => setFilter("search", value)}
          onSportChange={(value) => setFilter("sportGroup", value)}
          onGroupSportsChange={(value) => setOption("groupSports", value)}
          onReset={handleResetDashboard}
          scopeNote={scopeNote}
        />
      </div>

      <div className="section">
        <KpiGrid items={mainKpis} />
      </div>

      <div className="section">
        <KpiGrid items={loadKpis} />
      </div>

      <div className="grid two-columns section">
        <WeeklyVolumeChart
          data={snapshot.weeklySeries}
          title="Volume hebdomadaire"
          subtitle="Volume par semaine calendaire sur le perimetre actif, avec tendance glissante sur 4 semaines."
          info={DASHBOARD_SECTION_INFO.weeklyVolume}
          dataKey="distanceKm"
          name="Distance (km)"
          unit="km"
        />
        <PerformanceTrendChart
          data={snapshot.weeklySeries}
          info={DASHBOARD_SECTION_INFO.performanceTrend}
        />
      </div>

      <div className="section">
        <RecentActivitiesCard
          activities={snapshot.recentActivities}
          returnPath="/"
          subtitle="Les dernieres seances de la selection courante pour relire rapidement le contexte recent."
        />
      </div>
    </AppShell>
  );
}
