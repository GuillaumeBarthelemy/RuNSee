import { memo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * SubTabs — Alpine Light (Lot 1).
 *
 * Navigation par sous-onglets compacts. Scrollable horizontalement sur mobile,
 * sans débordement vertical. Source de vérité = hash URL (`#cumul-annuel`,
 * `#charges`, etc.) pour deep-link et back/forward natif.
 *
 * Différent de TabbedSettings (full-screen) — destiné aux sous-onglets de
 * page (Analyse / Performance / Progression).
 *
 * Props :
 * - tabs : [{ id: "charges", label: "Charges", count?: number }]
 * - defaultTabId : id de l'onglet actif par défaut
 * - onChange(tabId) : callback optionnel (consommateur peut aussi lire le hash)
 */
function SubTabs({ tabs = [], defaultTabId = null, onChange = null }) {
  const location = useLocation();
  const navigate = useNavigate();

  if (!tabs.length) return null;

  const hash = location.hash.replace(/^#/, "");
  const activeId = (hash && tabs.some((t) => t.id === hash))
    ? hash
    : (defaultTabId || tabs[0]?.id || null);

  function handleClick(tabId) {
    navigate(`${location.pathname}#${tabId}`, { replace: true });
    if (typeof onChange === "function") onChange(tabId);
  }

  return (
    <nav className="alpine-subtabs" role="tablist" aria-label="Sous-onglets">
      <div className="alpine-subtabs-track">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`alpine-subtab ${isActive ? "is-active" : ""}`.trim()}
              onClick={() => handleClick(tab.id)}
            >
              <span className="alpine-subtab-label">{tab.label}</span>
              {typeof tab.count === "number" ? (
                <span className="alpine-subtab-count">{tab.count}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default memo(SubTabs);
