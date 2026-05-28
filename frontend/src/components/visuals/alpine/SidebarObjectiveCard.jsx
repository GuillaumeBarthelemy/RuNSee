import { memo } from "react";
import { Link } from "react-router-dom";

function formatRaceDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function daysUntil(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

/**
 * SidebarObjectiveCard — Alpine Light.
 * Objectif principal (actif) + jusqu'a 2 objectifs secondaires (a venir).
 *
 * Props :
 * - activeRace : objectif principal
 * - secondaryRaces : [{ name, raceDate, ... }] (top 2)
 */
function SidebarObjectiveCard({ activeRace = null, secondaryRaces = [] }) {
  if (!activeRace && (!secondaryRaces || secondaryRaces.length === 0)) {
    return (
      <article className="alpine-sidebar-objective-card alpine-sidebar-objective-card--empty">
        <span className="alpine-sidebar-objective-kicker">Objectif principal</span>
        <p className="alpine-sidebar-objective-empty">Aucun objectif actif.</p>
        <Link className="alpine-sidebar-objective-link" to="/reglages#objectifs">
          Définir un objectif →
        </Link>
      </article>
    );
  }

  return (
    <article className="alpine-sidebar-objective-card">
      <span className="alpine-sidebar-objective-kicker">Objectif principal</span>
      {activeRace ? (
        <div className="alpine-sidebar-objective-body">
          <span className="alpine-sidebar-objective-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M3 19 L9 9 L13 14 L17 8 L21 19 Z" fill="currentColor" fillOpacity="0.85" />
            </svg>
          </span>
          <div className="alpine-sidebar-objective-text">
            <strong>{activeRace.name || "Course objectif"}</strong>
            {activeRace.raceDate ? (
              <span>
                {formatRaceDate(activeRace.raceDate)}
                {daysUntil(activeRace.raceDate) != null && daysUntil(activeRace.raceDate) >= 0
                  ? ` · J-${daysUntil(activeRace.raceDate)}`
                  : ""}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="alpine-sidebar-objective-empty">Aucun objectif principal actif.</p>
      )}

      {secondaryRaces && secondaryRaces.length > 0 ? (
        <div className="alpine-sidebar-objective-secondary">
          <span className="alpine-sidebar-objective-subkicker">Objectifs secondaires</span>
          <ul>
            {secondaryRaces.map((race) => {
              const d = daysUntil(race.raceDate);
              return (
                <li key={race.id}>
                  <span className="alpine-sidebar-objective-secondary-name">{race.name}</span>
                  <span className="alpine-sidebar-objective-secondary-meta">
                    {formatRaceDate(race.raceDate)}{d != null && d >= 0 ? ` · J-${d}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

export default memo(SidebarObjectiveCard);
