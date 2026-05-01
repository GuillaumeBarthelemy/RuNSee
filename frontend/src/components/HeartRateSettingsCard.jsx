import { useMemo } from "react";
import {
  buildEstimatedZoneCeilings,
  buildHeartRateZoneSummary,
  HEART_RATE_OPTION_KEYS,
  HEART_RATE_ZONE_FIELDS,
  normalizeHeartRatePreferences,
  resolveHeartRateZoneConfig,
} from "../utils/heartRatePreferences.js";

const noop = () => {};

function sanitizeNumericInput(value) {
  if (value === "") {
    return "";
  }

  const digitsOnly = String(value).replace(/[^\d]/g, "");

  if (!digitsOnly) {
    return "";
  }

  const numericValue = Math.max(0, Number(digitsOnly));
  return numericValue > 0 ? String(numericValue) : "";
}

export default function HeartRateSettingsCard({ options = {}, onOptionChange = noop }) {
  const normalized = useMemo(
    () => normalizeHeartRatePreferences(options),
    [options],
  );

  const previewConfig = useMemo(
    () => resolveHeartRateZoneConfig({
      preferences: options,
      estimatedMaxHeartrate: normalized.maxHeartrate,
    }),
    [normalized.maxHeartrate, options],
  );

  const estimatedCeilings = useMemo(
    () => buildEstimatedZoneCeilings(normalized.maxHeartrate),
    [normalized.maxHeartrate],
  );

  const status = useMemo(() => {
    if (normalized.hasCustomMax && previewConfig.hasCustomZones) {
      return {
        tone: "success",
        text: "Profil cardio personnalise actif. Analytics utilisera ta FC max et tes zones des qu'un bloc s'appuie sur ces donnees.",
      };
    }

    if (normalized.hasCustomMax && normalized.hasAnyCustomZones) {
      return {
        tone: "info",
        text: "FC max enregistree, mais les zones personnalisees restent incompletes ou incoherentes. Analytics gardera un repli estime tant que Z1 < Z2 < Z3 < Z4 < FC max n'est pas respecte.",
      };
    }

    if (normalized.hasCustomMax) {
      return {
        tone: "info",
        text: "FC max enregistree. Tant que les zones ne sont pas renseignees, Analytics estimera Z1 a Z5 a partir de cette FC max.",
      };
    }

    if (normalized.hasAnyCustomZones) {
      return {
        tone: "info",
        text: "Zones enregistrees, mais FC max manquante. Analytics estimera encore la FC max tant qu'elle n'est pas renseignee ici.",
      };
    }

    return {
      tone: "info",
      text: "Aucune valeur enregistree. Quand un graphique en a besoin, l'application utilisera une estimation et te l'indiquera dans Analytics.",
    };
  }, [normalized.hasAnyCustomZones, normalized.hasCustomMax, previewConfig.hasCustomZones]);

  const zoneSummary = useMemo(
    () => buildHeartRateZoneSummary(previewConfig.zones),
    [previewConfig.zones],
  );

  const handleReset = () => {
    onOptionChange(HEART_RATE_OPTION_KEYS.max, "");
    HEART_RATE_ZONE_FIELDS.forEach((field) => {
      onOptionChange(field.key, "");
    });
  };

  return (
    <section className="card card-accent">
      <div className="card-header-row wrap-on-mobile">
        <div>
          <h2 className="card-title">Profil cardio</h2>
          <p className="card-subtitle">
            Renseigne ta FC max et, si tu les connais, les bornes hautes de Z1 a Z4. Z5 est calculee automatiquement jusqu'a la FC max.
          </p>
        </div>

        <button type="button" className="button button-outline" onClick={handleReset}>
          Effacer les valeurs
        </button>
      </div>

      <div className={`alert ${status.tone === "success" ? "alert-success" : "alert-info"}`}>
        {status.text}
      </div>

      <div className="filters-grid top-gap-sm">
        <label className="field field-span-2">
          <span className="field-label">FC max</span>
          <input
            className="field-input"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            placeholder="Ex. 190"
            value={options?.[HEART_RATE_OPTION_KEYS.max] || ""}
            onChange={(event) => onOptionChange(HEART_RATE_OPTION_KEYS.max, sanitizeNumericInput(event.target.value))}
          />
        </label>

        {HEART_RATE_ZONE_FIELDS.map((field, index) => (
          <label className="field" key={field.key}>
            <span className="field-label">{field.label}</span>
            <input
              className="field-input"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              placeholder={estimatedCeilings[index] ? `Ex. ${estimatedCeilings[index]}` : "Ex. 150"}
              value={options?.[field.key] || ""}
              onChange={(event) => onOptionChange(field.key, sanitizeNumericInput(event.target.value))}
            />
          </label>
        ))}
      </div>

      <p className="small-text top-gap-sm">
        Si tu laisses des champs vides, Analytics utilisera une estimation. Les zones par defaut suivent 68 %, 79 %, 88 % et 94 % de la FC max utilisee (convention Friel/Joyner pour coureurs).
      </p>

      {zoneSummary ? (
        <>
          <p className="small-text top-gap-sm">
            Zones actuellement exploitables : {zoneSummary}
          </p>
          <div className="grid two-columns top-gap-sm">
            {previewConfig.zones.map((zone) => (
              <div className="metric-card compact-metric" key={zone.key}>
                <span className="metric-label">{zone.shortLabel}</span>
                <div className="metric-value small-metric">{zone.rangeLabel || "-"}</div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
