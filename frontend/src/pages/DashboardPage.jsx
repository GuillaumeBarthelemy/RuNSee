import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import SyncActions from "../components/SyncActions.jsx";
import SyncStatusCard from "../components/SyncStatusCard.jsx";
import SyncSummaryCard from "../components/SyncSummaryCard.jsx";
import ActivitiesTable from "../components/ActivitiesTable.jsx";
import KpiGrid from "../components/KpiGrid.jsx";
import WeeklyVolumeChart from "../components/WeeklyVolumeChart.jsx";
import MonthlyVolumeChart from "../components/MonthlyVolumeChart.jsx";
import SportDistributionChart from "../components/SportDistributionChart.jsx";
import ActivityFilters from "../components/ActivityFilters.jsx";
import { getCurrentAthlete } from "../services/athlete.service.js";
import { getActivities } from "../services/activity.service.js";
import { getCurrentSyncJob, getSyncSummary, startHistoricalSync, startIncrementalSync } from "../services/sync.service.js";
import { buildKpis, buildMonthlyVolume, buildSportDistribution, buildWeeklyVolume, filterActivities, getAvailableSportGroups } from "../utils/activityAggregations.js";
import { stravaLoginUrl } from "../config/env.js";

function extractErrorMessage(error, fallback) {
  return error?.response?.data?.userMessage || error?.response?.data?.message || error?.message || fallback;
}

export default function DashboardPage() {
  const location = useLocation();
  const [athlete, setAthlete] = useState(null);
  const [summary, setSummary] = useState(null);
  const [currentJob, setCurrentJob] = useState(null);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeAnchor, setActiveAnchor] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    sportGroup: "all",
    dateFrom: "",
    dateTo: "",
  });

  const isBusy = ["queued", "running"].includes(currentJob?.status);

  const loadAll = useCallback(async () => {
    try {
      const [athleteRes, summaryRes, currentJobRes, activitiesRes] = await Promise.allSettled([
        getCurrentAthlete(),
        getSyncSummary(),
        getCurrentSyncJob(),
        getActivities(),
      ]);

      if (athleteRes.status === "fulfilled") {
        setAthlete(athleteRes.value);
      } else if (athleteRes.reason?.response?.status !== 404) {
        throw athleteRes.reason;
      } else {
        setAthlete(null);
      }

      if (summaryRes.status === "fulfilled") {
        setSummary(summaryRes.value);
      } else {
        throw summaryRes.reason;
      }

      if (currentJobRes.status === "fulfilled") {
        setCurrentJob(currentJobRes.value);
      } else {
        throw currentJobRes.reason;
      }

      if (activitiesRes.status === "fulfilled") {
        setActivities(Array.isArray(activitiesRes.value) ? activitiesRes.value : []);
      } else {
        throw activitiesRes.reason;
      }
    } catch (err) {
      setError(extractErrorMessage(err, "Erreur de chargement du tableau de bord."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!isBusy) return undefined;
    const timer = setInterval(() => {
      loadAll();
    }, 3000);
    return () => clearInterval(timer);
  }, [isBusy, loadAll]);

  useEffect(() => {
    const hashFromUrl = location.hash ? location.hash.replace("#", "") : "";
    const hashFromStorage = sessionStorage.getItem("runsee-return-hash") || "";
    const nextAnchor = hashFromUrl || hashFromStorage;
    if (nextAnchor) {
      setActiveAnchor(nextAnchor);
      sessionStorage.removeItem("runsee-return-hash");
    }
  }, [location.hash]);

  const handleConnectStrava = useCallback(() => {
    window.location.href = stravaLoginUrl;
  }, []);

  const handleStartHistorical = useCallback(async () => {
    setError("");
    try {
      await startHistoricalSync();
      await loadAll();
    } catch (err) {
      setError(extractErrorMessage(err, "Erreur lors du lancement du rechargement historique."));
    }
  }, [loadAll]);

  const handleStartIncremental = useCallback(async () => {
    setError("");
    try {
      await startIncrementalSync();
      await loadAll();
    } catch (err) {
      setError(extractErrorMessage(err, "Erreur lors du lancement de la synchronisation incrémentale."));
    }
  }, [loadAll]);

  const handleFilterChange = useCallback((name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      search: "",
      sportGroup: "all",
      dateFrom: "",
      dateTo: "",
    });
  }, []);

  const availableSports = useMemo(() => getAvailableSportGroups(activities), [activities]);
  const filteredActivities = useMemo(() => filterActivities(activities, filters), [activities, filters]);
  const kpis = useMemo(() => buildKpis(filteredActivities), [filteredActivities]);
  const weeklyVolume = useMemo(() => buildWeeklyVolume(filteredActivities, filters), [filteredActivities, filters]);
  const monthlyVolume = useMemo(() => buildMonthlyVolume(filteredActivities, filters), [filteredActivities, filters]);
  const sportDistribution = useMemo(() => buildSportDistribution(filteredActivities), [filteredActivities]);

  return (
    <div className="page premium-page">
      <div className="container">
        <header className="topbar premium-topbar">
          <div>
            <div className="brand-line">
              <span className="brand-badge">RuNSee</span>
              <span className="brand-caption">Vision locale de tes activités Strava</span>
            </div>
            <h1 className="topbar-title">Tableau de bord premium</h1>
            <p className="page-subtitle">Synchronise, explore et analyse tes activités avec une interface pensée pour le suivi quotidien.</p>
          </div>
        </header>

        {error ? <div className="alert alert-error section">{error}</div> : null}

        <div className="section">
          <SyncActions
            onConnectStrava={handleConnectStrava}
            onStartHistorical={handleStartHistorical}
            onStartIncremental={handleStartIncremental}
            isBusy={isBusy}
          />
        </div>

        <div className="section">
          <ActivityFilters
            filters={filters}
            availableSports={availableSports}
            filteredCount={filteredActivities.length}
            totalCount={activities.length}
            onChange={handleFilterChange}
            onReset={handleResetFilters}
          />
        </div>

        <div className="section">
          <SyncSummaryCard summary={summary} athlete={athlete} />
        </div>

        <div className="grid two-columns section">
          <SyncStatusCard currentJob={currentJob} />
          <section className="card card-accent status-side-card">
            <h2 className="card-title">État général</h2>
            <p className="muted">
              {isLoading
                ? "Chargement en cours…"
                : athlete
                  ? "Connexion Strava active. Les données locales sont prêtes à être filtrées, analysées et ré-explorées activité par activité."
                  : "Aucun athlète connecté. Lance d'abord la connexion Strava pour alimenter la base locale."}
            </p>
            <div className="top-gap-sm small-text">
              Les graphiques, KPI et la table se recalculent automatiquement sur la sélection courante.
            </div>
          </section>
        </div>

        <div className="section">
          <KpiGrid kpis={kpis} />
        </div>

        <div className="grid two-columns section">
          <WeeklyVolumeChart data={weeklyVolume} />
          <MonthlyVolumeChart data={monthlyVolume} />
        </div>

        <div className="section">
          <SportDistributionChart data={sportDistribution} />
        </div>

        <div className="section">
          <ActivitiesTable activities={filteredActivities} currentAnchor={activeAnchor} onAnchorHandled={() => setActiveAnchor("")} />
        </div>
      </div>
    </div>
  );
}
