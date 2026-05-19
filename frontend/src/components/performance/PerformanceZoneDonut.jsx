import { memo } from "react";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";

const ZONE_COLORS = {
  z1: "#3b82f6",
  z2: "#22c55e",
  z3: "#6bb49b",
  z4: "#f59e0b",
  z5: "#ef4444",
};

function buildConicGradient(zones = []) {
  let cursor = 0;
  const segments = zones
    .filter((zone) => Number(zone?.share) > 0)
    .map((zone) => {
      const share = Math.max(0, Number(zone.share) || 0);
      const start = cursor;
      const end = cursor + share;
      cursor = end;
      const color = ZONE_COLORS[String(zone.key || "").toLowerCase()] || "#94a3b8";
      return `${color} ${start}% ${end}%`;
    });

  return segments.length ? `conic-gradient(${segments.join(", ")})` : "conic-gradient(#e5edf7 0% 100%)";
}

function PerformanceZoneDonut({ preview = {} }) {
  if (!preview?.hasData) {
    return (
      <section className="performance-panel performance-zone-donut-card">
        <h3>{preview.title || "Zones de fréquence cardiaque"}</h3>
        <PerformanceEmptyState message={preview.emptyReason} />
      </section>
    );
  }

  const zones = Array.isArray(preview.zones) ? preview.zones : [];

  return (
    <section className="performance-panel performance-zone-donut-card">
      <div className="performance-panel-head">
        <div>
          <span className="performance-panel-kicker">{preview.sourceLabel || "Zones FC"}</span>
          <h3>Zones de fréquence cardiaque</h3>
        </div>
        <strong>{Math.round(preview.easyShare || 0)} % facile</strong>
      </div>

      <div className="performance-zone-donut-layout">
        <div className="performance-zone-donut" style={{ "--zone-gradient": buildConicGradient(zones) }}>
          <div>
            <strong>{preview.totalDurationLabel || "-"}</strong>
            <span>Total</span>
          </div>
        </div>

        <div className="performance-zone-legend">
          {zones.map((zone) => (
            <div className="performance-zone-legend-row" key={zone.key}>
              <span
                className="performance-zone-dot"
                style={{ background: ZONE_COLORS[String(zone.key || "").toLowerCase()] || "#94a3b8" }}
              />
              <span>{zone.shortLabel || zone.label}</span>
              <small>{zone.label?.replace(zone.shortLabel || "", "").trim() || zone.rangeLabel || ""}</small>
              <b>{zone.durationLabel}</b>
              <strong>{Math.round(zone.share || 0)} %</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default memo(PerformanceZoneDonut);
