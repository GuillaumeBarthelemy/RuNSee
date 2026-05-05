import { memo } from "react";
import { clampTone } from "../../utils/tonePicker.js";

/**
 * BandPositioner — Bandes empilées avec curseur indiquant la position courante.
 * Idéal pour : monotonie Foster, polarisation, niveaux qualitatifs.
 *
 * Phase G4 — UX_CHARTE.md.
 *
 * Props :
 * - bands : array de { label, from, to, tone } — bandes ordonnées
 * - value : number — position du curseur (peut être null)
 * - valueDisplay : string optionnel — texte affiché à côté du curseur
 * - label : string — titre du composant
 */

function BandPositioner({
  bands = [],
  value = null,
  valueDisplay = null,
  label = "",
}) {
  const safeValue = value == null ? null : Number(value);

  // Détermine la bande active
  const activeBandIdx = safeValue == null ? -1 : bands.findIndex(
    (b) => safeValue >= (b.from ?? -Infinity) && safeValue < (b.to ?? Infinity),
  );

  return (
    <div className="band-positioner">
      {label ? <span className="band-positioner-label">{label}</span> : null}
      <ul className="band-positioner-bands" role="list">
        {bands.map((band, idx) => {
          const tone = clampTone(band.tone);
          const isActive = idx === activeBandIdx;
          return (
            <li
              key={idx}
              className={`band-positioner-band tone-${tone}-bg ${isActive ? "is-active" : ""}`}
              style={{ background: `var(--tone-${tone}-bg)` }}
            >
              <span className="band-positioner-band-label">{band.label}</span>
              {isActive ? (
                <span className={`band-positioner-marker tone-${tone}`}>
                  {valueDisplay || (safeValue != null ? safeValue.toFixed(1) : "")}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default memo(BandPositioner);
