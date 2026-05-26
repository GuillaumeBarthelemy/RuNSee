import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import AppShell from "../layouts/AppShell.jsx";
import SubTabs from "../components/visuals/alpine/SubTabs.jsx";
import ReglagesAccountTab from "../components/reglages/ReglagesAccountTab.jsx";
import ReglagesConnexionsTab from "../components/reglages/ReglagesConnexionsTab.jsx";
import ReglagesEntrainementTab from "../components/reglages/ReglagesEntrainementTab.jsx";
import ReglagesDonneesTab from "../components/reglages/ReglagesDonneesTab.jsx";
import ReglagesAboutTab from "../components/reglages/ReglagesAboutTab.jsx";
import useAuth from "../hooks/useAuth.js";
import { getGarminConnectionStatus } from "../services/externalProvider.service.js";

const REGLAGES_TABS = [
  { id: "compte",       label: "Compte" },
  { id: "connexions",   label: "Connexions" },
  { id: "entrainement", label: "Entraînement" },
  { id: "donnees",      label: "Données" },
  { id: "apropos",      label: "À propos" },
];

/**
 * ReglagesPage — Lot Réglages V1 (Alpine Light).
 *
 * 5 sous-onglets : Compte / Connexions / Entraînement / Données / À propos.
 *
 * NOTE : cette page remplace l'ancien Admin/Settings. La page /admin reste
 * accessible pour les actions admin systeme historiques mais pointera a terme
 * vers une URL dediee.
 */
export default function ReglagesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const hash = location.hash.replace(/^#/, "");
  const activeTabId = REGLAGES_TABS.some((t) => t.id === hash) ? hash : "compte";

  const [garminStatus, setGarminStatus] = useState(null);
  useEffect(() => {
    let cancelled = false;
    getGarminConnectionStatus()
      .then((s) => { if (!cancelled) setGarminStatus(s); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const stravaConnected = Boolean(user?.strava?.connected || user?.stravaConnected);
  const stravaAccount = user?.strava?.athleteUsername || user?.strava?.athleteName || user?.email || "";
  const stravaLastSync = user?.strava?.lastSync || "—";

  const garminConnected = Boolean(garminStatus?.connected);
  const garminAccount = garminStatus?.username || garminStatus?.account || "—";
  const garminLastSync = garminStatus?.lastSyncAt || "—";

  // AccountTab utilise useAuth() directement (refreshUser + logout)
  // user reste utilisé pour le statut Strava ci-dessous.
  void user;

  return (
    <AppShell
      eyebrow="Réglages"
      title="Réglages"
      subtitle="Gère ton compte et tes préférences."
    >
      <div className="reglages-page">
        <SubTabs tabs={REGLAGES_TABS} defaultTabId="compte" />

        {activeTabId === "compte" ? (
          <ReglagesAccountTab />
        ) : activeTabId === "connexions" ? (
          <ReglagesConnexionsTab
            stravaConnected={stravaConnected}
            stravaAccount={stravaAccount}
            stravaLastSync={stravaLastSync}
            garminConnected={garminConnected}
            garminAccount={garminAccount}
            garminLastSync={garminLastSync}
          />
        ) : activeTabId === "entrainement" ? (
          <ReglagesEntrainementTab />
        ) : activeTabId === "donnees" ? (
          <ReglagesDonneesTab />
        ) : (
          <ReglagesAboutTab />
        )}
      </div>
    </AppShell>
  );
}
