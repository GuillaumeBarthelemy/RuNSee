import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import PerformanceOverviewTab from "../components/performance/PerformanceOverviewTab.jsx";
import PerformanceVdotProfileTab from "../components/performance/PerformanceVdotProfileTab.jsx";
import PerformanceAlluresReferenceTab from "../components/performance/PerformanceAlluresReferenceTab.jsx";
import PerformanceFcPerformanceTab from "../components/performance/PerformanceFcPerformanceTab.jsx";
import PerformanceRecordsTab from "../components/performance/PerformanceRecordsTab.jsx";
import { buildVdotProfileTabModel } from "../utils/performanceVdotProfileModel.js";
import { buildAlluresReferenceModel } from "../utils/performanceAlluresReferenceModel.js";
import { buildFcPerformanceModel } from "../utils/performanceFcPerformanceModel.js";
import { buildRecordsModel } from "../utils/performanceRecordsModel.js";
import AnalyticsCompactFilters from "../components/analytics/AnalyticsCompactFilters.jsx";
import SubTabs from "../components/visuals/alpine/SubTabs.jsx";
import useActivityViewModel from "../hooks/useActivityViewModel.js";
import AppShell from "../layouts/AppShell.jsx";
import { enrichActivity } from "../services/activity.service.js";
import { getVdotHistory, getGarminFitnessSnapshots } from "../services/externalProvider.service.js";
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

// Tous les onglets restent cliquables (style Analyse). Les onglets non encore
// livres rendent un placeholder "en cours de construction" — voir .ai/current_context.md.
const PERFORMANCE_TABS = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "vdot", label: "VDOT & profil" },
  { id: "allures", label: "Allures de référence" },
  { id: "fc-performance", label: "FC de performance" },
  { id: "records", label: "Records" },
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
    includeRaw: true, // Performance calcule les records depuis les segment_efforts (rawJson)
  });
  const attemptedRecordEnrichmentsRef = useRef(new Set());
  const isAutoEnrichingRecordsRef = useRef(false);

  // VDOT history consolide (3 niveaux : Garmin daily, Garmin per-activity,
  // Daniels interne). Source unique de verite pour le KPI VDOT estime.
  // Fetch async au montage de la page.
  const [vdotHistory, setVdotHistory] = useState(null);
  const [garminLatestFitnessSnapshot, setGarminLatestFitnessSnapshot] = useState(null);
  useEffect(() => {
    let cancelled = false;
    getVdotHistory({ days: 90 })
      .then((data) => { if (!cancelled) setVdotHistory(data); })
      .catch(() => { /* fallback silencieux sur l'estimation interne */ });
    // Recupere le dernier snapshot fitness Garmin (Endurance Score / Hill Score)
    // pour alimenter l'axe 'Endurance musculaire' du profil 5D.
    getGarminFitnessSnapshots({ days: 90 })
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.snapshots) ? data.snapshots : [];
        // Cherche le snapshot le plus recent avec au moins une des 2 metriques.
        const latestWithScores = [...list].reverse().find((s) =>
          s.enduranceScore != null || s.hillScore != null,
        );
        if (latestWithScores) setGarminLatestFitnessSnapshot(latestWithScores);
      })
      .catch(() => { /* fallback : pas de Garmin endurance/hill, cascade Riegel/composite */ });
    return () => { cancelled = true; };
  }, []);

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

  // Onglet actif (hash) calcule tot : calcul paresseux des modeles feuilles
  // mono-onglet (records / allures / fc-performance) pour accelerer
  // l'ouverture de ces sous-onglets.
  const perfLocation = useLocation();
  const perfHash = perfLocation.hash.replace(/^#/, "");
  const perfActiveTab = PERFORMANCE_TABS.some((t) => t.id === perfHash) ? perfHash : "overview";

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
      vdotHistory,
      confidence: performanceConfidence,
    }),
    [
      bestEfforts,
      vdotHistory,
      canonicalPerformanceActivities,
      canonicalPerformanceScopeActivities,
      performanceConfidence,
      sharedRange.end,
      sharedRange.start,
      trainingAnalyticsSettings,
      vdotProfile,
    ],
  );

  // Modele onglet VDOT & profil — recoit le signal economy depuis overviewModel
  // pour eviter de recalculer et exposer la meme valeur dans les indicateurs cles.
  const vdotProfileTabModel = useMemo(
    () => {
      const economySignal = (overviewModel?.metrics || []).find((m) => m.key === "economy");
      return buildVdotProfileTabModel({
        scopeActivities: canonicalPerformanceScopeActivities,
        vdotHistory,
        confidence: performanceConfidence,
        referenceDate: sharedRange.end,
        garminLatestFitnessSnapshot,
        economySignal,
      });
    },
    [canonicalPerformanceScopeActivities, vdotHistory, performanceConfidence, sharedRange.end, overviewModel, garminLatestFitnessSnapshot],
  );

  // Modele onglet Allures de reference (mockup p.14).
  // Utilise vdotProfile (Daniels paces + race predictions) + vdotHistory pour
  // l'evolution allure seuil 30j.
  const alluresReferenceModel = useMemo(
    () => (perfActiveTab === "allures" ? buildAlluresReferenceModel({
      vdotProfile,
      vdotHistory,
      referenceDate: sharedRange.end,
    }) : null),
    [perfActiveTab, vdotProfile, vdotHistory, sharedRange.end],
  );

  // Modele onglet Records (mockup p.16) — le plus lourd (splits/segments).
  const recordsModel = useMemo(
    () => (perfActiveTab === "records" ? buildRecordsModel({ scopeActivities: canonicalPerformanceScopeActivities }) : null),
    [perfActiveTab, canonicalPerformanceScopeActivities],
  );

  // Modele onglet FC de performance (mockup p.15).
  const fcPerformanceModel = useMemo(
    () => (perfActiveTab === "fc-performance" ? buildFcPerformanceModel({
      scopeActivities: canonicalPerformanceScopeActivities,
      vdotProfile,
      vdotHistory,
      intensityModel: overviewModel?.zonePreview?.intensityModel || overviewModel?.zonePreview || null,
      settings: trainingAnalyticsSettings,
      referenceDate: sharedRange.end,
    }) : null),
    [perfActiveTab, canonicalPerformanceScopeActivities, vdotProfile, vdotHistory, overviewModel, trainingAnalyticsSettings, sharedRange.end],
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

  // Onglet actif (reutilise le calcul precoce).
  const activeTabId = perfActiveTab;

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
      subtitle="Analyse tes performances et suis tes records."
    >
      {error ? <div className="alert alert-error section">{error}</div> : null}
      {isLoading && !safeActivities.length ? (
        <div className="card section">Chargement de la performance...</div>
      ) : null}

      <div className="performance-page">
        {/* Topbar harmonisee avec page Analyse (sans meteo). */}
        <AnalyticsCompactFilters
          search={filters.search}
          sportGroup={filters.sportGroup}
          preset={options.sharedPeriodPreset}
          periodLabel={sharedRange.label}
          availableSports={availableSports}
          filteredCount={canonicalPerformanceActivities.length}
          totalCount={canonicalPerformanceScopeActivities.length}
          onSearchChange={(value) => setFilter("search", value)}
          onSportChange={(value) => setFilter("sportGroup", value)}
          onPresetChange={handleSharedPresetChange}
          onReset={handleResetSharedFilters}
        />

        <SubTabs tabs={PERFORMANCE_TABS} defaultTabId="overview" />

        {activeTabId === "overview" ? (
          <PerformanceOverviewTab model={overviewModel} />
        ) : activeTabId === "vdot" ? (
          <PerformanceVdotProfileTab
            model={vdotProfileTabModel}
            coachAdvice="Intègre une séance de fractions courtes (30''-1' à intensité élevée) cette semaine pour stimuler ta VO₂max sans impacter ta fatigue globale."
          />
        ) : activeTabId === "allures" ? (
          <PerformanceAlluresReferenceTab model={alluresReferenceModel} />
        ) : activeTabId === "fc-performance" ? (
          <PerformanceFcPerformanceTab
            model={fcPerformanceModel}
            intensityModel={overviewModel?.zonePreview || null}
            confidence={performanceConfidence}
          />
        ) : activeTabId === "records" ? (
          <PerformanceRecordsTab model={recordsModel} />
        ) : (
          <div className="card section performance-tab-placeholder">
            <h2>Onglet en cours de construction</h2>
            <p>
              Ce sous-onglet sera livre dans un lot Performance dedie. Repasse sur
              « Vue d'ensemble » pour la version actuelle.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
