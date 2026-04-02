import { useEffect, useMemo, useState } from "react";
import ActivityFilters from "../components/ActivityFilters.jsx";
import ActivitiesTable from "../components/ActivitiesTable.jsx";
import AppShell from "../layouts/AppShell.jsx";
import useActivityViewModel from "../hooks/useActivityViewModel.js";
import { buildCurrentAccountModel } from "../utils/accountPresentation.js";

export default function ActivitiesPage() {
  const {
    athlete,
    error,
    isLoading,
    safeActivities,
    filteredActivities,
    filters,
    options,
    table,
    availableSports,
    setFilter,
    resetFilters,
    setOption,
    setTable,
  } = useActivityViewModel({ includeActivities: true });
  const account = useMemo(
    () => buildCurrentAccountModel({ athlete, options }),
    [athlete, options],
  );
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

  return (
    <AppShell
      eyebrow="Activites"
      title="Bibliotheque d'activites"
      subtitle="Liste exploitable, filtres persistants et acces direct a la fiche detail."
      account={account}
    >
      {error ? <div className="alert alert-error section">{error}</div> : null}
      {isLoading && !safeActivities.length ? <div className="card section">Chargement des activites...</div> : null}

      <div className="section">
        <ActivityFilters
          filters={filters}
          options={options}
          availableSports={availableSports}
          filteredCount={filteredActivities.length}
          totalCount={safeActivities.length}
          onChange={setFilter}
          onReset={resetFilters}
          onOptionChange={setOption}
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
