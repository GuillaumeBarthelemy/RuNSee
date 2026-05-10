import { memo } from "react";

/**
 * ActivityPeriodKpis — Alpine Light (Lot 03, mockup PDF page 6).
 *
 * Bandeau 5 KPIs période :
 *  Sorties · Distance totale · Dénivelé+ · Temps total · FC moyenne
 *
 * Règle anti-régression :
 *  - Si valeur absente, afficher "—" (jamais 0 ni estimation).
 *  - Aucune normalisation ni "/100" sur métriques non bornées.
 *
 * Props : { kpis: { count, distanceMeters, hours, elevationMeters, avgHr } }
 */

function formatDistance(meters) {
  if (!Number.isFinite(meters) || meters <= 0) return "—";
  const km = meters / 1000;
  return km >= 100 ? `${Math.round(km)}` : km.toFixed(1);
}

function formatHours(hours) {
  if (!Number.isFinite(hours) || hours <= 0) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} min`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

function formatInt(value, suffix = "") {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return `${Math.round(value).toLocaleString("fr-FR")}${suffix}`;
}

function ActivityPeriodKpis({ kpis = {} }) {
  const { count = 0, distanceMeters = 0, hours = 0, elevationMeters = 0, avgHr = null } = kpis;
  return (
    <section className="alpine-activities-kpis" aria-label="Indicateurs période">
      <article className="alpine-activity-kpi">
        <span className="alpine-activity-kpi-label">Sorties</span>
        <strong className="alpine-activity-kpi-value">{count > 0 ? count : "—"}</strong>
      </article>
      <article className="alpine-activity-kpi">
        <span className="alpine-activity-kpi-label">Distance totale</span>
        <strong className="alpine-activity-kpi-value">{formatDistance(distanceMeters)}</strong>
        <span className="alpine-activity-kpi-unit">km</span>
      </article>
      <article className="alpine-activity-kpi">
        <span className="alpine-activity-kpi-label">Dénivelé+</span>
        <strong className="alpine-activity-kpi-value">{formatInt(elevationMeters)}</strong>
        <span className="alpine-activity-kpi-unit">m</span>
      </article>
      <article className="alpine-activity-kpi">
        <span className="alpine-activity-kpi-label">Temps total</span>
        <strong className="alpine-activity-kpi-value">{formatHours(hours)}</strong>
      </article>
      <article className="alpine-activity-kpi">
        <span className="alpine-activity-kpi-label">FC moyenne</span>
        <strong className="alpine-activity-kpi-value">{avgHr != null ? Math.round(avgHr) : "—"}</strong>
        <span className="alpine-activity-kpi-unit">bpm</span>
      </article>
    </section>
  );
}

export default memo(ActivityPeriodKpis);
