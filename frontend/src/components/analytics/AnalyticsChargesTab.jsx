import { memo, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import OverviewIndicatorCard from "./OverviewIndicatorCard.jsx";
import OverviewRangeBar from "./OverviewRangeBar.jsx";
import { clampTone } from "../../utils/tonePicker.js";
import { buildFourWeeksBackComparison } from "../../utils/analyticsFocus.js";

/**
 * AnalyticsChargesTab — Onglet "Charges" (Lot 04 V5, PDF page 8).
 *
 * Structure mockup :
 *   - 5 KPI cards (Charge 7j, CTL, ATL, TSB, Charge moy/séance)
 *   - Graphique évolution 3 séries (ATL/CTL/TSB) avec sélecteur période local
 *   - Histogramme charge hebdo 6 sem avec moyenne
 *   - Right rail : 3 takeaways + seuils recommandés + état actuel
 *   - Footer : sources scientifiques consolidées
 *
 * Décisions utilisateur (2026-05) :
 *   §1 Zone TSB sobre — pas de band horizontal sur le chart
 *   §2 Sélecteur période = état local (indépendant période globale)
 *   §3 Sources consolidées en bas (1 paragraphe)
 *
 * Seuils alignés littérature :
 *   - CTL 60-100 UA (Allen & Coggan 2010 p.247)
 *   - TSB -20/+10 UA productif (Mujika 2017, Friel 2009)
 *   - Ratio ATL/CTL > 1.3 surcharge (Gabbett 2016)
 *   - Charge 7j buckets Foster 2001 / Coggan 2003
 */

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS = [
  { id: "6w", label: "6 sem.", days: 42 },
  { id: "3m", label: "3 mois", days: 90 },
  { id: "6m", label: "6 mois", days: 180 },
  { id: "1y", label: "1 an",   days: 365 },
];

// Couleurs séries mockup PDF page 8
const SERIES_COLOR_ATL = "#2563EB";   // bleu — Fatigue
const SERIES_COLOR_CTL = "#16A34A";   // vert — Charge chronique
const SERIES_COLOR_TSB = "#F59E0B";   // orange — Équilibre

// Histogramme — référentiel CSS (cf. fix Vue d'ensemble)
const HISTO_GRAPH_HEIGHT_PX = 130;
const HISTO_GRAPH_PADDING_TOP_PX = 18;
const HISTO_BAR_AREA_RATIO = (HISTO_GRAPH_HEIGHT_PX - HISTO_GRAPH_PADDING_TOP_PX)
  / HISTO_GRAPH_HEIGHT_PX;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatDateShort(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatWeekLabel(start, end) {
  if (!(start instanceof Date) || !(end instanceof Date)) return "";
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} ${start.toLocaleDateString("fr-FR", { month: "short" })}`;
  }
  return `${start.getDate()} ${start.toLocaleDateString("fr-FR", { month: "short" })}–${end.getDate()} ${end.toLocaleDateString("fr-FR", { month: "short" })}`;
}

function classifyCharge7d(v) {
  if (v >= 900) return { tone: 5, hint: "Très élevée" };
  if (v >= 600) return { tone: 4, hint: "Élevée" };
  if (v >= 300) return { tone: 2, hint: "Standard" };
  return            { tone: 3, hint: "Légère" };
}

function classifyCtl(v) {
  if (v >= 100) return { tone: 2, hint: "Solide" };
  if (v >= 60)  return { tone: 1, hint: "Modérée" };
  if (v >= 30)  return { tone: 3, hint: "Basse" };
  return            { tone: 4, hint: "Très basse" };
}

function classifyAtl(ratio) {
  if (!Number.isFinite(ratio)) return { tone: 3, hint: "—" };
  if (ratio < 0.8) return { tone: 1, hint: "Fraîche" };
  if (ratio < 1.0) return { tone: 2, hint: "Équilibrée" };
  if (ratio < 1.3) return { tone: 4, hint: "Élevée" };
  return                 { tone: 5, hint: "Surcharge" };
}

function classifyTsb(v) {
  if (v >= 25)  return { tone: 1, hint: "Fraîcheur taper" };
  if (v >= 5)   return { tone: 2, hint: "Race ready" };
  if (v >= -10) return { tone: 2, hint: "Productif" };
  if (v >= -30) return { tone: 4, hint: "Fatigue" };
  return                { tone: 5, hint: "Surcharge" };
}

function classifySessionLoad(v) {
  if (v >= 130) return { tone: 4, hint: "Très élevée" };
  if (v >= 80)  return { tone: 3, hint: "Soutenue" };
  if (v >= 40)  return { tone: 2, hint: "Standard" };
  return            { tone: 1, hint: "Légère" };
}

function buildWeeklyCharges(chartData = [], endDate = new Date(), nWeeks = 6) {
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  const weeks = [];
  for (let i = nWeeks - 1; i >= 0; i--) {
    const wEnd = new Date(end.getTime() - i * 7 * 86400000);
    const wStart = new Date(wEnd.getTime() - 6 * 86400000);
    wStart.setHours(0, 0, 0, 0);
    let total = 0;
    for (const p of chartData) {
      const d = p?.date instanceof Date ? p.date : null;
      if (!d) continue;
      if (d >= wStart && d <= wEnd) {
        total += safeNumber(p.load);
      }
    }
    weeks.push({
      start: wStart,
      end: wEnd,
      label: formatWeekLabel(wStart, wEnd),
      load: Math.round(total),
    });
  }
  return weeks;
}

// ---------------------------------------------------------------------------
// Sub-component : Évolution chart (3 séries + sélecteur local)
// ---------------------------------------------------------------------------

function ChargesEvolutionChart({ chartData = [], currentEnd }) {
  const [periodId, setPeriodId] = useState("6w");
  const period = PERIOD_OPTIONS.find((p) => p.id === periodId) || PERIOD_OPTIONS[0];

  const filtered = useMemo(() => {
    const end = currentEnd instanceof Date ? new Date(currentEnd) : new Date();
    const start = new Date(end.getTime() - period.days * 86400000);
    return chartData
      .filter((p) => p?.date instanceof Date && p.date >= start && p.date <= end)
      .map((p) => ({
        date: p.date,
        dateLabel: formatDateShort(p.date),
        ctl: Math.round(safeNumber(p.ctl)),
        atl: Math.round(safeNumber(p.atl)),
        tsb: Math.round(safeNumber(p.tsb)),
      }));
  }, [chartData, currentEnd, period.days]);

  const lastPoint = filtered.length ? filtered[filtered.length - 1] : null;

  return (
    <section className="alpine-charges-chart-card">
      <header className="alpine-charges-chart-head">
        <h3 className="alpine-charges-chart-title">Évolution de la charge et de la fatigue</h3>
        <div className="alpine-charges-period-toggle" role="tablist" aria-label="Période">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={periodId === opt.id}
              className={`alpine-charges-period-pill ${periodId === opt.id ? "is-active" : ""}`}
              onClick={() => setPeriodId(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      <ul className="alpine-charges-chart-legend" aria-hidden="true">
        <li>
          <span className="alpine-charges-legend-dot" style={{ background: SERIES_COLOR_ATL }} />
          <span className="alpine-charges-legend-label">Fatigue (ATL)</span>
          {lastPoint ? <span className="alpine-charges-legend-value">{lastPoint.atl} UA</span> : null}
        </li>
        <li>
          <span className="alpine-charges-legend-dot" style={{ background: SERIES_COLOR_CTL }} />
          <span className="alpine-charges-legend-label">Charge chronique (CTL)</span>
          {lastPoint ? <span className="alpine-charges-legend-value">{lastPoint.ctl} UA</span> : null}
        </li>
        <li>
          <span className="alpine-charges-legend-dot" style={{ background: SERIES_COLOR_TSB }} />
          <span className="alpine-charges-legend-label">TSB (équilibre)</span>
          {lastPoint ? <span className="alpine-charges-legend-value">{lastPoint.tsb} UA</span> : null}
        </li>
      </ul>

      <div className="alpine-charges-chart-body">
        {filtered.length === 0 ? (
          <p className="alpine-overview-focus-empty">Pas de données sur la période sélectionnée.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filtered} margin={{ top: 8, right: 24, left: 4, bottom: 4 }}>
              <CartesianGrid stroke="rgba(123,140,163,0.16)" />
              <XAxis
                dataKey="dateLabel"
                stroke="#64748b"
                fontSize={11}
                interval="preserveStartEnd"
                minTickGap={32}
              />
              <YAxis
                yAxisId="left"
                stroke="#64748b"
                fontSize={11}
                label={{ value: "UA", angle: 0, position: "insideTopLeft", offset: -8, fill: "#64748b", fontSize: 11 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#64748b"
                fontSize={11}
                domain={[-40, 40]}
                label={{ value: "TSB", angle: 0, position: "insideTopRight", offset: -8, fill: "#64748b", fontSize: 11 }}
              />
              <Tooltip
                formatter={(v, name) => [`${Math.round(v)} UA`, name]}
                contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1" }}
              />
              <Legend wrapperStyle={{ display: "none" }} />
              <Line yAxisId="left"  type="monotone" dataKey="atl" name="Fatigue (ATL)" stroke={SERIES_COLOR_ATL} strokeWidth={2} dot={{ r: 2.5 }} />
              <Line yAxisId="left"  type="monotone" dataKey="ctl" name="Charge chronique (CTL)" stroke={SERIES_COLOR_CTL} strokeWidth={2} dot={{ r: 2.5 }} />
              <Line yAxisId="right" type="monotone" dataKey="tsb" name="TSB" stroke={SERIES_COLOR_TSB} strokeWidth={2} dot={{ r: 2.5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-component : Histogramme charge hebdo 6 sem
// ---------------------------------------------------------------------------

function ChargesWeeklyHistogram({ weeks = [] }) {
  if (!weeks.length) {
    return (
      <section className="alpine-charges-weekly-card">
        <h3 className="alpine-charges-weekly-title">Charge hebdomadaire (UA)</h3>
        <p className="alpine-overview-focus-empty">Pas assez de données.</p>
      </section>
    );
  }
  const values = weeks.map((w) => w.load);
  const max = Math.max(...values, 1) * 1.15;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const avgPct = (avg / max) * 100 * HISTO_BAR_AREA_RATIO;

  return (
    <section className="alpine-charges-weekly-card">
      <header className="alpine-charges-weekly-head">
        <h3 className="alpine-charges-weekly-title">Charge hebdomadaire (UA)</h3>
        <span className="alpine-charges-weekly-avg-pill">Moyenne 6 sem. {Math.round(avg)} UA</span>
      </header>

      <div className="alpine-charges-weekly-graph" aria-hidden="true">
        <span className="alpine-charges-weekly-avg-line" style={{ bottom: `${avgPct}%` }}>
          <span className="alpine-charges-weekly-avg-line-label">{Math.round(avg)}</span>
        </span>
        {weeks.map((w, idx) => {
          const h = w.load <= 0 ? 4 : Math.max(10, (w.load / max) * 100);
          const isLast = idx === weeks.length - 1;
          return (
            <div key={idx} className="alpine-charges-weekly-col">
              {w.load > 0 ? <span className="alpine-charges-weekly-value">{w.load}</span> : null}
              <span
                className={`alpine-charges-weekly-bar ${isLast ? "is-last" : ""}`.trim()}
                style={{ height: `${h}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="alpine-charges-weekly-labels" aria-hidden="true">
        {weeks.map((w, idx) => (
          <span key={idx}>{w.label}</span>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-component : Right rail
// ---------------------------------------------------------------------------

function ChargesRightRail({ chargeDeltaPct, ctl, atl, tsb, atlOverCtl }) {
  const tsbCls = classifyTsb(tsb);
  const ctlCls = classifyCtl(ctl);
  const atlCls = classifyAtl(atlOverCtl);

  const bullets = [];
  if (Number.isFinite(atlOverCtl)) {
    if (atlOverCtl >= 1.3) {
      bullets.push({ key: "atl", tone: 5, title: "Fatigue très élevée",
        body: `Ton ATL est ${Math.round((atlOverCtl - 1) * 100)} % au-dessus de ton CTL. Privilégie la récupération active.` });
    } else if (atlOverCtl >= 1.0) {
      bullets.push({ key: "atl", tone: 4, title: "Fatigue élevée",
        body: `Ton ATL est au-dessus de ton CTL. Surveille la récupération active.` });
    } else {
      bullets.push({ key: "atl", tone: 2, title: "Fatigue maîtrisée",
        body: `Ton ATL reste sous ton CTL. Bonne capacité d'absorption.` });
    }
  }
  if (Number.isFinite(tsb)) {
    if (tsb < -20) {
      bullets.push({ key: "tsb", tone: 5, title: "Équilibre négatif",
        body: `TSB à ${Math.round(tsb)} UA — état de fatigue. Vise entre -20 et +10 UA pour performer.` });
    } else if (tsb > 10) {
      bullets.push({ key: "tsb", tone: 1, title: "Équilibre positif",
        body: `TSB à ${Math.round(tsb)} UA — tu es frais. Idéal en approche de compétition.` });
    } else {
      bullets.push({ key: "tsb", tone: 2, title: "Équilibre productif",
        body: `TSB à ${Math.round(tsb)} UA — fenêtre d'entraînement optimale.` });
    }
  }
  if (Number.isFinite(chargeDeltaPct)) {
    if (chargeDeltaPct > 0 && chargeDeltaPct <= 15) {
      bullets.push({ key: "ctl", tone: 1, title: "Progression maîtrisée",
        body: `Charge à +${chargeDeltaPct} % vs 4 sem. précédentes. Continue à construire régulièrement.` });
    } else if (chargeDeltaPct > 15) {
      bullets.push({ key: "ctl", tone: 4, title: "Progression rapide",
        body: `+${chargeDeltaPct} % de charge. La fenêtre +5 / +10 % limite le risque de blessure (Gabbett).` });
    } else {
      bullets.push({ key: "ctl", tone: 3, title: "Charge stable",
        body: `Variation ${chargeDeltaPct} % vs 4 sem. précédentes — base maintenue.` });
    }
  }

  return (
    <aside className="alpine-charges-rail">
      <h3 className="alpine-charges-rail-title">À retenir</h3>
      <ul className="alpine-charges-rail-bullets">
        {bullets.map((b) => (
          <li key={b.key} className={`alpine-charges-rail-bullet tone-${clampTone(b.tone)}`}>
            <span className="alpine-charges-rail-bullet-title">{b.title}</span>
            <span className="alpine-charges-rail-bullet-body">{b.body}</span>
          </li>
        ))}
      </ul>

      <section className="alpine-charges-rail-thresholds">
        <h4 className="alpine-charges-rail-subtitle">Seuils recommandés</h4>
        <dl className="alpine-charges-rail-thresholds-list">
          <div><dt>CTL</dt><dd>60 – 100 UA</dd></div>
          <div><dt>ATL</dt><dd>60 – 100 UA</dd></div>
          <div><dt>TSB</dt><dd>-20 à +10 UA</dd></div>
        </dl>
      </section>

      <section className="alpine-charges-rail-state">
        <h4 className="alpine-charges-rail-subtitle">État actuel</h4>
        <div className="alpine-charges-rail-state-row">
          <div className="alpine-charges-rail-state-head">
            <span>Charge (CTL)</span>
            <strong className={`tone-${clampTone(ctlCls.tone)}`}>{Number.isFinite(ctl) ? Math.round(ctl) : "—"} <small>/100 UA</small></strong>
          </div>
          <OverviewRangeBar value={ctl} min={0} max={150} ticks={[]} gradient="cool" ariaLabel="CTL" />
        </div>
        <div className="alpine-charges-rail-state-row">
          <div className="alpine-charges-rail-state-head">
            <span>Fatigue (ATL)</span>
            <strong className={`tone-${clampTone(atlCls.tone)}`}>{Number.isFinite(atl) ? Math.round(atl) : "—"} <small>/100 UA</small></strong>
          </div>
          <OverviewRangeBar value={atl} min={0} max={150} ticks={[]} gradient="warm" ariaLabel="ATL" />
        </div>
        <div className="alpine-charges-rail-state-row">
          <div className="alpine-charges-rail-state-head">
            <span>Équilibre (TSB)</span>
            <strong className={`tone-${clampTone(tsbCls.tone)}`}>{Number.isFinite(tsb) ? Math.round(tsb) : "—"} <small>/100 UA</small></strong>
          </div>
          <OverviewRangeBar value={tsb} min={-60} max={60} ticks={[]} gradient="polar" ariaLabel="TSB" />
        </div>
      </section>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function AnalyticsChargesTab({
  trainingLoadModel = {},
  weeklySummary = {},
  sharedRangeEnd = new Date(),
}) {
  const summary = trainingLoadModel?.summary || {};
  const chartData = useMemo(
    () => (Array.isArray(trainingLoadModel?.chartData) ? trainingLoadModel.chartData : []),
    [trainingLoadModel?.chartData],
  );

  const last7Points = chartData.slice(-7);
  const charge7d = last7Points.reduce((s, p) => s + safeNumber(p?.load), 0);
  const sessions7d = last7Points.reduce((s, p) => s + (safeNumber(p?.load) > 0 ? 1 : 0), 0);
  const sessionLoadAvg = sessions7d > 0 ? charge7d / sessions7d : 0;

  const ctl = Number.isFinite(Number(summary.ctl)) ? Math.round(Number(summary.ctl))
    : (last7Points.length ? Math.round(safeNumber(last7Points[last7Points.length - 1].ctl)) : 0);
  const atl = Number.isFinite(Number(summary.atl)) ? Math.round(Number(summary.atl))
    : (last7Points.length ? Math.round(safeNumber(last7Points[last7Points.length - 1].atl)) : 0);
  const tsb = Number.isFinite(Number(summary.tsb)) ? Math.round(Number(summary.tsb)) : Math.round(ctl - atl);
  const atlOverCtl = ctl > 0 ? atl / ctl : null;

  const fourWeeksBack = useMemo(
    () => buildFourWeeksBackComparison({
      chartData,
      weeklySeries: weeklySummary?.weeklySeries || [],
      currentEnd: sharedRangeEnd,
    }),
    [chartData, weeklySummary?.weeklySeries, sharedRangeEnd],
  );

  const chargeDeltaPct = fourWeeksBack.chargeRef > 0
    ? Math.round(((charge7d - fourWeeksBack.chargeRef) / fourWeeksBack.chargeRef) * 100)
    : null;
  const chargeDeltaText = chargeDeltaPct != null
    ? `${chargeDeltaPct > 0 ? "+" : ""}${chargeDeltaPct} % vs ${fourWeeksBack.rangeLabel}`
    : "";
  const atlDelta = fourWeeksBack.atlRef > 0 ? atl - fourWeeksBack.atlRef : null;
  const atlDeltaText = atlDelta != null && Math.abs(atlDelta) > 0
    ? `${atlDelta > 0 ? "+" : ""}${Math.round(atlDelta)} vs ${fourWeeksBack.rangeLabel}`
    : "";
  const ctlDelta = fourWeeksBack.ctlRef > 0 ? ctl - fourWeeksBack.ctlRef : null;
  const ctlDeltaPct = ctlDelta != null && fourWeeksBack.ctlRef > 0
    ? Math.round((ctlDelta / fourWeeksBack.ctlRef) * 100)
    : null;
  const ctlDeltaText = ctlDeltaPct != null
    ? `${ctlDeltaPct > 0 ? "+" : ""}${ctlDeltaPct} % vs ${fourWeeksBack.rangeLabel}`
    : "";
  const tsbDelta = fourWeeksBack.tsbRef != null ? tsb - fourWeeksBack.tsbRef : null;
  const tsbDeltaText = tsbDelta != null && Math.abs(tsbDelta) > 0
    ? `${tsbDelta > 0 ? "+" : ""}${Math.round(tsbDelta)} vs ${fourWeeksBack.rangeLabel}`
    : "";

  const charge7dCls = classifyCharge7d(charge7d);
  const ctlCls = classifyCtl(ctl);
  const atlCls = classifyAtl(atlOverCtl);
  const tsbCls = classifyTsb(tsb);
  const sessionCls = classifySessionLoad(sessionLoadAvg);

  const weeks = useMemo(
    () => buildWeeklyCharges(chartData, sharedRangeEnd, 6),
    [chartData, sharedRangeEnd],
  );

  return (
    <div className="alpine-analytics-tab alpine-analytics-tab--charges alpine-charges-grid">
      <div className="alpine-charges-main">
        <section className="alpine-charges-kpi-row">
          <OverviewIndicatorCard
            label="Charge d'entraînement (7 j)"
            value={Math.round(charge7d)}
            unit="UA"
            hint={charge7dCls.hint}
            delta={chargeDeltaText}
            tone={charge7dCls.tone}
            rangeBar={{
              value: charge7d, min: 0, max: 900,
              ticks: [
                { value: 0, label: "0" },
                { value: 300, label: "300" },
                { value: 600, label: "600" },
                { value: 900, label: "900" },
              ],
              gradient: "warm",
            }}
          />
          <OverviewIndicatorCard
            label="Charge chronique (CTL)"
            value={ctl} unit="UA" hint={ctlCls.hint} delta={ctlDeltaText} tone={ctlCls.tone}
            rangeBar={{
              value: ctl, min: 0, max: 150,
              ticks: [
                { value: 0, label: "0" },
                { value: 50, label: "50" },
                { value: 100, label: "100" },
                { value: 150, label: "150" },
              ],
              gradient: "cool",
            }}
          />
          <OverviewIndicatorCard
            label="Fatigue (ATL)"
            value={atl} unit="UA" hint={atlCls.hint} delta={atlDeltaText} tone={atlCls.tone}
            rangeBar={{
              value: atl, min: 0, max: 150,
              ticks: [
                { value: 0, label: "0" },
                { value: 50, label: "50" },
                { value: 100, label: "100" },
                { value: 150, label: "150" },
              ],
              gradient: "warm",
            }}
          />
          <OverviewIndicatorCard
            label="Équilibre charge/fatigue (TSB)"
            value={tsb} unit="UA" hint={tsbCls.hint} delta={tsbDeltaText} tone={tsbCls.tone}
            rangeBar={{
              value: tsb, min: -60, max: 60,
              ticks: [
                { value: -60, label: "-60" },
                { value: -20, label: "-20" },
                { value: 0, label: "0" },
                { value: 20, label: "+20" },
                { value: 60, label: "+60" },
              ],
              gradient: "polar",
            }}
          />
          <OverviewIndicatorCard
            label="Charge moyenne par séance"
            value={Math.round(sessionLoadAvg)} unit="UA" hint={sessionCls.hint} delta="" tone={sessionCls.tone}
            rangeBar={{
              value: sessionLoadAvg, min: 0, max: 150,
              ticks: [
                { value: 0, label: "0" },
                { value: 50, label: "50" },
                { value: 100, label: "100" },
                { value: 150, label: "150" },
              ],
              gradient: "warm",
            }}
          />
        </section>

        <ChargesEvolutionChart chartData={chartData} currentEnd={sharedRangeEnd} />

        <ChargesWeeklyHistogram weeks={weeks} />

        <p className="alpine-charges-sources">
          Sources : <i>Banister EW (1991)</i> — modèle CTL/ATL/TSB ·{" "}
          <i>Allen H, Coggan AR (2010)</i> <i>Training and Racing with a Power Meter</i> 2ᵉ éd.
          — seuils CTL/TSB · <i>Mujika I (2017)</i> — affûtage et TSB ·{" "}
          <i>Friel J (2009)</i> <i>The Triathlete&apos;s Training Bible</i> ·{" "}
          <i>Gabbett TJ (2016)</i> <i>Br J Sports Med</i> 50(5) — ratio ATL/CTL et
          risque de blessure · <i>Foster C (2001)</i> — session-RPE comme charge.
        </p>
      </div>

      <ChargesRightRail
        chargeDeltaPct={chargeDeltaPct}
        ctl={ctl}
        atl={atl}
        tsb={tsb}
        atlOverCtl={atlOverCtl}
      />
    </div>
  );
}

export default memo(AnalyticsChargesTab);
