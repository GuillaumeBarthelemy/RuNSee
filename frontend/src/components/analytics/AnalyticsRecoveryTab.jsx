import { memo, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import OverviewRangeBar from "./OverviewRangeBar.jsx";
import AlpineSelect from "../visuals/alpine/AlpineSelect.jsx";
import { clampTone } from "../../utils/tonePicker.js";
import {
  buildRecoveryRolling30,
  buildRecoveryDailySeries,
  classifySleep,
  classifyHrv,
  classifyRestingHr,
  classifyStress,
  classifyReadiness,
  buildRecoveryRecommendation,
} from "../../utils/analyticsRecovery.js";

/**
 * AnalyticsRecoveryTab — Onglet "Sommeil & récupération" (Lot 04 V5, PDF p.11).
 *
 * 7 sections :
 *  1. 5 KPI cards (Sommeil / HRV / FC repos / Stress / État récupération)
 *  2. Right rail "À retenir" — 3 bullets dynamiques
 *  3. Right rail "Conseils récupération" — 3 tips statiques
 *  4. Chart "Évolution sommeil + récupération" (dual axis bars+line)
 *  5. Chart "HRV + FC repos – Tendances" (dual axis 2 lignes)
 *  6. Lecture récupération — 4 sub-cards + 1 Recommandation dynamique
 *  7. Footer "Conseil du jour" statique
 *
 * Décisions utilisateur (2026-05) :
 *  A. État récupération = readiness composite (Plews/Buchheit/Le Meur), fallback Garmin
 *  B. Comparaison rolling 30 j vs 30 j précédents
 *  C. Tips statiques, CTA placeholders (TODO globale)
 *  D. Recommandation dynamique selon readiness — Halson 2014 + Plews 2013
 *  E. Sélecteurs charts en état local (7 / 14 / 28 j)
 */

const COL_SLEEP = "#3B82F6";
const COL_RECOVERY = "#16A34A";
const COL_HRV = "#3B82F6";
const COL_RHR = "#F97316";
const COL_STRESS = "#F59E0B";

const DAY_OPTIONS = [
  { value: "7",  label: "7 derniers jours" },
  { value: "14", label: "14 derniers jours" },
  { value: "28", label: "28 derniers jours" },
];

// ---------------------------------------------------------------------------
// Helpers de formatage
// ---------------------------------------------------------------------------

function formatHmin(hoursFloat) {
  if (!Number.isFinite(hoursFloat) || hoursFloat <= 0) return "—";
  const h = Math.floor(hoursFloat);
  const m = Math.round((hoursFloat - h) * 60);
  return `${h}h ${String(m).padStart(2, "0")}`;
}

function formatHminDelta(deltaHours) {
  if (!Number.isFinite(deltaHours) || deltaHours === 0) return "";
  const sign = deltaHours > 0 ? "+" : "-";
  const abs = Math.abs(deltaHours);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return h === 0 ? `${sign}${m} min` : `${sign}${h}h ${String(m).padStart(2, "0")}`;
}

function formatDelta(value, unit = "") {
  if (!Number.isFinite(value) || value === 0) return "";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${unit ? " " + unit : ""}`;
}

// ---------------------------------------------------------------------------
// SVG icons
// ---------------------------------------------------------------------------

function IconMoon() { return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M9.5 1.5a6.5 6.5 0 0 0 5 11.5A6.5 6.5 0 1 1 9.5 1.5Z"/></svg>; }
function IconPulse() { return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" d="M1 8h3l2-5 4 10 2-5h3"/></svg>; }
function IconHeart() { return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 14.4 2 8.4a3.5 3.5 0 1 1 5-5l1 1 1-1a3.5 3.5 0 1 1 5 5L8 14.4Z"/></svg>; }
function IconLotus() { return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 1.5c1.5 2 2.2 4 1.5 6.5L8 14.5 6.5 8C5.8 5.5 6.5 3.5 8 1.5ZM3 6c1.5 1 2.5 2.5 2.5 4.5L3 13.5C1.5 11.5 1 9 3 6Zm10 0c-1.5 1-2.5 2.5-2.5 4.5L13 13.5c1.5-2 2-4.5 0-7.5Z"/></svg>; }
function IconRefresh() { return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M3.5 5.5A5 5 0 0 1 13 5l-1.4 1H14V3l-1 1A6 6 0 1 0 14 8h-1.4a4.6 4.6 0 1 1-9.1-2.5Z"/></svg>; }
function IconMountain() { return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M1 13 5 6l2.3 4.2L10 5l5 8H1Z"/></svg>; }
function IconNutrition() { return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M11 1c1.5 1 2.5 3 2.5 5 0 3-2 6-5.5 9C4.5 12 2.5 9 2.5 6c0-2 1-4 2.5-5 1 .5 2 1.5 3 3 1-1.5 2-2.5 3-3Z"/></svg>; }

// ---------------------------------------------------------------------------
// §1 — KPI card
// ---------------------------------------------------------------------------

function RecoveryKpiCard({ icon, iconClass, label, value, unit, hint, hintTone, delta, rangeBar }) {
  const tone = clampTone(hintTone);
  return (
    <article className="alpine-recovery-kpi-card">
      <header className="alpine-recovery-kpi-head">
        <span className={`alpine-recovery-kpi-icon ${iconClass}`}>{icon}</span>
        <span className="alpine-recovery-kpi-label">{label}</span>
      </header>
      <div className="alpine-recovery-kpi-value-row">
        <strong className="alpine-recovery-kpi-value">{value}</strong>
        {unit ? <span className="alpine-recovery-kpi-unit">{unit}</span> : null}
      </div>
      {hint ? <span className={`alpine-recovery-kpi-hint tone-${tone}`}>{hint}</span> : null}
      {rangeBar ? (
        <OverviewRangeBar
          value={rangeBar.value}
          min={rangeBar.min ?? 0}
          max={rangeBar.max ?? 100}
          ticks={rangeBar.ticks || []}
          gradient={rangeBar.gradient || "warm"}
          ariaLabel={label}
        />
      ) : null}
      {delta ? <span className="alpine-recovery-kpi-delta">{delta}</span> : null}
    </article>
  );
}

// ---------------------------------------------------------------------------
// §4 — Chart Évolution sommeil + récupération
// ---------------------------------------------------------------------------

function SleepRecoveryChart({ daily = [] }) {
  const [days, setDays] = useState("7");
  const data = daily.slice(-Number(days));
  const hasData = data.some((d) => d.sleepHours != null || d.recoveryPct != null);

  const insight = useMemo(() => {
    if (!hasData) return "";
    const recs = data.map((d) => d.recoveryPct).filter((v) => v != null);
    if (recs.length < 2) return "Plus de jours nécessaires pour dégager une tendance.";
    const half = Math.ceil(recs.length / 2);
    const first = recs.slice(0, half).reduce((s, v) => s + v, 0) / half;
    const last = recs.slice(half).reduce((s, v) => s + v, 0) / Math.max(1, recs.length - half);
    if (last - first >= 5) return "Le sommeil et la récupération progressent globalement. Poursuis sur cette dynamique.";
    if (first - last >= 5) return "La récupération marque le pas. Surveille tes signaux de fatigue.";
    return "Récupération stable sur la période. Continue à entretenir tes routines.";
  }, [data, hasData]);

  return (
    <section className="alpine-recovery-card">
      <header className="alpine-recovery-card-head">
        <h3 className="alpine-recovery-card-title">Évolution du sommeil et de la récupération</h3>
        <AlpineSelect value={days} options={DAY_OPTIONS} onChange={setDays} ariaLabel="Période" />
      </header>

      <ul className="alpine-recovery-chart-legend" aria-hidden="true">
        <li><span className="dot" style={{ background: COL_SLEEP, borderRadius: 2 }} /> Sommeil (h)</li>
        <li><span className="dot" style={{ background: COL_RECOVERY }} /> Récupération (%)</li>
      </ul>

      {!hasData ? (
        <p className="alpine-overview-focus-empty">Pas de données de récupération sur la période.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data} margin={{ top: 12, right: 24, left: 4, bottom: 4 }}>
            <CartesianGrid stroke="rgba(123,140,163,0.16)" />
            <XAxis dataKey="shortLabel" stroke="#64748b" fontSize={10} interval="preserveStartEnd" minTickGap={20} />
            <YAxis yAxisId="left" stroke="#64748b" fontSize={11} unit="h" domain={[0, 10]} />
            <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} unit="%" domain={[0, 100]} />
            <Tooltip
              formatter={(v, name) => {
                if (name === "sleepHours") return [v != null ? formatHmin(v) : "—", "Sommeil"];
                if (name === "recoveryPct") return [v != null ? `${Math.round(v)} %` : "—", "Récupération"];
                return [v, name];
              }}
              contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1" }}
            />
            <Legend wrapperStyle={{ display: "none" }} />
            <Bar yAxisId="left" dataKey="sleepHours" fill={COL_SLEEP} fillOpacity={0.6} radius={[3, 3, 0, 0]} maxBarSize={30}>
              <LabelList
                dataKey="sleepHours"
                position="top"
                fontSize={10}
                fill="#1e3a8a"
                fontWeight={700}
                formatter={(v) => (v != null ? formatHmin(v) : "")}
              />
            </Bar>
            <Line yAxisId="right" type="monotone" dataKey="recoveryPct" stroke={COL_RECOVERY} strokeWidth={2}
                  dot={{ r: 3, fill: COL_RECOVERY, strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: COL_RECOVERY, stroke: "#ffffff", strokeWidth: 2 }}
                  isAnimationActive={false} connectNulls>
              <LabelList
                dataKey="recoveryPct"
                position="top"
                fontSize={10}
                fill="#166534"
                fontWeight={700}
                formatter={(v) => (v != null ? `${Math.round(v)} %` : "")}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      )}
      {insight ? <p className="alpine-recovery-chart-insight">{insight}</p> : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// §5 — HRV + FC repos Tendances
// ---------------------------------------------------------------------------

function HrvRhrTrendsChart({ daily = [] }) {
  const [days, setDays] = useState("7");
  const data = daily.slice(-Number(days));
  const hasData = data.some((d) => d.hrvMs != null || d.restingHr != null);

  const insight = useMemo(() => {
    if (!hasData) return "";
    const hrvs = data.map((d) => d.hrvMs).filter((v) => v != null);
    const rhrs = data.map((d) => d.restingHr).filter((v) => v != null);
    if (hrvs.length < 2 || rhrs.length < 2) return "Plus de jours nécessaires pour une analyse fiable.";
    const hrvDelta = hrvs[hrvs.length - 1] - hrvs[0];
    const rhrDelta = rhrs[rhrs.length - 1] - rhrs[0];
    if (hrvDelta > 2 && rhrDelta < -1) return "HRV en hausse et FC repos en baisse : signes d'une bonne récupération.";
    if (hrvDelta < -2 && rhrDelta > 1) return "HRV en baisse et FC repos en hausse : attention à la fatigue accumulée.";
    return "Indicateurs cardiaques stables sur la période.";
  }, [data, hasData]);

  return (
    <section className="alpine-recovery-card">
      <header className="alpine-recovery-card-head">
        <h3 className="alpine-recovery-card-title">HRV et FC repos – Tendances</h3>
        <AlpineSelect value={days} options={DAY_OPTIONS} onChange={setDays} ariaLabel="Période" />
      </header>

      <ul className="alpine-recovery-chart-legend" aria-hidden="true">
        <li><span className="dot" style={{ background: COL_HRV }} /> HRV (ms)</li>
        <li><span className="dot" style={{ background: COL_RHR }} /> FC repos (bpm)</li>
      </ul>

      {!hasData ? (
        <p className="alpine-overview-focus-empty">Pas de données HRV / FC repos sur la période.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 12, right: 24, left: 4, bottom: 4 }}>
            <CartesianGrid stroke="rgba(123,140,163,0.16)" />
            <XAxis dataKey="shortLabel" stroke="#64748b" fontSize={10} interval="preserveStartEnd" minTickGap={20} />
            <YAxis yAxisId="left" stroke="#64748b" fontSize={11} domain={[0, 100]} unit=" ms" />
            <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} domain={[0, 100]} unit=" bpm" />
            <Tooltip
              formatter={(v, name) => {
                if (name === "hrvMs") return [v != null ? `${Math.round(v)} ms` : "—", "HRV"];
                if (name === "restingHr") return [v != null ? `${Math.round(v)} bpm` : "—", "FC repos"];
                return [v, name];
              }}
              contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1" }}
            />
            <Legend wrapperStyle={{ display: "none" }} />
            <Line yAxisId="left" type="monotone" dataKey="hrvMs" stroke={COL_HRV} strokeWidth={2}
                  dot={{ r: 3, fill: COL_HRV, strokeWidth: 0 }} isAnimationActive={false} connectNulls>
              <LabelList
                dataKey="hrvMs"
                position="top"
                fontSize={10}
                fill="#1e3a8a"
                fontWeight={700}
                formatter={(v) => (v != null ? Math.round(v) : "")}
              />
            </Line>
            <Line yAxisId="right" type="monotone" dataKey="restingHr" stroke={COL_RHR} strokeWidth={2}
                  dot={{ r: 3, fill: COL_RHR, strokeWidth: 0 }} isAnimationActive={false} connectNulls>
              <LabelList
                dataKey="restingHr"
                position="bottom"
                fontSize={10}
                fill="#9a3412"
                fontWeight={700}
                formatter={(v) => (v != null ? Math.round(v) : "")}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      )}
      {insight ? <p className="alpine-recovery-chart-insight">{insight}</p> : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// §6 — Mini sparklines + cards
// ---------------------------------------------------------------------------

function MiniSparkLine({ values = [], color = COL_RECOVERY, height = 28 }) {
  const valid = values.filter((v) => v != null);
  if (!valid.length) return null;
  const max = Math.max(...valid, 1);
  const min = Math.min(...valid, 0);
  const span = max - min || 1;
  const w = 100;
  const coords = values.map((v, i) => {
    if (v == null) return null;
    const x = (i / Math.max(1, values.length - 1)) * w;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return { x, y };
  }).filter(Boolean);
  if (!coords.length) return null;
  const linePath = `M ${coords.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ")}`;
  // Aire sous la courbe (refermée en bas de la viewBox)
  const firstX = coords[0].x.toFixed(1);
  const lastX = coords[coords.length - 1].x.toFixed(1);
  const areaPath = `${linePath} L ${lastX},${height} L ${firstX},${height} Z`;
  // ID gradient unique (color + count) pour éviter collisions multi-instances
  const gradId = `mini-spark-${color.replace("#", "")}-${values.length}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="alpine-recovery-mini-spark" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function MiniSparkBars({ values = [], color = COL_SLEEP, height = 28 }) {
  if (!values.length) return null;
  const valid = values.filter((v) => v != null && v > 0);
  if (!valid.length) return null;
  const max = Math.max(...valid, 1);
  const w = 100;
  const bw = w / values.length;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="alpine-recovery-mini-spark" aria-hidden="true">
      {values.map((v, i) => {
        if (v == null || v <= 0) return null;
        const h = (v / max) * (height - 2);
        return (
          <rect key={i} x={i * bw + 0.5} y={height - h} width={Math.max(0.5, bw - 1)} height={h}
                fill={color} opacity={0.8} rx={1} />
        );
      })}
    </svg>
  );
}

function LectureCard({ icon, iconClass, label, value, unit, hint, hintTone, rangeBar, objectif, spark, sparkColor, sparkType = "line", deltaText }) {
  const tone = clampTone(hintTone);
  return (
    <article className="alpine-recovery-lecture-card">
      <header className="alpine-recovery-lecture-head">
        <span className={`alpine-recovery-lecture-icon ${iconClass}`}>{icon}</span>
        <span className="alpine-recovery-lecture-label">{label}</span>
      </header>
      <div className="alpine-recovery-lecture-value-row">
        <strong className="alpine-recovery-lecture-value">{value}</strong>
        {unit ? <span className="alpine-recovery-lecture-unit">{unit}</span> : null}
      </div>
      {hint ? <span className={`alpine-recovery-lecture-hint tone-${tone}`}>{hint}</span> : null}
      {rangeBar ? (
        <OverviewRangeBar value={rangeBar.value} min={rangeBar.min} max={rangeBar.max}
                          ticks={[]} gradient={rangeBar.gradient || "warm"} ariaLabel={label} />
      ) : null}
      {objectif ? <span className="alpine-recovery-lecture-objectif">{objectif}</span> : null}
      {spark
        ? sparkType === "bars"
          ? <MiniSparkBars values={spark} color={sparkColor} />
          : <MiniSparkLine values={spark} color={sparkColor} />
        : null}
      {deltaText ? <span className="alpine-recovery-lecture-delta">{deltaText}</span> : null}
    </article>
  );
}

function RecommendationCard({ title, body, tone }) {
  const safeTone = clampTone(tone);
  return (
    <article className={`alpine-recovery-recommendation tone-${safeTone}`}>
      <span className="alpine-recovery-recommendation-icon"><IconMoon /></span>
      <span className="alpine-recovery-recommendation-label">Recommandation</span>
      <strong className="alpine-recovery-recommendation-title">{title}</strong>
      <p className="alpine-recovery-recommendation-body">{body}</p>
      <button type="button" className="alpine-recovery-recommendation-cta">Détails et conseils</button>
    </article>
  );
}

// ---------------------------------------------------------------------------
// §2 — Right rail "À retenir"
// ---------------------------------------------------------------------------

function ARetenirRail({ rolling30, readinessPct }) {
  const sleepCur = rolling30?.current?.sleepHours;
  const hrvDelta = rolling30?.deltaAbs?.hrvMs;
  const stressCur = rolling30?.current?.stress;
  const stressDelta = rolling30?.deltaAbs?.stress;

  const bullets = [];

  if (Number.isFinite(sleepCur) && sleepCur >= 7 && sleepCur <= 9) {
    bullets.push({ key: "sleep", toneKey: "endurance", icon: <IconMoon />,
      title: "Sommeil régulier",
      body: "Ta durée moyenne est dans la cible 7-9 h. La qualité reste bonne." });
  } else if (Number.isFinite(sleepCur) && sleepCur < 7) {
    bullets.push({ key: "sleep", toneKey: "amber-watch", icon: <IconMoon />,
      title: "Sommeil à renforcer",
      body: "Ta durée moyenne est sous 7 h. Vise au moins 7 h pour optimiser la récupération." });
  }

  if (Number.isFinite(hrvDelta) && hrvDelta >= 3) {
    bullets.push({ key: "hrv", toneKey: "endurance", icon: <IconPulse />,
      title: "HRV en progression",
      body: "Ton HRV augmente régulièrement. Bonne gestion du stress et des charges." });
  } else if (Number.isFinite(hrvDelta) && hrvDelta <= -3) {
    bullets.push({ key: "hrv", toneKey: "amber-watch", icon: <IconPulse />,
      title: "HRV en baisse",
      body: "Ton HRV diminue. Surveille les charges et la qualité de sommeil." });
  }

  if (Number.isFinite(stressCur) && stressCur > 50) {
    bullets.push({ key: "stress", toneKey: "amber-watch", icon: <IconLotus />,
      title: "Stress à surveiller",
      body: "Quelques pics élevés. Pense à intégrer respiration et récupération active." });
  } else if (Number.isFinite(stressDelta) && stressDelta <= -5) {
    bullets.push({ key: "stress", toneKey: "endurance", icon: <IconLotus />,
      title: "Stress en baisse",
      body: "Ton stress moyen diminue, c'est un bon signal de récupération." });
  }

  if (bullets.length === 0) {
    bullets.push({ key: "wait", toneKey: "neutral", icon: <IconRefresh />,
      title: `Récupération en suivi (${Math.round(readinessPct || 0)} %)`,
      body: "Continue à enregistrer tes nuits et tes ressentis pour affiner les indicateurs." });
  }

  return (
    <aside className="alpine-recovery-rail">
      <h3 className="alpine-recovery-rail-title">À retenir</h3>
      <ul className="alpine-recovery-rail-bullets">
        {bullets.map((b) => (
          <li key={b.key} className={`alpine-recovery-rail-bullet tk-${b.toneKey}`}>
            <span className="alpine-recovery-rail-bullet-icon">{b.icon}</span>
            <div className="alpine-recovery-rail-bullet-text">
              <span className="alpine-recovery-rail-bullet-title">{b.title}</span>
              <span className="alpine-recovery-rail-bullet-body">{b.body}</span>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className="alpine-recovery-rail-cta">Voir l&apos;analyse complète</button>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// §3 — Right rail "Conseils récupération"
// ---------------------------------------------------------------------------

function ConseilsRecuperation() {
  return (
    <aside className="alpine-recovery-tips">
      <h3 className="alpine-recovery-tips-title">Conseils récupération</h3>
      <ul className="alpine-recovery-tips-list">
        <li><span className="alpine-recovery-tips-icon"><IconMoon /></span>
          Garde une routine de sommeil régulière, même le week-end.</li>
        <li><span className="alpine-recovery-tips-icon"><IconPulse /></span>
          Favorise la respiration et la cohérence cardiaque.</li>
        <li><span className="alpine-recovery-tips-icon"><IconNutrition /></span>
          Hydrate-toi et privilégie une alimentation riche en nutriments.</li>
      </ul>
      <button type="button" className="alpine-recovery-tips-cta">Voir tous les conseils</button>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// §7 — Footer Conseil du jour
// ---------------------------------------------------------------------------

function ConseilDuJour() {
  return (
    <section className="alpine-recovery-footer">
      <span className="alpine-recovery-footer-icon"><IconMountain /></span>
      <div className="alpine-recovery-footer-text">
        <strong>Conseil du jour</strong>
        <p>Une récupération de qualité aujourd&apos;hui construit votre performance de demain.</p>
      </div>
      <button type="button" className="alpine-recovery-footer-cta">Voir tous les conseils</button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function AnalyticsRecoveryTab({
  recoveryVm = null,
  snapshots = [],
  sharedRangeEnd,
}) {
  const endDate = useMemo(() => {
    if (sharedRangeEnd instanceof Date) return sharedRangeEnd;
    return new Date();
  }, [sharedRangeEnd]);

  const readinessOverride = Number.isFinite(recoveryVm?.readiness?.score)
    ? recoveryVm.readiness.score
    : null;

  const rolling30 = useMemo(
    () => buildRecoveryRolling30(snapshots, endDate, readinessOverride),
    [snapshots, endDate, readinessOverride],
  );

  const daily28 = useMemo(
    () => buildRecoveryDailySeries(snapshots, endDate, 28),
    [snapshots, endDate],
  );
  const daily7 = daily28.slice(-7);

  const cur = rolling30?.current || {};
  const delta = rolling30?.deltaAbs || {};

  const sleepCls = classifySleep(cur.sleepHours);
  const hrvCls = classifyHrv(cur.hrvMs);
  const rhrCls = classifyRestingHr(cur.restingHr);
  const stressCls = classifyStress(cur.stress);
  const readinessCls = classifyReadiness(cur.readinessPct);

  const recommendation = useMemo(
    () => buildRecoveryRecommendation(cur.readinessPct),
    [cur.readinessPct],
  );

  const hasAnyData = snapshots.length > 0 && (
    Number.isFinite(cur.sleepHours) || Number.isFinite(cur.hrvMs)
    || Number.isFinite(cur.restingHr) || Number.isFinite(cur.stress)
  );

  if (!hasAnyData) {
    return (
      <div className="alpine-analytics-tab alpine-analytics-tab--recovery">
        <section className="alpine-recovery-card">
          <h3 className="alpine-recovery-card-title">Sommeil &amp; récupération</h3>
          <p className="alpine-overview-focus-empty">
            Connecte ta source de récupération (Garmin / Whoop / Oura) ou attends une première
            synchronisation pour afficher tes indicateurs sommeil et HRV.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="alpine-analytics-tab alpine-analytics-tab--recovery alpine-recovery-grid">
      <div className="alpine-recovery-main">
        {/* §1 */}
        <section className="alpine-recovery-kpi-row">
          <RecoveryKpiCard
            icon={<IconMoon />} iconClass="icon-tone-blue"
            label="Sommeil moyen"
            value={formatHmin(cur.sleepHours)}
            unit=""
            hint={sleepCls.hint} hintTone={sleepCls.tone}
            delta={delta.sleepHours != null ? `${formatHminDelta(delta.sleepHours)} vs 30 j précédents` : ""}
            rangeBar={{ value: cur.sleepHours, min: 5, max: 9,
              ticks: [{ value: 5, label: "5h" }, { value: 7, label: "7h" }, { value: 9, label: "9h" }],
              gradient: "cool" }}
          />
          <RecoveryKpiCard
            icon={<IconPulse />} iconClass="icon-tone-green"
            label="HRV moyen"
            value={cur.hrvMs != null ? Math.round(cur.hrvMs) : "—"} unit="ms"
            hint={hrvCls.hint} hintTone={hrvCls.tone}
            delta={delta.hrvMs != null && delta.hrvMs !== 0 ? `${formatDelta(delta.hrvMs)} vs 30 j précédents` : ""}
            rangeBar={{ value: cur.hrvMs, min: 30, max: 90,
              ticks: [{ value: 30, label: "30" }, { value: 60, label: "60" }, { value: 90, label: "90" }],
              gradient: "cool" }}
          />
          <RecoveryKpiCard
            icon={<IconHeart />} iconClass="icon-tone-red"
            label="FC repos moyenne"
            value={cur.restingHr != null ? Math.round(cur.restingHr) : "—"} unit="bpm"
            hint={rhrCls.hint} hintTone={rhrCls.tone}
            delta={delta.restingHr != null && delta.restingHr !== 0 ? `${formatDelta(delta.restingHr)} bpm vs 30 j précédents` : ""}
            rangeBar={{ value: cur.restingHr, min: 40, max: 70,
              ticks: [{ value: 40, label: "40" }, { value: 55, label: "55" }, { value: 70, label: "70" }],
              gradient: "warm" }}
          />
          <RecoveryKpiCard
            icon={<IconLotus />} iconClass="icon-tone-orange"
            label="Stress moyen"
            value={cur.stress != null ? Math.round(cur.stress) : "—"} unit="/100"
            hint={stressCls.hint} hintTone={stressCls.tone}
            delta={delta.stress != null && delta.stress !== 0 ? `${formatDelta(delta.stress)} vs 30 j précédents` : ""}
            rangeBar={{ value: cur.stress, min: 0, max: 100,
              ticks: [{ value: 0, label: "0" }, { value: 33, label: "33" }, { value: 66, label: "66" }, { value: 100, label: "100" }],
              gradient: "warm" }}
          />
          <RecoveryKpiCard
            icon={<IconRefresh />} iconClass="icon-tone-green"
            label="État de récupération"
            value={cur.readinessPct != null ? Math.round(cur.readinessPct) : "—"} unit="%"
            hint={readinessCls.hint} hintTone={readinessCls.tone}
            delta={delta.readinessPct != null && delta.readinessPct !== 0 ? `${formatDelta(delta.readinessPct)} % vs 30 j précédents` : ""}
            rangeBar={{ value: cur.readinessPct, min: 0, max: 100,
              ticks: [{ value: 0, label: "0%" }, { value: 50, label: "50%" }, { value: 100, label: "100%" }],
              gradient: "cool" }}
          />
        </section>

        {/* §4 + §5 */}
        <div className="alpine-recovery-row-2">
          <SleepRecoveryChart daily={daily28} />
          <HrvRhrTrendsChart daily={daily28} />
        </div>

        {/* §6 */}
        <section className="alpine-recovery-card">
          <header className="alpine-recovery-card-head">
            <h3 className="alpine-recovery-card-title">Lecture récupération</h3>
          </header>
          <div className="alpine-recovery-lecture-grid">
            <LectureCard
              icon={<IconMoon />} iconClass="icon-tone-blue"
              label="Sommeil"
              value={formatHmin(cur.sleepHours)} unit=""
              hint={sleepCls.hint} hintTone={sleepCls.tone}
              rangeBar={{ value: cur.sleepHours, min: 5, max: 9, gradient: "cool" }}
              objectif="Objectif : 7-9h"
              spark={daily7.map((d) => d.sleepHours)}
              sparkColor={COL_SLEEP} sparkType="bars"
              deltaText={delta.sleepHours != null && delta.sleepHours !== 0 ? `${formatHminDelta(delta.sleepHours)} vs semaine passée` : ""}
            />
            <LectureCard
              icon={<IconPulse />} iconClass="icon-tone-green"
              label="HRV"
              value={cur.hrvMs != null ? Math.round(cur.hrvMs) : "—"} unit="ms"
              hint={hrvCls.hint} hintTone={hrvCls.tone}
              rangeBar={{ value: cur.hrvMs, min: 30, max: 90, gradient: "cool" }}
              objectif="Objectif : > 60 ms"
              spark={daily7.map((d) => d.hrvMs)}
              sparkColor={COL_HRV} sparkType="line"
              deltaText={delta.hrvMs != null && delta.hrvMs !== 0 ? `${formatDelta(delta.hrvMs)} vs semaine passée` : ""}
            />
            <LectureCard
              icon={<IconHeart />} iconClass="icon-tone-red"
              label="FC repos"
              value={cur.restingHr != null ? Math.round(cur.restingHr) : "—"} unit="bpm"
              hint={rhrCls.hint} hintTone={rhrCls.tone}
              rangeBar={{ value: cur.restingHr, min: 40, max: 70, gradient: "warm" }}
              objectif="Objectif : 40-50 bpm"
              spark={daily7.map((d) => d.restingHr)}
              sparkColor={COL_RHR} sparkType="line"
              deltaText={delta.restingHr != null && delta.restingHr !== 0 ? `${formatDelta(delta.restingHr)} bpm vs semaine passée` : ""}
            />
            <LectureCard
              icon={<IconLotus />} iconClass="icon-tone-orange"
              label="Stress"
              value={cur.stress != null ? Math.round(cur.stress) : "—"} unit="/100"
              hint={stressCls.hint} hintTone={stressCls.tone}
              rangeBar={{ value: cur.stress, min: 0, max: 100, gradient: "warm" }}
              objectif="Objectif : < 35"
              spark={daily7.map((d) => d.stress)}
              sparkColor={COL_STRESS} sparkType="bars"
              deltaText={delta.stress != null && delta.stress !== 0 ? `${formatDelta(delta.stress)} vs semaine passée` : ""}
            />
            <RecommendationCard
              title={recommendation.title}
              body={recommendation.body}
              tone={recommendation.tone}
            />
          </div>
        </section>

        {/* §7 */}
        <ConseilDuJour />
      </div>

      <div className="alpine-recovery-right-rail">
        <ARetenirRail rolling30={rolling30} readinessPct={cur.readinessPct} />
        <ConseilsRecuperation />
      </div>
    </div>
  );
}

export default memo(AnalyticsRecoveryTab);
