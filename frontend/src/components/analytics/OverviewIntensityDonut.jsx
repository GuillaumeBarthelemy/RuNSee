import { memo } from "react";
import { Link } from "react-router-dom";

/**
 * OverviewIntensityDonut — Right rail "Répartition des intensités" PDF page 7.
 *
 * Donut SVG affichant la distribution durée par zone FC (Z1..Z5).
 * Valeur centrale = somme des heures sur la période (décision utilisateur §3).
 *
 * Pas de simulation : si zones non configurées, message renvoyant vers Réglages.
 */

const ZONE_COLORS = {
  z1: "#94a3b8",  // Récupération - gris
  z2: "#35a853",  // Endurance - vert
  z3: "#1268f3",  // Tempo - bleu
  z4: "#f59e0b",  // Seuil - orange
  z5: "#ef4444",  // VO2max - rouge
};

const ZONE_LABELS = {
  z1: "Z1 Récupération",
  z2: "Z2 Endurance",
  z3: "Z3 Tempo",
  z4: "Z4 Seuil",
  z5: "Z5 VO2max",
};

function formatHours(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0";
  const totalMin = Math.round(seconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${String(m).padStart(2, "0")}`;
}

function OverviewIntensityDonut({ intensityModel = {}, linkTo = "/analytics#intensites" }) {
  const zones = Array.isArray(intensityModel?.zones) ? intensityModel.zones : [];
  const hasData = zones.length > 0 && intensityModel?.hasData;

  if (!hasData) {
    return (
      <article className="alpine-overview-donut-card">
        <header>
          <h3 className="alpine-overview-donut-title">Répartition des intensités</h3>
        </header>
        <p className="alpine-overview-focus-empty">
          Configurez vos zones FC en Réglages pour activer la répartition.
        </p>
        <Link to="/admin#entrainement" className="alpine-overview-focus-link">
          Configurer les zones FC →
        </Link>
      </article>
    );
  }

  // Récupère le durationShare par zone (% durée)
  const segments = zones
    .filter((z) => Number(z?.durationShare) > 0)
    .map((z) => ({
      key: z.key,
      label: ZONE_LABELS[z.key] || z.key,
      color: ZONE_COLORS[z.key] || "#cbd5e1",
      pct: Number(z.durationShare) || 0,
      durationSeconds: Number(z.durationSeconds) || 0,
    }));

  const totalSeconds = segments.reduce((s, x) => s + x.durationSeconds, 0);
  const totalPct = segments.reduce((s, x) => s + x.pct, 0) || 100;

  const radius = 38;
  const circ = 2 * Math.PI * radius;

  // Pré-calcul des offsets cumulés via reduce (immutable, conforme react-hooks)
  const renderedSegments = segments.reduce((acc, s) => {
    const length = (s.pct / totalPct) * circ;
    const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].length : 0;
    return [...acc, { ...s, length, offset }];
  }, []);

  return (
    <article className="alpine-overview-donut-card">
      <header>
        <h3 className="alpine-overview-donut-title">Répartition des intensités</h3>
      </header>

      <div className="alpine-overview-donut-body">
        <svg
          viewBox="0 0 100 100"
          className="alpine-overview-donut-svg"
          aria-hidden="true"
        >
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#eaf0fa" strokeWidth="14" />
          {renderedSegments.map((s) => {
            const dash = `${s.length} ${circ - s.length}`;
            return (
              <circle
                key={s.key}
                cx="50" cy="50" r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth="14"
                strokeDasharray={dash}
                strokeDashoffset={-s.offset}
                transform="rotate(-90 50 50)"
                strokeLinecap="butt"
              />
            );
          })}
          <text x="50" y="48" textAnchor="middle" dominantBaseline="central"
            fontSize="14" fontWeight="800" fill="#0f2147">
            {formatHours(totalSeconds)}
          </text>
          <text x="50" y="60" textAnchor="middle" dominantBaseline="central"
            fontSize="7" fill="#64748b">
            total période
          </text>
        </svg>

        <ul className="alpine-overview-donut-legend">
          {segments.map((s) => (
            <li key={s.key}>
              <span
                className="alpine-overview-donut-legend-dot"
                style={{ background: s.color }}
              />
              <span className="alpine-overview-donut-legend-label">{s.label}</span>
              <span className="alpine-overview-donut-legend-meta">
                {formatHours(s.durationSeconds)} · {Math.round(s.pct)} %
              </span>
            </li>
          ))}
        </ul>
      </div>

      {linkTo ? (
        <Link to={linkTo} className="alpine-overview-focus-link">
          Voir le détail →
        </Link>
      ) : null}
    </article>
  );
}

export default memo(OverviewIntensityDonut);
