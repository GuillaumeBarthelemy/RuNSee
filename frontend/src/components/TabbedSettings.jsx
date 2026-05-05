import { useLocation, useNavigate } from "react-router-dom";

/**
 * TabbedSettings — Phase I1.
 *
 * Navigation par onglets pour la page Réglages, avec routing via URL hash.
 *
 * Props :
 * - tabs : array de { id, label, icon?, render() } — onglets à afficher
 * - defaultTabId : string — onglet actif par défaut (si pas de hash)
 *
 * Comportement :
 * - Le hash de l'URL (`#compte`, `#connexions`...) détermine l'onglet actif.
 * - Click sur un onglet → push le hash dans l'URL (URL partageable).
 * - Sur mobile, les onglets restent horizontaux mais scrollables.
 *
 * Note : pas de state local — l'onglet actif est dérivé directement du hash
 * URL (source de vérité unique, navigation back/forward gérée nativement).
 */
export default function TabbedSettings({ tabs = [], defaultTabId = null }) {
  const location = useLocation();
  const navigate = useNavigate();

  const hash = location.hash.replace(/^#/, "");
  const activeTabId = (hash && tabs.some((t) => t.id === hash))
    ? hash
    : (defaultTabId || tabs[0]?.id || null);

  function handleTabClick(tabId) {
    navigate(`${location.pathname}#${tabId}`, { replace: true });
  }

  if (!tabs.length) return null;

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  if (!activeTab) return null;

  return (
    <div className="tabbed-settings">
      <nav className="tabbed-settings-nav" role="tablist" aria-label="Sections des réglages">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab.id === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            className={`tabbed-settings-tab ${activeTab.id === tab.id ? "is-active" : ""}`.trim()}
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.icon ? <span className="tabbed-settings-tab-icon" aria-hidden="true">{tab.icon}</span> : null}
            <span className="tabbed-settings-tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div
        role="tabpanel"
        id={`tabpanel-${activeTab.id}`}
        aria-labelledby={`tab-${activeTab.id}`}
        className="tabbed-settings-panel"
      >
        {activeTab.render ? activeTab.render() : null}
      </div>
    </div>
  );
}
