import { useEffect, useMemo, useRef } from "react";
import PerformanceOverviewTab from "../components/performance/PerformanceOverviewTab.jsx";
import SubTabs from "../components/visuals/alpine/SubTabs.jsx";
import useActivityViewModel from "../hooks/useActivityViewModel.js";
import AppShell from "../layouts/AppShell.jsx";
import { enrichActivity } from "../services/activity.service.js";
import { filterActivities } from "../utils/activityAggregations.js";
import {
  buildBestEfforts,
  findRecordEnrichmentCandidates,
} from "../utils/activityInsights.js";
import { buildPerformanceConfidence } from "../utils/analysisConfidence.js";
import {
  buildPerformanceOverviewModel,
  getCanonicalPerformanceActivities,
} from "../utils/performanceOverviewModel.js";
import { buildVdotProfile } from "../utils/runningPerformance.js";

const PERFORMANCE_TABS = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "vdot", label: "VDOT & profil", disabled: true, title: "Onglet prévu au lot Performance suivant" },
  { id: "allures", label: "Allures de référence", disabled: true, title: "Onglet prévu au lot Performance suivant" },
  { id: "fc-performance", label: "FC de performance", disabled: true, title: "Onglet prévu au lot Performance suivant" },
  { id: "records", label: "Records", disabled: true, title: "Onglet prévu au lot Performance suivant" },
];

const PERIOD_OPTIONS = [
  { key: "7d", label: "7 j" },
  { key: "90d", label: "90 j" },
  { key: "6m", label: "6 mois" },
  { key: "12m", label: "12 mois" },
  { key: "all", label: "Tout" },
];

/**
 * PerformancePage — Lot Performance V5, onglet Vue d'ensemble.
 *
 * Frontière produit :
 * - Performance = mesurer le niveau et les capacités.
 * - Analyse = comprendre l'état d'entraînement actuel.
 * - Progression = suivre la construction long terme.
 *
 * Ce lot livre uniquement l'onglet Vue d'ensemble. Les autres onglets seront
 * ajoutés un par un afin d'éviter les placeholders et les demi-pages.
 */
export default function PerformancePage() {
  const {
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

  const performanceFilters = useMemo(
    () => ({
      ...filters,
      search: "",
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
        { ...filters, search: "", dateFrom: "", dateTo: "" },
        { groupSports: options.groupSports },
      ),
    [filters, options.groupSports, safeActivities],
  );

  const canonicalPerformanceActivities = useMemo(
    () => getCanonicalPerformanceActivities(performanceActivities),
    [performanceActivities],
  );

  const canonicalPerformanceScopeActivities = useMemo(
    () => getCanonicalPerformanceActivities(performanceScopeActivities),
    [performanceScopeActivities],
  );

  const bestEfforts = useMemo(
    () => buildBestEfforts(canonicalPerformanceScopeActivities, 3),
    [canonicalPerformanceScopeActivities],
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
      activities: canonicalPerformanceScopeActivities,
      vdotProfile,
      bestEfforts,
      referenceDate: sharedRange.end,
    }),
    [bestEfforts, canonicalPerformanceScopeActivities, sharedRange.end, vdotProfile],
  );

  const overviewModel = useMemo(
    () => buildPerformanceOverviewModel({
      periodActivities: canonicalPerformanceActivities,
      scopeActivities: canonicalPerformanceScopeActivities,
      range: {
        startDate: sharedRange.start,
        endDate: sharedRange.end,
      },
      settings: trainingAnalyticsSettings,
      bestEfforts,
      vdotProfile,
      confidence: performanceConfidence,
    }),
    [
      bestEfforts,
      canonicalPerformanceActivities,
      canonicalPerformanceScopeActivities,
      performanceConfidence,
      sharedRange.end,
      sharedRange.start,
      trainingAnalyticsSettings,
      vdotProfile,
    ],
  );

  const recordEnrichmentCandidates = useMemo(
    () => findRecordEnrichmentCandidates(canonicalPerformanceScopeActivities, { limitPerRecord: 1 }),
    [canonicalPerformanceScopeActivities],
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
      subtitle="Mesure ton niveau, tes repères d'allure et tes signaux de performance."
    >
      {error ? <div className="alert alert-error section">{error}</div> : null}
      {isLoading && !safeActivities.length ? (
        <div className="card section">Chargement de la performance...</div>
      ) : null}

      <div className="performance-page">
        <div className="performance-filter-compact" aria-label="Périmètre Performance">
          <span>
            {canonicalPerformanceActivities.length} sur {canonicalPerformanceScopeActivities.length} sorties
            {sharedRange.label ? ` · ${sharedRange.label}` : ""}
          </span>
          <div>
            <label>
              <small>Sport</small>
              <select value={filters.sportGroup} onChange={(event) => setFilter("sportGroup", event.target.value)}>
                <option value="all">Tous</option>
                {availableSports.map((sport) => (
                  <option key={sport} value={sport}>{sport}</option>
                ))}
              </select>
            </label>
            <label>
              <small>Période</small>
              <select value={options.sharedPeriodPreset} onChange={(event) => handleSharedPresetChange(event.target.value)}>
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={handleResetSharedFilters}>Réinitialiser</button>
          </div>
        </div>

        <SubTabs tabs={PERFORMANCE_TABS} defaultTabId="overview" />

        <PerformanceOverviewTab model={overviewModel} />
      </div>
    </AppShell>
  );
}
