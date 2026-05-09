import { memo } from "react";
import { Link } from "react-router-dom";
import KpiGaugeCircular from "./KpiGaugeCircular.jsx";
import { clampTone } from "../../../utils/tonePicker.js";

/**
 * RecoveryKpiCard — Alpine Light (Lot 3-bis, mockup-faithful).
 *
 * Carte récupération compacte. 4 sont alignées dans la section Récupération
 * de la page Aujourd'hui (Récupération / Sommeil / FC repos / Disponibilité).
 *
 * Layout :
 *  - icône colorée + label en haut
 *  - valeur grosse
 *  - sous-label tone (Correcte / Bonne qualité / Dans la norme / Prêt)
 *  - mini-graphe ou jauge circulaire
 *  - delta vs hier
 *  - lien "Voir le détail" en bas
 *
 * Props :
 * - icon : ReactNode
 * - label : string
 * - value : string|number
 * - unit : string optionnel
 * - hint : string optionnel
 * - delta : string optionnel
 * - tone : 1..5
 * - gaugeValue : number|null — si présent affiche jauge circulaire à la place du graphe
 * - chartData : number[] — alternative graphe simple
 * - chartType : "line" | "bar" (défaut "bar")
 * - linkTo : string optionnel (ex: "/analytics#sommeil-recup")
 */

function MiniBars({ data = [], color = "var(--al-primary, #1268f3)" }) {
  const valid = data.filter((v) => v != null && Number.isFinite(v));
  if (valid.length < 2) return null;
  const max = Math.max(...valid, 1);
  const min = Math.min(...valid, 0);
  const span = Math.max(1, max - min);
  return (
    <div className="alpine-recovery-mini-bars">
      {data.map((v, idx) => {
        if (v == null) return <span key={idx} className="alpine-recovery-mini-bar is-empty" />;
        const h = 20 + ((v - min) / span) * 80;
        const isLast = idx === data.length - 1;
        return (
          <span
            key={idx}
            className={`alpine-recovery-mini-bar ${isLast ? "is-last" : ""}`.trim()}
            style={{ height: `${h}%`, background: color, opacity: isLast ? 1 : 0.55 }}
          />
        );
      })}
    </div>
  );
}

function MiniLine({ data = [], color = "var(--al-primary, #1268f3)" }) {
  const valid = data.filter((v) => v != null && Number.isFinite(v));
  if (valid.length < 2) return null;
  const max = Math.max(...valid);
  const min = Math.min(...valid);
  const span = Math.max(1, max - min);
  const width = 140;
  const height = 36;
  const step = width / Math.max(1, data.length - 1);
  const path = data
    .map((v, idx) => {
      if (v == null) return "";
      const x = idx * step;
      const y = ((max - v) / span) * height;
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(" ");
  return (
    <svg
      className="alpine-recovery-mini-line"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RecoveryKpiCard({
  icon = null,
  label = "",
  value = "—",
  unit = "",
  hint = "",
  delta = "",
  tone = 3,
  gaugeValue = null,
  chartData = null,
  chartType = "bar",
  linkTo = null,
}) {
  const safeTone = clampTone(tone);

  return (
    <article className="alpine-recovery-card">
      <header className="alpine-recovery-card-head">
        {icon ? (
          <span className={`alpine-recovery-card-icon tone-${safeTone}`} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="alpine-recovery-card-label">{label}</span>
      </header>
      <div className="alpine-recovery-card-body">
        {gaugeValue != null ? (
          <KpiGaugeCircular value={gaugeValue} tone={safeTone} size="md" unit="%" />
        ) : (
          <div className="alpine-recovery-card-value-block">
            <strong className={`alpine-recovery-card-value tone-${safeTone}`}>{value}</strong>
            {unit ? <span className="alpine-recovery-card-unit">{unit}</span> : null}
          </div>
        )}
        <div className="alpine-recovery-card-meta">
          {gaugeValue != null && value !== "—" ? (
            <strong className={`alpine-recovery-card-value tone-${safeTone}`}>{value}{unit}</strong>
          ) : null}
          {hint ? <span className={`alpine-recovery-card-hint tone-${safeTone}`}>{hint}</span> : null}
          {delta ? <span className="alpine-recovery-card-delta">{delta}</span> : null}
          {chartData && chartData.length > 1 ? (
            chartType === "line"
              ? <MiniLine data={chartData} />
              : <MiniBars data={chartData} />
          ) : null}
        </div>
      </div>
      {linkTo ? (
        <Link className="alpine-recovery-card-link" to={linkTo}>
          Voir le détail
        </Link>
      ) : null}
    </article>
  );
}

export default memo(RecoveryKpiCard);
