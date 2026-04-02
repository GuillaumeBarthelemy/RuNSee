import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPace } from "../utils/activityInsights.js";
import InfoTooltip from "./InfoTooltip.jsx";

const GRID_STROKE = "rgba(123, 140, 163, 0.16)";
const AXIS_TICK = { fontSize: 12, fill: "#7B8CA3" };

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <div key={item.dataKey}>
          {item.name} : {item.dataKey === "averagePaceSecondsPerKm"
            ? formatPace(item.value)
            : `${Math.round(Number(item.value || 0))} bpm`}
        </div>
      ))}
    </div>
  );
}

export default function PerformanceTrendChart({ data = [], info = [] }) {
  const safeData = Array.isArray(data) ? data : [];
  const hasPace = safeData.some((entry) => Number(entry?.averagePaceSecondsPerKm) > 0);
  const hasHeartrate = safeData.some((entry) => Number(entry?.averageHeartrate) > 0);

  return (
    <section className="card chart-card">
      <div className="card-header-row">
        <div>
          <div className="title-with-info">
            <h2 className="card-title">Allure et FC dans le temps</h2>
            <InfoTooltip title="Allure et FC dans le temps" content={info} label="Afficher l'aide pour l'allure et la FC dans le temps" />
          </div>
          <p className="card-subtitle">Lecture simple de l'evolution hebdomadaire de l'allure moyenne et de la frequence cardiaque.</p>
        </div>
      </div>
      {safeData.length && (hasPace || hasHeartrate) ? (
        <div className="chart-box chart-box-large">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={safeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="period" minTickGap={18} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis
                yAxisId="pace"
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatPace(value)}
                domain={["dataMin - 20", "dataMax + 20"]}
              />
              <YAxis
                yAxisId="hr"
                orientation="right"
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                domain={["dataMin - 5", "dataMax + 5"]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {hasPace ? (
                <Line
                  yAxisId="pace"
                  type="monotone"
                  dataKey="averagePaceSecondsPerKm"
                  name="Allure moyenne"
                  stroke="#F97316"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: "#FB923C", stroke: "#F97316" }}
                />
              ) : null}
              {hasHeartrate ? (
                <Line
                  yAxisId="hr"
                  type="monotone"
                  dataKey="averageHeartrate"
                  name="FC moyenne"
                  stroke="#355886"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: "#355886", stroke: "#223A5E" }}
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state">Pas assez de donnees pour suivre l'allure ou la FC sur la periode.</div>
      )}
    </section>
  );
}
