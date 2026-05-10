import { useEffect, useMemo, useState } from "react";
import ActivitiesTable from "../components/ActivitiesTable.jsx";
import ActivitiesFilterBar from "../components/activities/ActivitiesFilterBar.jsx";
import ActivityPeriodKpis from "../components/activities/ActivityPeriodKpis.jsx";
import ActivityCardsView from "../components/activities/ActivityCardsView.jsx";
import ActivityRightRail from "../components/activities/ActivityRightRail.jsx";
import AppShell from "../layouts/AppShell.jsx";
import useActivityViewModel from "../hooks/useActivityViewModel.js";
import { filterActivities } from "../utils/activityAggregations.js";
import {
  computePeriodKpis,
  getActivityIntensity,
  getActivityProviderKey,
  hasIntensityReference,
} from "../utils/activitiesViewModel.js";

/**
 * ActivitiesPage — Alpine Light (mini-lot 14, mockup PDF page 6).
 *
 * Mini-lot 14 — corrections :
 *  - ActivitiesFilterBar Alpine compact (remplace AnalyticsFiltersBar volumineuse).
 *  - Filtres Source (Toutes/Strava/Garmin/Strava+Garmin) et Intensité (zones FC).
 *  - Tri (Date desc/asc, Distance, Durée).
 *  - Compteur intégré dans la barre filtres (plus de bandeau scope séparé).
 *
 * Anti-régression :
 *  - Aucun calcul métier modifié (filterActivities, useActivityViewModel intacts).
 *  - AnalyticsFiltersBar non modifié (toujours utilisé par Analyse).
 *  - Filtres Source / Intensité / Tri appliqués EN AVAL via useMemo, pas dans
 *    l'util filterActivities partagé.
 *  - Lien détail jamais cassé.
 */
export default function ActivitiesPage() {
  const {
    error,
    isLoading,
    safeActivities,
    filters,
    filteredActivities,
    options,
    sharedRange,
    table,
    availableSports,
    trainingAnalyticsSettings,
    setFilter,
    resetFilters,
    setOption,
    setTable,
  } = useActivityViewModel({ includeActivities: true });

  const [activeAnchor, setActiveAnchor] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.location.hash
      ? window.location.hash.replace("#", "")
      : window.sessionStorage?.getItem("runsee-return-hash") || "";
  });

  const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'table'
  const [source, setSource] = useState("all");
  const [intensity, setIntensity] = useState("all");
  const [sort, setSort] = useState("date_desc");

  useEffect(() => {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    sessionStorage.removeItem("runsee-return-hash");
  }, []);

  const activityScopeActivities = filterActivities(
    safeActivities,
    { ...filters, dateFrom: "", dateTo: "" },
    { groupSports: options.groupSports },
  );

  // Filtrage Source + Intensité en aval (jamais dans filterActivities partagé)
  const filteredAndRefined = useMemo(() => {
    const intensityRef = hasIntensityReference(trainingAnalyticsSettings);
    const result = filteredActivities.filter((a) => {
      // Filtre Source
      if (source !== "all") {
        if (getActivityProviderKey(a) !== source) return false;
      }
      // Filtre Intensité (uniquement si zones FC configurées)
      if (intensity !== "all" && intensityRef) {
        if (getActivityIntensity(a, trainingAnalyticsSettings) !== intensity) return false;
      }
      return true;
    });
    return result;
  }, [filteredActivities, source, intensity, trainingAnalyticsSettings]);

  // Tri en aval (jamais dans filterActivities)
  const sortedActivities = useMemo(() => {
    const arr = [...filteredAndRefined];
    const getDate = (a) => new Date(a?.startDate || a?.startDateLocal || 0).getTime();
    switch (sort) {
      case "date_asc":  arr.sort((a, b) => getDate(a) - getDate(b)); break;
      case "distance":  arr.sort((a, b) => Number(b?.distance || 0) - Number(a?.distance || 0)); break;
      case "duration":  arr.sort((a, b) => Number(b?.movingTime || 0) - Number(a?.movingTime || 0)); break;
      case "date_desc":
      default:          arr.sort((a, b) => getDate(b) - getDate(a)); break;
    }
    return arr;
  }, [filteredAndRefined, sort]);

  const handleSharedPresetChange = (preset) => {
    if (preset === "custom") {
      setOption("sharedPeriodPreset", "custom");
      if (!options.sharedCustomDateFrom) setOption("sharedCustomDateFrom", sharedRange.dateFrom);
      if (!options.sharedCustomDateTo) setOption("sharedCustomDateTo", sharedRange.dateTo);
      return;
    }
    setOption("sharedPeriodPreset", preset);
  };

  const handleResetFilters = () => {
    resetFilters();
    setOption("groupSports", true);
    setOption("sharedPeriodPreset", "90d");
    setOption("sharedCustomDateFrom", "");
    setOption("sharedCustomDateTo", "");
    setSource("all");
    setIntensity("all");
    setSort("date_desc");
  };

  // KPIs sur les activités filtrées + raffinées
  const periodKpis = useMemo(
    () => computePeriodKpis(sortedActivities),
    [sortedActivities],
  );

  const intensityAvailable = useMemo(
    () => hasIntensityReference(trainingAnalyticsSettings),
    [trainingAnalyticsSettings],
  );

  return (
    <AppShell
      eyebrow="Activités"
      title="Activités"
      subtitle="Toutes vos sorties et entraînements."
    >
      {error ? <div className="alert alert-error section">{error}</div> : null}
      {isLoading && !safeActivities.length ? (
        <div className="card section">Chargement des activités…</div>
      ) : null}

      {/* === Bandeau 5 KPIs période === */}
      <ActivityPeriodKpis kpis={periodKpis} />

      {/* === Barre filtres compacte Alpine === */}
      <ActivitiesFilterBar
        search={filters.search}
        sportGroup={filters.sportGroup}
        source={source}
        intensity={intensity}
        sort={sort}
        preset={options.sharedPeriodPreset}
        periodLabel={sharedRange.label}
        availableSports={availableSports}
        intensityAvailable={intensityAvailable}
        filteredCount={sortedActivities.length}
        totalCount={activityScopeActivities.length}
        onSearchChange={(value) => setFilter("search", value)}
        onSportChange={(value) => setFilter("sportGroup", value)}
        onSourceChange={setSource}
        onIntensityChange={setIntensity}
        onSortChange={setSort}
        onPresetChange={handleSharedPresetChange}
        onReset={handleResetFilters}
      />

      {/* === Toggle Cartes / Tableau (fallback) === */}
      <div className="alpine-activities-view-toggle" role="tablist" aria-label="Mode d'affichage">
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === "cards"}
          className={`alpine-button alpine-button--ghost ${viewMode === "cards" ? "is-active" : ""}`.trim()}
          onClick={() => setViewMode("cards")}
        >
          Vue cartes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === "table"}
          className={`alpine-button alpine-button--ghost ${viewMode === "table" ? "is-active" : ""}`.trim()}
          onClick={() => setViewMode("table")}
        >
          Vue tableau
        </button>
      </div>

      {/* === Layout principal : cartes + right rail (desktop 2 cols) === */}
      {viewMode === "cards" ? (
        <div className="alpine-activities-layout">
          <div className="alpine-activities-main">
            <ActivityCardsView
              activities={sortedActivities}
              settings={trainingAnalyticsSettings}
            />
          </div>
          <ActivityRightRail activities={sortedActivities} />
        </div>
      ) : (
        <div className="section">
          <ActivitiesTable
            activities={sortedActivities}
            groupSports={options.groupSports}
            currentAnchor={activeAnchor}
            onAnchorHandled={() => setActiveAnchor("")}
            currentPage={table.currentPage}
            pageSize={table.pageSize}
            onPageChange={(value) => setTable("currentPage", value)}
            onPageSizeChange={(value) => {
              setTable("pageSize", value);
              setTable("currentPage", 1);
            }}
            title="Toutes les activités"
            subtitle="Vue tabulaire de fallback. La vue cartes reste la cible principale."
            returnPath="/activities"
          />
        </div>
      )}
    </AppShell>
  );
}
