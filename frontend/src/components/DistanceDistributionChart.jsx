import { memo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useChartViewport from "../hooks/useChartViewport.js";
import { buildCategoryAxisConfig } from "../utils/chartAxis.js";
import InfoTooltip from "./InfoTooltip.jsx";

const GRID_STROKE = "rgba(123, 140, 163, 0.16)";

function DistanceDistributionChart({
  data = [],
  title = "Profil des distances de sorties",
  subtitle = "Repere la place des sorties courtes, intermediaires et longues dans l'entrainement recent.",
  info = [],
}) {
  const { containerRef, chartWidth, axisTick } = useChartViewport();
  const safeData = Array.isArray(data) ? data.filter((entry) => entry?.label) : [];
  const isVertical = chartWidth <= 0 || chartWidth < 760;
  const chartLayout = isVertical ? "vertical" : "horizontal";
  const xAxisConfig = buildCategoryAxisConfig({
    width: chartWidth,
    labelKey: "label",
  });
  const yAxisWidth = isVertical ? 74 : 34;

  return (
    <section className="card chart-card">
      <div className="card-header-row">
        <div>
          <div className="title-with-info">
            <h2 className="card-title">{title}</h2>
            <InfoTooltip title={title} content={info} label={`Afficher l'aide pour ${title}`} />
          </div>
          <p className="card-subtitle">{subtitle}</p>
        </div>
      </div>
      {safeData.length ? (
        <div className="chart-box chart-box-medium" ref={containerRef}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart key={`distance-distribution-${chartLayout}-${safeData.length}`} data={safeData} layout={chartLayout}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
              {isVertical ? (
                <>
                  <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis dataKey="label" type="category" width={yAxisWidth} tick={axisTick} axisLine={false} tickLine={false} />
                </>
              ) : (
                <>
                  <XAxis
                    dataKey={xAxisConfig.dataKey}
                    tickFormatter={xAxisConfig.tickFormatter}
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                    interval={xAxisConfig.interval}
                    height={xAxisConfig.height}
                    minTickGap={xAxisConfig.minTickGap}
                    tickMargin={xAxisConfig.tickMargin}
                  />
                  <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={yAxisWidth} />
                </>
              )}
              <Tooltip formatter={(value) => [`${value}`, "Nombre d'activites"]} />
              <Bar dataKey="value" name="Nombre d'activites" fill="#FB923C" radius={isVertical ? [0, 8, 8, 0] : [8, 8, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <div className="empty-state">Aucune activite disponible pour repartir les distances.</div>}
    </section>
  );
}

export default memo(DistanceDistributionChart);
