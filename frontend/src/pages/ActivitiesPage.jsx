import { useEffect, useState } from "react";
import AnalyticsFiltersBar from "../components/AnalyticsFiltersBar.jsx";
import ActivitiesTable from "../components/ActivitiesTable.jsx";
import { SHARED_FILTER_COPY } from "../content/analyticsCopy.js";
import AppShell from "../layouts/AppShell.jsx";
import useActivityViewModel from "../hooks/useActivityViewModel.js";
import { filterActivities } from "../utils/activityAggregations.js";
import { getAnalyticsPresetLabel } from "../utils/analyticsPeriods.js";

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
  } = useActivityViewModel({
    includeActivities: true,
  });
  const [activeAnchor, setActiveAnchor] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.location.hash
      ? window.location.hash.replace("#", "")
      : window.sessionStorage?.getItem("runsee-return-hash") || "";
  });

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
  const scopeNote = `Perimetre actuel : ${scopeLabel}.${searchNote} Filtres partages sur ${getAnalyticsPresetLabel(options.sharedPeriodPreset)}.`;

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
      eyebrow="Activites"
      title="Bibliotheque d'activites"
      subtitle={`Liste exploitable, filtres partages et acces direct a la fiche detail sur ${getAnalyticsPresetLabel(options.sharedPeriodPreset)}.`}
    >
      {error ? <div className="alert alert-error section">{error}</div> : null}
      {isLoading && !safeActivities.length ? <div className="card section">Chargement des activites...</div> : null}

      <div className="section">
        <AnalyticsFiltersBar
          title="Filtres d'analyse"
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
          title="Toutes les activites"
          subtitle="Vue de travail pour filtrer, parcourir puis ouvrir une seance sans perdre le contexte."
          returnPath="/activities"
        />
      </div>
    </AppShell>
  );
}
