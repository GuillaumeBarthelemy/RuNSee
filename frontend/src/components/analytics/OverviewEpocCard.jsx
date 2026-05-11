import { memo } from "react";
import { Link } from "react-router-dom";
import { clampTone } from "../../utils/tonePicker.js";

/**
 * OverviewEpocCard — Section FOCUS, indicateur "Dette d'oxygène (EPOC)".
 *
 * Donut SVG affichant la distribution des niveaux EPOC sur la période,
 * pondérée par durée d'activité. Valeur centrale = EPOC moyen mlO₂/kg.
 *
 * État vide propre si pas d'enrichissement Garmin disponible.
 */

const TONE_COLOR = {
  1: "#35a853",  // Léger
  2: "#84cc16",  // (non utilisé pour EPOC)
  3: "#1268f3",  // (non utilisé)
  4: "#f59e0b",  // Élevé
  5: "#ef4444",  // Très élevé
};

// Couleur Modéré custom (entre tone 1 et tone 4)
const COLOR_MODERATE = "#65a30d";

function colorForLevel(level) {
  switch (level) {
    case "Léger":       return TONE_COLOR[1];
    case "Modéré":      return COLOR_MODERATE;
    case "Élevé":       return TONE_COLOR[4];
    case "Très élevé":  return TONE_COLOR[5];
    default:            return "#cbd5e1";
  }
}

function MiniDonut({ distribution = [], averageMlKg = 0 }) {
  const total = distribution.reduce((s, d) => s + d.pct, 0) || 100;
  const radius = 38;
  const circ = 2 * Math.PI * radius;
  // Pré-calcul des offsets cumulés via reduce (immutable, conforme react-hooks)
  const segments = distribution.reduce((acc, d) => {
    const length = (d.pct / total) * circ;
    const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].length : 0;
    return [...acc, { ...d, length, offset }];
  }, []);
  return (
    <svg
      viewBox="0 0 100 100"
      className="alpine-overview-epoc-donut"
      aria-hidden="true"
    >
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
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
        fontSize="22" fontWeight="700" fill="#0f2147">
        {averageMlKg}
      </text>
      <text x="50" y="66" textAnchor="middle" dominantBaseline="central"
        fontSize="9" fill="#64748b">
        mlO₂/kg
      </text>
    </svg>
  );
}

function OverviewEpocCard({ summary = {} }) {
  const tone = clampTone(summary.tone || 3);
  const hasData = !!summary.hasData;

  return (
    <article className={`alpine-overview-focus-card tone-${tone}`}>
      <header className="alpine-overview-focus-head">
        <span className="alpine-overview-focus-kicker">Stimulation aérobie</span>
        <h3 className="alpine-overview-focus-title">Dette d'oxygène (EPOC)</h3>
      </header>

      <div className="alpine-overview-focus-body alpine-overview-epoc-body">
        {hasData ? (
          <>
            <MiniDonut distribution={summary.distribution} averageMlKg={summary.averageMlKg} />
            <ul className="alpine-overview-epoc-legend">
              {summary.distribution.map((d) => (
                <li key={d.level}>
                  <span
                    className="alpine-overview-epoc-legend-dot"
                    style={{ background: colorForLevel(d.level) }}
                  />
                  <span className="alpine-overview-epoc-legend-label">{d.level}</span>
                  <strong className="alpine-overview-epoc-legend-pct">{d.pct} %</strong>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="alpine-overview-focus-empty-block">
            <p className="alpine-overview-focus-empty">
              L'EPOC est mesurée par les montres Garmin compatibles. Activez la
              sync Garmin et l'enrichissement par activité pour l'afficher ici.
            </p>
            <Link to="/admin#connexions" className="alpine-overview-focus-link">
              Configurer Garmin →
            </Link>
          </div>
        )}
      </div>

      <p className="alpine-overview-focus-source">
        Méthode : Børsheim E, Bahr R (2003), <i>Sports Med</i> 33(14):1037–1060.
      </p>
    </article>
  );
}

export default memo(OverviewEpocCard);
