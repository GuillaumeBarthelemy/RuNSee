import { memo, useState } from "react";
import InfoTooltip from "./InfoTooltip.jsx";

// ---------------------------------------------------------------------------
// SVG chart dimensions
// ---------------------------------------------------------------------------

const CHART_W = 720;
const CHART_H = 160;
const PAD_LEFT = 44;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 32;

const INNER_W = CHART_W - PAD_LEFT - PAD_RIGHT;
const INNER_H = CHART_H - PAD_TOP - PAD_BOTTOM;

// ---------------------------------------------------------------------------
// Metric options available for the secondary axis
// ---------------------------------------------------------------------------

const METRIC_OPTIONS = [
  { key: "sleepScore", label: "Sommeil (score)", unit: "/ 100", color: "var(--recovery-sleep-color, #7c6af7)" },
  { key: "hrvAvgMs", label: "HRV moy.", unit: "ms", color: "var(--recovery-hrv-color, #38bdf8)" },
  { key: "restingHr", label: "FC repos", unit: "bpm", color: "var(--recovery-hr-color, #f97316)" },
  { key: "bodyBattery", label: "Body Battery", unit: "%", color: "var(--recovery-bb-color, #22d3ee)" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeBounds(values) {
  const valid = values.filter((v) => v != null && Number.isFinite(v));
  if (!valid.length) return { min: 0, max: 1 };
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  return { min: min === max ? min - 1 : min, max: min === max ? max + 1 : max };
}

function scaleX(index, total) {
  if (total <= 1) return PAD_LEFT + INNER_W / 2;
  return PAD_LEFT + (index / (total - 1)) * INNER_W;
}

function scaleY(value, min, max) {
  const span = Math.max(1, max - min);
  return PAD_TOP + ((max - value) / span) * INNER_H;
}

function buildPath(points, xFn, valueKey, bounds) {
  const valid = [];
  points.forEach((p, i) => {
    if (p[valueKey] != null) valid.push({ i, v: p[valueKey] });
  });
  if (valid.length < 2) return "";
  return valid
    .map(({ i, v }, idx) => {
      const x = xFn(i, points.length);
      const y = scaleY(v, bounds.min, bounds.max);
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function buildBarPath(points, xFn, bounds) {
  const bars = points
    .filter((p) => p.load != null && p.load > 0)
    .map((p, _unused, arr) => {
      const i = points.indexOf(p);
      const x = xFn(i, points.length);
      const barW = Math.max(2, INNER_W / points.length - 1);
      const y = scaleY(p.load, bounds.min, bounds.max);
      const h = CHART_H - PAD_BOTTOM - y;
      return { x: x - barW / 2, y, w: barW, h: Math.max(1, h) };
    });
  return bars;
}

// ---------------------------------------------------------------------------
// Y-axis tick labels
// ---------------------------------------------------------------------------

function YAxisTicks({ min, max, color }) {
  const ticks = [min, (min + max) / 2, max].map((v) => Math.round(v));
  return (
    <>
      {ticks.map((tick, i) => (
        <text
          key={i}
          x={PAD_LEFT - 6}
          y={scaleY(tick, min, max) + 4}
          textAnchor="end"
          fontSize="10"
          fill={color}
        >
          {tick}
        </text>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function RecoveryVsLoadChart({ points = [], info = null }) {
  const [activeMetric, setActiveMetric] = useState("sleepScore");

  const metricDef = METRIC_OPTIONS.find((m) => m.key === activeMetric) || METRIC_OPTIONS[0];

  const loadValues = points.map((p) => p.load).filter((v) => v != null);
  const metricValues = points.map((p) => p[activeMetric]).filter((v) => v != null);

  const hasEnoughData = metricValues.length >= 5;

  const loadBounds = safeBounds(loadValues);
  const metricBounds = safeBounds(metricValues);

  const bars = hasEnoughData ? buildBarPath(points, scaleX, { min: 0, max: loadBounds.max * 1.1 }) : [];
  const metricPath = hasEnoughData
    ? buildPath(points, scaleX, activeMetric, metricBounds)
    : "";

  // X-axis label: first and last date
  const firstDate = points[0]?.dateKey || "";
  const lastDate = points[points.length - 1]?.dateKey || "";

  return (
    <section className="card recovery-vs-load-chart">
      <div className="card-header">
        <div className="card-title-block">
          <h2 className="card-title">Charge vs Récupération</h2>
          <p className="card-subtitle">Barres = charge journalière · Courbe = indicateur physiologique sélectionné</p>
        </div>
        {info ? (
          <InfoTooltip title={info.title} content={info.content} />
        ) : null}
      </div>

      <div className="recovery-metric-tabs">
        {METRIC_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={`recovery-metric-tab ${activeMetric === opt.key ? "is-active" : ""}`}
            onClick={() => setActiveMetric(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {!hasEnoughData ? (
        <p className="recovery-chart-empty">
          Pas assez de données de récupération pour afficher la corrélation (minimum 5 jours).
        </p>
      ) : (
        <div className="recovery-chart-wrap">
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            className="recovery-chart-svg"
            aria-label={`Charge vs ${metricDef.label} sur ${points.length} jours`}
          >
            {/* Load bars */}
            {bars.map((b, i) => (
              <rect
                key={i}
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                className="recovery-load-bar"
              />
            ))}

            {/* Recovery metric line */}
            {metricPath ? (
              <path
                d={metricPath}
                fill="none"
                stroke={metricDef.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="recovery-metric-line"
              />
            ) : null}

            {/* Y-axis ticks */}
            <YAxisTicks min={metricBounds.min} max={metricBounds.max} color={metricDef.color} />

            {/* X-axis date labels */}
            <text x={PAD_LEFT} y={CHART_H - 4} fontSize="10" fill="var(--color-text-muted, #888)">
              {firstDate}
            </text>
            <text
              x={CHART_W - PAD_RIGHT}
              y={CHART_H - 4}
              textAnchor="end"
              fontSize="10"
              fill="var(--color-text-muted, #888)"
            >
              {lastDate}
            </text>
          </svg>
        </div>
      )}
    </section>
  );
}

export default memo(RecoveryVsLoadChart);
