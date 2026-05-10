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

// Helpers de format renvoyant { value, unit } : l'unité n'est rendue que si
// la valeur est exploitable. Évite les rendus interdits "— km", "— bpm", "— m".

function formatDistance(meters) {
  if (!Number.isFinite(meters) || meters <= 0) return { value: "—", unit: "" };
  const km = meters / 1000;
  const value = km >= 100 ? `${Math.round(km)}` : km.toFixed(1);
  return { value, unit: "km" };
}

function formatHours(hours) {
  if (!Number.isFinite(hours) || hours <= 0) return { value: "—", unit: "" };
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return { value: `${m}`, unit: "min" };
  return { value: `${h}h${String(m).padStart(2, "0")}`, unit: "" };
}

function formatElevation(meters) {
  if (!Number.isFinite(meters) || meters <= 0) return { value: "—", unit: "" };
  return { value: Math.round(meters).toLocaleString("fr-FR"), unit: "m" };
}

function formatHr(bpm) {
  if (!Number.isFinite(bpm) || bpm <= 0) return { value: "—", unit: "" };
  return { value: `${Math.round(bpm)}`, unit: "bpm" };
}

function Kpi({ label, value, unit }) {
  return (
    <article className="alpine-activity-kpi">
      <span className="alpine-activity-kpi-label">{label}</span>
      <strong className="alpine-activity-kpi-value">{value}</strong>
      {unit ? <span className="alpine-activity-kpi-unit">{unit}</span> : null}
    </article>
  );
}

function ActivityPeriodKpis({ kpis = {} }) {
  const { count = 0, distanceMeters = 0, hours = 0, elevationMeters = 0, avgHr = null } = kpis;

  const distance = formatDistance(distanceMeters);
  const time = formatHours(hours);
  const elevation = formatElevation(elevationMeters);
  const heartrate = formatHr(avgHr);

  return (
    <section className="alpine-activities-kpis" aria-label="Indicateurs période">
      <Kpi label="Sorties"        value={count > 0 ? `${count}` : "—"} unit="" />
      <Kpi label="Distance totale" value={distance.value}              unit={distance.unit} />
      <Kpi label="Dénivelé +"      value={elevation.value}             unit={elevation.unit} />
      <Kpi label="Temps total"     value={time.value}                  unit={time.unit} />
      <Kpi label="FC moyenne"      value={heartrate.value}             unit={heartrate.unit} />
    </section>
  );
}

export default memo(ActivityPeriodKpis);
