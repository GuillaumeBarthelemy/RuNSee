import { memo, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import TrendsRegularityHeatmap from "./TrendsRegularityHeatmap.jsx";
import AlpineSelect from "../visuals/alpine/AlpineSelect.jsx";
import RecoveryKpiCard from "../visuals/alpine/RecoveryKpiCard.jsx";
import {
  buildMonthlyTrendsMatrix,
  buildPeriodComparison,
  buildRegularityStats,
  buildHeatmapMatrix,
} from "../../utils/analyticsTrends.js";

/**
 * AnalyticsTrendsTab — Onglet "Tendances" (Lot 04 V5, PDF page 9).
 *
 * Sections :
 *   1. 4 KPI cards avec sparkline (Volume / Fréquence / Dénivelé / Régularité)
 *   2. Right rail "À retenir" + CTA "Voir l'analyse complète"
 *   3. Progression du volume (line chart 6/12 mois)
 *   4. Comparaison mensuelle (grouped bar chart 12 mois × 2 ans)
 *   5. Régularité & constance (heatmap + stats)
 *   6. Comparaison de périodes (4 sub-cards current vs previous)
 *   7. Sources consolidées en bas
 *
 * Décisions utilisateur (2026-05) :
 *  - Période précédente = même durée immédiatement avant (auto)
 *  - Sélecteurs internes en état local
 *  - Sources consolidées au footer
 */

const PRIMARY = "#1268f3";
const PRIMARY_SOFT = "#bfdbfe";

const RANGE_OPTIONS = [
  { id: "6m",  label: "6 derniers mois",  months: 6 },
  { id: "12m", label: "12 derniers mois", months: 12 },
];

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatDeltaPct(n) {
  if (n == null || !Number.isFinite(n)) return "";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n} %`;
}

function formatDeltaAbs(n, unit = "") {
  if (n == null || !Number.isFinite(n) || n === 0) return "";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}${unit ? " " + unit : ""}`;
}

function formatHours(h) {
  if (!Number.isFinite(h) || h <= 0) return "0h 00";
  const hours = Math.floor(h);
  const m = Math.round((h - hours) * 60);
  return `${hours}h ${String(m).padStart(2, "0")}`;
}

function formatHoursDelta(h) {
  if (!Number.isFinite(h) || h === 0) return "";
  const sign = h > 0 ? "+" : "-";
  const abs = Math.abs(h);
  const hours = Math.floor(abs);
  const m = Math.round((abs - hours) * 60);
  return hours === 0 ? `${sign}${m} min` : `${sign}${hours}h ${String(m).padStart(2, "0")}`;
}

function previousMonthLabel(periodEnd) {
  const d = periodEnd instanceof Date ? new Date(periodEnd) : new Date();
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return prev.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
}

// Note : sparklines et bars inline retirés. La rangée KPI utilise désormais
// RecoveryKpiCard (visuals/alpine), aligné avec la page Accueil — layout
// header + valeur à gauche + line chart gradient à droite.

// ---------------------------------------------------------------------------
// 1. KPI Row
// ---------------------------------------------------------------------------

// Icônes inline 24×24 (cohérence avec DashboardPage)
function KpiIconRoute() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 4v4l6 8v4M18 4v6l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function KpiIconCalendar() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}
function KpiIconMountain() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 19l5-10 4 7 3-5 6 8H3z" fill="currentColor" /></svg>;
}
function KpiIconSpark() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3z" fill="currentColor" /></svg>;
}

function TrendsKpiRow({
  monthlyMatrix = [],
  sharedRangeEnd,
  weeklyFrequencySeries = [],
  regularityMonthlySeries = [],
  regularityDailySpark = [],
}) {
  const last = monthlyMatrix[monthlyMatrix.length - 1] || {};
  const prev = monthlyMatrix[monthlyMatrix.length - 2] || {};

  const distanceDeltaPct = prev.distanceKm > 0
    ? Math.round(((last.distanceKm - prev.distanceKm) / prev.distanceKm) * 100)
    : null;
  const elevationDeltaPct = prev.elevationGain > 0
    ? Math.round(((last.elevationGain - prev.elevationGain) / prev.elevationGain) * 100)
    : null;

  const lastMonthWeeks = 4.345;
  const lastFreq = Math.round((safeNum(last.runs) / lastMonthWeeks) * 10) / 10;
  const prevFreq = Math.round((safeNum(prev.runs) / lastMonthWeeks) * 10) / 10;
  const freqDelta = Math.round((lastFreq - prevFreq) * 10) / 10;

  const lastReg = regularityMonthlySeries.length ? regularityMonthlySeries[regularityMonthlySeries.length - 1] : 0;
  const prevReg = regularityMonthlySeries.length > 1 ? regularityMonthlySeries[regularityMonthlySeries.length - 2] : 0;
  const regDeltaPts = lastReg - prevReg;

  const prevLabel = previousMonthLabel(sharedRangeEnd);

  const distanceSpark = monthlyMatrix.map((m) => m.distanceKm);
  const elevationSpark = monthlyMatrix.map((m) => m.elevationGain);

  // Tone par direction : vert si hausse claire, ambre si baisse claire, neutre sinon.
  // → tone affecte la couleur du chart + icône + valeur (cohérence visuelle).
  function toneOfDeltaPct(p) {
    if (!Number.isFinite(p)) return 3;
    if (p >= 10) return 1;
    if (p <= -10) return 4;
    return 3;
  }

  return (
    <section className="alpine-trends-kpi-row">
      <RecoveryKpiCard
        icon={<KpiIconRoute />}
        label="Volume mensuel"
        value={Math.round(safeNum(last.distanceKm) * 10) / 10 || "—"}
        unit=" km"
        delta={distanceDeltaPct != null
          ? `${distanceDeltaPct > 0 ? "+" : ""}${distanceDeltaPct} % vs ${prevLabel}`
          : ""}
        tone={toneOfDeltaPct(distanceDeltaPct)}
        chartData={distanceSpark}
        chartType="line"
      />
      <RecoveryKpiCard
        icon={<KpiIconCalendar />}
        label="Fréquence hebdomadaire"
        value={lastFreq || "—"}
        unit=" sorties"
        delta={Number.isFinite(freqDelta) && freqDelta !== 0
          ? `${freqDelta > 0 ? "+" : ""}${freqDelta} vs ${prevLabel}`
          : ""}
        tone={toneOfDeltaPct(prevFreq > 0 ? ((lastFreq - prevFreq) / prevFreq) * 100 : null)}
        chartData={weeklyFrequencySeries}
        chartType="line"
      />
      <RecoveryKpiCard
        icon={<KpiIconMountain />}
        label="Dénivelé mensuel"
        value={(safeNum(last.elevationGain) || 0).toLocaleString("fr-FR")}
        unit=" m"
        delta={elevationDeltaPct != null
          ? `${elevationDeltaPct > 0 ? "+" : ""}${elevationDeltaPct} % vs ${prevLabel}`
          : ""}
        tone={toneOfDeltaPct(elevationDeltaPct)}
        chartData={elevationSpark}
        chartType="line"
      />
      <RecoveryKpiCard
        icon={<KpiIconSpark />}
        label="Régularité"
        value={lastReg || "—"}
        unit=" %"
        delta={Number.isFinite(regDeltaPts) && regDeltaPts !== 0
          ? `${regDeltaPts > 0 ? "+" : ""}${regDeltaPts} pts vs ${prevLabel}`
          : ""}
        tone={lastReg >= 75 ? 1 : lastReg >= 60 ? 2 : lastReg >= 40 ? 4 : 5}
        chartData={regularityDailySpark}
        chartType="bar"
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// 2. Progression du volume
// ---------------------------------------------------------------------------

function TrendsMonthlyEvolution({ matrix = [] }) {
  const [rangeId, setRangeId] = useState("6m");
  const range = RANGE_OPTIONS.find((r) => r.id === rangeId) || RANGE_OPTIONS[0];
  const data = matrix.slice(-range.months).map((m) => ({
    key: m.key, label: m.label, distanceKm: m.distanceKm,
  }));
  const last = data[data.length - 1] || {};
  const first = data[0] || {};
  const deltaPct = first.distanceKm > 0
    ? Math.round(((last.distanceKm - first.distanceKm) / first.distanceKm) * 100)
    : null;

  return (
    <section className="alpine-trends-card">
      <header className="alpine-trends-card-head">
        <h3 className="alpine-trends-card-title">Progression du volume</h3>
        <AlpineSelect
          value={rangeId}
          options={RANGE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          onChange={setRangeId}
          ariaLabel="Période d'analyse de la progression du volume"
        />
      </header>

      <div className="alpine-trends-evolution-value-row">
        <strong className="alpine-trends-evolution-value">
          {(last.distanceKm || 0).toLocaleString("fr-FR")} km
        </strong>
        <span className="alpine-trends-evolution-label">{last.label || ""}</span>
        {deltaPct != null ? (
          <span className={`alpine-trends-evolution-delta ${deltaPct >= 0 ? "is-up" : "is-down"}`}>
            {formatDeltaPct(deltaPct)} <small>vs {first.label}</small>
          </span>
        ) : null}
      </div>

      {data.length === 0 ? (
        <p className="alpine-overview-focus-empty">Pas de données sur la période.</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 12, right: 20, left: 4, bottom: 4 }}>
            <CartesianGrid stroke="rgba(123,140,163,0.16)" />
            <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} unit=" km" />
            <Tooltip
              formatter={(v) => [`${v} km`, "Volume"]}
              contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1" }}
            />
            <Legend wrapperStyle={{ display: "none" }} />
            <Line
              type="monotone"
              dataKey="distanceKm"
              stroke={PRIMARY}
              strokeWidth={2}
              dot={{ r: 3, fill: PRIMARY, stroke: PRIMARY, strokeWidth: 0 }}
              activeDot={{ r: 4, fill: PRIMARY, stroke: "#ffffff", strokeWidth: 2 }}
              isAnimationActive={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 3. Comparaison mensuelle
// ---------------------------------------------------------------------------

function TrendsMonthlyComparison({ matrix24 = [], endDate }) {
  if (matrix24.length < 12) {
    return (
      <section className="alpine-trends-card">
        <h3 className="alpine-trends-card-title">Comparaison mensuelle</h3>
        <p className="alpine-overview-focus-empty">
          Comparaison N vs N-1 indisponible — l'historique est inférieur à 12 mois.
        </p>
      </section>
    );
  }
  const last12 = matrix24.slice(-12);
  const prev12 = matrix24.slice(-24, -12);
  const data = last12.map((m, idx) => ({
    label: m.label, current: m.distanceKm, previous: prev12[idx]?.distanceKm || 0,
  }));
  const start = matrix24[matrix24.length - 12]?.periodStart;
  const end = endDate instanceof Date ? endDate : matrix24[matrix24.length - 1]?.periodEnd;
  const prevStart = matrix24[0]?.periodStart;
  const prevEnd = matrix24[11]?.periodEnd;
  const fmt = (d) => (d instanceof Date ? d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) : "");
  const currentLabel = `${fmt(start)} – ${fmt(end)}`;
  const previousLabel = `${fmt(prevStart)} – ${fmt(prevEnd)}`;

  return (
    <section className="alpine-trends-card">
      <header className="alpine-trends-card-head">
        <h3 className="alpine-trends-card-title">Comparaison mensuelle</h3>
      </header>
      <ul className="alpine-trends-mini-legend">
        <li><span className="alpine-trends-legend-dot" style={{ background: PRIMARY_SOFT }} /> {previousLabel}</li>
        <li><span className="alpine-trends-legend-dot" style={{ background: PRIMARY }} /> {currentLabel}</li>
      </ul>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid stroke="rgba(123,140,163,0.16)" vertical={false} />
          <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
          <YAxis stroke="#64748b" fontSize={11} unit=" km" />
          <Tooltip
            formatter={(v, name) => [`${v} km`, name === "current" ? "Année courante" : "Année précédente"]}
            contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1" }}
          />
          <Bar dataKey="previous" fill={PRIMARY_SOFT} radius={[3, 3, 0, 0]} />
          <Bar dataKey="current"  fill={PRIMARY}      radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 4. Régularité & heatmap
// ---------------------------------------------------------------------------

function TrendsRegularitySection({ activities = [], sharedRangeEnd }) {
  const [rangeId, setRangeId] = useState("6m");
  const range = RANGE_OPTIONS.find((r) => r.id === rangeId) || RANGE_OPTIONS[0];

  const heatmap = useMemo(
    () => buildHeatmapMatrix(activities, { endDate: sharedRangeEnd, months: range.months }),
    [activities, sharedRangeEnd, range.months],
  );
  const winStart = useMemo(() => {
    const end = sharedRangeEnd instanceof Date ? new Date(sharedRangeEnd) : new Date();
    return new Date(end.getFullYear(), end.getMonth() - range.months + 1, 1);
  }, [sharedRangeEnd, range.months]);
  const stats = useMemo(
    () => buildRegularityStats(activities, { start: winStart, end: sharedRangeEnd }),
    [activities, winStart, sharedRangeEnd],
  );

  const streakLabel = stats.longestStreakStart && stats.longestStreakEnd
    ? `${stats.longestStreakStart.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${stats.longestStreakEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`
    : "";

  return (
    <section className="alpine-trends-card">
      <header className="alpine-trends-card-head">
        <h3 className="alpine-trends-card-title">Régularité &amp; constance</h3>
        <AlpineSelect
          value={rangeId}
          options={RANGE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          onChange={setRangeId}
          ariaLabel="Période d'analyse de la régularité"
        />
      </header>

      <div className="alpine-trends-regularity-body">
        <div className="alpine-trends-regularity-stats">
          <div>
            <span className="alpine-trends-stat-label">Meilleure série</span>
            <strong className="alpine-trends-stat-value">{stats.longestStreak}</strong>
            <span className="alpine-trends-stat-unit">jours</span>
            {streakLabel ? <span className="alpine-trends-stat-extra">{streakLabel}</span> : null}
          </div>
          <div>
            <span className="alpine-trends-stat-label">Jours actifs</span>
            <strong className="alpine-trends-stat-value">{stats.activeDays}</strong>
            <span className="alpine-trends-stat-unit">/ {stats.totalDays}</span>
            <span className="alpine-trends-stat-extra">{stats.regularityPercent} %</span>
          </div>
        </div>
        <TrendsRegularityHeatmap matrix={heatmap} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 5. Comparaison de périodes (4 sub-cards)
// ---------------------------------------------------------------------------

function IconDistance() {
  return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M3 7.5a3 3 0 1 1 6 0c0 2.2-3 5-3 5s-3-2.8-3-5Zm3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm6 3a2 2 0 1 1 4 0c0 1.5-2 3.4-2 3.4s-2-1.9-2-3.4Z"/></svg>;
}
function IconTime() {
  return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm0 1.4a5.1 5.1 0 1 1 0 10.2A5.1 5.1 0 0 1 8 2.9Zm.7 2v3.2l2.3 1.4-.7 1.1-2.9-1.7V4.9h1.3Z"/></svg>;
}
function IconMountain() {
  return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M1 13 5 6l2.3 4.2L10 5l5 8H1Z"/></svg>;
}
function IconRuns() {
  return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M10 1.9a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8ZM7.2 5.4 9 4.6l1.7 2 1.8.6-.4 1.3-2.4-.8-1 1.1.6 1.7 2 .9-.4 1.3-2.8-1.2-.8-2.3-1.6 1.8-2.4-.6.3-1.3 1.8.4 1.8-2Z"/></svg>;
}

function PeriodSubCard({ icon, label, value, unit, deltaAbs, prevValue, prevUnit, deltaPct }) {
  const positive = (deltaPct ?? 0) >= 0;
  return (
    <article className="alpine-trends-period-card">
      <div className="alpine-trends-period-card-head">
        <span className="alpine-trends-period-card-icon" aria-hidden="true">{icon}</span>
        <span className="alpine-trends-period-card-label">{label}</span>
      </div>
      <div className="alpine-trends-period-card-value-row">
        <strong className="alpine-trends-period-card-value">{value}</strong>
        {unit ? <span className="alpine-trends-period-card-unit">{unit}</span> : null}
        {deltaAbs ? (
          <span className={`alpine-trends-period-card-delta-abs ${positive ? "is-up" : "is-down"}`}>{deltaAbs}</span>
        ) : null}
      </div>
      <div className="alpine-trends-period-card-prev">
        <span>{prevValue}{prevUnit ? ` ${prevUnit}` : ""}</span>
        {deltaPct != null ? (
          <span className={`alpine-trends-period-card-delta-pct ${positive ? "is-up" : "is-down"}`}>
            {formatDeltaPct(deltaPct)}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function TrendsPeriodComparison({ activities = [], currentRange = {} }) {
  const cmp = useMemo(
    () => buildPeriodComparison(activities, currentRange),
    [activities, currentRange],
  );
  if (!cmp.current) return null;

  return (
    <section className="alpine-trends-card">
      <header className="alpine-trends-card-head">
        <h3 className="alpine-trends-card-title">Comparaison de périodes</h3>
        <div className="alpine-trends-period-compare-range" aria-hidden="true">
          <div>
            <span className="alpine-trends-period-compare-tag">Période actuelle</span>
            <span className="alpine-trends-period-compare-value">{cmp.rangeLabel}</span>
          </div>
          <span className="alpine-trends-period-compare-sep">vs</span>
          <div>
            <span className="alpine-trends-period-compare-tag">Période précédente</span>
            <span className="alpine-trends-period-compare-value">{cmp.previousRangeLabel}</span>
          </div>
        </div>
      </header>

      <div className="alpine-trends-period-grid">
        <PeriodSubCard
          icon={<IconDistance />}
          label="Distance"
          value={(cmp.current.distanceKm || 0).toLocaleString("fr-FR")}
          unit="km"
          deltaAbs={formatDeltaAbs(cmp.delta.distanceKm, "km")}
          prevValue={(cmp.previous.distanceKm || 0).toLocaleString("fr-FR")}
          prevUnit="km"
          deltaPct={cmp.deltaPct.distanceKm}
        />
        <PeriodSubCard
          icon={<IconTime />}
          label="Temps"
          value={formatHours(cmp.current.durationHours)}
          unit=""
          deltaAbs={formatHoursDelta(cmp.delta.durationHours)}
          prevValue={formatHours(cmp.previous.durationHours)}
          prevUnit=""
          deltaPct={cmp.deltaPct.durationHours}
        />
        <PeriodSubCard
          icon={<IconMountain />}
          label="Dénivelé +"
          value={(cmp.current.elevationGain || 0).toLocaleString("fr-FR")}
          unit="m"
          deltaAbs={formatDeltaAbs(cmp.delta.elevationGain, "m")}
          prevValue={(cmp.previous.elevationGain || 0).toLocaleString("fr-FR")}
          prevUnit="m"
          deltaPct={cmp.deltaPct.elevationGain}
        />
        <PeriodSubCard
          icon={<IconRuns />}
          label="Sorties"
          value={cmp.current.runs}
          unit=""
          deltaAbs={formatDeltaAbs(cmp.delta.runs)}
          prevValue={cmp.previous.runs}
          prevUnit=""
          deltaPct={cmp.deltaPct.runs}
        />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 6. Right rail
// ---------------------------------------------------------------------------

function RailIconTrendUp() {
  return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M2 12.5 6.4 8 9 10.5 14 5.6V8h1.4V3H10.4v1.4h2.6L9 8.5 6.4 6 1 11.5l1 1Z"/></svg>;
}
function RailIconTrendDown() {
  return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M2 3.5 6.4 8 9 5.5 14 10.4V8h1.4v5H10.4v-1.4h2.6L9 7.5 6.4 10 1 4.5l1-1Z"/></svg>;
}
function RailIconMountain() {
  return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M1 13 5 6l2.3 4.2L10 5l5 8H1Z"/></svg>;
}
function RailIconSparkle() {
  return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 1 9.3 6.7 15 8l-5.7 1.3L8 15l-1.3-5.7L1 8l5.7-1.3L8 1Z"/></svg>;
}
function RailIconAlert() {
  return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 1.4 15 14H1L8 1.4Zm0 4.6v4h-1.4v-4H8Zm-.7 6.4a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z"/></svg>;
}

function TrendsRightRail({ matrix = [], regularityPercent = 0 }) {
  const last = matrix[matrix.length - 1] || {};
  const prev = matrix[matrix.length - 2] || {};
  const distanceDeltaPct = prev.distanceKm > 0
    ? Math.round(((last.distanceKm - prev.distanceKm) / prev.distanceKm) * 100)
    : null;
  const elevationDeltaPct = prev.elevationGain > 0
    ? Math.round(((last.elevationGain - prev.elevationGain) / prev.elevationGain) * 100)
    : null;

  // Narration cohérente — icône reflète la DIRECTION du signal :
  //   ↗ TrendUp pour hausse, ↘ TrendDown pour baisse, ▲ Mountain spécifique
  //   au dénivelé, ✦ Sparkle pour régularité positive, ⚠ Alert pour fragile.
  // toneKey choisit la pastille colorée (palette mockup conservée par sujet).
  const bullets = [];

  // --- Volume ---
  if (Number.isFinite(distanceDeltaPct) && distanceDeltaPct >= 5) {
    bullets.push({
      key: "vol", toneKey: "warm-volume", icon: <RailIconTrendUp />,
      title: "Volume en hausse",
      body: "Ton volume progresse régulièrement sur la dernière période.",
    });
  } else if (Number.isFinite(distanceDeltaPct) && distanceDeltaPct <= -10) {
    bullets.push({
      key: "vol", toneKey: "amber-watch", icon: <RailIconTrendDown />,
      title: "Volume en baisse",
      body: "Ton volume diminue — phase de récupération ou allègement programmé ?",
    });
  } else if (Number.isFinite(distanceDeltaPct)) {
    bullets.push({
      key: "vol", toneKey: "neutral", icon: <RailIconTrendUp />,
      title: "Volume stable",
      body: "Charge maintenue d'un mois sur l'autre.",
    });
  }

  // --- Dénivelé ---
  if (Number.isFinite(elevationDeltaPct) && elevationDeltaPct >= 10) {
    bullets.push({
      key: "elev", toneKey: "cool-elevation", icon: <RailIconMountain />,
      title: "Dénivelé en progression",
      body: "Forte montée du dénivelé sur les 2 derniers mois.",
    });
  } else if (Number.isFinite(elevationDeltaPct) && elevationDeltaPct <= -15) {
    bullets.push({
      key: "elev", toneKey: "neutral", icon: <RailIconMountain />,
      title: "Dénivelé en repli",
      body: "Le profil de tes sorties s'aplanit ce mois-ci.",
    });
  }

  // --- Régularité (seuils scientifiquement alignés Tudor-Locke 2011) ---
  //   < 40 % = fragile, 40-60 % = perfectible, 60-75 % = correcte,
  //   >= 75 % = ancrée. On utilise les valeurs absolues du dernier
  //   mois (regularityPercent), sans pourcentage dans le body.
  if (regularityPercent >= 75) {
    bullets.push({
      key: "reg", toneKey: "warm-regularity", icon: <RailIconSparkle />,
      title: "Régularité ancrée",
      body: "Ta constance est exemplaire, continue sur cette lancée.",
    });
  } else if (regularityPercent >= 60) {
    bullets.push({
      key: "reg", toneKey: "warm-regularity", icon: <RailIconSparkle />,
      title: "Régularité correcte",
      body: "Bonne assiduité. Vise 4 sorties / sem pour ancrer l'habitude.",
    });
  } else if (regularityPercent >= 40) {
    bullets.push({
      key: "reg", toneKey: "amber-watch", icon: <RailIconAlert />,
      title: "Régularité perfectible",
      body: "Trop d'écarts entre les sorties. Cible 3 séances / sem minimum.",
    });
  } else if (Number.isFinite(regularityPercent)) {
    bullets.push({
      key: "reg", toneKey: "amber-watch", icon: <RailIconAlert />,
      title: "Régularité à reconstruire",
      body: "Trop de jours sans activité. Repars sur 2-3 sorties courtes par semaine.",
    });
  }

  return (
    <aside className="alpine-trends-rail">
      <h3 className="alpine-trends-rail-title">À retenir</h3>
      <ul className="alpine-trends-rail-bullets">
        {bullets.map((b) => (
          <li key={b.key} className={`alpine-trends-rail-bullet ${b.toneKey ? `tk-${b.toneKey}` : ""}`}>
            <span className="alpine-trends-rail-bullet-icon">{b.icon}</span>
            <div className="alpine-trends-rail-bullet-text">
              <span className="alpine-trends-rail-bullet-title">{b.title}</span>
              <span className="alpine-trends-rail-bullet-body">{b.body}</span>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className="alpine-trends-rail-cta">
        Voir l&apos;analyse complète
      </button>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function AnalyticsTrendsTab({
  activities = [],
  sharedRange = {},
  sharedRangeEnd,
}) {
  const endDate = useMemo(() => {
    if (sharedRangeEnd instanceof Date) return sharedRangeEnd;
    if (sharedRange?.end instanceof Date) return sharedRange.end;
    return new Date();
  }, [sharedRangeEnd, sharedRange?.end]);

  const matrix6 = useMemo(
    () => buildMonthlyTrendsMatrix(activities, { endDate, months: 6 }),
    [activities, endDate],
  );
  const matrix24 = useMemo(
    () => buildMonthlyTrendsMatrix(activities, { endDate, months: 24 }),
    [activities, endDate],
  );

  const weeklyFrequencySeries = useMemo(
    () => matrix6.map((m) => Math.round((safeNum(m.runs) / 4.345) * 10) / 10),
    [matrix6],
  );

  const regularityMonthlySeries = useMemo(() => matrix6.map((m) => {
    const stats = buildRegularityStats(activities, { start: m.periodStart, end: m.periodEnd });
    return stats.regularityPercent;
  }), [matrix6, activities]);

  // Spark journalier régularité : 30 dernières journées, hauteur de barre
  // proportionnelle à la durée totale d'activité du jour (min). Reproduit
  // visuellement la trame "barcode" du mockup avec hauteurs variables.
  const regularityDailySpark = useMemo(() => {
    const e = endDate instanceof Date ? endDate : new Date();
    const minutesByDay = new Map();
    for (const a of activities) {
      const raw = a?.startDateLocal || a?.startDate;
      if (!raw) continue;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const minutes = Number(a?.movingTime || 0) / 60;
      minutesByDay.set(key, (minutesByDay.get(key) || 0) + minutes);
    }
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(e.getTime() - i * 86400000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push(Math.round(minutesByDay.get(key) || 0));
    }
    return days;
  }, [activities, endDate]);

  const last30 = useMemo(() => {
    const e = endDate;
    const s = new Date(e.getTime() - 29 * 86400000);
    return buildRegularityStats(activities, { start: s, end: e });
  }, [activities, endDate]);

  return (
    <div className="alpine-analytics-tab alpine-analytics-tab--trends alpine-trends-grid">
      <div className="alpine-trends-main">
        <TrendsKpiRow
          monthlyMatrix={matrix6}
          sharedRangeEnd={endDate}
          weeklyFrequencySeries={weeklyFrequencySeries}
          regularityMonthlySeries={regularityMonthlySeries}
          regularityDailySpark={regularityDailySpark}
        />

        <div className="alpine-trends-row-2">
          <TrendsMonthlyEvolution matrix={matrix24} />
          <TrendsMonthlyComparison matrix24={matrix24} endDate={endDate} />
        </div>

        <TrendsRegularitySection activities={activities} sharedRangeEnd={endDate} />

        <TrendsPeriodComparison activities={activities} currentRange={sharedRange} />

        <p className="alpine-charges-sources">
          Sources : <i>Esteve-Lanao J (2007)</i> <i>J Strength Cond Res</i> 21(3) — volume hebdomadaire amateur ·{" "}
          <i>Seiler S (2010)</i> — fréquence et polarisation · <i>Millet GP (2011)</i>{" "}
          <i>Sports Med</i> 41(7) — dénivelé trail · <i>Tudor-Locke C (2011)</i> — métriques de
          régularité · <i>OMS (2020)</i> — recommandations activité physique.
        </p>
      </div>

      <TrendsRightRail matrix={matrix6} regularityPercent={last30.regularityPercent} />
    </div>
  );
}

export default memo(AnalyticsTrendsTab);
