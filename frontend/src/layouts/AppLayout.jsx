import { useCallback, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import AppBrand from "../components/AppBrand.jsx";
import CurrentAccountPanel from "../components/CurrentAccountPanel.jsx";
import AppNavigation from "../components/AppNavigation.jsx";
import useAuth from "../hooks/useAuth.js";
import useProviderStatuses from "../hooks/useProviderStatuses.js";
import useRunSeeData from "../hooks/useRunSeeData.js";
import { startGlobalSync } from "../services/sync.service.js";
import { buildCurrentAccountModel } from "../utils/accountPresentation.js";

export default function AppLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { athlete, summary, currentJob, isBusy, reload, setError } = useRunSeeData({ includeActivities: false });
  const providerStatuses = useProviderStatuses();
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
      const result = await startGlobalSync();
      if (result?.status === "already_running" && result?.message) {
        setError(result.message);
      }
      await providerStatuses.refresh();
      await reload({ includeActivities: false });
    } catch (error) {
      const message =
        error?.response?.data?.userMessage ||
        error?.response?.data?.message ||
        error?.message ||
        "Impossible de lancer la synchronisation globale.";
      setError(message);
    } finally {
      setIsSyncLaunching(false);
    }
  }, [canSync, isBusy, providerStatuses, reload, setError]);

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
            providerStatuses={providerStatuses.providers}
            providerStatusLoading={providerStatuses.isLoading}
            providerStatusError={providerStatuses.error}
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
