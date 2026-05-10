import { memo } from "react";
import { Link } from "react-router-dom";
import KpiGaugeCircular from "./KpiGaugeCircular.jsx";
import { clampTone } from "../../../utils/tonePicker.js";

/**
 * RecoveryKpiCard — Alpine Light (Lot 3-bis, mockup-faithful).
 *
 * Layout compact : valeur + hint + delta à gauche, mini-graphe à droite.
 * La couleur du graphe suit le tone de la carte (cohérence visuelle).
 *
 * Props :
 * - icon, label, value, unit, hint, delta, tone : 1..5
 * - gaugeValue : number|null — remplace value-block par jauge SVG
 * - chartData  : number[] — mini-graphe à droite
 * - chartType  : "line" | "bar"
 * - linkTo     : string
 */

// Couleur du tracé selon le tone — cohérence avec icon et hint
const TONE_CHART_COLOR = {
  1: "var(--al-success, #35a853)",
  2: "#84cc16",
  3: "var(--al-primary, #1268f3)",
  4: "var(--al-warning, #f59e0b)",
  5: "var(--al-alert, #ef4444)",
};

function MiniBars({ data = [], color }) {
  const valid = data.filter((v) => v != null && Number.isFinite(v));
  if (valid.length < 2) return null;
  const max = Math.max(...valid, 1);
  const min = Math.min(...valid, 0);
  const span = Math.max(1, max - min);
  return (
    <div className="alpine-recovery-mini-bars">
      {data.map((v, idx) => {
        if (v == null) return <span key={idx} className="alpine-recovery-mini-bar is-empty" />;
        const h = 20 + ((v - min) / span) * 80;
        const isLast = idx === data.length - 1;
        return (
          <span
            key={idx}
            className={`alpine-recovery-mini-bar ${isLast ? "is-last" : ""}`.trim()}
            style={{ height: `${h}%`, background: color, opacity: isLast ? 1 : 0.55 }}
          />
        );
      })}
    </div>
  );
}

function MiniLine({ data = [], color }) {
  const valid = data.filter((v) => v != null && Number.isFinite(v));
  if (valid.length < 2) return null;
  const max = Math.max(...valid);
  const min = Math.min(...valid);
  const span = Math.max(1, max - min);
  const width = 110;
  const height = 44;
  const step = width / Math.max(1, data.length - 1);
  const path = data
    .map((v, idx) => {
      if (v == null) return "";
      const x = idx * step;
      const y = ((max - v) / span) * height;
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(" ");
  const gradId = `rcMiniLine-${String(color).replace(/\W/g, "")}`;
  return (
    <svg
      className="alpine-recovery-mini-line"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.15" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L ${width} ${height} L 0 ${height} Z`}
        fill={`url(#${gradId})`}
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RecoveryKpiCard({
  icon      = null,
  label     = "",
  value     = "—",
  unit      = "",
  hint      = "",
  delta     = "",
  tone      = 3,
  gaugeValue = null,
  chartData  = null,
  chartType  = "bar",
  linkTo     = null,
}) {
  const safeTone   = clampTone(tone);
  const chartColor = TONE_CHART_COLOR[safeTone] || TONE_CHART_COLOR[3];
  const hasChart   = Array.isArray(chartData) && chartData.filter(Boolean).length > 1;

  return (
    <article className="alpine-recovery-card">
      <header className="alpine-recovery-card-head">
        {icon ? (
          <span className={`alpine-recovery-card-icon tone-${safeTone}`} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="alpine-recovery-card-label">{label}</span>
      </header>

      <div className="alpine-recovery-card-body">
        {/* Colonne gauche : valeur + hint + delta */}
        <div className="alpine-recovery-card-info">
          {gaugeValue != null ? (
            <KpiGaugeCircular value={gaugeValue} tone={safeTone} size="md" unit="%" />
          ) : (
            <div className="alpine-recovery-card-value-row">
              <strong className={`alpine-recovery-card-value tone-${safeTone}`}>{value}</strong>
              {unit ? <span className="alpine-recovery-card-unit">{unit}</span> : null}
            </div>
          )}
          {gaugeValue != null && value !== "—" ? (
            <strong className={`alpine-recovery-card-gauge-value tone-${safeTone}`}>{value}{unit}</strong>
          ) : null}
          {hint  ? <span className={`alpine-recovery-card-hint  tone-${safeTone}`}>{hint}</span>  : null}
          {delta ? <span className="alpine-recovery-card-delta">{delta}</span> : null}
        </div>

        {/* Colonne droite : mini-graphe */}
        {hasChart ? (
          <div className="alpine-recovery-card-chart">
            {chartType === "line"
              ? <MiniLine data={chartData} color={chartColor} />
              : <MiniBars data={chartData} color={chartColor} />}
          </div>
        ) : null}
      </div>

      {linkTo ? (
        <Link className="alpine-recovery-card-link" to={linkTo}>Voir le détail</Link>
      ) : null}
    </article>
  );
}

export default memo(RecoveryKpiCard);
