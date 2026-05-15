import { memo } from "react";

/**
 * OverviewRangeBar — Variante dédiée Vue d'ensemble (Lot 04, PDF page 7).
 *
 * Range bar horizontale avec :
 *   - gradient sémantique selon `gradient` ("warm" vert→rouge, ou "cool" rouge→vert)
 *   - curseur (cercle) positionné sur la valeur courante
 *   - ticks chiffrés sous la barre
 *
 * Props :
 *   - value      : number (valeur courante)
 *   - min, max   : number (échelle)
 *   - ticks      : Array<{ value: number, label: string }>
 *   - gradient   : "warm" (low=vert, high=rouge) | "cool" (low=rouge, high=vert) | "polar"
 *                  (centre vert, bords rouges — pour deltas centrés autour de 0)
 *   - showCursor : boolean (default true)
 *   - height     : number px (default 8)
 *   - ariaLabel  : string
 */

function gradientStops(gradient) {
  switch (gradient) {
    case "cool":
      // low=rouge → high=vert (ex: VO2max où haute valeur = bon)
      return [
        { offset: 0,    color: "#ef4444" },
        { offset: 0.35, color: "#f59e0b" },
        { offset: 0.65, color: "#84cc16" },
        { offset: 1,    color: "#35a853" },
      ];
    case "polar":
      // centre=vert, bords=rouges (ex: deltas où ±0 = optimal)
      return [
        { offset: 0,    color: "#ef4444" },
        { offset: 0.30, color: "#f59e0b" },
        { offset: 0.50, color: "#35a853" },
        { offset: 0.70, color: "#f59e0b" },
        { offset: 1,    color: "#ef4444" },
      ];
    case "warm":
    default:
      // low=vert → high=rouge (ex: Charge où haute valeur = vigilance)
      return [
        { offset: 0,    color: "#35a853" },
        { offset: 0.35, color: "#84cc16" },
        { offset: 0.65, color: "#f59e0b" },
        { offset: 1,    color: "#ef4444" },
      ];
  }
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function OverviewRangeBar({
  value = null,
  min = 0,
  max = 100,
  ticks = [],
  gradient = "warm",
  showCursor = true,
  ariaLabel = "",
}) {
  const span = Math.max(1, max - min);
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : null;
  const pctRaw = safeValue == null ? null : ((safeValue - min) / span) * 100;
  const pct = pctRaw == null ? null : clamp(pctRaw, 0, 100);

  // gradient id unique par variante
  const gid = `overview-rb-${gradient}`;

  return (
    <div className="alpine-overview-rangebar" role="img" aria-label={ariaLabel}>
      <svg viewBox="0 0 200 14" preserveAspectRatio="none" className="alpine-overview-rangebar-svg" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            {gradientStops(gradient).map((s, idx) => (
              <stop key={idx} offset={s.offset} stopColor={s.color} />
            ))}
          </linearGradient>
        </defs>
        <rect x="0" y="3" width="200" height="8" rx="4" fill={`url(#${gid})`} opacity="0.85" />
        {showCursor && pct != null ? (
          <g transform={`translate(${(pct / 100) * 200}, 7)`}>
            <circle r="6" fill="#0f2147" />
            <circle r="4" fill="#ffffff" />
          </g>
        ) : null}
      </svg>

      {ticks.length ? (
        <div className="alpine-overview-rangebar-ticks">
          {ticks.map((t, idx) => {
            const tickPct = clamp(((t.value - min) / span) * 100, 0, 100);
            return (
              <span
                key={idx}
                className="alpine-overview-rangebar-tick"
                style={{ left: `${tickPct}%` }}
              >
                {t.label}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default memo(OverviewRangeBar);
