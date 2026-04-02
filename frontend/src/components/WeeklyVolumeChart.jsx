import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import InfoTooltip from "./InfoTooltip.jsx";

const GRID_STROKE = "rgba(123, 140, 163, 0.16)";
const AXIS_TICK = { fontSize: 12, fill: "#7B8CA3" };
const noop = () => {};

function defaultFormatValue(value, unit = "") {
  if (unit) {
    return `${value} ${unit}`;
  }

  return value;
}

function toDate(value) {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatShortWeekTick(value) {
  const date = toDate(value);

  if (!date) {
    return value;
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function formatMonthTick(value) {
  const date = toDate(value);

  if (!date) {
    return value;
  }

  return date.toLocaleDateString("fr-FR", {
    month: "short",
    year: "2-digit",
  });
}

function buildAxisConfig(data = []) {
  const hasPeriodDates = data.every((entry) => entry?.periodDate);

  if (!hasPeriodDates) {
    return {
      dataKey: "period",
      ticks: undefined,
      tickFormatter: (value) => value,
      angle: -35,
      textAnchor: "end",
      height: 70,
      minTickGap: 0,
    };
  }

  const lastIndex = Math.max(0, data.length - 1);

  if (data.length <= 12) {
    return {
      dataKey: "periodDate",
      ticks: data.map((entry) => entry.periodDate),
      tickFormatter: formatShortWeekTick,
      angle: -28,
      textAnchor: "end",
      height: 60,
      minTickGap: 10,
    };
  }

  if (data.length <= 24) {
    const step = Math.max(2, Math.ceil(data.length / 10));

    return {
      dataKey: "periodDate",
      ticks: data
        .filter((_, index) => index === 0 || index === lastIndex || index % step === 0)
        .map((entry) => entry.periodDate),
      tickFormatter: formatShortWeekTick,
      angle: -24,
      textAnchor: "end",
      height: 56,
      minTickGap: 12,
    };
  }

  const ticks = data
    .filter((entry, index, items) => {
      if (index === 0 || index === lastIndex) {
        return true;
      }

      const current = toDate(entry.periodDate);
      const previous = toDate(items[index - 1]?.periodDate);

      if (!current || !previous) {
        return false;
      }

      return current.getMonth() !== previous.getMonth() || current.getFullYear() !== previous.getFullYear();
    })
    .map((entry) => entry.periodDate);

  return {
    dataKey: "periodDate",
    ticks,
    tickFormatter: formatMonthTick,
    angle: 0,
    textAnchor: "middle",
    height: 40,
    minTickGap: 18,
  };
}

function buildTrendData(data = [], dataKey = "value", windowSize = 4) {
  const safeWindowSize = Math.max(2, Number(windowSize || 4));

  return data.map((entry, index) => {
    const sliceStart = Math.max(0, index - safeWindowSize + 1);
    const windowValues = data
      .slice(sliceStart, index + 1)
      .map((item) => Number(item?.[dataKey] || 0))
      .filter((value) => Number.isFinite(value));
    const trendValue = windowValues.length
      ? windowValues.reduce((sum, value) => sum + value, 0) / windowValues.length
      : null;

    return {
      ...entry,
      __trendValue: trendValue,
    };
  });
}

function WeeklyTooltip({
  active,
  payload,
  label,
  dataKey,
  formatValue,
  name,
  showTrendLine,
  trendLabel,
}) {
  if (!active || !payload?.length) return null;

  const entry = payload[0]?.payload || {};
  const valueEntry = payload.find((item) => item.dataKey === dataKey) || payload[0];
  const trendEntry = payload.find((item) => item.dataKey === "__trendValue");
  const rawValue = valueEntry?.value ?? entry?.[dataKey] ?? 0;
  const rawTrendValue = trendEntry?.value ?? entry?.__trendValue ?? null;

  return (
    <div className="chart-tooltip">
      <strong>{entry.period || label}</strong>
      <div>{name} : {formatValue(rawValue)}</div>
      {showTrendLine && Number.isFinite(rawTrendValue) ? (
        <div>{trendLabel} : {formatValue(rawTrendValue)}</div>
      ) : null}
    </div>
  );
}

export default function WeeklyVolumeChart({
  data = [],
  title = "Volume hebdomadaire",
  subtitle = "Toutes les semaines de la periode affichee sont conservees, meme a 0.",
  info = [],
  dataKey = "distanceKm",
  name = "Distance (km)",
  unit = "km",
  fill = "#F97316",
  emptyMessage = "Aucune donnee disponible sur cette plage.",
  valueFormatter = null,
  showTrendLine = false,
  trendWindow = 4,
  trendLabel = "Tendance",
  trendColor = "#7B8CA3",
  showMetricControl = false,
  metricControlLabel = "Vue",
  metricOptions = [],
  selectedMetric = "",
  onMetricChange = noop,
}) {
  const safeData = Array.isArray(data) ? data : [];
  const formatValue = valueFormatter || ((value) => defaultFormatValue(value, unit));
  const axisConfig = buildAxisConfig(safeData);
  const chartData = showTrendLine ? buildTrendData(safeData, dataKey, trendWindow) : safeData;
  const safeMetricOptions = Array.isArray(metricOptions) && metricOptions.length
    ? metricOptions
    : [{ value: dataKey, label: name }];
  const safeSelectedMetric = selectedMetric || dataKey;

  return (
    <section className="card chart-card">
      <div className="card-header-row wrap-on-mobile align-center">
        <div>
          <div className="title-with-info">
            <h2 className="card-title">{title}</h2>
            <InfoTooltip title={title} content={info} label={`Afficher l'aide pour ${title}`} />
          </div>
          <p className="card-subtitle">{subtitle}</p>
        </div>
        {showMetricControl ? (
          <div className="chart-controls">
            <label className="inline-field">
              <span className="field-label inline-label">{metricControlLabel}</span>
              <select className="field-input field-input-small" value={safeSelectedMetric} onChange={(event) => onMetricChange(event.target.value)}>
                {safeMetricOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </div>
      {safeData.length ? (
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} barCategoryGap="18%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
              <XAxis
                dataKey={axisConfig.dataKey}
                ticks={axisConfig.ticks}
                tickFormatter={axisConfig.tickFormatter}
                interval={0}
                angle={axisConfig.angle}
                textAnchor={axisConfig.textAnchor}
                height={axisConfig.height}
                minTickGap={axisConfig.minTickGap}
                tickMargin={8}
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip
                content={(
                  <WeeklyTooltip
                    dataKey={dataKey}
                    formatValue={formatValue}
                    name={name}
                    showTrendLine={showTrendLine}
                    trendLabel={trendLabel}
                  />
                )}
              />
              <Bar dataKey={dataKey} name={name} fill={fill} radius={[8, 8, 0, 0]} />
              {showTrendLine ? (
                <Line
                  type="monotone"
                  dataKey="__trendValue"
                  name={trendLabel}
                  stroke={trendColor}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  strokeDasharray="6 4"
                />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state">{emptyMessage}</div>
      )}
    </section>
  );
}
