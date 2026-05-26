import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import AppShell from "../layouts/AppShell.jsx";
import AnalyticsCompactFilters from "../components/analytics/AnalyticsCompactFilters.jsx";
import SubTabs from "../components/visuals/alpine/SubTabs.jsx";
import EmptyState from "../components/visuals/alpine/EmptyState.jsx";
import ProgressionVolumeTab from "../components/progression/ProgressionVolumeTab.jsx";
import ProgressionOverviewTab from "../components/progression/ProgressionOverviewTab.jsx";
import ProgressionRegularityTab from "../components/progression/ProgressionRegularityTab.jsx";
import ProgressionComparisonsTab from "../components/progression/ProgressionComparisonsTab.jsx";
import useActivityViewModel from "../hooks/useActivityViewModel.js";
import { filterActivities } from "../utils/activityAggregations.js";
import { buildProgressionVolumeModel } from "../utils/progressionVolumeModel.js";
import { buildProgressionOverviewModel } from "../utils/progressionOverviewModel.js";
import { buildProgressionRegularityModel } from "../utils/progressionRegularityModel.js";
import { buildProgressionComparisonsModel } from "../utils/progressionComparisonsModel.js";

const PROGRESSION_TABS = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "volume", label: "Volume" },
  { id: "regularite", label: "Régularité" },
  { id: "comparaisons", label: "Comparaisons" },
];

/**
 * ProgressionPage — Lot Progression V1.
 *
 * Frontière produit :
 *   - Performance = mesurer le niveau et les capacités.
 *   - Analyse = comprendre l'état d'entraînement actuel.
 *   - Progression = suivre la construction long terme.
 *
 * Ce lot livre uniquement l'onglet Volume (mockup p.18). Les autres onglets
 * rendent un placeholder en cours de construction.
 */
export default function ProgressionPage() {
  const {
    error,
    isLoading,
    safeActivities,
    sharedRange,
    filters,
    options,
    availableSports,
    setFilter,
    resetFilters,
    setOption,
  } = useActivityViewModel({ includeActivities: true });

  const location = useLocation();
  const hash = location.hash.replace(/^#/, "");
  const activeTabId = PROGRESSION_TABS.some((t) => t.id === hash) ? hash : "overview";

  // Filtres period appliques pour les KPIs (12 derniers mois override sharedRange
  // pour Volume — on prend la fenetre choisie par l'utilisateur).
  const periodFilters = useMemo(
    () => ({
      ...filters,
      search: "",
      dateFrom: sharedRange.dateFrom,
      dateTo: sharedRange.dateTo,
    }),
    [filters, sharedRange.dateFrom, sharedRange.dateTo],
  );

  // Pour Volume, on a besoin de l'historique long terme — on garde sharedRange comme
  // fenetre d'analyse mais le modele lui-meme s'occupe de la fenetre 12 mois.
  const scopeActivities = useMemo(
    () =>
      filterActivities(
        safeActivities,
        { ...filters, search: "", dateFrom: "", dateTo: "" },
        { groupSports: options.groupSports },
      ),
    [filters, options.groupSports, safeActivities],
  );

  const volumeModel = useMemo(
    () => buildProgressionVolumeModel({
      activities: scopeActivities,
      referenceDate: sharedRange.end,
    }),
    [scopeActivities, sharedRange.end],
  );

  const overviewModel = useMemo(
    () => buildProgressionOverviewModel({
      activities: scopeActivities,
      referenceDate: sharedRange.end,
    }),
    [scopeActivities, sharedRange.end],
  );

  const regularityModel = useMemo(
    () => buildProgressionRegularityModel({
      activities: scopeActivities,
      referenceDate: sharedRange.end,
    }),
    [scopeActivities, sharedRange.end],
  );

  const comparisonsModel = useMemo(
    () => buildProgressionComparisonsModel({
      activities: scopeActivities,
      referenceDate: sharedRange.end,
    }),
    [scopeActivities, sharedRange.end],
  );

  const periodActivitiesCount = useMemo(
    () => filterActivities(safeActivities, periodFilters, { groupSports: options.groupSports }).length,
    [periodFilters, options.groupSports, safeActivities],
  );

  const handleSharedPresetChange = (preset) => {
    if (preset === "custom") {
      setOption("sharedPeriodPreset", "custom");
      if (!options.sharedCustomDateFrom) setOption("sharedCustomDateFrom", sharedRange.dateFrom);
      if (!options.sharedCustomDateTo) setOption("sharedCustomDateTo", sharedRange.dateTo);
      return;
    }
    setOption("sharedPeriodPreset", preset);
  };

  const handleResetSharedFilters = () => {
    resetFilters();
    setOption("groupSports", true);
    setOption("sharedPeriodPreset", "365d");
    setOption("sharedCustomDateFrom", "");
    setOption("sharedCustomDateTo", "");
  };

  return (
    <AppShell
      eyebrow="Progression"
      title="Progression"
      subtitle="Construction long terme : volume, cumul annuel, régularité et comparaisons."
    >
      {error ? <div className="alert alert-error section">{error}</div> : null}
      {isLoading && !safeActivities.length ? (
        <div className="card section">Chargement de la progression...</div>
      ) : null}

      <div className="progression-page">
        <AnalyticsCompactFilters
          search={filters.search}
          sportGroup={filters.sportGroup}
          preset={options.sharedPeriodPreset}
          periodLabel={sharedRange.label}
          availableSports={availableSports}
          filteredCount={periodActivitiesCount}
          totalCount={scopeActivities.length}
          onSearchChange={(value) => setFilter("search", value)}
          onSportChange={(value) => setFilter("sportGroup", value)}
          onPresetChange={handleSharedPresetChange}
          onReset={handleResetSharedFilters}
        />

        <SubTabs tabs={PROGRESSION_TABS} defaultTabId="overview" />

        {activeTabId === "overview" ? (
          <ProgressionOverviewTab model={overviewModel} />
        ) : activeTabId === "volume" ? (
          <ProgressionVolumeTab model={volumeModel} />
        ) : activeTabId === "regularite" ? (
          <ProgressionRegularityTab model={regularityModel} />
        ) : activeTabId === "comparaisons" ? (
          <ProgressionComparisonsTab model={comparisonsModel} />
        ) : (
          <div className="card section progression-tab-placeholder">
            <EmptyState
              icon="🏔️"
              title="Onglet en cours de construction"
              description="Ce sous-onglet sera livré dans un lot Progression dédié. Repasse sur « Volume » pour la version actuelle."
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
