import { useEffect, useMemo, useRef, useState } from "react";
import AnalyticsFiltersBar from "../components/AnalyticsFiltersBar.jsx";
import AnalysisConfidenceBadge from "../components/AnalysisConfidenceBadge.jsx";
import BestEffortsPanel from "../components/BestEffortsPanel.jsx";
import PerformancePhysioCard from "../components/PerformancePhysioCard.jsx";
import PersonalPatternsCard from "../components/PersonalPatternsCard.jsx";
import RaceCountdownCard from "../components/RaceCountdownCard.jsx";
import RaceObjectiveCallToAction from "../components/RaceObjectiveCallToAction.jsx";
import VdotProfileCard from "../components/VdotProfileCard.jsx";
import { SHARED_FILTER_COPY, buildInfoBlocks } from "../content/analyticsCopy.js";
import { TRAINING_MVP_KPI_INFO, TRAINING_MVP_SECTION_INFO } from "../content/trainingMvpCopy.js";
import useActivityViewModel from "../hooks/useActivityViewModel.js";
import useRaceObjectives from "../hooks/useRaceObjectives.js";
import AppShell from "../layouts/AppShell.jsx";
import { enrichActivity } from "../services/activity.service.js";
import { getGarminRecoverySnapshots } from "../services/externalProvider.service.js";
import { filterActivities } from "../utils/activityAggregations.js";
import { buildCurrentAccountModel } from "../utils/accountPresentation.js";
import {
  buildObjectiveConfidence,
  buildPerformanceConfidence,
} from "../utils/analysisConfidence.js";
import {
  buildBestEfforts,
  buildBestEffortRecords,
  buildActivityItems,
  findRecordEnrichmentCandidates,
} from "../utils/activityInsights.js";
import { getAnalyticsGranularity, getAnalyticsPresetLabel } from "../utils/analyticsPeriods.js";
import { buildTrainingLoadStateModel } from "../utils/trainingMetrics.js";
import { buildRaceObjectiveProfile } from "../utils/raceObjectivePlanner.js";
import { buildVdotProfile } from "../utils/runningPerformance.js";
import { buildPersonalPatterns } from "../utils/crossDataAnalytics.js";

const BEST_EFFORTS_INFO = buildInfoBlocks({
  role: "Faire remonter les seances saillantes de la selection et relier les records route a leur course support quand elle est retrouvee.",
  calculation:
    "Les tops de distance, allure et D+ viennent de la selection courante. Les records route balaient tout l'historique du perimetre actif hors filtre de date, puis enrichissent les activites candidates quand des details Strava manquent encore.",
  interpretation:
    "On garde ainsi les records utiles sans les melanger aux KPI d'entrainement centraux.",
});

const EFFORT_DEFINITIONS = {
  longest: buildInfoBlocks({
    role: "Retrouver les plus grosses sorties de la selection.",
    calculation: "Tri simple par distance sur la selection courante.",
    interpretation: "Utile pour relire les gros blocs d'endurance.",
  }),
  fastest: buildInfoBlocks({
    role: "Faire remonter les sorties les plus rapides de la selection.",
    calculation: "Tri par allure avec un seuil minimum de 5 km pour eviter les efforts trop courts.",
    interpretation: "A lire comme un repere de vitesse recente, pas comme un RP officiel.",
  }),
  climbing: buildInfoBlocks({
    role: "Retrouver les sorties les plus chargees en denivele.",
    calculation: "Tri simple par D+ sur la selection courante.",
    interpretation: "Pratique pour relire les seances les plus vallonnees ou trail.",
  }),
  records: buildInfoBlocks({
    role: "Reconstruire les records route all time et les raccorder a la bonne course.",
    calculation:
      "RunNSee combine les RP/PR explicites, les seances proches des distances standard et les best efforts detailles. Si l'activite candidate reste trop pauvre localement, un enrichissement cible Strava est tente.",
    interpretation:
      "L'objectif est de retomber sur la bonne course, avec son nom et sa date, plutot que sur un split sorti du contexte.",
  }),
};

export default function PerformancePage() {
  const {
    athlete,
    error,
    isLoading,
    safeActivities,
    sharedRange,
    filters,
    options,
    availableSports,
    trainingAnalyticsSettings,
    setFilter,
    resetFilters,
    setOption,
    reload,
  } = useActivityViewModel({
    includeActivities: true,
  });
  const attemptedRecordEnrichmentsRef = useRef(new Set());
  const isAutoEnrichingRecordsRef = useRef(false);
  const { activeRace } = useRaceObjectives();

  const account = useMemo(
    () => buildCurrentAccountModel({ athlete, options }),
    [athlete, options],
  );

  const [recoverySnapshots, setRecoverySnapshots] = useState([]);

  useEffect(() => {
    let ignore = false;
    getGarminRecoverySnapshots({ days: 56 })
      .then((data) => {
        if (!ignore && Array.isArray(data?.snapshots)) setRecoverySnapshots(data.snapshots);
      })
      .catch(() => {});
    return () => { ignore = true; };
  }, []);

  const performanceFilters = useMemo(
    () => ({
      ...filters,
      dateFrom: sharedRange.dateFrom,
      dateTo: sharedRange.dateTo,
    }),
    [filters, sharedRange.dateFrom, sharedRange.dateTo],
  );

  const performanceActivities = useMemo(
    () => filterActivities(safeActivities, performanceFilters, { groupSports: options.groupSports }),
    [performanceFilters, options.groupSports, safeActivities],
  );

  const performanceScopeActivities = useMemo(
    () =>
      filterActivities(
        safeActivities,
        { ...filters, dateFrom: "", dateTo: "" },
        { groupSports: options.groupSports },
      ),
    [filters, options.groupSports, safeActivities],
  );

  const chartGranularity = getAnalyticsGranularity(sharedRange);
  const trainingLoadModel = useMemo(
    () => buildTrainingLoadStateModel(performanceScopeActivities, {
      startDate: sharedRange.start,
      endDate: sharedRange.end,
      granularity: chartGranularity,
      weekStartsOn: options.userWeekStartsOn,
      settings: trainingAnalyticsSettings,
    }),
    [chartGranularity, options.userWeekStartsOn, performanceScopeActivities, sharedRange.end, sharedRange.start, trainingAnalyticsSettings],
  );

  const bestEfforts = useMemo(() => {
    const selectionEfforts = buildBestEfforts(performanceActivities, 3);
    const allTimeEfforts = buildBestEfforts(performanceScopeActivities, 3);

    return {
      ...selectionEfforts,
      records: allTimeEfforts.records,
    };
  }, [performanceActivities, performanceScopeActivities]);

  const personalPatterns = useMemo(
    () => buildPersonalPatterns({
      activities: performanceScopeActivities,
      snapshots: recoverySnapshots,
    }),
    [performanceScopeActivities, recoverySnapshots],
  );

  const vdotProfile = useMemo(
    () => buildVdotProfile({
      records: bestEfforts.records,
      referenceDate: sharedRange.end,
    }),
    [bestEfforts.records, sharedRange.end],
  );
  const performanceConfidence = useMemo(
    () => buildPerformanceConfidence({
      activities: performanceScopeActivities,
      vdotProfile,
      bestEfforts,
      referenceDate: sharedRange.end,
    }),
    [bestEfforts, performanceScopeActivities, sharedRange.end, vdotProfile],
  );

  const raceProfile = useMemo(() => {
    if (!activeRace) {
      return { hasRace: false };
    }

    const items = buildActivityItems(performanceScopeActivities, { settings: trainingAnalyticsSettings });
    const records = buildBestEffortRecords(items);

    return buildRaceObjectiveProfile({
      race: activeRace,
      loadModel: trainingLoadModel,
      bestEffortRecords: records,
      referenceDate: sharedRange.end,
    });
  }, [activeRace, performanceScopeActivities, sharedRange.end, trainingAnalyticsSettings, trainingLoadModel]);
  const objectiveConfidence = useMemo(
    () => buildObjectiveConfidence({
      race: activeRace,
      profile: raceProfile,
      activities: performanceScopeActivities,
      recoverySnapshots,
      referenceDate: sharedRange.end,
    }),
    [activeRace, performanceScopeActivities, raceProfile, recoverySnapshots, sharedRange.end],
  );

  const recordEnrichmentCandidates = useMemo(
    () => findRecordEnrichmentCandidates(performanceScopeActivities, { limitPerRecord: 1 }),
    [performanceScopeActivities],
  );

  useEffect(() => {
    const pendingCandidates = recordEnrichmentCandidates.filter((activity) => {
      const id = String(activity?.stravaActivityId || "");
      return id && !attemptedRecordEnrichmentsRef.current.has(id);
    });

    if (!pendingCandidates.length || isAutoEnrichingRecordsRef.current) {
      return undefined;
    }

    pendingCandidates.forEach((activity) => {
      attemptedRecordEnrichmentsRef.current.add(String(activity?.stravaActivityId || ""));
    });

    let isCancelled = false;
    isAutoEnrichingRecordsRef.current = true;

    (async () => {
      const results = await Promise.allSettled(
        pendingCandidates.map((activity) => enrichActivity(activity.stravaActivityId)),
      );
      const hasSuccess = results.some((result) => result.status === "fulfilled");

      if (!isCancelled && hasSuccess) {
        await reload({ includeActivities: true });
      }
    })()
      .catch(() => {})
      .finally(() => {
        isAutoEnrichingRecordsRef.current = false;
      });

    return () => {
      isCancelled = true;
    };
  }, [recordEnrichmentCandidates, reload]);

  const scopeLabel = filters.sportGroup === "all" ? "tous les sports" : filters.sportGroup;
  const searchNote = filters.search ? ` Recherche active : "${filters.search}".` : "";
  const scopeNote = `Perimetre actuel : ${scopeLabel}.${searchNote} Performance route, records et course objectif sur ${getAnalyticsPresetLabel(options.sharedPeriodPreset)}.`;

  const handleSharedPresetChange = (preset) => {
    if (preset === "custom") {
      setOption("sharedPeriodPreset", "custom");
      if (!options.sharedCustomDateFrom) {
        setOption("sharedCustomDateFrom", sharedRange.dateFrom);
      }
      if (!options.sharedCustomDateTo) {
        setOption("sharedCustomDateTo", sharedRange.dateTo);
      }
      return;
    }

    setOption("sharedPeriodPreset", preset);
  };

  const handleSharedCustomDateChange = (name, value) => {
    setOption("sharedPeriodPreset", "custom");
    setOption(name, value);
  };

  const handleResetSharedFilters = () => {
    resetFilters();
    setOption("groupSports", true);
    setOption("sharedPeriodPreset", "90d");
    setOption("sharedCustomDateFrom", "");
    setOption("sharedCustomDateTo", "");
  };

  return (
    <AppShell
      eyebrow="Performance"
      title="Performance"
      subtitle={`Niveau route, records et course objectif sur ${getAnalyticsPresetLabel(options.sharedPeriodPreset)}.`}
      account={account}
    >
      {error ? <div className="alert alert-error section">{error}</div> : null}
      {isLoading && !safeActivities.length ? <div className="card section">Chargement de la performance...</div> : null}

      <div className="section">
        <AnalyticsFiltersBar
          title="Filtres de performance"
          subtitle={SHARED_FILTER_COPY.subtitle}
          resetLabel={SHARED_FILTER_COPY.resetLabel}
          infoContent={SHARED_FILTER_COPY.info}
          preset={options.sharedPeriodPreset}
          rangeLabel={sharedRange.label}
          customDateFrom={options.sharedCustomDateFrom}
          customDateTo={options.sharedCustomDateTo}
          search={filters.search}
          sportGroup={filters.sportGroup}
          groupSports={options.groupSports}
          availableSports={availableSports}
          filteredCount={performanceActivities.length}
          totalCount={performanceScopeActivities.length}
          onPresetChange={handleSharedPresetChange}
          onCustomDateChange={handleSharedCustomDateChange}
          onSearchChange={(value) => setFilter("search", value)}
          onSportChange={(value) => setFilter("sportGroup", value)}
          onGroupSportsChange={(value) => setOption("groupSports", value)}
          onReset={handleResetSharedFilters}
          scopeNote={scopeNote}
        />
      </div>

      <div className="section">
        <AnalysisConfidenceBadge confidence={performanceConfidence} />
      </div>

      <div className="analysis-page-stack">
        <div className="section">
          <VdotProfileCard
            profile={vdotProfile}
            info={TRAINING_MVP_KPI_INFO.vdotProfile || TRAINING_MVP_SECTION_INFO.advancedSignals}
            confidence={performanceConfidence}
          />
        </div>

        {recoverySnapshots.length > 0 ? (
          <div className="section">
            <PerformancePhysioCard snapshots={recoverySnapshots} />
          </div>
        ) : null}

        <div className="section">
          <BestEffortsPanel
            efforts={bestEfforts}
            returnPath="/performance"
            info={BEST_EFFORTS_INFO}
            definitions={EFFORT_DEFINITIONS}
          />
        </div>

        {recoverySnapshots.length > 0 ? (
          <div className="section">
            <PersonalPatternsCard patterns={personalPatterns} />
          </div>
        ) : null}

        <div className="section">
          {raceProfile?.hasRace ? (
            <RaceCountdownCard profile={raceProfile} confidence={objectiveConfidence} />
          ) : (
            <RaceObjectiveCallToAction />
          )}
        </div>
      </div>
    </AppShell>
  );
}
