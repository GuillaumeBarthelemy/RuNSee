import { memo } from "react";

/**
 * ProgressionRegularityCard — Mockup p.17 Row 3 centre.
 *
 * Donut % regularite + calendar mini 52 sem + meilleure serie.
 */
function ProgressionRegularityCard({ data = {} }) {
  const pct = Math.max(0, Math.min(100, Number(data?.percent) || 0));
  const radius = 56;
  const stroke = 12;
  const c = 2 * Math.PI * radius;
  const offset = c - (pct / 100) * c;

  const weeks = Array.isArray(data?.weeks) ? data.weeks : [];

  return (
    <section className="progression-panel progression-regularity-card">
      <div className="progression-panel-head">
        <h3>Régularité</h3>
      </div>
      <div className="progression-regularity-body">
        <div className="progression-regularity-donut">
          <svg viewBox="0 0 140 140" width="140" height="140">
            <circle cx="70" cy="70" r={radius} stroke="#e5edf7" strokeWidth={stroke} fill="none" />
            <circle
              cx="70"
              cy="70"
              r={radius}
              stroke="#15803d"
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              transform="rotate(-90 70 70)"
            />
            <text x="70" y="68" textAnchor="middle" fontSize="22" fontWeight="700" fill="#0f172a">{pct}%</text>
            <text x="70" y="86" textAnchor="middle" fontSize="11" fill="#64748b">Régularité</text>
          </svg>
        </div>
        <div className="progression-regularity-side">
          <div>
            <small>Jours actifs</small>
            <strong>{data?.activeDays ?? 0} / {data?.expectedDays ?? 0}</strong>
          </div>
          <div className="progression-regularity-calendar" aria-label="Semaines actives sur l'année">
            {weeks.map((w, idx) => (
              <span
                key={idx}
                className={`progression-regularity-week ${w.active ? "is-active" : ""} ${w.future ? "is-future" : ""}`}
                title={`Semaine ${idx + 1}`}
              />
            ))}
          </div>
          <div>
            <small>Séquences</small>
            <strong>{data?.activeWeeks ?? 0} semaines</strong>
            <em>Meilleure série : {data?.bestStreak ?? 0} sem.</em>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(ProgressionRegularityCard);
