import { useCallback, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import AppNavigation from "../components/AppNavigation.jsx";
import SidebarBrand from "../components/visuals/alpine/SidebarBrand.jsx";
import SidebarObjectiveCard from "../components/visuals/alpine/SidebarObjectiveCard.jsx";
import SidebarAdviceCard from "../components/visuals/alpine/SidebarAdviceCard.jsx";
import UserMenu from "../components/visuals/alpine/UserMenu.jsx";
import useAuth from "../hooks/useAuth.js";
import useProviderStatuses from "../hooks/useProviderStatuses.js";
import useRaceObjectives from "../hooks/useRaceObjectives.js";
import useRunSeeData from "../hooks/useRunSeeData.js";
import { startGlobalSync } from "../services/sync.service.js";
import { buildCurrentAccountModel } from "../utils/accountPresentation.js";

/**
 * AppLayout — Refonte Alpine Light Lot 2-bis (mockup-faithful).
 *
 * Sidebar selon mockup :
 *  - Brand "RunNSee Alpine Light" avec icône montagne
 *  - Navigation 7 items (Accueil/Activités/Analyse/Performance/Progression/Réglages/Glossaire)
 *  - Carte "Objectif principal" (consomme useRaceObjectives.activeRace)
 *  - Carte "Conseil du jour" (texte coach prudent par défaut, à enrichir Lot 3-bis)
 *  - UserMenu en bas avec dropdown (Réglages / Glossaire / Déconnexion)
 *  - Bouton de synchronisation globale en bas (icône discrète)
 *
 * Hooks et services backend conservés intacts :
 *  useAuth, useRunSeeData, useProviderStatuses, useRaceObjectives, startGlobalSync.
 */
export default function AppLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { athlete, summary, currentJob, isBusy, reload, setError } = useRunSeeData({ includeActivities: false });
  const providerStatuses = useProviderStatuses();
  const { activeRace } = useRaceObjectives();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSyncLaunching, setIsSyncLaunching] = useState(false);

  const account = useMemo(
    () => buildCurrentAccountModel({ user, athlete, summary }),
    [athlete, summary, user],
  );
  const canSync = Boolean(
    providerStatuses.providers?.strava?.connected
      || providerStatuses.providers?.garmin?.connected
      || user?.stravaConnected
      || athlete,
  );
  const isSyncing = Boolean(
    isBusy || isSyncLaunching || ["queued", "running"].includes(currentJob?.status),
  );

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error("Sidebar logout failed:", error);
    } finally {
      navigate("/login", { replace: true });
      setIsLoggingOut(false);
    }
  }, [logout, navigate]);

  const handleSync = useCallback(async () => {
    if (!canSync || isBusy) return;

    setError("");
    setIsSyncLaunching(true);

    try {
      const result = await startGlobalSync();
      if (result?.status === "already_running" && result?.message) {
        setError(result.message);
      }
      await providerStatuses.refresh();
      await reload({ includeActivities: false });
    } catch (error) {
      const message =
        error?.response?.data?.userMessage
        || error?.response?.data?.message
        || error?.message
        || "Impossible de lancer la synchronisation globale.";
      setError(message);
    } finally {
      setIsSyncLaunching(false);
    }
  }, [canSync, isBusy, providerStatuses, reload, setError]);

  return (
    <div className="app-shell alpine-shell">
      <aside className="app-sidebar alpine-sidebar">
        <div className="alpine-sidebar-top">
          <SidebarBrand />
          <AppNavigation />
        </div>

        <div className="alpine-sidebar-cards">
          <SidebarObjectiveCard activeRace={activeRace} />
          <SidebarAdviceCard linkTo="/analytics" />
        </div>

        <div className="alpine-sidebar-bottom">
          <UserMenu
            account={account}
            onLogout={handleLogout}
            isLoggingOut={isLoggingOut}
          />
          <button
            type="button"
            className={`alpine-sidebar-sync ${isSyncing ? "is-busy" : ""}`.trim()}
            onClick={handleSync}
            disabled={!canSync || isSyncing}
            aria-label={isSyncing
              ? "Synchronisation en cours"
              : canSync
                ? "Synchroniser Strava et Garmin"
                : "Connecte un provider d'abord"}
            title={isSyncing
              ? "Synchronisation en cours"
              : canSync
                ? "Synchroniser Strava et Garmin"
                : "Connecte un provider d'abord"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M20 11a8 8 0 0 0-14.9-4M4 13a8 8 0 0 0 14.9 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M5 4v4h4M19 20v-4h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
