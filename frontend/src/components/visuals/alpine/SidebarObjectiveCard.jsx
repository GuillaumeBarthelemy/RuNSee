import { memo } from "react";
import { Link } from "react-router-dom";

function formatRaceDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * SidebarObjectiveCard — Alpine Light (Lot 2-bis).
 *
 * Carte "Objectif principal" dans la sidebar.
 * Si pas d'objectif actif : affiche un état vide compact avec lien vers
 * la création.
 *
 * Props :
 * - activeRace : { name, raceDate, distanceMeters, ... }
 */
function SidebarObjectiveCard({ activeRace = null }) {
  if (!activeRace) {
    return (
      <article className="alpine-sidebar-objective-card alpine-sidebar-objective-card--empty">
        <span className="alpine-sidebar-objective-kicker">Objectif principal</span>
        <p className="alpine-sidebar-objective-empty">Aucun objectif actif.</p>
        <Link className="alpine-sidebar-objective-link" to="/admin#entrainement">
          Définir un objectif →
        </Link>
      </article>
    );
  }

  return (
    <article className="alpine-sidebar-objective-card">
      <span className="alpine-sidebar-objective-kicker">Objectif principal</span>
      <div className="alpine-sidebar-objective-body">
        <span className="alpine-sidebar-objective-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M3 19 L9 9 L13 14 L17 8 L21 19 Z"
              fill="currentColor"
              fillOpacity="0.85"
            />
          </svg>
        </span>
        <div className="alpine-sidebar-objective-text">
          <strong>{activeRace.name || "Course objectif"}</strong>
          {activeRace.raceDate ? (
            <span>{formatRaceDate(activeRace.raceDate)}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default memo(SidebarObjectiveCard);
