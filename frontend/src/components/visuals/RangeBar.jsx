import { memo } from "react";
import { clampTone, toneCssVar } from "../../utils/tonePicker.js";

/**
 * RangeBar — Barre horizontale avec marqueur + zones colorées.
 *
 * Phase G2 — UX_CHARTE.md.
 *
 * Props :
 * - value : number — valeur courante (null si donnée manquante)
 * - min, max : number — bornes de l'axe
 * - zones : array de { from, to, tone, label? } — zones colorées (1..5 niveaux)
 * - tone : 1..5 — tone forcé pour le marqueur (sinon dérivé de la zone matchée)
 * - unit : string
 * - label : string
 * - valueDisplay : string optionnel — texte affiché à droite (sinon value+unit)
 * - showZoneLabels : boolean (défaut true) — afficher les labels sous la barre
 */
function RangeBar({
  value = null,
  min = 0,
  max = 100,
  zones = [],
  tone = null,
  unit = "",
  label = "",
  valueDisplay = null,
  showZoneLabels = true,
}) {
  const range = Math.max(1, max - min);
  const safeValue = value == null ? null : Math.min(Math.max(Number(value), min), max);
  const valuePct = safeValue == null ? 0 : ((safeValue - min) / range) * 100;

  // Détermine le tone du marqueur si non imposé : utilise la zone qui contient la valeur.
  const matchedZone = safeValue != null
    ? zones.find((z) => safeValue >= (z.from ?? -Infinity) && safeValue < (z.to ?? Infinity))
    : null;
  const effectiveTone = tone != null ? tone : (matchedZone?.tone ?? 3);
  const markerColor = toneCssVar(effectiveTone);

  const displayText = valueDisplay
    || (safeValue != null ? `${Math.round(safeValue * 10) / 10}${unit ? ` ${unit}` : ""}` : "—");

  return (
    <div className="range-bar">
      <div className="range-bar-header">
        {label ? <span className="range-bar-label">{label}</span> : null}
        <span className={`range-bar-value tone-${clampTone(effectiveTone)}`}>{displayText}</span>
      </div>

      <div className="range-bar-track" role="img" aria-label={`${label || "valeur"} : ${displayText}`}>
        {zones.map((zone, idx) => {
          const fromPct = ((Math.max(zone.from ?? min, min) - min) / range) * 100;
          const toPct = ((Math.min(zone.to ?? max, max) - min) / range) * 100;
          const widthPct = Math.max(0, toPct - fromPct);
          return (
            <span
              key={idx}
              className={`range-bar-zone tone-${clampTone(zone.tone)}-bg`}
              style={{
                left: `${fromPct}%`,
                width: `${widthPct}%`,
                background: `var(--tone-${clampTone(zone.tone)}-bg)`,
              }}
            />
          );
        })}

        {safeValue != null ? (
          <span
            className="range-bar-marker"
            style={{ left: `${valuePct}%`, background: markerColor }}
          />
        ) : null}
      </div>

      {showZoneLabels && zones.some((z) => z.label) ? (
        <div className="range-bar-zone-labels">
          {zones.map((zone, idx) => (
            <span key={idx} className="range-bar-zone-label">{zone.label || ""}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default memo(RangeBar);
