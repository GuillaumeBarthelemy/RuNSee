import { memo } from "react";
import { Link } from "react-router-dom";
import BrandMountainIcon from "./BrandMountainIcon.jsx";

/**
 * SidebarAdviceCard — Alpine Light (Lot 2-bis).
 *
 * Carte "Conseil du jour" dans la sidebar.
 * Conseil court (1-2 phrases), ton coach descriptif et prudent.
 *
 * Props :
 * - title : string (défaut "Conseil du jour")
 * - children : texte du conseil
 * - linkTo : optionnel — destination du lien "Voir tous les conseils"
 *
 * Note : le contenu coach est volontairement neutre par défaut. Sur la page
 * Aujourd'hui, il sera remplacé par une reformulation du verdict du jour
 * via le hook approprié (Lot 3-bis).
 */
function SidebarAdviceCard({
  title = "Conseil du jour",
  children = null,
  linkTo = null,
}) {
  const adviceText = children || "Hydrate-toi avant l'effort. Une bonne récupération est la base d'une progression durable.";

  return (
    <article className="alpine-sidebar-advice-card">
      <span className="alpine-sidebar-advice-kicker" aria-hidden="true">
        <BrandMountainIcon />
      </span>
      <strong className="alpine-sidebar-advice-title">{title}</strong>
      <p className="alpine-sidebar-advice-text">{adviceText}</p>
      {linkTo ? (
        <Link className="alpine-sidebar-advice-link" to={linkTo}>
          Voir tous les conseils
        </Link>
      ) : null}
    </article>
  );
}

export default memo(SidebarAdviceCard);
