import { memo } from "react";
import { clampTone } from "../../../utils/tonePicker.js";

/**
 * KpiChartCard — Alpine Light (Lot 3-bis, mockup-faithful).
 *
 * Grosse carte avec valeur + delta + mini-graphe 14 j + footnote.
 *
 * Props :
 * - label : string
 * - value : string|number
 * - unit : string optionnel
 * - hint : string optionnel (sous-label coloré par `tone`)
 * - delta : string optionnel
 * - tone : 1..5 — pilote la couleur du `hint` UNIQUEMENT
 * - chart : { type: "line" | "bar", data: number[], color?: string, fillZone?: { min, max } }
 *   - color : couleur du tracé (défaut : couleur tone selon graph type)
 *   - fillZone : optionnel — zone teintée en fond (ex: zone "verte" optimum)
 * - footnote : string
 * - axisLabels : array string
 */

const CHART_HEIGHT = 100;

// Couleurs par défaut des graphes — couleurs douces pour ne pas confondre
// la coloration "tone du KPI" (hint) et la couleur du tracé.
const DEFAULT_LINE_COLOR = "var(--al-success, #35a853)";   // vert charge
const DEFAULT_BAR_COLOR = "var(--al-primary, #1268f3)";    // bleu primaire

function buildLinePath(data, min, max, width) {
  const valid = data.filter((v) => v != null && Number.isFinite(v));
  if (valid.length < 2) return "";

  const span = Math.max(1, max - min);
  const step = width / Math.max(1, data.length - 1);
  return data
    .map((value, idx) => {
      if (value == null) return "";
      const x = idx * step;
      const y = ((max - value) / span) * CHART_HEIGHT;
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(" ");
}

function LineChart({ data, min, max, color, fillZone }) {
  const width = 280;
  const path = buildLinePath(data, min, max, width);
  if (!path) {
    return <div className="alpine-chart-empty">Pas assez de données</div>;
  }
  const span = Math.max(1, max - min);
  const gradId = `chartFill-${String(color).replace(/\W/g, "")}`;

  // Zone de fond optionnelle (ex: zone optimale verte sur la charge)
  let zoneRect = null;
  if (fillZone && fillZone.min != null && fillZone.max != null) {
    const yTop = ((max - fillZone.max) / span) * CHART_HEIGHT;
    const yBottom = ((max - fillZone.min) / span) * CHART_HEIGHT;
    const yT = Math.max(0, Math.min(CHART_HEIGHT, yTop));
    const yB = Math.max(0, Math.min(CHART_HEIGHT, yBottom));
    zoneRect = (
      <rect
        x="0"
        y={yT}
        width={width}
        height={Math.max(0, yB - yT)}
        fill="var(--al-success-soft, #e8f6ec)"
        opacity="0.5"
      />
    );
  }

  return (
    <svg
      className="alpine-kpi-chart-svg"
      viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.20" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {zoneRect}
      <path d={`${path} L ${width} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BarChart({ data, min, max, color }) {
  if (!data.length) return <div className="alpine-chart-empty">Pas assez de données</div>;
  const span = Math.max(1, max - min);
  const width = 280;
  const barW = Math.max(2, (width - data.length * 2) / data.length);
  // Hauteur minimale visible pour les jours sans activité (gris)
  const EMPTY_BAR_HEIGHT = 6;

  return (
    <svg
      className="alpine-kpi-chart-svg"
      viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {data.map((value, idx) => {
        const x = idx * (barW + 2);
        const isEmpty = value == null || !Number.isFinite(value) || value <= 0;
        const h = isEmpty
          ? EMPTY_BAR_HEIGHT
          : Math.max(2, (Math.max(0, value - min) / span) * CHART_HEIGHT);
        const y = CHART_HEIGHT - h;
        const isLast = idx === data.length - 1;
        const fillColor = isEmpty
          ? "var(--al-border, #dfe8f5)"
          : color;
        return (
          <rect
            key={idx}
            x={x}
            y={y}
            width={barW}
            height={h}
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
  label = "",
  value = "—",
  unit = "",
  hint = "",
  delta = "",
  tone = 3,
  chart = null,
  footnote = "",
  axisLabels = null,
}) {
  const safeTone = clampTone(tone);
  const data = Array.isArray(chart?.data) ? chart.data : [];
  const valid = data.filter((v) => v != null && Number.isFinite(v));
  const isLine = chart?.type !== "bar";
  const color = chart?.color || (isLine ? DEFAULT_LINE_COLOR : DEFAULT_BAR_COLOR);

  const min = chart?.min ?? (valid.length ? Math.min(0, ...valid) : 0);
  const max = chart?.max ?? (valid.length ? Math.max(...valid) * 1.1 : 100);

  return (
    <article className="alpine-kpi-chart-card">
      <header className="alpine-kpi-chart-head">
        <span className="alpine-kpi-chart-label">{label}</span>
      </header>
      <div className="alpine-kpi-chart-value-row">
        <strong className="alpine-kpi-chart-value">{value}</strong>
        {unit ? <span className="alpine-kpi-chart-unit">{unit}</span> : null}
      </div>
      {hint ? <span className={`alpine-kpi-chart-hint tone-${safeTone}`}>{hint}</span> : null}
      {delta ? <span className="alpine-kpi-chart-delta">{delta}</span> : null}

      <div className="alpine-kpi-chart-graph">
        {isLine
          ? <LineChart data={data} min={min} max={max} color={color} fillZone={chart?.fillZone} />
          : <BarChart data={data} min={min} max={max} color={color} />}
      </div>
      {axisLabels && axisLabels.length ? (
        <div className="alpine-kpi-chart-axis">
          {axisLabels.map((labelTxt, idx) => (
            <span key={idx}>{labelTxt}</span>
          ))}
        </div>
      ) : null}

      {footnote ? <p className="alpine-kpi-chart-footnote">{footnote}</p> : null}
    </article>
  );
}

export default memo(KpiChartCard);
