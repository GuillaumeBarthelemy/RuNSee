import { memo } from "react";
import { Link } from "react-router-dom";
import { clampTone } from "../../utils/tonePicker.js";

/**
 * OverviewEpocCard — Section FOCUS, "Dette d'oxygène (EPOC)" (Lot 04 v2).
 *
 * Mockup PDF page 7 :
 *   - Donut avec **temps de récupération Garmin** au centre (décision §3)
 *   - Légende : Léger 14 (50%), Modéré 9 (32%), etc. — comptes absolus + %
 *   - Bouton "Voir le détail" en bas (CTA proéminent)
 *
 * Source : Børsheim & Bahr (2003), classification EPOC ; champ recoveryTime
 * natif Garmin Firstbeat.
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

  // Valeur centrale du donut : temps de récupération moyen Garmin
  const centerLabel = summary.averageRecoveryLabel || "—";
  const centerHint = summary.averageRecoveryLabel ? "récupération" : "";

  return (
    <article className={`alpine-overview-focus-card tone-${tone}`}>
      <header className="alpine-overview-focus-head">
        <span className="alpine-overview-focus-kicker">Stimulation aérobie</span>
        <h3 className="alpine-overview-focus-title">Dette d'oxygène (EPOC)</h3>
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
              Aucune activité enrichie Garmin sur la période. L'EPOC est mesurée
              par les montres Garmin compatibles : vérifie ta connexion et
              l'enrichissement par activité.
            </p>
            <Link to="/admin#connexions" className="alpine-overview-focus-link">
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
        Méthode : Børsheim E, Bahr R (2003), <i>Sports Med</i> 33(14):1037–1060.
        Temps de récupération : champ natif Garmin Firstbeat.
      </p>
    </article>
  );
}

export default memo(OverviewEpocCard);
