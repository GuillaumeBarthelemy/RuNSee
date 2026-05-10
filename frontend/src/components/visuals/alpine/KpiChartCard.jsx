import { memo } from "react";
import { clampTone } from "../../../utils/tonePicker.js";

/**
 * KpiChartCard — Alpine Light (Lot 3-bis, mockup-faithful).
 *
 * Carte avec valeur, hint, delta, mini-graphe responsive, footnote.
 * Les labels d'axe Y sont rendus en HTML (pas en SVG) pour éviter la
 * déformation avec preserveAspectRatio="none". Les lignes de grille
 * restent en SVG mais avec vector-effect="non-scaling-stroke".
 *
 * Props :
 * - label, value, unit, hint, delta, tone, footnote, axisLabels (axe X)
 * - chart : { type, data, color?, fillZone?, min?, max?, yAxis? }
 *   - yAxis: { ticks: [{value, label}, ...] } — labels HTML positionnés en %
 *     ou raccourci : { labels: ["100","50","0"] } (value = parseFloat(label))
 */

function normalizeYAxisTicks(yAxis) {
  if (!yAxis) return null;
  if (Array.isArray(yAxis.ticks)) {
    return yAxis.ticks.filter((t) => Number.isFinite(t?.value));
  }
  if (Array.isArray(yAxis.labels)) {
    return yAxis.labels
      .map((l) => ({ value: parseFloat(l), label: l }))
      .filter((t) => Number.isFinite(t.value));
  }
  return null;
}

const VB_W = 300;  // viewBox SVG (le SVG s'étire au container via preserveAspectRatio="none")
const VB_H = 100;

const DEFAULT_LINE_COLOR = "var(--al-success, #35a853)";
const DEFAULT_BAR_COLOR  = "var(--al-primary, #1268f3)";

function buildLinePath(data, min, max) {
  const valid = data.filter((v) => v != null && Number.isFinite(v));
  if (valid.length < 2) return "";
  const span = Math.max(1, max - min);
  const step = VB_W / Math.max(1, data.length - 1);
  return data
    .map((v, idx) => {
      if (v == null) return "";
      const x = idx * step;
      const y = ((max - v) / span) * VB_H;
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(" ");
}

function YAxisGridSvg({ ticks, min, max }) {
  const span = Math.max(1, max - min);
  return (
    <>
      {ticks.map((t, idx) => {
        const y = ((max - t.value) / span) * VB_H;
        const yC = Math.min(VB_H - 0.5, Math.max(0.5, y));
        return (
          <line
            key={idx}
            x1="0" y1={yC.toFixed(1)}
            x2={VB_W} y2={yC.toFixed(1)}
            stroke="#c4d0e8"
            strokeWidth="1"
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
            opacity="0.9"
          />
        );
      })}
    </>
  );
}

function YAxisLabelsHtml({ ticks, min, max }) {
  const span = Math.max(1, max - min);
  return (
    <div className="alpine-kpi-chart-yaxis" aria-hidden="true">
      {ticks.map((t, idx) => {
        const topPct = ((max - t.value) / span) * 100;
        const clamped = Math.min(98, Math.max(2, topPct));
        return (
          <span key={idx} style={{ top: `${clamped}%` }}>{t.label}</span>
        );
      })}
    </div>
  );
}

function LineChart({ data, min, max, color, fillZone, yTicks }) {
  const path = buildLinePath(data, min, max);
  if (!path) return <div className="alpine-chart-empty">Pas assez de données</div>;
  const span = Math.max(1, max - min);
  const gradId = `chartFill-${String(color).replace(/\W/g, "")}`;

  let zoneRect = null;
  if (fillZone && fillZone.min != null && fillZone.max != null) {
    const yTop    = ((max - fillZone.max) / span) * VB_H;
    const yBottom = ((max - fillZone.min) / span) * VB_H;
    const yT = Math.max(0, Math.min(VB_H, yTop));
    const yB = Math.max(0, Math.min(VB_H, yBottom));
    zoneRect = (
      <rect
        x="0" y={yT} width={VB_W}
        height={Math.max(0, yB - yT)}
        fill="var(--al-success-soft, #e8f6ec)"
        opacity="0.5"
      />
    );
  }

  return (
    <svg
      className="alpine-kpi-chart-svg"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.20" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks ? <YAxisGridSvg ticks={yTicks} min={min} max={max} /> : null}
      {zoneRect}
      <path
        d={`${path} L ${VB_W} ${VB_H} L 0 ${VB_H} Z`}
        fill={`url(#${gradId})`}
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function BarChart({ data, min, max, color, yTicks }) {
  if (!data.length) return <div className="alpine-chart-empty">Pas assez de données</div>;
  const span = Math.max(1, max - min);
  const barW = Math.max(2, (VB_W - data.length * 2) / data.length);
  const EMPTY_BAR_HEIGHT = 6;

  return (
    <svg
      className="alpine-kpi-chart-svg"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {yTicks ? <YAxisGridSvg ticks={yTicks} min={min} max={max} /> : null}
      {data.map((value, idx) => {
        const x = idx * (barW + 2);
        const isEmpty = value == null || !Number.isFinite(value) || value <= 0;
        const h = isEmpty
          ? EMPTY_BAR_HEIGHT
          : Math.max(2, (Math.max(0, value - min) / span) * VB_H);
        const y = VB_H - h;
        const isLast = idx === data.length - 1;
        const fillColor = isEmpty ? "var(--al-border, #dfe8f5)" : color;
        return (
          <rect
            key={idx}
            x={x} y={y}
            width={barW} height={h}
            rx="2"
            fill={fillColor}
            opacity={isEmpty ? 0.6 : (isLast ? 1 : 0.78)}
          />
        );
      })}
    </svg>
  );
}

function KpiChartCard({
  label    = "",
  value    = "—",
  unit     = "",
  hint     = "",
  delta    = "",
  tone     = 3,
  chart    = null,
  footnote = "",
  axisLabels = null,
}) {
  const safeTone = clampTone(tone);
  const data   = Array.isArray(chart?.data) ? chart.data : [];
  const valid  = data.filter((v) => v != null && Number.isFinite(v));
  const isLine = chart?.type !== "bar";
  const color  = chart?.color || (isLine ? DEFAULT_LINE_COLOR : DEFAULT_BAR_COLOR);

  const min = chart?.min ?? (valid.length ? Math.min(0, ...valid) : 0);
  const max = chart?.max ?? (valid.length ? Math.max(...valid) * 1.1 : 100);

  const yTicks = normalizeYAxisTicks(chart?.yAxis);
  const hasYAxis = yTicks && yTicks.length > 0;

  return (
    <article className="alpine-kpi-chart-card">
      <header className="alpine-kpi-chart-head">
        <span className="alpine-kpi-chart-label">{label}</span>
      </header>
      <div className="alpine-kpi-chart-value-row">
        <strong className="alpine-kpi-chart-value">{value}</strong>
        {unit ? <span className="alpine-kpi-chart-unit">{unit}</span> : null}
      </div>
      {hint  ? <span className={`alpine-kpi-chart-hint tone-${safeTone}`}>{hint}</span>  : null}
      {delta ? <span className="alpine-kpi-chart-delta">{delta}</span> : null}

      <div className={`alpine-kpi-chart-graph ${hasYAxis ? "has-yaxis" : ""}`.trim()}>
        {isLine
          ? <LineChart data={data} min={min} max={max} color={color} fillZone={chart?.fillZone} yTicks={yTicks} />
          : <BarChart  data={data} min={min} max={max} color={color} yTicks={yTicks} />}
        {hasYAxis ? <YAxisLabelsHtml ticks={yTicks} min={min} max={max} /> : null}
      </div>
      {axisLabels && axisLabels.length ? (
        <div className="alpine-kpi-chart-axis">
          {axisLabels.map((lbl, idx) => (
            <span key={idx}>{lbl}</span>
          ))}
        </div>
      ) : null}
      {footnote ? <p className="alpine-kpi-chart-footnote">{footnote}</p> : null}
    </article>
  );
}

export default memo(KpiChartCard);
