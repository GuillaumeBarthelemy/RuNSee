import { memo } from "react";
import { clampTone } from "../../utils/tonePicker.js";
import InfoTooltip from "../InfoTooltip.jsx";

/**
 * OverviewStateGauges — Carte "État & Fatigue" en bas de section CHARGE & FATIGUE.
 *
 * Présente 3 gauges horizontales :
 *   - ATL (Fatigue)
 *   - TSB (Fraîcheur)
 *   - ACWR (Charge récente / Base)
 *
 * Pas de score inventé — toutes les valeurs viennent des modèles existants.
 */

function GaugeRow({ label, value, hint, tone = 3, suffix = "", glossaryKey = "", help = "" }) {
  const safeTone = clampTone(tone);
  const valueDisplay = value == null || !Number.isFinite(value) ? "—" : value;
  return (
    <li className="alpine-overview-gauge-row">
      <div className="alpine-overview-gauge-head">
        <span className="title-with-info">
          <span className="alpine-overview-gauge-label">{label}</span>
          {glossaryKey && help ? (
            <InfoTooltip
              compact
              title={label}
              glossaryKey={glossaryKey}
              content={[{ text: help }]}
              label={`Afficher l'aide pour ${label}`}
            />
          ) : null}
        </span>
        <strong className={`alpine-overview-gauge-value tone-${safeTone}`}>
          {valueDisplay}{suffix}
        </strong>
      </div>
      {hint ? <span className={`alpine-overview-gauge-hint tone-${safeTone}`}>{hint}</span> : null}
    </li>
  );
}

function atlTone(atl) {
  if (atl >= 60) return 4;
  if (atl >= 35) return 3;
  return 2;
}

function tsbTone(tsb) {
  if (tsb < -20) return 5;
  if (tsb < -10) return 4;
  if (tsb < 5) return 3;
  if (tsb <= 25) return 1;
  return 4;
}

function acwrTone(acwr) {
  if (!Number.isFinite(acwr)) return 3;
  if (acwr >= 0.8 && acwr <= 1.3) return 1;
  if (acwr >= 0.5 && acwr < 0.8) return 2;
  if (acwr > 1.3 && acwr <= 1.5) return 2;
  if (acwr > 1.5) return 4;
  return 3;
}

function OverviewStateGauges({
  atl = null,
  tsb = null,
  acwr = null,
}) {
  return (
    <article className="alpine-overview-state-card">
      <header className="alpine-overview-state-head">
        <span className="alpine-overview-state-kicker">Synthèse</span>
        <h3 className="alpine-overview-state-title">État & Fatigue</h3>
      </header>
      <ul className="alpine-overview-state-list">
        <GaugeRow
          label="Fatigue (ATL)"
          value={atl != null ? Math.round(atl) : null}
          hint={atl == null ? "—" : atl >= 60 ? "Élevée" : atl >= 35 ? "Modérée" : "Basse"}
          tone={atl != null ? atlTone(atl) : 3}
          glossaryKey="atl"
          help="Fatigue récente : moyenne lissée de ta charge sur 7 jours."
        />
        <GaugeRow
          label="Fraîcheur (TSB)"
          value={tsb != null ? Math.round(tsb) : null}
          hint={tsb == null ? "—" : tsb >= 5 && tsb <= 25 ? "Optimale" : tsb < -10 ? "Tendue" : "Stable"}
          tone={tsb != null ? tsbTone(tsb) : 3}
          glossaryKey="tsb"
          help="Fraîcheur = base de fond (CTL) − fatigue récente (ATL). Positif = frais."
        />
        <GaugeRow
          label="Charge / Base (ACWR)"
          value={Number.isFinite(acwr) ? acwr.toFixed(2) : null}
          hint={!Number.isFinite(acwr) ? "—" : acwr >= 0.8 && acwr <= 1.3 ? "Sweet spot" : acwr > 1.5 ? "Charge récente forte" : "Stable"}
          tone={acwrTone(acwr)}
          glossaryKey="acwr"
          help="Rapport charge récente (7 j) sur base (28 j). Zone d'équilibre : 0,8–1,3."
        />
      </ul>
      <p className="alpine-overview-state-note">
        Banister (ATL/CTL/TSB) · Gabbett (ACWR).
      </p>
    </article>
  );
}

export default memo(OverviewStateGauges);
