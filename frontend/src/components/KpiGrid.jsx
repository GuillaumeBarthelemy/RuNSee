function formatKm(meters) {
  return `${(Number(meters || 0) / 1000).toFixed(1)} km`;
}

function formatHours(seconds) {
  return `${(Number(seconds || 0) / 3600).toFixed(1)} h`;
}

export default function KpiGrid({ kpis }) {
  const items = [
    { label: "Activités filtrées", value: kpis.totalActivities ?? 0, hint: "sur la sélection courante" },
    { label: "Distance totale", value: formatKm(kpis.totalDistance), hint: "tous sports confondus" },
    { label: "Temps de déplacement", value: formatHours(kpis.totalMovingTime), hint: "durée active cumulée" },
    { label: "Dénivelé positif", value: `${Math.round(kpis.totalElevationGain || 0)} m`, hint: "sur la sélection courante" },
    { label: "FC moyenne", value: kpis.averageHeartrate ? `${Math.round(kpis.averageHeartrate)} bpm` : "-", hint: "sur les activités mesurées" },
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
