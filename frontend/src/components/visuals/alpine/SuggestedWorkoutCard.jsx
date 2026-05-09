import { memo } from "react";

/**
 * SuggestedWorkoutCard — Alpine Light (Lot 3-bis, mockup-faithful).
 *
 * Carte "Sortie suggérée" sur la page Aujourd'hui, à droite des 4 cards
 * récupération.
 *
 * **PLACEHOLDER** — V7 validée user. La génération automatique de séance
 * personnalisée est journalisée dans le backlog
 * (`docs/backlog/BACKLOG_FONCTIONNALITES_FUTURES.md` section 2).
 *
 * Pour l'instant : affiche un type de sortie cohérent avec le verdict
 * (endurance par défaut), avec mention « Suggestion : ... » pour bien
 * marquer le caractère indicatif.
 *
 * Props :
 * - title : string (ex: "Sortie Endurance")
 * - tags : array de string (ex: ["Zone 2", "Endurance"])
 * - distanceKm : number|null (ex: 12.4)
 * - durationLabel : string|null (ex: "1:02")
 * - elevationGainMeters : number|null (ex: 620)
 * - linkTo : string optionnel (défaut "/analytics")
 */

function formatDistance(km) {
  if (km == null || !Number.isFinite(km)) return "—";
  return km.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function SuggestedWorkoutCard({
  title = "Sortie suggérée",
  tags = [],
  distanceKm = null,
  durationLabel = null,
  elevationGainMeters = null,
  linkTo = "/analytics",
}) {
  return (
    <article className="alpine-suggested-workout">
      <header className="alpine-suggested-workout-head">
        <span className="alpine-suggested-workout-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M14 5 a1.5 1.5 0 1 1 -3 0 a1.5 1.5 0 0 1 3 0 Z"
              fill="currentColor"
            />
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
          {tags.length ? (
            <div className="alpine-suggested-workout-tags">
              {tags.map((tag, idx) => (
                <span key={`${tag}-${idx}`} className="alpine-suggested-workout-tag">{tag}</span>
              ))}
            </div>
          ) : null}
        </div>
      </header>
      <div className="alpine-suggested-workout-stats">
        <div>
          <span>Distance</span>
          <strong>{formatDistance(distanceKm)} km</strong>
        </div>
        <div>
          <span>Durée</span>
          <strong>{durationLabel || "—"}</strong>
        </div>
        <div>
          <span>Dénivelé</span>
          <strong>{elevationGainMeters != null ? `${Math.round(elevationGainMeters)} m` : "—"}</strong>
        </div>
      </div>
      <a className="alpine-button alpine-button--primary alpine-suggested-workout-cta" href={linkTo}>
        Voir le détail
      </a>
    </article>
  );
}

export default memo(SuggestedWorkoutCard);
