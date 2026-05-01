import { memo } from "react";
import { Link } from "react-router-dom";

const noop = () => {};

function toValidDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getFirstName(athlete = {}) {
  const source = athlete?.firstname
    || athlete?.firstName
    || athlete?.name
    || athlete?.displayName
    || "";

  return String(source).trim().split(/\s+/)[0] || "";
}

function formatLongDate(value) {
  const date = toValidDate(value) || new Date();

  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatRaceCountdown(race = {}) {
  const raceDate = toValidDate(race?.raceDate);

  if (!raceDate) {
    return null;
  }

  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startRace = new Date(raceDate.getFullYear(), raceDate.getMonth(), raceDate.getDate());
  const days = Math.round((startRace - startToday) / 86400000);

  if (days === 0) {
    return "Jour J";
  }

  return days > 0 ? `J-${days}` : `J+${Math.abs(days)}`;
}

function formatActivitySummary(activityCount = 0, totalCount = 0) {
  const safeActivityCount = Math.max(0, Number(activityCount) || 0);
  const safeTotalCount = Math.max(0, Number(totalCount) || 0);

  if (safeTotalCount > 0 && safeTotalCount !== safeActivityCount) {
    return `${safeActivityCount} / ${safeTotalCount} activites`;
  }

  return `${safeActivityCount} activite${safeActivityCount > 1 ? "s" : ""}`;
}

function TodayHeader({
  athlete = {},
  activeRace = null,
  date = new Date(),
  rangeLabel = "",
  sportGroup = "all",
  availableSports = [],
  activityCount = 0,
  totalCount = 0,
  onSportChange = noop,
}) {
  const firstName = getFirstName(athlete);
  const raceCountdown = activeRace ? formatRaceCountdown(activeRace) : null;
  const sports = Array.isArray(availableSports) ? availableSports : [];

  return (
    <section className="card today-header-card">
      <div className="today-header-copy">
        <span className="section-kicker">Aujourd'hui</span>
        <h2 className="today-header-title">
          {firstName ? `${firstName}, voici ton point du jour` : "Pilotage du jour"}
        </h2>
        <p className="card-subtitle today-header-date">{formatLongDate(date)}</p>
        <div className="today-header-context" aria-label="Contexte de lecture">
          <span className="filter-chip">7 jours glissants</span>
          {rangeLabel ? <span className="filter-chip">{rangeLabel}</span> : null}
          <span className="filter-chip">{formatActivitySummary(activityCount, totalCount)}</span>
        </div>
      </div>

      <div className="today-header-side">
        <label className="today-scope-panel">
          <span className="today-scope-label">Perimetre sport</span>
          <select
            className="today-scope-select"
            value={sportGroup}
            onChange={(event) => onSportChange(event.target.value)}
          >
            <option value="all">Tous les sports</option>
            {sports.map((sport) => (
              <option key={sport} value={sport}>
                {sport}
              </option>
            ))}
          </select>
          <span className="today-scope-meta">La periode reste fixe sur les 7 derniers jours.</span>
        </label>

        {activeRace && raceCountdown ? (
          <Link className="today-race-badge" to="/performance">
            <span>Course objectif</span>
            <strong>{raceCountdown} | {activeRace.name || "Objectif"}</strong>
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export default memo(TodayHeader);
