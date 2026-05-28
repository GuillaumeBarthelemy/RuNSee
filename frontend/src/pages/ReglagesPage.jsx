import { useLocation } from "react-router-dom";
import AppShell from "../layouts/AppShell.jsx";
import SubTabs from "../components/visuals/alpine/SubTabs.jsx";
import ReglagesAccountTab from "../components/reglages/ReglagesAccountTab.jsx";
import ReglagesConnexionsTab from "../components/reglages/ReglagesConnexionsTab.jsx";
import ReglagesEntrainementTab from "../components/reglages/ReglagesEntrainementTab.jsx";
import ReglagesObjectivesTab from "../components/reglages/ReglagesObjectivesTab.jsx";
import ReglagesDonneesTab from "../components/reglages/ReglagesDonneesTab.jsx";
import ReglagesAboutTab from "../components/reglages/ReglagesAboutTab.jsx";
import useAuth from "../hooks/useAuth.js";

const REGLAGES_TABS = [
  { id: "compte",       label: "Compte" },
  { id: "connexions",   label: "Connexions" },
  { id: "entrainement", label: "Entraînement" },
  { id: "objectifs",    label: "Objectifs" },
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

  // AccountTab et ConnexionsTab utilisent leurs propres hooks/services pour
  // charger les donnees fraiches (user / providers status). On ne passe plus
  // de props ici (autoriser auto-refresh apres save / sync / reconnect).
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
          <ReglagesConnexionsTab />
        ) : activeTabId === "entrainement" ? (
          <ReglagesEntrainementTab />
        ) : activeTabId === "objectifs" ? (
          <ReglagesObjectivesTab />
        ) : activeTabId === "donnees" ? (
          <ReglagesDonneesTab />
        ) : (
          <ReglagesAboutTab />
        )}
      </div>
    </AppShell>
  );
}
