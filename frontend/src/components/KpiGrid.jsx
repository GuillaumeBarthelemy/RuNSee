function formatKm(value) {
  return `${Number(value || 0).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

function formatHours(value) {
  return `${Number(value || 0).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h`;
}

export default function KpiGrid({ kpis = {} }) {
  const safeKpis = kpis || {};
  const items = [
    { label: "Activités filtrées", value: safeKpis.totalActivities ?? 0, hint: "sur la sélection courante" },
    { label: "Distance totale", value: formatKm(safeKpis.totalDistance), hint: "tous sports confondus" },
    { label: "Temps de déplacement", value: formatHours(safeKpis.totalMovingTime), hint: "durée active cumulée" },
    { label: "Dénivelé positif", value: `${Math.round(safeKpis.totalElevationGain || 0).toLocaleString("fr-FR")} m`, hint: "sur la sélection courante" },
    { label: "FC moyenne", value: safeKpis.averageHeartrate ? `${Math.round(safeKpis.averageHeartrate)} bpm` : "-", hint: "sur les activités mesurées" },
  ];

  return (
    <section className="grid kpi-grid">
      {items.map((item) => (
        <div className="metric-card premium-metric" key={item.label}>
          <span className="metric-label">{item.label}</span>
          <div className="metric-value">{item.value}</div>
          <div className="metric-secondary">{item.hint}</div>
        </div>
      ))}
    </section>
  );
}
