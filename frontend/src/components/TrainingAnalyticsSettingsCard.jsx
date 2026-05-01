import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_TRAINING_ANALYTICS_SETTINGS,
  normalizeTrainingAnalyticsSettings,
} from "../utils/trainingMetrics.js";

const noop = () => {};

function sanitizeNumericInput(value) {
  if (value === "") {
    return "";
  }

  const digitsOnly = String(value).replace(/[^\d]/g, "");

  return digitsOnly ? digitsOnly : "";
}

function buildInitialFormState(settings = {}) {
  const normalized = normalizeTrainingAnalyticsSettings(settings);

  return {
    heartRateMax: normalized.heartRateMax ?? "",
    restingHeartrate: normalized.restingHeartrate ?? "",
    biologicalSex: normalized.biologicalSex ?? "unspecified",
    heartRateZone1Max: normalized.heartRateZone1Max ?? "",
    heartRateZone2Max: normalized.heartRateZone2Max ?? "",
    heartRateZone3Max: normalized.heartRateZone3Max ?? "",
    heartRateZone4Max: normalized.heartRateZone4Max ?? "",
    intensitySourcePriority: normalized.intensitySourcePriority,
    efficiencyMinDurationMinutes: normalized.efficiencyMinDurationMinutes,
    efficiencyMaxElevationPerKm: normalized.efficiencyMaxElevationPerKm,
    efficiencyExcludeTrail: normalized.efficiencyExcludeTrail,
  };
}

function formatHistoryDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function describeHistoryEntry(entry = {}) {
  const heartRateSummary = entry.heartRateMax
    ? `FC max ${entry.heartRateMax} bpm`
    : "FC max non renseignee";
  const restingSummary = `FC repos ${
    entry.restingHeartrate || entry.heartRateRest || DEFAULT_TRAINING_ANALYTICS_SETTINGS.restingHeartrate
  } bpm`;
  const sourceSummary = entry.intensitySourcePriority === "pace" ? "intensites: allure" : "intensites: FC";
  const efficiencySummary = `efficience >= ${entry.efficiencyMinDurationMinutes || DEFAULT_TRAINING_ANALYTICS_SETTINGS.efficiencyMinDurationMinutes} min, <= ${entry.efficiencyMaxElevationPerKm || DEFAULT_TRAINING_ANALYTICS_SETTINGS.efficiencyMaxElevationPerKm} m/km`;

  return [heartRateSummary, restingSummary, sourceSummary, efficiencySummary].join(" - ");
}

function describeZoneBounds(entry = {}) {
  const zones = [
    entry.heartRateZone1Max ? `Z1 ${entry.heartRateZone1Max}` : null,
    entry.heartRateZone2Max ? `Z2 ${entry.heartRateZone2Max}` : null,
    entry.heartRateZone3Max ? `Z3 ${entry.heartRateZone3Max}` : null,
    entry.heartRateZone4Max ? `Z4 ${entry.heartRateZone4Max}` : null,
  ].filter(Boolean);

  return zones.length ? zones.join(" · ") : "Bornes de zones non renseignees";
}

function getHistoryStatusLabel(entry = {}) {
  return entry.isActive ? "Active" : "Archivee";
}

function getHistoryStatusClass(entry = {}) {
  return entry.isActive ? "status-success" : "status-idle";
}

function SettingsPanel({ title, description, children, className = "" }) {
  return (
    <div className={`admin-settings-panel ${className}`.trim()}>
      <div className="admin-settings-panel-head">
        <h3 className="subcard-title">{title}</h3>
        {description ? <p className="small-text">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

export default function TrainingAnalyticsSettingsCard({
  settings = null,
  history = [],
  isPending = false,
  onSave = noop,
  onRestore = noop,
  showPhysiologyPanel = true,
}) {
  const [formState, setFormState] = useState(() => buildInitialFormState(settings));

  useEffect(() => {
    setFormState(buildInitialFormState(settings));
  }, [settings]);

  const normalizedSettings = useMemo(
    () => normalizeTrainingAnalyticsSettings(settings || {}),
    [settings],
  );

  const handleChange = (name, value) => {
    setFormState((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleReset = () => {
    setFormState(buildInitialFormState(DEFAULT_TRAINING_ANALYTICS_SETTINGS));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave({
      ...formState,
      heartRateMax: formState.heartRateMax || null,
      restingHeartrate: formState.restingHeartrate || null,
      biologicalSex: formState.biologicalSex || "unspecified",
      heartRateZone1Max: formState.heartRateZone1Max || null,
      heartRateZone2Max: formState.heartRateZone2Max || null,
      heartRateZone3Max: formState.heartRateZone3Max || null,
      heartRateZone4Max: formState.heartRateZone4Max || null,
    });
  };

  const historyEntries = Array.isArray(history) ? history : [];
  const zoneSummary = [
    normalizedSettings.heartRateZone1Max ? `Z1 ${normalizedSettings.heartRateZone1Max}` : null,
    normalizedSettings.heartRateZone2Max ? `Z2 ${normalizedSettings.heartRateZone2Max}` : null,
    normalizedSettings.heartRateZone3Max ? `Z3 ${normalizedSettings.heartRateZone3Max}` : null,
    normalizedSettings.heartRateZone4Max ? `Z4 ${normalizedSettings.heartRateZone4Max}` : null,
  ].filter(Boolean);

  return (
    <section className="card card-accent training-analytics-card">
      <div className="card-header-row wrap-on-mobile">
        <div>
          <span className="eyebrow admin-card-kicker">Calculs</span>
          <h2 className="card-title">Parametres analytics</h2>
          <p className="card-subtitle">
            Reglages metier persistants par utilisateur pour la charge, l&apos;efficience allure / FC et la source prioritaire des intensites.
          </p>
        </div>
      </div>

      <div className="admin-settings-summary">
        <div className="admin-settings-summary-main">
          <strong>Charge RunNSee</strong>
          <span>TRIMP Banister prioritaire quand FC moyenne, FC max et FC repos sont exploitables.</span>
        </div>
        <div className="admin-settings-summary-chips" aria-label="Parametres actifs">
          <span className="status-pill status-idle">
            FC max {normalizedSettings.heartRateMax ? `${normalizedSettings.heartRateMax} bpm` : "non renseignee"}
          </span>
          <span className="status-pill status-idle">FC repos {normalizedSettings.restingHeartrate} bpm</span>
          <span className="status-pill status-idle">
            {normalizedSettings.intensitySourcePriority === "pace" ? "Intensites allure" : "Intensites FC"}
          </span>
        </div>
      </div>

      <form className="top-gap-sm" onSubmit={handleSubmit}>
        <div className="admin-settings-panel-grid">
          {showPhysiologyPanel ? (
            <SettingsPanel
              title="Profil cardio TRIMP"
              description="Base personnelle utilisee pour normaliser la charge cardiaque."
              className="admin-settings-panel-primary"
            >
              <div className="admin-settings-fields admin-settings-fields-3">
                <label className="field">
                  <span className="field-label">FC max</span>
                  <input
                    className="field-input"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    placeholder="Ex. 190"
                    value={formState.heartRateMax}
                    onChange={(event) => handleChange("heartRateMax", sanitizeNumericInput(event.target.value))}
                  />
                </label>

                <label className="field">
                  <span className="field-label">FC repos</span>
                  <input
                    className="field-input"
                    type="number"
                    inputMode="numeric"
                    min="30"
                    max="120"
                    step="1"
                    placeholder="Ex. 48"
                    value={formState.restingHeartrate}
                    onChange={(event) => handleChange("restingHeartrate", sanitizeNumericInput(event.target.value))}
                  />
                </label>

                <label className="field">
                  <span className="field-label">Sexe biologique TRIMP</span>
                  <select
                    className="field-input"
                    value={formState.biologicalSex}
                    onChange={(event) => handleChange("biologicalSex", event.target.value)}
                  >
                    <option value="unspecified">Non renseigne</option>
                    <option value="male">Homme</option>
                    <option value="female">Femme</option>
                  </select>
                </label>
              </div>
            </SettingsPanel>
          ) : null}

          <SettingsPanel
            title="Zones FC"
            description={zoneSummary.length ? `Bornes actives : ${zoneSummary.join(" - ")}` : "Bornes personnalisees utilisees pour l'intensite."}
          >
            <div className="admin-settings-fields admin-settings-fields-4">
              <label className="field">
                <span className="field-label">Z1 jusqu&apos;a</span>
                <input
                  className="field-input"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  placeholder="Ex. 135"
                  value={formState.heartRateZone1Max}
                  onChange={(event) => handleChange("heartRateZone1Max", sanitizeNumericInput(event.target.value))}
                />
              </label>

              <label className="field">
                <span className="field-label">Z2 jusqu&apos;a</span>
                <input
                  className="field-input"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  placeholder="Ex. 150"
                  value={formState.heartRateZone2Max}
                  onChange={(event) => handleChange("heartRateZone2Max", sanitizeNumericInput(event.target.value))}
                />
              </label>

              <label className="field">
                <span className="field-label">Z3 jusqu&apos;a</span>
                <input
                  className="field-input"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  placeholder="Ex. 165"
                  value={formState.heartRateZone3Max}
                  onChange={(event) => handleChange("heartRateZone3Max", sanitizeNumericInput(event.target.value))}
                />
              </label>

              <label className="field">
                <span className="field-label">Z4 jusqu&apos;a</span>
                <input
                  className="field-input"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  placeholder="Ex. 178"
                  value={formState.heartRateZone4Max}
                  onChange={(event) => handleChange("heartRateZone4Max", sanitizeNumericInput(event.target.value))}
                />
              </label>
            </div>
          </SettingsPanel>

          <SettingsPanel
            title="Regles d'analyse"
            description="Priorite d'intensite et garde-fous pour comparer allure et cardio."
          >
            <div className="admin-settings-fields admin-settings-fields-2">
              <label className="field">
                <span className="field-label">Source prioritaire intensites</span>
                <select
                  className="field-input"
                  value={formState.intensitySourcePriority}
                  onChange={(event) => handleChange("intensitySourcePriority", event.target.value)}
                >
                  <option value="heart_rate">Zones FC d&apos;abord</option>
                  <option value="pace">Zones allure d&apos;abord</option>
                </select>
              </label>

              <label className="field">
                <span className="field-label">Trail pour l&apos;efficience</span>
                <select
                  className="field-input"
                  value={formState.efficiencyExcludeTrail ? "exclude" : "include"}
                  onChange={(event) => handleChange("efficiencyExcludeTrail", event.target.value === "exclude")}
                >
                  <option value="exclude">Exclure le trail</option>
                  <option value="include">Inclure le trail</option>
                </select>
              </label>

              <label className="field">
                <span className="field-label">Duree mini efficience</span>
                <input
                  className="field-input"
                  type="number"
                  inputMode="numeric"
                  min="5"
                  step="1"
                  value={formState.efficiencyMinDurationMinutes}
                  onChange={(event) => handleChange("efficiencyMinDurationMinutes", sanitizeNumericInput(event.target.value))}
                />
              </label>

              <label className="field">
                <span className="field-label">D+ maxi / km</span>
                <input
                  className="field-input"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={formState.efficiencyMaxElevationPerKm}
                  onChange={(event) => handleChange("efficiencyMaxElevationPerKm", sanitizeNumericInput(event.target.value))}
                />
              </label>
            </div>
          </SettingsPanel>
        </div>

        <p className="small-text top-gap-sm admin-settings-active-note">
          Version active : {settings?.effectiveFrom ? formatHistoryDate(settings.effectiveFrom) : "valeurs par defaut"}.
        </p>

        <div className="admin-settings-actions top-gap-sm">
          <button type="submit" className="button button-dark" disabled={isPending}>
            {isPending ? "Enregistrement..." : "Enregistrer les parametres"}
          </button>
          <button type="button" className="button button-outline" onClick={handleReset} disabled={isPending}>
            Revenir aux valeurs par defaut
          </button>
        </div>
      </form>

      <div className="top-gap-sm">
        <div className="card-header-row wrap-on-mobile">
          <div>
            <h3 className="subcard-title">Historique recent</h3>
            <p className="small-text">Versions recentes des reglages, avec reactivation directe si besoin.</p>
          </div>
        </div>

        {historyEntries.length ? (
          <div className="table-wrapper analytics-settings-history-shell">
            <table className="table compact-table analytics-settings-history-table">
              <thead>
                <tr>
                  <th>Statut</th>
                  <th>Date</th>
                  <th>Parametres cles</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {historyEntries.map((entry) => (
                  <tr className="analytics-settings-history-row" key={entry.id || entry.effectiveFrom || describeHistoryEntry(entry)}>
                    <td>
                      <span className={`status-pill ${getHistoryStatusClass(entry)}`}>
                        {getHistoryStatusLabel(entry)}
                      </span>
                    </td>
                    <td>
                      <div className="analytics-settings-history-date">
                        <strong>{formatHistoryDate(entry.effectiveFrom)}</strong>
                        <span className="small-text">
                          {entry.isActive
                            ? "Version actuellement appliquee"
                            : `Archivee${entry.archivedAt ? ` le ${formatHistoryDate(entry.archivedAt)}` : ""}`}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="analytics-settings-history-summary">
                        <div className="analytics-settings-history-line">{describeHistoryEntry(entry)}</div>
                        <div className="analytics-settings-history-line">{describeZoneBounds(entry)}</div>
                        <div className="analytics-settings-history-line">
                          Trail {entry.efficiencyExcludeTrail ? "exclu" : "inclus"} pour l&apos;efficience
                        </div>
                      </div>
                    </td>
                    <td className="analytics-settings-history-action">
                      {!entry.isActive ? (
                        <button
                          type="button"
                          className="button button-outline"
                          onClick={() => onRestore(entry)}
                          disabled={isPending}
                        >
                          Reactiver
                        </button>
                      ) : (
                        <span className="small-text">En cours</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">Aucune version precedente enregistree pour ce compte.</div>
        )}
      </div>
    </section>
  );
}
