import { useCallback, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import AppBrand from "../components/AppBrand.jsx";
import CurrentAccountPanel from "../components/CurrentAccountPanel.jsx";
import AppNavigation from "../components/AppNavigation.jsx";
import useAuth from "../hooks/useAuth.js";
import useRunSeeData from "../hooks/useRunSeeData.js";
import { startHistoricalSync, startIncrementalSync } from "../services/sync.service.js";
import { buildCurrentAccountModel } from "../utils/accountPresentation.js";

export default function AppLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { athlete, summary, currentJob, isBusy, reload, setError } = useRunSeeData({ includeActivities: false });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSyncLaunching, setIsSyncLaunching] = useState(false);

  const account = useMemo(
    () => buildCurrentAccountModel({ user, athlete, summary }),
    [athlete, summary, user],
  );
  const canSync = Boolean(user?.stravaConnected || athlete);
  const hasImportedActivities = Number(summary?.totalActivities || 0) > 0;

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
    if (!canSync || isBusy) {
      return;
    }

    setError("");
    setIsSyncLaunching(true);

    try {
      if (hasImportedActivities) {
        await startIncrementalSync();
      } else {
        await startHistoricalSync();
      }

      await reload({ includeActivities: false });
    } catch (error) {
      const message =
        error?.response?.data?.userMessage ||
        error?.response?.data?.message ||
        error?.message ||
        "Impossible de lancer la synchronisation Strava.";
      setError(message);
    } finally {
      setIsSyncLaunching(false);
    }
  }, [canSync, hasImportedActivities, isBusy, reload, setError]);

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar-top">
          <AppBrand />
          <CurrentAccountPanel
            account={account}
            onLogout={handleLogout}
            onSync={handleSync}
            isPending={isLoggingOut}
            isSyncing={Boolean(isBusy || isSyncLaunching || ["queued", "running"].includes(currentJob?.status))}
            canSync={canSync}
          />
          <span className="app-sidebar-label">Navigation</span>
        </div>
        <AppNavigation />
        <div className="app-sidebar-footer">
          <button
            type="button"
            className="button button-outline app-sidebar-glossary-button"
            onClick={() => navigate("/glossaire")}
          >
            Glossaire
          </button>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
