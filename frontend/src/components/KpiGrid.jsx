import InfoTooltip from "./InfoTooltip.jsx";

function formatKm(value) {
  return `${Number(value || 0).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

function formatHours(value) {
  return `${Number(value || 0).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h`;
}

function buildDefaultItems(kpis = {}) {
  const safeKpis = kpis || {};

  return [
    { label: "Activites filtrees", value: safeKpis.totalActivities ?? 0, hint: "sur la selection courante" },
    { label: "Distance totale", value: formatKm(safeKpis.totalDistance), hint: "tous sports confondus" },
    { label: "Temps de deplacement", value: formatHours(safeKpis.totalMovingTime), hint: "duree active cumulee" },
    { label: "Denivele positif", value: `${Math.round(safeKpis.totalElevationGain || 0).toLocaleString("fr-FR")} m`, hint: "sur la selection courante" },
    { label: "FC moyenne", value: safeKpis.averageHeartrate ? `${Math.round(safeKpis.averageHeartrate)} bpm` : "-", hint: "sur les activites mesurees" },
  ];
}

export default function KpiGrid({ kpis = {}, items = null, className = "kpi-grid" }) {
  const safeItems = Array.isArray(items) && items.length ? items : buildDefaultItems(kpis);

  return (
    <section className={`grid ${className}`.trim()}>
      {safeItems.map((item) => (
        <div
          className={`metric-card premium-metric ${item.compact ? "compact-metric" : ""}`.trim()}
          key={item.label}
        >
          <div className="metric-label-row">
            <span className="metric-label">{item.label}</span>
            {item.info ? (
              <InfoTooltip
                title={item.label}
                content={item.info}
                label={`Afficher l'aide pour ${item.label}`}
              />
            ) : null}
          </div>
          <div className={`metric-value ${item.valueClassName || ""}`.trim()}>{item.value}</div>
          {item.trend ? (
            <div className={`metric-trend ${item.trendTone ? `metric-trend-${item.trendTone}` : ""}`.trim()}>
              {item.trend}
            </div>
          ) : null}
          {item.hint ? <div className="metric-secondary">{item.hint}</div> : null}
        </div>
      ))}
    </section>
  );
}
