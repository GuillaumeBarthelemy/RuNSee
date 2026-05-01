import { memo, useEffect, useMemo, useState } from "react";
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
  return digitsOnly || "";
}

function buildFormState(settings = {}) {
  const normalized = normalizeTrainingAnalyticsSettings(settings);

  return {
    heartRateMax: normalized.heartRateMax ?? "",
    restingHeartrate: normalized.restingHeartrate ?? "",
    biologicalSex: normalized.biologicalSex ?? "unspecified",
  };
}

function buildSettingsPayload(settings = {}, formState = {}) {
  const normalized = normalizeTrainingAnalyticsSettings(settings);

  return {
    heartRateMax: formState.heartRateMax || null,
    restingHeartrate: formState.restingHeartrate || null,
    biologicalSex: formState.biologicalSex || "unspecified",
    heartRateZone1Max: normalized.heartRateZone1Max || null,
    heartRateZone2Max: normalized.heartRateZone2Max || null,
    heartRateZone3Max: normalized.heartRateZone3Max || null,
    heartRateZone4Max: normalized.heartRateZone4Max || null,
    intensitySourcePriority: normalized.intensitySourcePriority,
    efficiencyMinDurationMinutes: normalized.efficiencyMinDurationMinutes,
    efficiencyMaxElevationPerKm: normalized.efficiencyMaxElevationPerKm,
    efficiencyExcludeTrail: normalized.efficiencyExcludeTrail,
  };
}

function getSexLabel(value) {
  if (value === "male") return "Homme";
  if (value === "female") return "Femme";
  return "Non renseigne";
}

function PhysiologicalProfileCard({
  settings = null,
  isPending = false,
  onSave = noop,
}) {
  const [formState, setFormState] = useState(() => buildFormState(settings));

  useEffect(() => {
    setFormState(buildFormState(settings));
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

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave(buildSettingsPayload(settings, formState));
  };

  const handleReset = () => {
    setFormState({
      heartRateMax: DEFAULT_TRAINING_ANALYTICS_SETTINGS.heartRateMax ?? "",
      restingHeartrate: DEFAULT_TRAINING_ANALYTICS_SETTINGS.restingHeartrate ?? "",
      biologicalSex: DEFAULT_TRAINING_ANALYTICS_SETTINGS.biologicalSex ?? "unspecified",
    });
  };

  return (
    <section className="card card-accent physiological-profile-card">
      <div className="card-header-row wrap-on-mobile">
        <div>
          <span className="eyebrow admin-card-kicker">Profil</span>
          <h2 className="card-title">Profil cardio et physiologique</h2>
          <p className="card-subtitle">
            Ces valeurs personnalisent le TRIMP, les zones cardio et les lectures de charge. Garde-les a jour quand tes tests terrain evoluent.
          </p>
        </div>
      </div>

      <div className="physiological-profile-summary" aria-label="Valeurs physiologiques actives">
        <span className="status-pill status-idle">
          FC max {normalizedSettings.heartRateMax ? `${normalizedSettings.heartRateMax} bpm` : "non renseignee"}
        </span>
        <span className="status-pill status-idle">FC repos {normalizedSettings.restingHeartrate} bpm</span>
        <span className="status-pill status-idle">{getSexLabel(normalizedSettings.biologicalSex)}</span>
      </div>

      <form className="top-gap-sm" onSubmit={handleSubmit}>
        <div className="physiological-profile-fields">
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

        <div className="admin-settings-actions top-gap-sm">
          <button type="submit" className="button button-dark" disabled={isPending}>
            {isPending ? "Enregistrement..." : "Enregistrer le profil"}
          </button>
          <button type="button" className="button button-outline" onClick={handleReset} disabled={isPending}>
            Valeurs par defaut
          </button>
        </div>
      </form>
    </section>
  );
}

export default memo(PhysiologicalProfileCard);
