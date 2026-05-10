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
 * - chart : { type: "line" | "bar", data: number[], color?, fillZone?, yAxis? }
 *   - color    : couleur du tracé (défaut vert ligne, bleu barre)
 *   - fillZone : zone teintée fond (ex: { min: 30, max: 90 })
 *   - yAxis    : affiche axe des ordonnées { labels: ["100","50","0"] } (mockup)
 * - footnote : string
 * - axisLabels : array string (axe X bas)
 */

const CHART_HEIGHT = 100;
const CHART_WIDTH  = 260; // largeur utile SVG (laisse 20px pour labels Y)

const DEFAULT_LINE_COLOR = "var(--al-success, #35a853)";
const DEFAULT_BAR_COLOR  = "var(--al-primary, #1268f3)";

function buildLinePath(data, min, max, width) {
  const valid = data.filter((v) => v != null && Number.isFinite(v));
  if (valid.length < 2) return "";
  const span = Math.max(1, max - min);
  const step = width / Math.max(1, data.length - 1);
  return data
    .map((v, idx) => {
      if (v == null) return "";
      const x = idx * step;
      const y = ((max - v) / span) * CHART_HEIGHT;
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(" ");
}

function YAxisLabels({ labels, min, max }) {
  // Dessine grille horizontale + labels à droite pour chaque valeur de labels
  const span = Math.max(1, max - min);
  return (
    <>
      {labels.map((label, idx) => {
        const val = parseFloat(label);
        if (!Number.isFinite(val)) return null;
        const y = ((max - val) / span) * CHART_HEIGHT;
        return (
          <g key={idx}>
            <line
              x1="0" y1={y.toFixed(1)}
              x2={CHART_WIDTH} y2={y.toFixed(1)}
              stroke="var(--al-border, #dfe8f5)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <text
              x={CHART_WIDTH + 4}
              y={(y + 4).toFixed(1)}
              fontSize="9"
              fill="var(--al-text-soft, #6b7a99)"
              fontFamily="inherit"
            >
              {label}
            </text>
          </g>
        );
      })}
    </>
  );
}

function LineChart({ data, min, max, color, fillZone, yAxis }) {
  const path = buildLinePath(data, min, max, CHART_WIDTH);
  if (!path) {
    return <div className="alpine-chart-empty">Pas assez de données</div>;
  }
  const span = Math.max(1, max - min);
  const gradId = `chartFill-${String(color).replace(/\W/g, "")}`;

  let zoneRect = null;
  if (fillZone && fillZone.min != null && fillZone.max != null) {
    const yTop    = ((max - fillZone.max) / span) * CHART_HEIGHT;
    const yBottom = ((max - fillZone.min) / span) * CHART_HEIGHT;
    const yT = Math.max(0, Math.min(CHART_HEIGHT, yTop));
    const yB = Math.max(0, Math.min(CHART_HEIGHT, yBottom));
    zoneRect = (
      <rect
        x="0" y={yT} width={CHART_WIDTH}
        height={Math.max(0, yB - yT)}
        fill="var(--al-success-soft, #e8f6ec)"
        opacity="0.5"
      />
    );
  }

  const totalWidth = yAxis ? CHART_WIDTH + 24 : CHART_WIDTH;

  return (
    <svg
      className="alpine-kpi-chart-svg"
      viewBox={`0 0 ${totalWidth} ${CHART_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.20" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {yAxis ? <YAxisLabels labels={yAxis.labels} min={min} max={max} /> : null}
      {zoneRect}
      <path d={`${path} L ${CHART_WIDTH} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BarChart({ data, min, max, color, yAxis }) {
  if (!data.length) return <div className="alpine-chart-empty">Pas assez de données</div>;
  const span = Math.max(1, max - min);
  const barW = Math.max(2, (CHART_WIDTH - data.length * 2) / data.length);
  const EMPTY_BAR_HEIGHT = 6;
  const totalWidth = yAxis ? CHART_WIDTH + 24 : CHART_WIDTH;

  return (
    <svg
      className="alpine-kpi-chart-svg"
      viewBox={`0 0 ${totalWidth} ${CHART_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {yAxis ? <YAxisLabels labels={yAxis.labels} min={min} max={max} /> : null}
      {data.map((value, idx) => {
        const x = idx * (barW + 2);
        const isEmpty = value == null || !Number.isFinite(value) || value <= 0;
        const h = isEmpty
          ? EMPTY_BAR_HEIGHT
          : Math.max(2, (Math.max(0, value - min) / span) * CHART_HEIGHT);
        const y = CHART_HEIGHT - h;
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

      <div className="alpine-kpi-chart-graph">
        {isLine
          ? <LineChart data={data} min={min} max={max} color={color} fillZone={chart?.fillZone} yAxis={chart?.yAxis} />
          : <BarChart  data={data} min={min} max={max} color={color} yAxis={chart?.yAxis} />}
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
