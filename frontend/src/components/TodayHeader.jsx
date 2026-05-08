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
    return `${safeActivityCount} / ${safeTotalCount} activités`;
  }

  return `${safeActivityCount} activité${safeActivityCount > 1 ? "s" : ""}`;
}

function TodayHeader({
  athlete = {},
  activeRace = null,
  date = new Date(),
  rangeLabel = "",
  sportGroup = "all",
  defaultSportGroup = "Course à pied / trail",
  availableSports = [],
  activityCount = 0,
  totalCount = 0,
  onSportChange = noop,
  onSportReset = noop,
}) {
  const firstName = getFirstName(athlete);
  const raceCountdown = activeRace ? formatRaceCountdown(activeRace) : null;
  const sports = Array.isArray(availableSports) ? availableSports : [];
  const isFiltered = sportGroup !== defaultSportGroup;
  const scopeLabel = sportGroup === "all" ? "Tous les sports" : sportGroup;

  return (
    <section className="card today-header-card">
      <div className="today-header-copy">
        <span className="section-kicker">Aujourd'hui</span>
        <h2 className="today-header-title">
          {firstName ? `Bonjour ${firstName}` : "Bonjour"}
        </h2>
        <p className="card-subtitle today-header-date">
          {formatLongDate(date)} · Lecture sur 7 jours
        </p>
        <div className="today-header-context" aria-label="Contexte de lecture">
          <span className="filter-chip">Périmètre : {scopeLabel}</span>
          <span className="filter-chip">{formatActivitySummary(activityCount, totalCount)}</span>
          {rangeLabel ? <span className="filter-chip">{rangeLabel}</span> : null}
          {isFiltered ? (
            <span className="filter-chip today-filter-active">Lecture filtrée : {scopeLabel}</span>
          ) : null}
        </div>
      </div>

      <div className="today-header-side">
        <label className="today-scope-panel">
          <span className="today-scope-label">Périmètre sport</span>
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
          <span className="today-scope-meta">La période reste fixe sur les 7 derniers jours.</span>
          {isFiltered ? (
            <button className="button button-outline today-scope-reset" type="button" onClick={onSportReset}>
              Réinitialiser
            </button>
          ) : null}
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
