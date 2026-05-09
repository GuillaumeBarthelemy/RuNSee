import { memo } from "react";
import { Link } from "react-router-dom";
import ConfidenceDots from "./ConfidenceDots.jsx";
import { clampTone } from "../../../utils/tonePicker.js";

/**
 * TodayReadingCard — Alpine Light (Lot 3-bis, mockup-faithful).
 *
 * Carte horizontale "Lecture du jour" sur la page Aujourd'hui.
 *
 * Layout (mockup) :
 *  - Kicker "Lecture du jour" en haut à gauche
 *  - Icône grande (cercle vert clair) à gauche
 *  - Titre verdict + 1 phrase descriptive au centre
 *  - À droite : ConfidenceDots
 *  - Bouton ">" pour aller voir Analyse
 *
 * Props :
 * - title : string (ex: "Prêt pour une bonne sortie")
 * - description : string (ex: "Charge maitrisée, fatigue modérée...")
 * - tone : 1..5 (couleur de l'icône)
 * - icon : ReactNode optionnel (par défaut : runner)
 * - confidenceLevel : "high" | "medium" | "low" | "insufficient"
 * - linkTo : string (défaut "/analytics")
 */

function DefaultIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14.5 4.5 a1.5 1.5 0 1 1 -3 0 a1.5 1.5 0 0 1 3 0 Z"
        fill="currentColor"
      />
      <path
        d="M9 13 L11 10 L13 12 L15 11 M11 10 L11 16 L9 21 M13 12 L15 16 L17 21 M11 16 L7 17"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function TodayReadingCard({
  title = "Lecture du jour",
  description = "",
  tone = 3,
  icon = null,
  confidenceLevel = "medium",
  linkTo = "/analytics",
}) {
  const safeTone = clampTone(tone);

  return (
    <section className="alpine-today-reading-card">
      <span className="alpine-today-reading-kicker">Lecture du jour</span>
      <div className="alpine-today-reading-body">
        <span className={`alpine-today-reading-icon tone-${safeTone}-bg`} aria-hidden="true">
          <span className={`alpine-today-reading-icon-inner tone-${safeTone}`}>
            {icon || <DefaultIcon />}
          </span>
        </span>
        <div className="alpine-today-reading-text">
          <strong className="alpine-today-reading-title">{title}</strong>
          {description ? <p className="alpine-today-reading-description">{description}</p> : null}
        </div>
        <div className="alpine-today-reading-meta">
          <ConfidenceDots level={confidenceLevel} />
          <Link
            to={linkTo}
            className="alpine-today-reading-link"
            aria-label="Voir l'analyse complète"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M9 6 L15 12 L9 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default memo(TodayReadingCard);
