import { memo } from "react";

/**
 * PageHeader — Alpine Light (Lot 1).
 *
 * En-tête de page avec eyebrow, titre, sous-titre et actions optionnelles.
 * Bandeau montagne discret en arrière-plan.
 *
 * Props :
 * - eyebrow : string (ex: "Aujourd'hui", "Performance")
 * - title : string
 * - subtitle : string optionnel
 * - actions : ReactNode optionnel (boutons/filtres à droite)
 * - withMountains : boolean (défaut true) — affiche le bandeau visuel discret
 */
function PageHeader({
  eyebrow = "",
  title = "",
  subtitle = "",
  actions = null,
  withMountains = true,
}) {
  return (
    <header className={`alpine-page-header ${withMountains ? "with-mountains" : ""}`.trim()}>
      <div className="alpine-page-header-inner">
        <div className="alpine-page-header-text">
          {eyebrow ? <span className="alpine-page-header-eyebrow">{eyebrow}</span> : null}
          {title ? <h1 className="alpine-page-header-title">{title}</h1> : null}
          {subtitle ? <p className="alpine-page-header-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="alpine-page-header-actions">{actions}</div> : null}
      </div>
    </header>
  );
}

export default memo(PageHeader);
