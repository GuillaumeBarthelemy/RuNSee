import { memo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useChartViewport from "../hooks/useChartViewport.js";
import InfoTooltip from "./InfoTooltip.jsx";

const GRID_STROKE = "rgba(123, 140, 163, 0.16)";
const noop = () => {};
const ZONE_ACCENT_MAP = {
  z1: {
    accent: "#6D9F8C",
    soft: "rgba(109, 159, 140, 0.18)",
  },
  z2: {
    accent: "#6B8FCA",
    soft: "rgba(107, 143, 202, 0.18)",
  },
  z3: {
    accent: "#355886",
    soft: "rgba(53, 88, 134, 0.18)",
  },
  z4: {
    accent: "#D7962A",
    soft: "rgba(215, 150, 42, 0.18)",
  },
  z5: {
    accent: "#F97316",
    soft: "rgba(249, 115, 22, 0.2)",
  },
};

function formatLoad(value) {
  return `${Number(value || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} pts`;
}

function formatDurationMinutes(value) {
  const totalMinutes = Math.max(0, Math.round(Number(value || 0)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} min`;
  }

  return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
}

function getMetricConfig(metric) {
  if (metric === "duration") {
    return {
      key: "duration",
      dataKey: "durationMinutes",
      label: "Durée",
      formatter: formatDurationMinutes,
      shareKey: "durationShare",
      shareLabel: "du temps suivi",
      secondaryLabel: "Charge",
      secondaryFormatter: formatLoad,
      secondaryValueKey: "load",
    };
  }

  return {
    key: "load",
    dataKey: "load",
    label: "Charge",
    formatter: formatLoad,
    shareKey: "loadShare",
    shareLabel: "de la charge suivie",
    secondaryLabel: "Durée",
    secondaryFormatter: formatDurationMinutes,
    secondaryValueKey: "durationMinutes",
  };
}

function CustomTooltip({ active, payload, label, metricConfig }) {
  if (!active || !payload?.length) {
    return null;
  }

  const entry = payload[0]?.payload || {};
  const primaryValue = entry?.[metricConfig.dataKey] ?? 0;
  const secondaryValue = entry?.[metricConfig.secondaryValueKey] ?? 0;
  const shareValue = entry?.[metricConfig.shareKey] ?? 0;

  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {entry.rangeLabel ? <div>{entry.rangeLabel}</div> : null}
      <div>{metricConfig.label} : {metricConfig.formatter(primaryValue)}</div>
      <div>{metricConfig.secondaryLabel} : {metricConfig.secondaryFormatter(secondaryValue)}</div>
      <div>{Math.round(Number(shareValue || 0))} % {metricConfig.shareLabel}</div>
    </div>
  );
}

function ZoneLoadDistributionCard({
  model = {},
  title,
  subtitle,
  info = [],
  accentColor = "#355886",
  selectedMetric = "load",
  metricOptions = [],
  metricControlLabel = "Mesure",
  onMetricChange = noop,
  insight = "",
  showSourceDetails = false,
}) {
  const { containerRef, chartWidth, axisTick } = useChartViewport();
  const safeModel = model || {};
  const safeData = Array.isArray(safeModel.zones) ? safeModel.zones : [];
  const metricConfig = getMetricConfig(selectedMetric);
  const hasData = Boolean(safeModel.hasData) && safeData.some((entry) => Number(entry?.[metricConfig.dataKey]) > 0);
  const chartLayout = "vertical";
  const yAxisWidth = chartWidth > 0 && chartWidth < 520 ? 42 : 48;
  const barSize = chartWidth > 0 && chartWidth < 640 ? 18 : 24;
  const safeMetricOptions = Array.isArray(metricOptions) && metricOptions.length
    ? metricOptions
    : [
        { value: "load", label: "Charge" },
        { value: "duration", label: "Durée" },
      ];
  const zoneLegend = safeData.filter((entry) => entry?.rangeLabel);

  return (
    <section className="card chart-card">
      <div className="card-header-row wrap-on-mobile align-center">
        <div>
          <div className="title-with-info">
            <h2 className="card-title">{title}</h2>
            <InfoTooltip title={title} content={info} label={`Afficher l'aide pour ${title}`} />
          </div>
          {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
          {insight ? <div className="chart-insight">{insight}</div> : null}
          {showSourceDetails && safeModel.sourceLabel ? (
            <p className="small-text">
              Source active : {safeModel.sourceLabel}.
              {safeModel.fallbackLabel ? ` ${safeModel.fallbackLabel}.` : ""}
            </p>
          ) : null}
          {showSourceDetails && safeModel.referenceMaxHeartrate ? (
            <p className="small-text">
              FC max utilisee : {Math.round(Number(safeModel.referenceMaxHeartrate || 0))} bpm.
            </p>
          ) : null}
          {showSourceDetails && safeModel.referencePaceLabel ? (
            <p className="small-text">
              Allure de reference : {safeModel.referencePaceLabel} sur {safeModel.referenceSampleSize || 0} sortie(s) comparees.
            </p>
          ) : null}
          {safeModel.estimationMessage ? (
            <div className="alert alert-info top-gap-sm">
              {safeModel.estimationMessage}
            </div>
          ) : null}
          {zoneLegend.length ? (
            <div className="zone-detail-legend top-gap-sm" aria-label="Legende des zones cardiaques">
              {zoneLegend.map((zone) => (
                <div
                  key={zone.key}
                  className="zone-detail-item"
                  style={{
                    "--zone-accent": ZONE_ACCENT_MAP[zone.key]?.accent || "#355886",
                    "--zone-accent-soft": ZONE_ACCENT_MAP[zone.key]?.soft || "rgba(53, 88, 134, 0.18)",
                  }}
                >
                  <span className="zone-detail-key">{zone.shortLabel}</span>
                  <div className="zone-detail-copy">
                    <span className="zone-detail-range">{zone.rangeLabel}</span>
                    <span className="zone-detail-value">
                      {metricConfig.formatter(zone?.[metricConfig.dataKey] ?? 0)} · {Math.round(Number(zone?.[metricConfig.shareKey] ?? 0))} %
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="chart-controls">
          <label className="inline-field">
            <span className="field-label inline-label">{metricControlLabel}</span>
            <select className="field-input field-input-small" value={selectedMetric} onChange={(event) => onMetricChange(event.target.value)}>
              {safeMetricOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {hasData ? (
        <div className="chart-box chart-box-medium" ref={containerRef}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart key={`zone-${chartLayout}-${metricConfig.key}-${safeData.length}`} data={safeData} layout={chartLayout}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
              <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis dataKey="shortLabel" type="category" tick={axisTick} axisLine={false} tickLine={false} width={yAxisWidth} />
              <Tooltip content={<CustomTooltip metricConfig={metricConfig} />} />
              <Bar dataKey={metricConfig.dataKey} fill={accentColor} radius={[0, 8, 8, 0]} barSize={barSize} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state">{safeModel.message || "Pas assez de données pour répartir la charge par zones."}</div>
      )}
    </section>
  );
}

export default memo(ZoneLoadDistributionCard);
