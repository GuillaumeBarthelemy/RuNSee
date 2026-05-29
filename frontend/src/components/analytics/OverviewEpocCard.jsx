import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { clampTone } from "../../utils/tonePicker.js";
import InfoTooltip from "../InfoTooltip.jsx";
import { enrichGarminActivities, getGarminConnectionStatus } from "../../services/externalProvider.service.js";

/**
 * OverviewEpocCard — Section FOCUS, "Stimulus aérobie · Charge d'entraînement"
 * (Lot 04 v2, repivot 2026-05).
 *
 * Décision technique 2026-05 : l'API web Garmin n'expose plus l'EPOC brut
 * (`summaryDTO.epoc`) ni le `recoveryTime` par activité — ces champs ne
 * vivent plus que dans le FIT exporté. On surface donc le **Training Load
 * Firstbeat** (`activityTrainingLoad`), successeur moderne de l'EPOC dans
 * le modèle Garmin/Firstbeat.
 *
 * Mockup PDF page 7 :
 *   - Donut avec **Training Load moyen** au centre
 *   - Légende : Léger 14 (50%), Modéré 9 (32%), etc.
 *   - Bouton "Voir le détail" en bas
 *
 * Sources :
 *  - Firstbeat (2014), "Automated Method for Detecting Acute Insufficient
 *    Recovery from Training Load" — Training Load comme intégration EPOC.
 *  - Børsheim & Bahr (2003) Sports Med 33(14) — base EPOC originelle.
 */

const COLOR_LIGHT = "#35a853";
const COLOR_MODERATE = "#65a30d";
const COLOR_HIGH = "#f59e0b";
const COLOR_VERY_HIGH = "#ef4444";

function colorForLevel(level) {
  switch (level) {
    case "Léger":      return COLOR_LIGHT;
    case "Modéré":     return COLOR_MODERATE;
    case "Élevé":      return COLOR_HIGH;
    case "Très élevé": return COLOR_VERY_HIGH;
    default:           return "#cbd5e1";
  }
}

function MiniDonut({ distribution = [], centerLabel = "—", centerHint = "" }) {
  const total = distribution.reduce((s, d) => s + d.pct, 0) || 100;
  const radius = 38;
  const circ = 2 * Math.PI * radius;
  // Offsets cumulés via reduce (immutable, conforme react-hooks)
  const segments = distribution.reduce((acc, d) => {
    const length = (d.pct / total) * circ;
    const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].length : 0;
    return [...acc, { ...d, length, offset }];
  }, []);

  return (
    <svg viewBox="0 0 100 100" className="alpine-overview-epoc-donut" aria-hidden="true">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="#eaf0fa" strokeWidth="12" />
      {segments.map((s) => {
        const dash = `${s.length} ${circ - s.length}`;
        return (
          <circle
            key={s.level}
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={colorForLevel(s.level)}
            strokeWidth="12"
            strokeDasharray={dash}
            strokeDashoffset={-s.offset}
            transform="rotate(-90 50 50)"
            strokeLinecap="butt"
          />
        );
      })}
      <text x="50" y="48" textAnchor="middle" dominantBaseline="central"
        fontSize="16" fontWeight="800" fill="#0f2147">
        {centerLabel}
      </text>
      <text x="50" y="62" textAnchor="middle" dominantBaseline="central"
        fontSize="7" fill="#64748b">
        {centerHint}
      </text>
    </svg>
  );
}

function OverviewEpocCard({ summary = {}, linkTo = "/analytics#charges" }) {
  const tone = clampTone(summary.tone || 3);
  const hasData = !!summary.hasData;

  // État local pour le bouton "Lancer l'enrichissement maintenant"
  const [enrichStatus, setEnrichStatus] = useState(null); // null | "loading" | "success" | "error" | "no-connection"
  const [enrichMessage, setEnrichMessage] = useState("");

  async function handleEnrichNow() {
    setEnrichStatus("loading");
    setEnrichMessage("");
    try {
      const conn = await getGarminConnectionStatus();
      if (!conn?.connection?.connected) {
        setEnrichStatus("no-connection");
        setEnrichMessage("Connecte Garmin avant d'enrichir tes activités.");
        return;
      }
      const result = await enrichGarminActivities({ mode: "recent_missing", days: 30, allowGarminOnly: true });
      setEnrichStatus("success");
      const matched = result?.matchedCount ?? 0;
      const fetched = result?.fetchedCount ?? 0;
      setEnrichMessage(
        matched > 0
          ? `${matched} activité${matched > 1 ? "s" : ""} enrichie${matched > 1 ? "s" : ""}. Rafraîchis la page pour voir l'EPOC.`
          : `${fetched} activité${fetched > 1 ? "s" : ""} Garmin récupérée${fetched > 1 ? "s" : ""}, aucun match Strava sur la période.`,
      );
    } catch (err) {
      setEnrichStatus("error");
      setEnrichMessage(err?.response?.data?.message || err?.message || "Échec de l'enrichissement.");
    }
  }

  // Valeur centrale du donut : Training Load moyen Firstbeat
  // (l'API web Garmin n'expose plus le recoveryTime par activité).
  const centerLabel = Number.isFinite(Number(summary?.averageTrainingLoad))
    ? String(summary.averageTrainingLoad)
    : "—";
  const centerHint = Number.isFinite(Number(summary?.averageTrainingLoad))
    ? "Training Load"
    : "";

  return (
    <article className={`alpine-overview-focus-card tone-${tone}`}>
      <header className="alpine-overview-focus-head">
        <span className="alpine-overview-focus-kicker">Stimulus aérobie</span>
        <div className="title-with-info">
          <h3 className="alpine-overview-focus-title">Charge d'entraînement Garmin</h3>
          <InfoTooltip
            compact
            title="Charge d'entraînement (EPOC)"
            glossaryKey="epoc"
            content={[{ text: "Ampleur du stimulus aérobie d'une séance (Training Load Firstbeat, héritier de l'EPOC) : indique le besoin de récupération." }]}
            label="Afficher l'aide pour la charge d'entraînement"
          />
        </div>
      </header>

      <div className="alpine-overview-focus-body alpine-overview-epoc-body">
        {hasData ? (
          <>
            <MiniDonut
              distribution={summary.distribution}
              centerLabel={centerLabel}
              centerHint={centerHint}
            />
            <ul className="alpine-overview-epoc-legend">
              {summary.distribution.map((d) => (
                <li key={d.level}>
                  <span
                    className="alpine-overview-epoc-legend-dot"
                    style={{ background: colorForLevel(d.level) }}
                  />
                  <span className="alpine-overview-epoc-legend-label">{d.level}</span>
                  <span className="alpine-overview-epoc-legend-count">
                    {d.count} <span className="alpine-overview-epoc-legend-pct">({d.pct} %)</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="alpine-overview-focus-empty-block">
            <p className="alpine-overview-focus-empty">
              Aucune activité enrichie Garmin sur la période. La charge
              d'entraînement (Training Load Firstbeat) est calculée par les
              montres Garmin compatibles.
            </p>

            <button
              type="button"
              onClick={handleEnrichNow}
              disabled={enrichStatus === "loading"}
              className="alpine-overview-epoc-enrich-btn"
            >
              {enrichStatus === "loading"
                ? "Enrichissement en cours…"
                : "Lancer l'enrichissement maintenant"}
            </button>

            {enrichMessage ? (
              <p className={`alpine-overview-epoc-enrich-msg is-${enrichStatus}`}>
                {enrichMessage}
              </p>
            ) : null}

            <Link to="/reglages#connexions" className="alpine-overview-focus-link">
              Vérifier la connexion Garmin →
            </Link>
          </div>
        )}
      </div>

      {hasData ? (
        <Link to={linkTo} className="alpine-overview-cta-button">
          Voir le détail
        </Link>
      ) : null}

      <p className="alpine-overview-focus-source">
        Méthode : Garmin/Firstbeat (2014), <i>Training Load</i> dérivé EPOC.
        Børsheim &amp; Bahr (2003) <i>Sports Med</i> 33(14):1037–1060 — base EPOC.
      </p>
    </article>
  );
}

export default memo(OverviewEpocCard);
