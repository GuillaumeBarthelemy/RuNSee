import { memo } from "react";

/**
 * SuggestedWorkoutCard — Alpine Light (Lot 3-bis, mockup-faithful).
 *
 * Carte "Sortie suggérée" sur la page Aujourd'hui.
 *
 * Affiche une ORIENTATION de séance (titre, effort, plage de durée, terrain).
 * NE PAS afficher de valeurs numériques inventées (km, D+ exact).
 * Si isPlaceholder → afficher message prudent.
 *
 * Props :
 * - title        : string
 * - subtitle     : string
 * - tags         : string[]
 * - durationRange: string|null  (ex: "45 à 70 min")
 * - terrain      : string|null  (ex: "Terrain souple si possible")
 * - isPlaceholder: boolean
 * - linkTo       : string (défaut "/analytics")
 */
function SuggestedWorkoutCard({
  title = "Sortie suggérée",
  subtitle = "",
  tags = [],
  durationRange = null,
  terrain = null,
  isPlaceholder = false,
  linkTo = "/analytics",
}) {
  return (
    <article className="alpine-suggested-workout">
      <header className="alpine-suggested-workout-head">
        <span className="alpine-suggested-workout-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M14 5 a1.5 1.5 0 1 1 -3 0 a1.5 1.5 0 0 1 3 0 Z" fill="currentColor" />
            <path
              d="M9 13 L11 11 L13 13 L15 12 M11 11 L11 17 L9 21 M13 13 L15 17 L17 20 M11 17 L7 18"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </span>
        <div className="alpine-suggested-workout-text">
          <span className="alpine-suggested-workout-kicker">Sortie suggérée</span>
          <strong className="alpine-suggested-workout-title">{title}</strong>
          {subtitle ? (
            <span className="alpine-suggested-workout-subtitle">{subtitle}</span>
          ) : null}
          {tags.length ? (
            <div className="alpine-suggested-workout-tags">
              {tags.map((tag, idx) => (
                <span key={`${tag}-${idx}`} className="alpine-suggested-workout-tag">{tag}</span>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      {!isPlaceholder && (durationRange || terrain) ? (
        <div className="alpine-suggested-workout-stats">
          {durationRange ? (
            <div>
              <span>Durée estimée</span>
              <strong>{durationRange}</strong>
            </div>
          ) : null}
          {terrain ? (
            <div>
              <span>Terrain</span>
              <strong>{terrain}</strong>
            </div>
          ) : null}
        </div>
      ) : null}

      {isPlaceholder ? (
        <p className="alpine-suggested-workout-placeholder">
          Connecte Garmin ou accumule quelques séances pour affiner la suggestion.
        </p>
      ) : null}

      <a className="alpine-button alpine-button--primary alpine-suggested-workout-cta" href={linkTo}>
        Voir le détail
      </a>
    </article>
  );
}

export default memo(SuggestedWorkoutCard);
