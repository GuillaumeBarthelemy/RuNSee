function formatKm(value) {
  return `${Number(value || 0).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

function formatHours(value) {
  return `${Number(value || 0).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h`;
}

export default function KpiGrid({ kpis }) {
  const items = [
    { label: 'Activités filtrées', value: kpis.totalActivities ?? 0, hint: 'sur la sélection courante' },
    { label: 'Distance totale', value: formatKm(kpis.totalDistance), hint: 'tous sports confondus' },
    { label: 'Temps de déplacement', value: formatHours(kpis.totalMovingTime), hint: 'durée active cumulée' },
    { label: 'Dénivelé positif', value: `${Math.round(kpis.totalElevationGain || 0).toLocaleString('fr-FR')} m`, hint: 'sur la sélection courante' },
    { label: 'FC moyenne', value: kpis.averageHeartrate ? `${Math.round(kpis.averageHeartrate)} bpm` : '-', hint: 'sur les activités mesurées' },
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
