import { memo } from "react";

/**
 * OverviewRangeBar — Variante dédiée Vue d'ensemble (Lot 04, PDF page 7).
 *
 * Range bar horizontale avec :
 *   - gradient sémantique selon `gradient` ("warm" vert→rouge, "cool" rouge→vert,
 *     ou "polar" centre vert / bords rouges)
 *   - curseur HTML positionné absolu (toujours circulaire, jamais étiré)
 *   - ticks chiffrés sous la barre
 *
 * Note : le rect SVG est volontairement étiré (preserveAspectRatio="none")
 * car c'est juste un rectangle gradient — pas de distortion visible. Le curseur
 * en revanche est rendu en HTML pour rester parfaitement circulaire.
 *
 * Props :
 *   - value      : number (valeur courante)
 *   - min, max   : number (échelle)
 *   - ticks      : Array<{ value: number, label: string }>
 *   - gradient   : "warm" | "cool" | "polar"
 *   - showCursor : boolean (default true)
 *   - ariaLabel  : string
 */

function gradientStops(gradient) {
  switch (gradient) {
    case "cool":
      return [
        { offset: 0,    color: "#ef4444" },
        { offset: 0.35, color: "#f59e0b" },
        { offset: 0.65, color: "#84cc16" },
        { offset: 1,    color: "#35a853" },
      ];
    case "polar":
      return [
        { offset: 0,    color: "#ef4444" },
        { offset: 0.30, color: "#f59e0b" },
        { offset: 0.50, color: "#35a853" },
        { offset: 0.70, color: "#f59e0b" },
        { offset: 1,    color: "#ef4444" },
      ];
    case "warm":
    default:
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

  const gid = `overview-rb-${gradient}`;

  return (
    <div className="alpine-overview-rangebar" role="img" aria-label={ariaLabel}>
      <div className="alpine-overview-rangebar-track">
        {/* Rectangle gradient — étiré horizontalement, c'est OK (uniforme couleur) */}
        <svg
          className="alpine-overview-rangebar-svg"
          viewBox="0 0 200 8"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
              {gradientStops(gradient).map((s, idx) => (
                <stop key={idx} offset={s.offset} stopColor={s.color} />
              ))}
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="200" height="8" rx="4" fill={`url(#${gid})`} opacity="0.85" />
        </svg>

        {/* Curseur en HTML — jamais déformé, toujours circulaire 14×14 */}
        {showCursor && pct != null ? (
          <span
            className="alpine-overview-rangebar-cursor"
            style={{ left: `${pct}%` }}
            aria-hidden="true"
          />
        ) : null}
      </div>

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
