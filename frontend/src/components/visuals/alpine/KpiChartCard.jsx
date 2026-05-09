import { memo } from "react";
import { clampTone, toneCssVar } from "../../../utils/tonePicker.js";

/**
 * KpiChartCard — Alpine Light (Lot 3-bis, mockup-faithful).
 *
 * Grosse carte avec :
 *  - label en haut + icône info
 *  - valeur grosse + unité
 *  - sous-label tone (Correcte / Bon / Modérée…)
 *  - delta vs hier ou vs sem passée
 *  - mini-graphe 14 j (line chart ou bar chart)
 *  - phrase descriptive en bas
 *
 * Props :
 * - label : string (ex: "Charge d'entrainement")
 * - value : string|number
 * - unit : string optionnel
 * - hint : string optionnel (sous-label coloré)
 * - delta : string optionnel ("+4 vs hier", "+0h32 vs semaine passée")
 * - tone : 1..5
 * - chart : { type: "line" | "bar", data: number[], min?, max? }
 * - footnote : string (phrase explicative sous le graphe)
 * - axisLabels : array string (labels x affichés sous le graphe, ex: ["-7j", ..., "Aujourd'hui"])
 */

const CHART_HEIGHT = 100;

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

function LineChart({ data, min, max, color }) {
  const width = 280;
  const path = buildLinePath(data, min, max, width);
  if (!path) {
    return <div className="alpine-chart-empty">Pas assez de données</div>;
  }
  return (
    <svg
      className="alpine-kpi-chart-svg"
      viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`chartFill-${color.replace(/\W/g, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.18" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L ${width} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`} fill={`url(#chartFill-${color.replace(/\W/g, "")})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BarChart({ data, min, max, color }) {
  const valid = data.filter((v) => v != null && Number.isFinite(v));
  if (!valid.length) return <div className="alpine-chart-empty">Pas assez de données</div>;
  const span = Math.max(1, max - min);
  const width = 280;
  const barW = Math.max(2, (width - data.length * 2) / data.length);
  return (
    <svg
      className="alpine-kpi-chart-svg"
      viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {data.map((value, idx) => {
        if (value == null || !Number.isFinite(value)) return null;
        const v = Math.max(0, value - min);
        const h = (v / span) * CHART_HEIGHT;
        const x = idx * (barW + 2);
        const y = CHART_HEIGHT - h;
        const isLast = idx === data.length - 1;
        return (
          <rect
            key={idx}
            x={x}
            y={y}
            width={barW}
            height={Math.max(2, h)}
            rx="2"
            fill={isLast ? color : `${color}cc`}
            opacity={isLast ? 1 : 0.7}
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
  const color = toneCssVar(safeTone);
  const data = Array.isArray(chart?.data) ? chart.data : [];
  const valid = data.filter((v) => v != null && Number.isFinite(v));
  const min = chart?.min ?? (valid.length ? Math.min(...valid) : 0);
  const max = chart?.max ?? (valid.length ? Math.max(...valid) : 100);

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
        {chart?.type === "bar"
          ? <BarChart data={data} min={min} max={max} color={color} />
          : <LineChart data={data} min={min} max={max} color={color} />}
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
