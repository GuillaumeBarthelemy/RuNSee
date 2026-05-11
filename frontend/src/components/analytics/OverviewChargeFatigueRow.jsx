import { memo } from "react";
import { clampTone } from "../../utils/tonePicker.js";
import OverviewStateGauges from "./OverviewStateGauges.jsx";

/**
 * OverviewChargeFatigueRow — Section "CHARGE & FATIGUE" en bas Vue d'ensemble.
 *
 * Reprend visuellement les histogrammes CTL et ATL (synthèse cohérente avec
 * l'onglet Charges, décision utilisateur §4). Plus carte gauges État & Fatigue.
 *
 * Le visuel utilise des barres simples par semaine pour rester compact
 * (PDF page 7 montre des histogrammes hebdomadaires, pas la chronologie complète
 * de l'onglet Charges).
 */

function buildWeeklyHistogram(chartData = []) {
  // Regroupe par semaine (lundi → dimanche). Si granularity="weekly", déjà OK.
  // Sinon, prend 1 valeur par semaine ISO (dernier point de la semaine).
  if (!Array.isArray(chartData) || !chartData.length) return [];
  const byWeek = new Map();
  for (const p of chartData) {
    const date = p?.date instanceof Date ? p.date : new Date(p?.date);
    if (Number.isNaN(date.getTime())) continue;
    // ISO week key (lundi de la semaine)
    const day = date.getDay();
    const mondayOffset = (day + 6) % 7;
    const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - mondayOffset);
    const key = monday.toISOString().slice(0, 10);
    if (!byWeek.has(key)) byWeek.set(key, { date: monday, ctl: 0, atl: 0 });
    // Garder la dernière valeur de la semaine
    byWeek.set(key, { date: monday, ctl: Number(p?.ctl) || 0, atl: Number(p?.atl) || 0 });
  }
  return Array.from(byWeek.values())
    .sort((a, b) => a.date - b.date)
    .slice(-8); // 8 dernières semaines
}

function MiniHistogram({ data = [], dataKey = "ctl", color = "#1268f3", maxValue = null }) {
  if (!data.length) {
    return <p className="alpine-overview-focus-empty">Pas assez de données.</p>;
  }
  const values = data.map((d) => Number(d[dataKey]) || 0);
  const max = maxValue ?? Math.max(...values, 1) * 1.1;
  return (
    <div className="alpine-overview-mini-histo" aria-hidden="true">
      {data.map((d, idx) => {
        const v = Number(d[dataKey]) || 0;
        const h = Math.max(8, (v / max) * 100);
        const isLast = idx === data.length - 1;
        return (
          <div key={idx} className="alpine-overview-mini-histo-col">
            <span
              className={`alpine-overview-mini-histo-bar ${isLast ? "is-last" : ""}`.trim()}
              style={{ height: `${h}%`, background: color }}
            />
          </div>
        );
      })}
    </div>
  );
}

function OverviewChargeFatigueRow({
  trainingLoadModel = {},
  loadDynamicsProfile = {},
}) {
  const summary = trainingLoadModel?.summary || {};
  const chartData = Array.isArray(trainingLoadModel?.chartData) ? trainingLoadModel.chartData : [];
  const weekly = buildWeeklyHistogram(chartData);

  const ctlValue = Number.isFinite(summary.ctl) ? Math.round(summary.ctl) : null;
  const atlValue = Number.isFinite(summary.atl) ? Math.round(summary.atl) : null;
  const ctlTone = ctlValue == null ? 3 : ctlValue >= 50 ? 1 : ctlValue >= 25 ? 2 : 3;
  const atlTone = atlValue == null ? 3 : atlValue >= 60 ? 4 : atlValue >= 35 ? 3 : 2;

  return (
    <section className="alpine-overview-charge-row">
      <article className={`alpine-overview-mini-chart-card tone-${clampTone(ctlTone)}`}>
        <header>
          <span className="alpine-overview-mini-chart-kicker">Synthèse charges</span>
          <h3 className="alpine-overview-mini-chart-title">Condition (CTL)</h3>
        </header>
        <div className="alpine-overview-mini-chart-value-row">
          <strong className={`alpine-overview-mini-chart-value tone-${clampTone(ctlTone)}`}>
            {ctlValue ?? "—"}
          </strong>
          <span className="alpine-overview-mini-chart-unit">pts</span>
        </div>
        <MiniHistogram data={weekly} dataKey="ctl" color="var(--al-success, #35a853)" />
        <p className="alpine-overview-mini-chart-axis">8 dernières semaines</p>
      </article>

      <article className={`alpine-overview-mini-chart-card tone-${clampTone(atlTone)}`}>
        <header>
          <span className="alpine-overview-mini-chart-kicker">Synthèse charges</span>
          <h3 className="alpine-overview-mini-chart-title">Fatigue (ATL)</h3>
        </header>
        <div className="alpine-overview-mini-chart-value-row">
          <strong className={`alpine-overview-mini-chart-value tone-${clampTone(atlTone)}`}>
            {atlValue ?? "—"}
          </strong>
          <span className="alpine-overview-mini-chart-unit">pts</span>
        </div>
        <MiniHistogram data={weekly} dataKey="atl" color="var(--al-primary, #1268f3)" />
        <p className="alpine-overview-mini-chart-axis">8 dernières semaines</p>
      </article>

      <OverviewStateGauges
        atl={summary.atl}
        tsb={summary.tsb}
        acwr={loadDynamicsProfile?.acwrEwma?.value}
      />
    </section>
  );
}

export default memo(OverviewChargeFatigueRow);
