import { useMemo } from "react";
import AnalyticsFiltersBar from "../components/AnalyticsFiltersBar.jsx";
import BestEffortsPanel from "../components/BestEffortsPanel.jsx";
import DistanceDistributionChart from "../components/DistanceDistributionChart.jsx";
import InfoTooltip from "../components/InfoTooltip.jsx";
import IntensityDistributionChart from "../components/IntensityDistributionChart.jsx";
import KpiGrid from "../components/KpiGrid.jsx";
import MonthlyVolumeChart from "../components/MonthlyVolumeChart.jsx";
import PeriodComparisonSection from "../components/PeriodComparisonSection.jsx";
import RollingLoadChart from "../components/RollingLoadChart.jsx";
import WeeklyVolumeChart from "../components/WeeklyVolumeChart.jsx";
import useActivityViewModel from "../hooks/useActivityViewModel.js";
import AppShell from "../layouts/AppShell.jsx";
import {
  buildDistanceDistribution,
  buildMonthlySeries,
  filterActivities,
} from "../utils/activityAggregations.js";
import { buildCurrentAccountModel } from "../utils/accountPresentation.js";
import {
  buildBestEfforts,
  buildIntensityDistribution,
  buildRegularitySummary,
  buildTrainingStateTimeline,
  buildTrainingStatusSummary,
  isRunLikeActivity,
} from "../utils/activityInsights.js";
import { buildAnalyticsDateRange, getAnalyticsGranularity, getAnalyticsPresetLabel } from "../utils/analyticsPeriods.js";

function formatLoad(value) {
  return `${Number(value || 0).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pts`;
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

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return `${value > 0 ? "+" : ""}${Number(value).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

function formatRatio(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }

  return Number(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getTrendToneFromDelta(value) {
  if (!Number.isFinite(value)) return "neutral";
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

function getFreshnessTone(label) {
  if (label === "Frais") return "positive";
  if (label === "Charge") return "warning";
  return "neutral";
}

function getRatioTone(label) {
  if (label === "Eleve") return "warning";
  if (label === "Bas") return "negative";
  return "positive";
}

function buildTooltip({ role, calculation, interpretation, extra = "" }) {
  return [
    { label: "En bref", text: role },
    { label: "Calcul", text: calculation },
    { label: "Lecture", text: extra ? `${interpretation} ${extra}` : interpretation },
  ].filter(Boolean);
}

const SECTION_INFO = {
  trainingState: buildTooltip({
    role: "Vue rapide de votre charge recente, de votre base et de votre fraicheur.",
    calculation:
      "On regarde surtout les 7 derniers jours pour la charge recente, puis environ 6 semaines pour la base. Formule simple : forme = base - charge recente.",
    interpretation:
      "Si la charge recente monte plus vite que la base, la fatigue peut grimper. Si la forme remonte, vous etes souvent plus frais.",
    extra:
      "Charge et volume peuvent etre multi-sport. L'allure et l'intensite restent reservees a la course / trail.",
  }),
  comparison: buildTooltip({
    role: "Comparer la periode choisie avec la meme duree juste avant.",
    calculation:
      "Si vous regardez 30 jours, on compare ces 30 jours aux 30 jours precedents. Formule simple : delta % = (periode actuelle - periode precedente) / periode precedente.",
    interpretation:
      "Vous voyez vite si vous faites plus, moins, ou autrement qu'avant.",
    extra:
      "L'allure de reference n'apparait que si la selection correspond vraiment a la course / trail.",
  }),
  referencePace: buildTooltip({
    role: "Allure repere plus stable qu'une seule tres bonne seance.",
    calculation:
      "On prend des sorties course / trail recentes comparables et on garde une allure centrale, proche de votre niveau habituel. Les valeurs tres extremes sont ecartees s'il y a assez de donnees.",
    interpretation:
      "Si cette allure devient plus rapide, votre niveau recent semble progresser.",
    extra:
      "Course / trail uniquement. Ce n'est pas un record, mais un repere fiable pour comparer deux periodes.",
  }),
  trainingTimeline: buildTooltip({
    role: "Montrer comment evoluent charge recente, base et forme dans le temps.",
    calculation:
      "Chaque point reprend la meme logique que les KPI du haut : recent pour la charge, plusieurs semaines pour la base, puis la difference entre les deux pour la forme.",
    interpretation:
      "Une hausse nette de la charge indique souvent un bloc de travail. Une forme qui remonte indique souvent plus de fraicheur.",
    extra: "La charge peut rester multi-sport selon le perimetre choisi.",
  }),
  intensity: buildTooltip({
    role: "Montrer combien de temps vos sorties course / trail passent dans chaque zone cardio.",
    calculation:
      "On utilise d'abord la FC max et les zones saisies dans Administration. Sinon, l'application estime la FC max et les zones. Quand on a des laps ou splits cardio, on additionne leur temps par zone. Sinon, on classe toute la seance selon sa FC moyenne.",
    interpretation:
      "Si la plus grande part du temps est en Z1-Z2, l'entrainement reste surtout facile. Si Z4-Z5 prend plus de place, la periode est plus exigeante.",
    extra:
      "Course / trail uniquement. Si un repli estime est actif, le bloc vous l'indique et vous invite a completer Administration.",
  }),
  monthly: buildTooltip({
    role: "Relire votre cycle mois par mois.",
    calculation:
      "On additionne la charge du mois. Si Strava fournit un suffer score, on l'utilise. Sinon, on prend une estimation simple basee sur distance et denivele.",
    interpretation:
      "Utile pour reperer les gros blocs, les mois plus legers et la continuite du cycle.",
    extra: "Multi-sport selon le perimetre choisi.",
  }),
  weeklySessions: buildTooltip({
    role: "Montrer votre frequence ou votre volume semaine par semaine.",
    calculation:
      "Le mode seances compte les activites de chaque semaine. Le mode km additionne la distance de chaque semaine, y compris sur les semaines a zero.",
    interpretation:
      "Le mode seances aide a lire la densite. Le mode km aide a lire le volume. Les deux permettent de voir vite les trous et les pics.",
    extra: "Multi-sport selon le perimetre choisi.",
  }),
  distanceProfile: buildTooltip({
    role: "Voir la place des sorties courtes, moyennes et longues.",
    calculation:
      "Chaque activite est rangee dans une tranche de distance : 0-5 km, 5-10 km, 10-15 km, etc.",
    interpretation:
      "Plus la repartition est claire, plus on comprend vite la structure recente des sorties.",
    extra: "Multi-sport, meme si c'est surtout utile pour la course / trail.",
  }),
  bestEfforts: buildTooltip({
    role: "Faire ressortir les seances les plus marquantes de la selection.",
    calculation:
      "On trie les activites selon trois angles simples : la plus longue, la plus rapide et celle avec le plus de D+.",
    interpretation:
      "Cela permet de retrouver rapidement les seances fortes sans relire tout l'historique.",
    extra: "Les plus rapides sont surtout pertinentes en course / trail.",
  }),
};

const KPI_INFO = {
  acuteLoad: buildTooltip({
    role: "Mesurer ce que vous avez vraiment encaisse tout recemment.",
    calculation:
      "On additionne la charge de chaque seance des 7 derniers jours. Si une seance a un suffer score, on l'utilise. Sinon, on prend une estimation simple basee sur distance et denivele.",
    interpretation:
      "Plus le chiffre monte vite, plus la semaine recente a ete exigeante.",
    extra: "Multi-sport selon le perimetre choisi.",
  }),
  fitness: buildTooltip({
    role: "Mesurer votre base de travail sur plusieurs semaines.",
    calculation:
      "On regarde environ 6 semaines d'historique et on ramene cela a une semaine moyenne. C'est une base plus stable que la seule semaine en cours.",
    interpretation:
      "Plus cette valeur est haute, plus votre fond d'entrainement est solide.",
    extra: "Multi-sport selon le perimetre choisi.",
  }),
  freshness: buildTooltip({
    role: "Voir si vous etes plutot frais ou plutot entame.",
    calculation:
      "On compare la base des dernieres semaines avec la charge tres recente. Formule simple : forme = fitness - charge recente.",
    interpretation:
      "Au-dessus de zero vous etes plutot frais. Pres de zero vous etes dans l'equilibre. En dessous de zero, la fatigue est plus presente.",
    extra: "Multi-sport selon le perimetre choisi.",
  }),
  acwr: buildTooltip({
    role: "Verifier si la charge recente reste coherente avec votre fond.",
    calculation:
      "On compare la charge des 7 derniers jours a votre base moyenne des dernieres semaines. Formule simple : ratio = charge 7 j / fitness.",
    interpretation:
      "Autour de 1, la situation reste assez stable. Plus haut, la montee est rapide. Plus bas, la stimulation est plus faible.",
    extra: "Multi-sport selon le perimetre choisi.",
  }),
  regularity: buildTooltip({
    role: "Mesurer la constance de la pratique.",
    calculation:
      "On regarde les 4 dernieres semaines et on calcule la part de semaines avec au moins une activite. Formule simple : semaines actives / 4.",
    interpretation:
      "Plus le pourcentage est haut, plus l'entrainement a ete regulier.",
    extra: "Multi-sport selon le perimetre choisi.",
  }),
  distance: buildTooltip({
    role: "Garder un repere de volume simple.",
    calculation: "On additionne les kilometres des 7 derniers jours.",
    interpretation:
      "Utile pour voir rapidement si la semaine recente etait legere ou chargee.",
    extra: "Multi-sport selon le perimetre choisi.",
  }),
  time: buildTooltip({
    role: "Lire le volume en temps plutot qu'en vitesse.",
    calculation: "On additionne le temps en mouvement des 7 derniers jours.",
    interpretation:
      "Tres utile quand l'allure n'est pas comparable d'une seance a l'autre.",
    extra: "Multi-sport selon le perimetre choisi.",
  }),
  elevation: buildTooltip({
    role: "Mesurer la contrainte du terrain.",
    calculation: "On additionne le denivele positif des 7 derniers jours.",
    interpretation:
      "Particulierement utile en trail ou sur les semaines vallonnees.",
    extra: "Multi-sport selon le perimetre choisi.",
  }),
  sessionsPerWeek: buildTooltip({
    role: "Mesurer la frequence de pratique.",
    calculation:
      "On prend le nombre total d'activites, puis on le rapporte au nombre de semaines observees.",
    interpretation: "Plus la valeur est haute, plus la pratique est dense.",
    extra: "Multi-sport selon le perimetre choisi.",
  }),
  activeWeeks: buildTooltip({
    role: "Voir combien de semaines ont vraiment contenu de l'entrainement.",
    calculation:
      "Une semaine est active des qu'elle contient au moins une activite.",
    interpretation:
      "Plus il y a de semaines actives, plus la continuite est bonne.",
    extra: "Multi-sport selon le perimetre choisi.",
  }),
  streak: buildTooltip({
    role: "Suivre la serie de semaines sans coupure.",
    calculation:
      "On compte le nombre de semaines consecutives actives jusqu'a aujourd'hui.",
    interpretation:
      "Plus le streak est long, plus la pratique recente est continue.",
    extra: "Multi-sport selon le perimetre choisi.",
  }),
};
const EFFORT_DEFINITIONS = {
  longest: buildTooltip({
    role: "Retrouver les plus grosses sorties en distance.",
    calculation:
      "On trie simplement les activites de la plus longue a la plus courte.",
    interpretation:
      "Pratique pour revoir vos grosses sorties d'endurance.",
    extra: "Sur la selection courante.",
  }),
  fastest: buildTooltip({
    role: "Retrouver les sorties les plus rapides de la periode.",
    calculation:
      "On trie les activites selon l'allure, avec un minimum de 5 km pour eviter les efforts trop courts.",
    interpretation:
      "Cela met en avant les seances de vitesse les plus parlantes.",
    extra: "Surtout pertinent pour la course / trail.",
  }),
  climbing: buildTooltip({
    role: "Retrouver les sorties les plus exigeantes en denivele.",
    calculation: "On trie les activites selon le D+.",
    interpretation:
      "Utile pour revoir les grosses seances vallonnees ou trail.",
    extra: "Sur la selection courante.",
  }),
};
export default function AnalyticsPage() {
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

  const analyticsRange = useMemo(
    () => buildAnalyticsDateRange({
      preset: options.analyticsPeriodPreset,
      customDateFrom: options.analyticsCustomDateFrom,
      customDateTo: options.analyticsCustomDateTo,
    }),
    [options.analyticsCustomDateFrom, options.analyticsCustomDateTo, options.analyticsPeriodPreset],
  );

  const analyticsFilters = useMemo(
    () => ({
      ...filters,
      dateFrom: analyticsRange.dateFrom,
      dateTo: analyticsRange.dateTo,
    }),
    [analyticsRange.dateFrom, analyticsRange.dateTo, filters],
  );

  const analyticsActivities = useMemo(
    () => filterActivities(safeActivities, analyticsFilters, { groupSports: options.groupSports }),
    [analyticsFilters, options.groupSports, safeActivities],
  );

  const analyticsScopeActivities = useMemo(
    () =>
      filterActivities(
        safeActivities,
        { ...filters, dateFrom: "", dateTo: "" },
        { groupSports: options.groupSports },
      ),
    [filters, options.groupSports, safeActivities],
  );

  const isRunOnlyScope = useMemo(
    () => analyticsScopeActivities.length > 0 && analyticsScopeActivities.every((activity) => isRunLikeActivity(activity)),
    [analyticsScopeActivities],
  );
  const hasRunLikeActivities = useMemo(
    () => analyticsScopeActivities.some((activity) => isRunLikeActivity(activity)),
    [analyticsScopeActivities],
  );

  const granularity = getAnalyticsGranularity(analyticsRange);

  const trainingStatus = useMemo(
    () => buildTrainingStatusSummary(analyticsScopeActivities, { endDate: analyticsRange.end }),
    [analyticsRange.end, analyticsScopeActivities],
  );

  const trainingTimeline = useMemo(
    () => buildTrainingStateTimeline(analyticsScopeActivities, {
      startDate: analyticsRange.start,
      endDate: analyticsRange.end,
      granularity,
    }),
    [analyticsRange.end, analyticsRange.start, analyticsScopeActivities, granularity],
  );

  const periodWeeks = Math.max(1, Math.ceil(analyticsRange.days / 7));
  const regularitySummary = useMemo(
    () => buildRegularitySummary(analyticsScopeActivities, {
      weeks: periodWeeks,
      startDate: analyticsRange.start,
      endDate: analyticsRange.end,
    }),
    [analyticsRange.end, analyticsRange.start, analyticsScopeActivities, periodWeeks],
  );

  const heartRatePreferences = useMemo(
    () => ({
      heartRateMax: options.heartRateMax,
      heartRateZone1Max: options.heartRateZone1Max,
      heartRateZone2Max: options.heartRateZone2Max,
      heartRateZone3Max: options.heartRateZone3Max,
      heartRateZone4Max: options.heartRateZone4Max,
    }),
    [
      options.heartRateMax,
      options.heartRateZone1Max,
      options.heartRateZone2Max,
      options.heartRateZone3Max,
      options.heartRateZone4Max,
    ],
  );

  const intensityModel = useMemo(
    () => buildIntensityDistribution(analyticsScopeActivities, {
      startDate: analyticsRange.start,
      endDate: analyticsRange.end,
      allowRunOnlyMetrics: hasRunLikeActivities,
      heartRatePreferences,
    }),
    [analyticsRange.end, analyticsRange.start, analyticsScopeActivities, hasRunLikeActivities, heartRatePreferences],
  );

  const monthlyLoadSeries = useMemo(
    () => buildMonthlySeries(analyticsActivities, {
      metric: "load",
      startDate: analyticsRange.start,
      endDate: analyticsRange.end,
    }),
    [analyticsActivities, analyticsRange.end, analyticsRange.start],
  );

  const distanceDistribution = useMemo(
    () => buildDistanceDistribution(analyticsActivities),
    [analyticsActivities],
  );

  const bestEfforts = useMemo(
    () => buildBestEfforts(analyticsActivities, 3),
    [analyticsActivities],
  );

  const scopeText = useMemo(() => {
    const sportScope = filters.sportGroup === "all" ? "tous les sports" : filters.sportGroup;
    const searchNote = filters.search ? ` Recherche active : "${filters.search}".` : "";

    if (isRunOnlyScope) {
      return `Perimetre actuel : ${sportScope}.${searchNote} Allure de reference et intensite actives en course / trail.`;
    }

    if (hasRunLikeActivities) {
      return `Perimetre actuel : ${sportScope}.${searchNote} Intensite calculee uniquement sur les activites course / trail de la selection ; allure de reference reservee a un filtre course / trail pur.`;
    }

    return `Perimetre actuel : ${sportScope}.${searchNote} Allure de reference et intensite indisponibles faute de sorties course / trail cardio exploitables.`;
  }, [filters.search, filters.sportGroup, hasRunLikeActivities, isRunOnlyScope]);

  const stateKpis = [
    {
      label: "Charge 7 j",
      value: formatLoad(trainingStatus.acuteLoad),
      trend: trainingStatus.acuteDeltaPercent !== null ? `${formatPercent(trainingStatus.acuteDeltaPercent)} vs 7 j precedents` : "Pas de reference",
      trendTone: getTrendToneFromDelta(trainingStatus.acuteDeltaPercent),
      hint: "Charge recente",
      info: KPI_INFO.acuteLoad,
    },
    {
      label: "Fitness 42 j",
      value: formatLoad(trainingStatus.fitness),
      hint: "Base de forme",
      info: KPI_INFO.fitness,
    },
    {
      label: "Forme",
      value: formatLoad(trainingStatus.freshness),
      trend: trainingStatus.freshnessLabel,
      trendTone: getFreshnessTone(trainingStatus.freshnessLabel),
      hint: "Equilibre charge / fraicheur",
      info: KPI_INFO.freshness,
    },
    {
      label: "Ratio charge / fond",
      value: formatRatio(trainingStatus.acuteChronicRatio),
      trend: trainingStatus.ratioLabel,
      trendTone: getRatioTone(trainingStatus.ratioLabel),
      hint: "Charge aigu / chronique",
      info: KPI_INFO.acwr,
    },
    {
      label: "Regularite 4 sem.",
      value: `${Math.round(Number(trainingStatus.regularityScore || 0))} %`,
      hint: "Semaines actives recentes",
      info: KPI_INFO.regularity,
    },
  ];

  const secondaryStateKpis = [
    {
      label: "Distance / semaine",
      value: formatDistance(trainingStatus.distancePerWeek),
      hint: "Fenetre recente 7 j",
      info: KPI_INFO.distance,
    },
    {
      label: "Temps / semaine",
      value: formatHours(trainingStatus.movingHoursPerWeek),
      hint: "Fenetre recente 7 j",
      info: KPI_INFO.time,
    },
    {
      label: "D+ / semaine",
      value: formatElevation(trainingStatus.elevationPerWeek),
      hint: "Fenetre recente 7 j",
      info: KPI_INFO.elevation,
    },
  ];

  const regularityKpis = [
    {
      label: "Seances / semaine",
      value: regularitySummary.averageSessionsPerWeek || 0,
      hint: `${periodWeeks} semaine(s) observee(s)`,
      info: KPI_INFO.sessionsPerWeek,
    },
    {
      label: "Semaines actives",
      value: regularitySummary.activeWeeks || 0,
      hint: `sur ${periodWeeks}`,
      info: KPI_INFO.activeWeeks,
    },
    {
      label: "Streak actif",
      value: `${regularitySummary.activeStreakWeeks || 0} sem.`,
      hint: "Continuite en cours",
      info: KPI_INFO.streak,
    },
    {
      label: "Regularite",
      value: `${regularitySummary.activeWeeksRatio || 0} %`,
      hint: "Part des semaines actives",
      info: KPI_INFO.regularity,
    },
  ];

  const analyticsWeeklyMetric = options.analyticsWeeklyMetric === "distanceKm" ? "distanceKm" : "count";
  const weeklyChartConfig = useMemo(
    () => (
      analyticsWeeklyMetric === "distanceKm"
        ? {
            title: "Km par semaine",
            subtitle: "Barres hebdomadaires et tendance glissante pour reperer plus vite les semaines de volume haut ou bas.",
            dataKey: "distanceKm",
            name: "Distance",
            unit: "km",
            fill: "#F97316",
            trendLabel: "Moyenne 4 sem.",
            trendColor: "#355886",
            valueFormatter: (value) => formatDistance(value),
          }
        : {
            title: "Seances par semaine",
            subtitle: "Barres hebdomadaires et tendance glissante pour reperer plus vite les creux et les pics.",
            dataKey: "count",
            name: "Seances",
            unit: "",
            fill: "#355886",
            trendLabel: "Tendance 4 sem.",
            trendColor: "#F97316",
            valueFormatter: (value) => `${Number(value || 0).toLocaleString("fr-FR", {
              minimumFractionDigits: Number.isInteger(Number(value || 0)) ? 0 : 1,
              maximumFractionDigits: 1,
            })} seance(s)`,
          }
    ),
    [analyticsWeeklyMetric],
  );

  const handleAnalyticsPresetChange = (preset) => {
    if (preset === "custom") {
      setOption("analyticsPeriodPreset", "custom");
      if (!options.analyticsCustomDateFrom) {
        setOption("analyticsCustomDateFrom", analyticsRange.dateFrom);
      }
      if (!options.analyticsCustomDateTo) {
        setOption("analyticsCustomDateTo", analyticsRange.dateTo);
      }
      return;
    }

    setOption("analyticsPeriodPreset", preset);
  };

  const handleCustomDateChange = (name, value) => {
    setOption("analyticsPeriodPreset", "custom");
    setOption(name, value);
  };

  const handleResetAnalytics = () => {
    resetFilters();
    setOption("groupSports", true);
    setOption("analyticsPeriodPreset", "90d");
    setOption("analyticsCustomDateFrom", "");
    setOption("analyticsCustomDateTo", "");
    setOption("comparisonMetric", "distanceKm");
  };

  return (
    <AppShell
      eyebrow="Analyses"
      title="Analyses avancees"
      subtitle={`Etat d'entrainement, comparaison de periodes et intensite sur ${getAnalyticsPresetLabel(options.analyticsPeriodPreset)}.`}
      account={account}
    >
      {error ? <div className="alert alert-error section">{error}</div> : null}
      {isLoading && !safeActivities.length ? <div className="card section">Chargement des analyses...</div> : null}

      <div className="section">
        <AnalyticsFiltersBar
          preset={options.analyticsPeriodPreset}
          rangeLabel={analyticsRange.label}
          customDateFrom={options.analyticsCustomDateFrom}
          customDateTo={options.analyticsCustomDateTo}
          search={filters.search}
          sportGroup={filters.sportGroup}
          groupSports={options.groupSports}
          availableSports={availableSports}
          filteredCount={analyticsActivities.length}
          totalCount={analyticsScopeActivities.length}
          onPresetChange={handleAnalyticsPresetChange}
          onCustomDateChange={handleCustomDateChange}
          onSearchChange={(value) => setFilter("search", value)}
          onSportChange={(value) => setFilter("sportGroup", value)}
          onGroupSportsChange={(value) => setOption("groupSports", value)}
          onReset={handleResetAnalytics}
          scopeNote={scopeText}
        />
      </div>

      <div className="section">
        <div className="card-header-row">
          <div>
            <div className="title-with-info">
              <h2 className="card-title">Etat d'entrainement</h2>
              <InfoTooltip title="Etat d'entrainement" content={SECTION_INFO.trainingState} label="Afficher l'aide pour l'etat d'entrainement" />
            </div>
            <p className="card-subtitle">
              Lecture immediate de la charge recente, de la base de forme, de la fraicheur et de la constance.
            </p>
          </div>
        </div>
        <KpiGrid items={stateKpis} className="kpi-grid" />
        <div className="top-gap-sm">
          <KpiGrid items={secondaryStateKpis} className="three-columns" />
        </div>
      </div>

      <div className="section">
        <RollingLoadChart
          data={trainingTimeline}
          metric="load"
          title="Evolution charge / fitness / forme"
          subtitle={granularity === "daily" ? "Lecture journaliere sur la periode courte." : "Lecture hebdomadaire sur la periode longue."}
          info={SECTION_INFO.trainingTimeline}
          shortKey="acuteLoad"
          longKey="fitness"
          freshnessKey="freshness"
          shortLabel="Charge 7 j"
          longLabel="Fitness 42 j"
          freshnessLabel="Forme"
          valueFormatter={(value) => formatLoad(value)}
        />
      </div>

      <div className="section">
        <PeriodComparisonSection
          activities={analyticsScopeActivities}
          currentRange={analyticsRange}
          chartMetric={options.comparisonMetric}
          allowRunOnlyMetrics={isRunOnlyScope}
          scopeText={scopeText}
          info={SECTION_INFO.comparison}
          referencePaceInfo={SECTION_INFO.referencePace}
          onChartMetricChange={(value) => setOption("comparisonMetric", value)}
        />
      </div>

      <div className="section">
        <div className="card-header-row">
          <div>
            <div className="title-with-info">
              <h2 className="card-title">Intensite et regularite</h2>
              <InfoTooltip title="Intensite et regularite" content={SECTION_INFO.intensity} label="Afficher l'aide pour l'intensite et la regularite" />
            </div>
            <p className="card-subtitle">
              Frequence hebdomadaire, continuite du cycle et repartition estimee des seances course / trail.
            </p>
          </div>
        </div>
        <KpiGrid items={regularityKpis} className="four-columns" />
      </div>

      <div className="grid two-columns section">
        <IntensityDistributionChart
          model={intensityModel}
          title="Repartition de l'intensite"
          subtitle="Temps passe par zones de FC sur les sorties course / trail de la selection."
          info={SECTION_INFO.intensity}
        />
        <WeeklyVolumeChart
          data={regularitySummary.weeklySeries}
          title={weeklyChartConfig.title}
          subtitle={weeklyChartConfig.subtitle}
          info={SECTION_INFO.weeklySessions}
          dataKey={weeklyChartConfig.dataKey}
          name={weeklyChartConfig.name}
          unit={weeklyChartConfig.unit}
          fill={weeklyChartConfig.fill}
          showTrendLine
          trendWindow={4}
          trendLabel={weeklyChartConfig.trendLabel}
          trendColor={weeklyChartConfig.trendColor}
          valueFormatter={weeklyChartConfig.valueFormatter}
          showMetricControl
          metricControlLabel="Mode"
          metricOptions={[
            { value: "count", label: "Seances" },
            { value: "distanceKm", label: "Km" },
          ]}
          selectedMetric={analyticsWeeklyMetric}
          onMetricChange={(value) => setOption("analyticsWeeklyMetric", value)}
        />
      </div>

      <div className="grid two-columns section">
        <MonthlyVolumeChart
          data={monthlyLoadSeries}
          title="Analyse mensuelle"
          subtitle="Lecture mensuelle de la charge sur la periode selectionnee."
          info={SECTION_INFO.monthly}
          metric="load"
          display="bar"
          months={monthlyLoadSeries.length}
          showControls={false}
        />
        <DistanceDistributionChart
          data={distanceDistribution}
          info={SECTION_INFO.distanceProfile}
        />
      </div>

      <div className="section">
        <BestEffortsPanel
          efforts={bestEfforts}
          returnPath="/analytics"
          info={SECTION_INFO.bestEfforts}
          definitions={EFFORT_DEFINITIONS}
        />
      </div>
    </AppShell>
  );
}

