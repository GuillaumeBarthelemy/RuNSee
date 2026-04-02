import { useMemo } from "react";
import { Outlet } from "react-router-dom";
import AppBrand from "../components/AppBrand.jsx";
import CurrentAccountPanel from "../components/CurrentAccountPanel.jsx";
import AppNavigation from "../components/AppNavigation.jsx";
import useRunSeeData from "../hooks/useRunSeeData.js";
import { buildCurrentAccountModel } from "../utils/accountPresentation.js";

export default function AppLayout() {
  const { athlete } = useRunSeeData({ includeActivities: false });

  const account = useMemo(
    () => buildCurrentAccountModel({ athlete }),
    [athlete],
  );

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar-top">
          <AppBrand />
          <CurrentAccountPanel account={account} />
          <span className="app-sidebar-label">Navigation</span>
        </div>
        <AppNavigation />
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
