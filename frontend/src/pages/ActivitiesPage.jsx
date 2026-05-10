import { useEffect, useMemo, useState } from "react";
import AnalyticsFiltersBar from "../components/AnalyticsFiltersBar.jsx";
import ActivitiesTable from "../components/ActivitiesTable.jsx";
import ActivityPeriodKpis from "../components/activities/ActivityPeriodKpis.jsx";
import ActivityCardsView from "../components/activities/ActivityCardsView.jsx";
import ActivityRightRail from "../components/activities/ActivityRightRail.jsx";
import { SHARED_FILTER_COPY } from "../content/analyticsCopy.js";
import AppShell from "../layouts/AppShell.jsx";
import useActivityViewModel from "../hooks/useActivityViewModel.js";
import { filterActivities } from "../utils/activityAggregations.js";
import { getAnalyticsPresetLabel } from "../utils/analyticsPeriods.js";
import { computePeriodKpis } from "../utils/activitiesViewModel.js";

/**
 * ActivitiesPage — Alpine Light (Lot 03, mockup PDF page 6).
 *
 * Refonte cards-first (PDF page 6) :
 *  1. Header "Activités" + sous-texte "Toutes vos sorties et entraînements."
 *  2. Bandeau 5 KPIs période
 *  3. AnalyticsFiltersBar (existant, conservé)
 *  4. Layout 2 colonnes desktop : liste cartes (gauche) + right rail (droite)
 *  5. Toggle "Vue tableau" → fallback ActivitiesTable conservé
 *
 * Anti-régression :
 *  - Aucun calcul métier modifié (filterActivities, useActivityViewModel intacts).
 *  - getActivityPublicId via activityLinks (pas de /activities/undefined).
 *  - "—" si donnée absente (jamais 0 km, 0 m, 0 bpm fictif).
 *  - ActivitiesTable conservé en fallback toggle.
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

  useEffect(() => {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    sessionStorage.removeItem("runsee-return-hash");
  }, []);

  const activityScopeActivities = filterActivities(
    safeActivities,
    { ...filters, dateFrom: "", dateTo: "" },
    { groupSports: options.groupSports },
  );

  const scopeLabel = filters.sportGroup === "all" ? "tous les sports" : filters.sportGroup;
  const searchNote = filters.search ? ` Recherche active : "${filters.search}".` : "";
  const scopeNote = `Périmètre actuel : ${scopeLabel}.${searchNote} Filtres partagés sur ${getAnalyticsPresetLabel(options.sharedPeriodPreset)}.`;

  const handleSharedPresetChange = (preset) => {
    if (preset === "custom") {
      setOption("sharedPeriodPreset", "custom");
      if (!options.sharedCustomDateFrom) setOption("sharedCustomDateFrom", sharedRange.dateFrom);
      if (!options.sharedCustomDateTo) setOption("sharedCustomDateTo", sharedRange.dateTo);
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

  // KPIs sur les activités filtrées (utils existants → aucun calcul métier nouveau)
  const periodKpis = useMemo(() => computePeriodKpis(filteredActivities), [filteredActivities]);

  return (
    <AppShell
      eyebrow="Activités"
      title="Activités"
      subtitle="Toutes vos sorties et entraînements."
    >
      {error ? <div className="alert alert-error section">{error}</div> : null}
      {isLoading && !safeActivities.length ? (
        <div className="card section">Chargement des activités...</div>
      ) : null}

      {/* === Bandeau 5 KPIs période === */}
      <ActivityPeriodKpis kpis={periodKpis} />

      {/* === Filtres partagés (composant existant) === */}
      <div className="section">
        <AnalyticsFiltersBar
          title="Filtres"
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
          filteredCount={filteredActivities.length}
          totalCount={activityScopeActivities.length}
          onPresetChange={handleSharedPresetChange}
          onCustomDateChange={handleSharedCustomDateChange}
          onSearchChange={(value) => setFilter("search", value)}
          onSportChange={(value) => setFilter("sportGroup", value)}
          onGroupSportsChange={(value) => setOption("groupSports", value)}
          onReset={handleResetSharedFilters}
          scopeNote={scopeNote}
        />
      </div>

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
            <ActivityCardsView activities={filteredActivities} />
          </div>
          <ActivityRightRail activities={filteredActivities} />
        </div>
      ) : (
        <div className="section">
          <ActivitiesTable
            activities={filteredActivities}
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
