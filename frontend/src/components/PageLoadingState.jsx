export default function PageLoadingState({ title = "Chargement", subtitle = "Preparation de la page..." }) {
  return (
    <div className="page-loading-shell" aria-live="polite" aria-busy="true">
      <div className="loading-card loading-header-card">
        <div className="loading-line loading-line-title" />
        <div className="loading-line loading-line-subtitle" />
      </div>

      <div className="loading-grid">
        <div className="loading-card loading-metric-card" />
        <div className="loading-card loading-metric-card" />
        <div className="loading-card loading-metric-card" />
      </div>

      <div className="loading-card loading-chart-card" />

      <span className="sr-only">{title}. {subtitle}</span>
    </div>
  );
}
