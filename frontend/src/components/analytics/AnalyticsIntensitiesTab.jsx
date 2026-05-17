import { memo, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ZONE_COLORS,
  ZONE_LABELS,
  buildIntensityKpi,
  buildIntensityWeeklySeries,
  buildIntensityRouteVsTrail,
  buildIntensityRolling30Comparison,
  shareZ1Z2,
  shareZ3Z5,
  shareZ4Z5,
  activeZonesCount,
  classifyEndurance,
  classifyModerate,
  classifyVariety,
  buildFooterTakeaway,
} from "../../utils/analyticsIntensities.js";

/**
 * AnalyticsIntensitiesTab — Onglet "Intensités" (Lot 04 V5, PDF page 10).
 *
 * Sections :
 *  1. Répartition des intensités (donut 5 zones + légende valeurs/%)
 *  2. 3 mini-KPI (Temps en zones / Séances de qualité / Allure soutenue)
 *  3. Right rail "À retenir" (3 bullets dynamiques + CTA placeholder)
 *  4. Évolution hebdomadaire — stacked bar 6 sem × 5 zones + insight bottom
 *  5. Intensité dominante — comparaison route vs trail (cachée si l'un absent)
 *  6. Right rail "Légende des zones" (synchro settings FC utilisateur)
 *  7. Lecture intensité — 3 sub-cards classifiées (Seiler, Stöggl, Treff)
 *  8. Footer "À retenir" dynamique (alignement Seiler/Esteve-Lanao)
 *
 * Décisions utilisateur (2026-05) :
 *  A. Source FC prioritaire + hint visible
 *  B. Rolling 30 j vs 30 j précédents (cohérent Tendances)
 *  C. Carte Route vs Trail cachée si l'un des deux est vide
 *  D. CTAs en placeholders (TODO globale)
 *  E/F. Tags + footer vérifiés scientifiquement (Seiler 2010, Stöggl 2014,
 *       Treff 2019, Esteve-Lanao 2007)
 *  G. Légende zones consomme directement intensityModel.zones[] (settings user)
 */

// ---------------------------------------------------------------------------
// Helpers de formatage
// ---------------------------------------------------------------------------

function formatHmin(hoursFloat) {
  if (!Number.isFinite(hoursFloat) || hoursFloat <= 0) return "0h 00";
  const h = Math.floor(hoursFloat);
  const m = Math.round((hoursFloat - h) * 60);
  return `${h}h ${String(m).padStart(2, "0")}`;
}

function formatDeltaPct(p) {
  if (p == null || !Number.isFinite(p)) return "";
  return `${p > 0 ? "+" : ""}${p} %`;
}

function formatDeltaAbs(v, unit = "") {
  if (!Number.isFinite(v) || v === 0) return "";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v}${unit ? " " + unit : ""}`;
}

// ---------------------------------------------------------------------------
// Sub-component : Donut 5 zones
// ---------------------------------------------------------------------------

function IntensityDonut({ zones = [], totalHours = 0 }) {
  const segments = zones
    .map((z) => ({
      key: (z.key || "").toLowerCase(),
      durationHours: Number(z.durationHours) || 0,
      durationShare: Number(z.durationShare) || 0,
    }))
    .filter((s) => s.durationHours > 0);

  const radius = 42;
  const stroke = 16;
  const circ = 2 * Math.PI * radius;
  const totalShare = segments.reduce((s, x) => s + x.durationShare, 0) || 100;

  // Offsets cumulés
  const drawn = segments.reduce((acc, s) => {
    const length = (s.durationShare / totalShare) * circ;
    const offset = acc.length > 0
      ? acc[acc.length - 1].offset + acc[acc.length - 1].length
      : 0;
    return [...acc, { ...s, length, offset }];
  }, []);

  return (
    <svg viewBox="0 0 120 120" className="alpine-intensities-donut" aria-hidden="true">
      <circle cx="60" cy="60" r={radius} fill="none" stroke="#eaf0fa" strokeWidth={stroke} />
      {drawn.map((s) => (
        <circle
          key={s.key}
          cx="60" cy="60" r={radius}
          fill="none"
          stroke={ZONE_COLORS[s.key] || "#cbd5e1"}
          strokeWidth={stroke}
          strokeDasharray={`${s.length} ${circ - s.length}`}
          strokeDashoffset={-s.offset}
          transform="rotate(-90 60 60)"
          strokeLinecap="butt"
        />
      ))}
      <text x="60" y="56" textAnchor="middle" dominantBaseline="central"
        fontSize="14" fontWeight="800" fill="#0f2147">
        {formatHmin(totalHours)}
      </text>
      <text x="60" y="72" textAnchor="middle" dominantBaseline="central"
        fontSize="8" fill="#64748b">
        Temps total
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Sub-component : Légende valeurs (à droite du donut)
// ---------------------------------------------------------------------------

function IntensityLegend({ zones = [] }) {
  // Ordre Z1 → Z5
  const ordered = ["z1", "z2", "z3", "z4", "z5"]
    .map((k) => zones.find((z) => (z.key || "").toLowerCase() === k))
    .filter(Boolean);
  return (
    <ul className="alpine-intensities-legend">
      {ordered.map((z) => {
        const k = (z.key || "").toLowerCase();
        const hours = Number(z.durationHours) || 0;
        const share = Math.round(Number(z.durationShare) || 0);
        return (
          <li key={k}>
            <span className="alpine-intensities-legend-dot" style={{ background: ZONE_COLORS[k] }} />
            <span className="alpine-intensities-legend-label">
              <strong>{z.shortLabel || k.toUpperCase()}</strong>{" "}
              {ZONE_LABELS[k] || z.label || ""}
            </span>
            <span className="alpine-intensities-legend-value">
              {formatHmin(hours)} <span className="alpine-intensities-legend-pct">({share} %)</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Sub-component : 3 KPI cards
// ---------------------------------------------------------------------------

function KpiIconClock() {
  return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm0 1.4a5.1 5.1 0 1 1 0 10.2A5.1 5.1 0 0 1 8 2.9Zm.7 2v3.2l2.3 1.4-.7 1.1-2.9-1.7V4.9h1.3Z"/></svg>;
}
function KpiIconFlame() {
  return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 1c.4 1.6.1 2.6-.4 3.5C7 5.4 6 6 6 7.5c0 .8.5 1.4 1 1.6-.6.2-1.6.9-1.6 2.2 0 1.6 1.3 2.7 2.6 2.7 1.4 0 2.6-1 2.6-2.7 0-1.3-1-2-1.6-2.2.5-.2 1-.8 1-1.6 0-1.4-1-2-1.6-2.9C7.9 3.7 7.6 2.6 8 1Z"/></svg>;
}
function KpiIconGauge() {
  return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 2.5a5.5 5.5 0 0 0-5 7.7h1.6A4 4 0 0 1 12 10.2h1.5A5.5 5.5 0 0 0 8 2.5Zm0 2.2L6.8 9a1 1 0 1 0 1.4 0L8 4.7Z"/></svg>;
}

function IntensityKpiCard({ icon, iconClass, label, value, valueUnit, subtitle, delta }) {
  const positive = delta && delta.trim().startsWith("+");
  return (
    <article className="alpine-intensities-kpi-card">
      <span className="alpine-intensities-kpi-label">{label}</span>
      <div className="alpine-intensities-kpi-body">
        <span className={`alpine-intensities-kpi-icon ${iconClass}`}>{icon}</span>
        <div>
          <div className="alpine-intensities-kpi-value-row">
            <strong className="alpine-intensities-kpi-value">{value}</strong>
            {valueUnit ? <span className="alpine-intensities-kpi-unit">{valueUnit}</span> : null}
          </div>
          {subtitle ? <span className="alpine-intensities-kpi-sub">{subtitle}</span> : null}
        </div>
      </div>
      {delta ? (
        <span className={`alpine-intensities-kpi-delta ${positive ? "is-up" : "is-down"}`}>
          {delta} <small>vs période précédente</small>
        </span>
      ) : null}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Sub-component : Right rail "À retenir"
// ---------------------------------------------------------------------------

function RailIconEndurance() {
  return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm0 1.4a5.1 5.1 0 1 1 0 10.2A5.1 5.1 0 0 1 8 2.9Zm.7 2v3.2l2.3 1.4-.7 1.1-2.9-1.7V4.9h1.3Z"/></svg>;
}
function RailIconActivity() {
  return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M1 8h3l2-5 4 10 2-5h3"/></svg>;
}
function RailIconTrend() {
  return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M2 12.5 6.4 8 9 10.5 14 5.6V8h1.4V3H10.4v1.4h2.6L9 8.5 6.4 6 1 11.5l1 1Z"/></svg>;
}

function IntensitiesRail({ model, rolling30 }) {
  const z1z2 = shareZ1Z2(model);
  const z3z5 = shareZ3Z5(model);
  const totalDeltaPct = rolling30?.deltaPct?.totalHours;

  const bullets = [];

  // Endurance solide
  if (z1z2 >= 70) {
    bullets.push({
      key: "endur", toneKey: "endurance", icon: <RailIconEndurance />,
      title: "Endurance solide",
      body: `${Math.round(z1z2)} % du temps en Z1-Z2. Base aérobie bien construite.`,
    });
  } else if (z1z2 >= 50) {
    bullets.push({
      key: "endur", toneKey: "endurance", icon: <RailIconEndurance />,
      title: "Endurance correcte",
      body: `${Math.round(z1z2)} % du temps en Z1-Z2. Cible 70 % pour un foncier solide.`,
    });
  } else {
    bullets.push({
      key: "endur", toneKey: "amber-watch", icon: <RailIconEndurance />,
      title: "Foncier à renforcer",
      body: `${Math.round(z1z2)} % du temps en Z1-Z2. Augmente le volume facile.`,
    });
  }

  // Stimulus équilibré
  if (z3z5 >= 20 && z3z5 <= 35) {
    bullets.push({
      key: "stim", toneKey: "moderate", icon: <RailIconActivity />,
      title: "Stimulus équilibré",
      body: `${Math.round(z3z5)} % du temps en Z3-Z5. Bon équilibre charge/qualité.`,
    });
  } else if (z3z5 < 20) {
    bullets.push({
      key: "stim", toneKey: "neutral", icon: <RailIconActivity />,
      title: "Stimulus modéré",
      body: `${Math.round(z3z5)} % du temps en Z3-Z5. Marge pour intégrer plus de qualité.`,
    });
  } else {
    bullets.push({
      key: "stim", toneKey: "amber-watch", icon: <RailIconActivity />,
      title: "Stimulus élevé",
      body: `${Math.round(z3z5)} % du temps en Z3-Z5. Surveille la récupération.`,
    });
  }

  // Progression — basée sur rolling 30 j
  if (Number.isFinite(totalDeltaPct)) {
    if (totalDeltaPct >= 5) {
      bullets.push({
        key: "prog", toneKey: "trend-up", icon: <RailIconTrend />,
        title: "Progression maîtrisée",
        body: `${formatDeltaPct(totalDeltaPct)} de temps total avec plus de variété.`,
      });
    } else if (totalDeltaPct <= -10) {
      bullets.push({
        key: "prog", toneKey: "neutral", icon: <RailIconTrend />,
        title: "Charge en allègement",
        body: `${formatDeltaPct(totalDeltaPct)} de temps total — phase de récupération.`,
      });
    }
  }

  return (
    <aside className="alpine-intensities-rail">
      <h3 className="alpine-intensities-rail-title">À retenir</h3>
      <ul className="alpine-intensities-rail-bullets">
        {bullets.map((b) => (
          <li key={b.key} className={`alpine-intensities-rail-bullet tk-${b.toneKey}`}>
            <span className="alpine-intensities-rail-bullet-icon">{b.icon}</span>
            <div className="alpine-intensities-rail-bullet-text">
              <span className="alpine-intensities-rail-bullet-title">{b.title}</span>
              <span className="alpine-intensities-rail-bullet-body">{b.body}</span>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className="alpine-intensities-rail-cta">
        Voir l&apos;analyse complète
      </button>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Sub-component : Évolution hebdomadaire stacked
// ---------------------------------------------------------------------------

function WeeklyStackedTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].reverse(); // Z5 d'abord en haut
  const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
  return (
    <div className="alpine-intensities-weekly-tooltip">
      <strong>{label}</strong>
      {sorted.map((p) => (
        <div key={p.dataKey}>
          <span className="dot" style={{ background: ZONE_COLORS[p.dataKey] }} />
          {p.dataKey.toUpperCase()} {ZONE_LABELS[p.dataKey] || ""} :{" "}
          <b>{formatHmin(Number(p.value) || 0)}</b>
        </div>
      ))}
      <div className="alpine-intensities-weekly-tooltip-total">
        Total : <b>{formatHmin(total)}</b>
      </div>
    </div>
  );
}

function IntensitiesWeeklyStack({ weekly = [] }) {
  if (!weekly.length) {
    return (
      <section className="alpine-intensities-card">
        <h3 className="alpine-intensities-card-title">Temps en zones — Évolution hebdomadaire</h3>
        <p className="alpine-overview-focus-empty">Pas assez de données pour le suivi hebdomadaire.</p>
      </section>
    );
  }

  // Insight bottom : zone dominante de la dernière semaine
  const last = weekly[weekly.length - 1];
  const lastZones = ["z1", "z2", "z3", "z4", "z5"].map((k) => ({ k, v: Number(last[k]) || 0 }));
  lastZones.sort((a, b) => b.v - a.v);
  const top = lastZones[0];
  const insight = top.v > 0
    ? top.k === "z2"
      ? "Plus de temps en Z2 cette semaine, idéal pour construire l'endurance de base."
      : top.k === "z1"
        ? "Plus de temps en Z1 cette semaine, phase de récupération active."
        : top.k === "z3"
          ? "Plus de temps en Z3 cette semaine, travail au seuil ventilatoire 1."
          : top.k === "z4"
            ? "Plus de temps en Z4 cette semaine, travail au seuil lactique."
            : "Plus de temps en Z5 cette semaine, sollicitation maximale aérobie."
    : "Pas d'activité enregistrée la semaine en cours.";

  return (
    <section className="alpine-intensities-card">
      <header className="alpine-intensities-card-head">
        <h3 className="alpine-intensities-card-title">Temps en zones — Évolution hebdomadaire</h3>
      </header>

      <ul className="alpine-intensities-weekly-legend" aria-hidden="true">
        {["z1", "z2", "z3", "z4", "z5"].map((k) => (
          <li key={k}>
            <span className="dot" style={{ background: ZONE_COLORS[k] }} /> {k.toUpperCase()}
          </li>
        ))}
      </ul>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={weekly} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
          <CartesianGrid stroke="rgba(123,140,163,0.16)" vertical={false} />
          <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
          <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v}h`} />
          <Tooltip content={<WeeklyStackedTooltip />} cursor={{ fill: "rgba(123,140,163,0.08)" }} />
          {/* Cadre de la semaine en cours — fidélité mockup */}
          {last?.label ? (
            <ReferenceArea
              x1={last.label}
              x2={last.label}
              stroke="#0f2147"
              strokeOpacity={0.55}
              strokeWidth={1.2}
              strokeDasharray="3 3"
              fill="transparent"
              ifOverflow="extendDomain"
            />
          ) : null}
          {["z1", "z2", "z3", "z4", "z5"].map((k) => (
            <Bar key={k} dataKey={k} stackId="zones" fill={ZONE_COLORS[k]} radius={k === "z5" ? [3, 3, 0, 0] : 0} />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <p className="alpine-intensities-weekly-insight">
        <span className="alpine-intensities-insight-icon" aria-hidden="true">🏃</span> {insight}
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-component : Route vs Trail
// ---------------------------------------------------------------------------

function RoadGlyph({ color = "#1268f3" }) {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <path
        fill={color}
        d="M11 5h10l3 22h-5l-1-7h-4l-1 7H8l3-22Zm3 2-.8 6h5.6L18 7h-4Zm-.4 8 -.5 3h5.8l-.5-3h-4.8Z"
      />
    </svg>
  );
}
function TreeGlyph({ color = "#16a34a" }) {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <path
        fill={color}
        d="M16 3 23 13H19l4 7H17v6h-2v-6H9l4-7H9l7-10Z"
      />
    </svg>
  );
}

/**
 * Donut unique scindé verticalement Route | Trail.
 * Chaque moitié prend la couleur de la zone dominante de son terrain.
 */
function RouteTrailSplitDonut({ roadColor, trailColor }) {
  // 2 arcs SVG : demi-cercle gauche (Route) et demi-cercle droit (Trail).
  // Rayon 50, centre (60,60), stroke épais → effet donut.
  return (
    <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
      {/* Demi-anneau gauche (Route) */}
      <path
        d="M60 12 A 48 48 0 0 0 60 108"
        fill="none"
        stroke={roadColor}
        strokeWidth="18"
      />
      {/* Demi-anneau droit (Trail) */}
      <path
        d="M60 12 A 48 48 0 0 1 60 108"
        fill="none"
        stroke={trailColor}
        strokeWidth="18"
      />
      {/* Trait de séparation vertical au milieu */}
      <line x1="60" y1="6" x2="60" y2="114" stroke="#ffffff" strokeWidth="3" />
    </svg>
  );
}

function IntensitiesRouteVsTrail({ data }) {
  if (!data) return null;
  const { road, trail } = data;
  if (!road || !trail) return null;

  const roadColor = ZONE_COLORS[road.zoneKey] || "#94a3b8";
  const trailColor = ZONE_COLORS[trail.zoneKey] || "#94a3b8";

  return (
    <section className="alpine-intensities-card">
      <header className="alpine-intensities-card-head">
        <h3 className="alpine-intensities-card-title">Intensité dominante</h3>
        <span className="alpine-intensities-card-subtitle">Comparaison route vs trail</span>
      </header>

      <div className="alpine-intensities-rt-split">
        {/* SVG donut split */}
        <div className="alpine-intensities-rt-split-viz">
          <RouteTrailSplitDonut roadColor={roadColor} trailColor={trailColor} />
          <div className="alpine-intensities-rt-glyph alpine-intensities-rt-glyph--left">
            <RoadGlyph color={roadColor} />
          </div>
          <div className="alpine-intensities-rt-glyph alpine-intensities-rt-glyph--right">
            <TreeGlyph color={trailColor} />
          </div>
        </div>

        {/* Labels sous le donut, alignés avec leur moitié */}
        <div className="alpine-intensities-rt-split-labels">
          <div className="alpine-intensities-rt-split-col">
            <strong className="alpine-intensities-rt-context" style={{ color: roadColor }}>Route</strong>
            <span className="alpine-intensities-rt-zone">
              <span className="dot" style={{ background: roadColor }} />
              <strong>{road.zoneKey.toUpperCase()}</strong> {ZONE_LABELS[road.zoneKey]}
            </span>
            <span className="alpine-intensities-rt-share">{road.sharePercent} % du temps</span>
          </div>
          <div className="alpine-intensities-rt-split-col">
            <strong className="alpine-intensities-rt-context" style={{ color: trailColor }}>Trail</strong>
            <span className="alpine-intensities-rt-zone">
              <span className="dot" style={{ background: trailColor }} />
              <strong>{trail.zoneKey.toUpperCase()}</strong> {ZONE_LABELS[trail.zoneKey]}
            </span>
            <span className="alpine-intensities-rt-share">{trail.sharePercent} % du temps</span>
          </div>
        </div>
      </div>

      <p className="alpine-intensities-rt-insight">
        {road.zoneKey === trail.zoneKey
          ? "Même intensité dominante sur route et trail."
          : `Intensité dominante différente entre route (${ZONE_LABELS[road.zoneKey]}) et trail (${ZONE_LABELS[trail.zoneKey]}).`}
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-component : Légende des zones (synchro settings user)
// ---------------------------------------------------------------------------

function ZonesLegendCard({ model }) {
  const zones = Array.isArray(model?.zones) ? model.zones : [];
  const ordered = ["z1", "z2", "z3", "z4", "z5"]
    .map((k) => zones.find((z) => (z.key || "").toLowerCase() === k))
    .filter(Boolean);

  const fcMaxValue = Number(model?.referenceMaxHeartrate) || 0;
  const isEstimated = !!model?.usingEstimatedMaxHeartrate;

  return (
    <aside className="alpine-intensities-zones-legend">
      <h3 className="alpine-intensities-zones-legend-title">Légende des zones</h3>
      <ul className="alpine-intensities-zones-legend-list">
        {ordered.map((z) => {
          const k = (z.key || "").toLowerCase();
          return (
            <li key={k}>
              <span className="alpine-intensities-zones-legend-dot" style={{ background: ZONE_COLORS[k] }} />
              <span className="alpine-intensities-zones-legend-label">
                <strong>{z.shortLabel || k.toUpperCase()}</strong>{" "}
                {ZONE_LABELS[k] || ""}
              </span>
              <span className="alpine-intensities-zones-legend-range">
                {z.rangeLabel || ""}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="alpine-intensities-zones-legend-foot">
        FCmax {fcMaxValue > 0 ? `${fcMaxValue} bpm` : "—"}
        {isEstimated ? <span className="alpine-intensities-zones-legend-est"> (estimée)</span> : null}
      </p>
      <button type="button" className="alpine-intensities-zones-legend-cta">En savoir plus</button>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Sub-component : Lecture intensité (3 sub-cards)
// ---------------------------------------------------------------------------

function LectureIntensite({ model }) {
  const z1z2 = shareZ1Z2(model);
  const z3z5 = shareZ3Z5(model);
  const z4z5 = shareZ4Z5(model);
  const nbZones = activeZonesCount(model);

  const enduranceCls = classifyEndurance(z1z2);
  const moderateCls = classifyModerate(z3z5);
  const varietyCls = classifyVariety(nbZones);

  return (
    <section className="alpine-intensities-card">
      <header className="alpine-intensities-card-head">
        <h3 className="alpine-intensities-card-title">Lecture intensité</h3>
      </header>
      <div className="alpine-intensities-lecture-grid">
        <article className={`alpine-intensities-lecture-card lecture-tone-${enduranceCls.tone}`}>
          <span className="alpine-intensities-lecture-icon">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 14.4 2 8.4a3.5 3.5 0 1 1 5-5l1 1 1-1a3.5 3.5 0 1 1 5 5L8 14.4Z"/></svg>
          </span>
          <strong className="alpine-intensities-lecture-title">Endurance dominante</strong>
          <p className="alpine-intensities-lecture-body">
            {Math.round(z1z2)} % du temps en Z1-Z2. Base aérobie pour soutenir
            la charge d'entraînement et favoriser la récupération.
          </p>
          <span className="alpine-intensities-lecture-tag">{enduranceCls.tag}</span>
        </article>

        <article className={`alpine-intensities-lecture-card lecture-tone-${moderateCls.tone}`}>
          <span className="alpine-intensities-lecture-icon">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M1 8h3l2-5 4 10 2-5h3"/></svg>
          </span>
          <strong className="alpine-intensities-lecture-title">Intensité modérée</strong>
          <p className="alpine-intensities-lecture-body">
            {Math.round(z3z5)} % du temps en Z3-Z5, dont {Math.round(z4z5)} % en
            Z4-Z5. Volume de travail qualitatif pour progresser sans surcharger.
          </p>
          <span className="alpine-intensities-lecture-tag">{moderateCls.tag}</span>
        </article>

        <article className={`alpine-intensities-lecture-card lecture-tone-${varietyCls.tone}`}>
          <span className="alpine-intensities-lecture-icon">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M2 13V4h2v9H2Zm4 0V7h2v6H6Zm4 0V2h2v11h-2Zm4 0V9h2v4h-2Z"/></svg>
          </span>
          <strong className="alpine-intensities-lecture-title">Variété des intensités</strong>
          <p className="alpine-intensities-lecture-body">
            {nbZones === 5
              ? "Utilisation des 5 zones sur la période."
              : `Utilisation de ${nbZones} zones sur 5 sur la période.`}{" "}
            Continue à varier les stimuli pour optimiser la progression.
          </p>
          <span className="alpine-intensities-lecture-tag">{varietyCls.tag}</span>
        </article>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-component : Footer "À retenir"
// ---------------------------------------------------------------------------

function FooterTakeaway({ model }) {
  const text = buildFooterTakeaway(model);
  return (
    <section className="alpine-intensities-footer">
      <span className="alpine-intensities-footer-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M1 13 5 6l2.3 4.2L10 5l5 8H1Z"/></svg>
      </span>
      <div className="alpine-intensities-footer-text">
        <strong>À retenir</strong>
        <p>{text}</p>
      </div>
      <button type="button" className="alpine-intensities-footer-cta">Voir tous les conseils</button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function AnalyticsIntensitiesTab({
  intensityModel = {},
  activities = [],
  sharedRange = {},
  sharedRangeEnd,
  trainingAnalyticsSettings = {},
}) {
  const endDate = useMemo(() => {
    if (sharedRangeEnd instanceof Date) return sharedRangeEnd;
    if (sharedRange?.end instanceof Date) return sharedRange.end;
    return new Date();
  }, [sharedRangeEnd, sharedRange?.end]);

  const zones = Array.isArray(intensityModel?.zones) ? intensityModel.zones : [];

  const kpi = useMemo(
    () => buildIntensityKpi(intensityModel, activities, {
      start: sharedRange?.start,
      end: endDate,
    }),
    [intensityModel, activities, sharedRange?.start, endDate],
  );

  // 12 semaines pour densifier l'histogramme (barres plus fines, cohérent
  // avec le mockup et la largeur de la card 2/3 colonne principale).
  const weekly = useMemo(
    () => buildIntensityWeeklySeries(activities, {
      endDate, nWeeks: 12, settings: trainingAnalyticsSettings,
    }),
    [activities, endDate, trainingAnalyticsSettings],
  );

  const routeVsTrail = useMemo(
    () => buildIntensityRouteVsTrail(activities, {
      startDate: sharedRange?.start,
      endDate,
      settings: trainingAnalyticsSettings,
    }),
    [activities, sharedRange?.start, endDate, trainingAnalyticsSettings],
  );

  const rolling30 = useMemo(
    () => buildIntensityRolling30Comparison(activities, endDate, trainingAnalyticsSettings),
    [activities, endDate, trainingAnalyticsSettings],
  );

  const hasData = intensityModel?.hasData;
  const sourceHint = intensityModel?.sourceLabel === "Zones FC"
    ? "Source : zones FC"
    : intensityModel?.sourceLabel || "Source indéterminée";

  if (!hasData) {
    return (
      <div className="alpine-analytics-tab alpine-analytics-tab--intensities">
        <section className="alpine-intensities-card">
          <h3 className="alpine-intensities-card-title">Répartition des intensités</h3>
          <p className="alpine-overview-focus-empty">
            {intensityModel?.message
              || "Pas de données d'intensité exploitables sur la période sélectionnée."}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="alpine-analytics-tab alpine-analytics-tab--intensities alpine-intensities-grid">
      <div className="alpine-intensities-main">
        {/* §1 + §2 : Répartition + 3 KPI en ligne (mockup p.10) */}
        <section className="alpine-intensities-top-row">
          <article className="alpine-intensities-distribution-card">
            <header className="alpine-intensities-card-head">
              <h3 className="alpine-intensities-card-title">Répartition des intensités</h3>
              <span className="alpine-intensities-card-sub-hint">{sourceHint}</span>
            </header>
            <div className="alpine-intensities-distribution-body">
              <IntensityDonut zones={zones} totalHours={kpi.totalHours} />
              <IntensityLegend zones={zones} />
            </div>
          </article>

          <IntensityKpiCard
            icon={<KpiIconClock />}
            iconClass="icon-tone-blue"
            label="Temps en zones"
            value={formatHmin(kpi.totalHours)}
            valueUnit=""
            subtitle="100 % du temps"
            delta={formatDeltaPct(rolling30?.deltaPct?.totalHours)}
          />
          <IntensityKpiCard
            icon={<KpiIconFlame />}
            iconClass="icon-tone-red"
            label="Séances de qualité"
            value={kpi.qualitySessionCount}
            valueUnit="séances"
            subtitle={`${kpi.qualitySessionShare} % du total`}
            delta={formatDeltaAbs(rolling30?.delta?.qualitySessionCount)}
          />
          <IntensityKpiCard
            icon={<KpiIconGauge />}
            iconClass="icon-tone-green"
            label="Allure soutenue"
            value={formatHmin(kpi.sustainedHours)}
            valueUnit=""
            subtitle={`${kpi.sustainedShare} % du temps`}
            delta={formatDeltaPct(rolling30?.deltaPct?.sustainedHours)}
          />
        </section>

        {/* §4 + §5 : Évolution + Route vs Trail */}
        <div className="alpine-intensities-row-2">
          <IntensitiesWeeklyStack weekly={weekly} />
          <IntensitiesRouteVsTrail data={routeVsTrail} />
        </div>

        {/* §7 : Lecture intensité */}
        <LectureIntensite model={intensityModel} />

        {/* §8 : Footer */}
        <FooterTakeaway model={intensityModel} />
      </div>

      <div className="alpine-intensities-right-rail">
        <IntensitiesRail model={intensityModel} rolling30={rolling30} />
        <ZonesLegendCard model={intensityModel} />
      </div>
    </div>
  );
}

export default memo(AnalyticsIntensitiesTab);
