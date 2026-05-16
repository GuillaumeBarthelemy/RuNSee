import { memo } from "react";
import { clampTone } from "../../utils/tonePicker.js";
import OverviewRangeBar from "./OverviewRangeBar.jsx";

/**
 * OverviewChargeFatigueRow — Section "CHARGE & FATIGUE" Vue d'ensemble (Lot 04 v2).
 *
 * Layout PDF page 7 :
 *   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
 *   │ Charge UA      │  │ Fatigue UA     │  │ État actuel    │
 *   │ valeur grosse  │  │ valeur grosse  │  │ ATL + range bar│
 *   │ histo 7j       │  │ histo 7j       │  │ CTL + range bar│
 *   │ moyenne XX     │  │ moyenne XX     │  │ ATL/CTL ratio  │
 *   └────────────────┘  └────────────────┘  └────────────────┘
 *
 * Histogrammes : 7 derniers jours par jour, avec labels (Lun 25, Mar 26…),
 * valeurs au-dessus des barres et **ligne horizontale de moyenne**.
 *
 * Carte État actuel : ATL + CTL + ratio ATL/CTL "Fatigue relative" (décision §6).
 */

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function startOfDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

/**
 * Clé de date en heure LOCALE (pas UTC) pour éviter le décalage timezone
 * sur le matching chartData ↔ jours iterés.
 * Bug initial : toISOString().slice(0,10) renvoie la date UTC, ce qui crée
 * un offset d'un jour pour les utilisateurs en UTC+N le soir → histogrammes
 * Charge/Fatigue tous à zéro.
 */
function localDateKey(d) {
  if (!(d instanceof Date)) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Renvoie [{ date, label, ctl, atl, load }] pour les 7 derniers jours.
 * Matching dates en LOCAL — cf. localDateKey.
 */
function buildLastSevenDays(chartData = [], referenceEnd = new Date()) {
  if (!Array.isArray(chartData)) return [];
  const end = startOfDay(referenceEnd);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const target = new Date(end.getTime() - i * 24 * 60 * 60 * 1000);
    const dayKey = localDateKey(target);
    const point = chartData.find((p) => {
      const pd = p?.date instanceof Date ? p.date : null;
      return pd ? localDateKey(startOfDay(pd)) === dayKey : false;
    });
    days.push({
      date: target,
      label: `${DAY_LABELS[target.getDay()]} ${target.getDate()}`,
      ctl: Number(point?.ctl) || 0,
      atl: Number(point?.atl) || 0,
      load: Number(point?.load) || 0,
    });
  }
  return days;
}

function DailyHistogram({ data = [], dataKey = "load", color = "#1268f3", unit = "UA" }) {
  if (!data.length) {
    return <p className="alpine-overview-focus-empty">Pas assez de données.</p>;
  }
  const values = data.map((d) => Number(d[dataKey]) || 0);
  const max = Math.max(...values, 1) * 1.15;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const avgPct = (avg / max) * 100;

  return (
    <div className="alpine-overview-daily-histo">
      <div className="alpine-overview-daily-histo-graph" aria-hidden="true">
        <span
          className="alpine-overview-daily-histo-avg-line"
          style={{ bottom: `${avgPct}%` }}
        >
          <span className="alpine-overview-daily-histo-avg-line-label">
            {Math.round(avg)}
          </span>
        </span>
        {data.map((d, idx) => {
          const v = Number(d[dataKey]) || 0;
          const h = v <= 0 ? 4 : Math.max(10, (v / max) * 100);
          const isLast = idx === data.length - 1;
          const label = v > 0 ? Math.round(v) : "";
          return (
            <div key={idx} className="alpine-overview-daily-histo-col">
              {label !== "" ? (
                <span className="alpine-overview-daily-histo-value">{label}</span>
              ) : null}
              <span
                className={`alpine-overview-daily-histo-bar ${isLast ? "is-last" : ""}`.trim()}
                style={{ height: `${h}%`, background: color }}
              />
            </div>
          );
        })}
      </div>
      <div className="alpine-overview-daily-histo-labels" aria-hidden="true">
        {data.map((d, idx) => (
          <span key={idx}>{d.label}</span>
        ))}
      </div>
      <p className="alpine-overview-daily-histo-avg">
        Moyenne {Math.round(avg)} {unit}
      </p>
    </div>
  );
}

function StateRangeRow({ label, value, max, unit = "", tone = 3 }) {
  const safeTone = clampTone(tone);
  return (
    <div className="alpine-overview-state-row">
      <div className="alpine-overview-state-row-head">
        <span className="alpine-overview-state-row-label">{label}</span>
        <strong className={`alpine-overview-state-row-value tone-${safeTone}`}>
          {value != null && Number.isFinite(value) ? Math.round(value) : "—"}
          {unit ? ` ${unit}` : ""}
        </strong>
      </div>
      <OverviewRangeBar
        value={value}
        min={0}
        max={max}
        ticks={[]}
        gradient="warm"
        ariaLabel={label}
      />
    </div>
  );
}

function OverviewChargeFatigueRow({
  trainingLoadModel = {},
  referenceEnd = new Date(),
}) {
  const summary = trainingLoadModel?.summary || {};
  const chartData = Array.isArray(trainingLoadModel?.chartData) ? trainingLoadModel.chartData : [];
  const days = buildLastSevenDays(chartData, referenceEnd);

  // Valeur courante = dernière valeur disponible (jour le plus récent)
  const ctlValue = Number.isFinite(Number(summary.ctl))
    ? Math.round(Number(summary.ctl))
    : (days.length ? Math.round(days[days.length - 1].ctl) : null);
  const atlValue = Number.isFinite(Number(summary.atl))
    ? Math.round(Number(summary.atl))
    : (days.length ? Math.round(days[days.length - 1].atl) : null);

  // Ratio ATL/CTL "Fatigue relative" (mockup)
  const ratio = ctlValue && ctlValue > 0 ? atlValue / ctlValue : null;
  let ratioLabel = "—";
  let ratioTone = 3;
  if (Number.isFinite(ratio)) {
    if (ratio < 0.8)      { ratioLabel = "Fraîcheur"; ratioTone = 1; }
    else if (ratio < 1.0) { ratioLabel = "Équilibrée"; ratioTone = 2; }
    else if (ratio < 1.3) { ratioLabel = "Élevée"; ratioTone = 4; }
    else                  { ratioLabel = "Très élevée"; ratioTone = 5; }
  }

  const ctlTone = ctlValue == null ? 3 : ctlValue >= 50 ? 1 : ctlValue >= 25 ? 2 : 3;
  const atlTone = atlValue == null ? 3 : atlValue >= 60 ? 4 : atlValue >= 35 ? 3 : 2;

  return (
    <section className="alpine-overview-charge-row">
      {/* Charge d'entraînement (UA) */}
      <article className={`alpine-overview-mini-chart-card tone-${clampTone(ctlTone)}`}>
        <header>
          <span className="alpine-overview-mini-chart-kicker">Synthèse charge</span>
          <h3 className="alpine-overview-mini-chart-title">Charge d'entraînement (UA)</h3>
        </header>
        <p className="alpine-overview-mini-chart-period">7 derniers jours</p>
        <div className="alpine-overview-mini-chart-value-row">
          <strong className={`alpine-overview-mini-chart-value tone-${clampTone(ctlTone)}`}>
            {ctlValue ?? "—"}
          </strong>
          <span className="alpine-overview-mini-chart-unit">UA</span>
        </div>
        <DailyHistogram data={days} dataKey="load" color="var(--al-warning, #f59e0b)" unit="UA" />
      </article>

      {/* Fatigue (ATL) — histogramme ATL jour par jour */}
      <article className={`alpine-overview-mini-chart-card tone-${clampTone(atlTone)}`}>
        <header>
          <span className="alpine-overview-mini-chart-kicker">Synthèse fatigue</span>
          <h3 className="alpine-overview-mini-chart-title">Fatigue (ATL)</h3>
        </header>
        <p className="alpine-overview-mini-chart-period">7 derniers jours</p>
        <div className="alpine-overview-mini-chart-value-row">
          <strong className={`alpine-overview-mini-chart-value tone-${clampTone(atlTone)}`}>
            {atlValue ?? "—"}
          </strong>
          <span className="alpine-overview-mini-chart-unit">UA</span>
        </div>
        <DailyHistogram data={days} dataKey="atl" color="var(--al-warning, #f59e0b)" unit="UA" />
      </article>

      {/* État actuel — ATL + CTL + ratio */}
      <article className="alpine-overview-state-card">
        <header className="alpine-overview-state-head">
          <span className="alpine-overview-state-kicker">Synthèse</span>
          <h3 className="alpine-overview-state-title">État actuel</h3>
        </header>

        <StateRangeRow label="ATL (Fatigue)"   value={atlValue} max={150} tone={atlTone} />
        <StateRangeRow label="CTL (Condition)" value={ctlValue} max={150} tone={ctlTone} />

        <div className="alpine-overview-state-row alpine-overview-state-row--ratio">
          <div className="alpine-overview-state-row-head">
            <span className="alpine-overview-state-row-label">ATL/CTL</span>
            <strong className={`alpine-overview-state-row-value tone-${clampTone(ratioTone)}`}>
              {Number.isFinite(ratio) ? ratio.toFixed(2) : "—"}
            </strong>
          </div>
          <span className={`alpine-overview-state-row-hint tone-${clampTone(ratioTone)}`}>
            Fatigue relative · {ratioLabel}
          </span>
        </div>

        <p className="alpine-overview-state-note">
          Banister (ATL / CTL) — ratio &gt; 1 = charge récente supérieure à la base.
        </p>
      </article>
    </section>
  );
}

export default memo(OverviewChargeFatigueRow);
