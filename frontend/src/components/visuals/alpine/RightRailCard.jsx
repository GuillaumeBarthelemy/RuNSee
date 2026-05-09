import { memo } from "react";

/**
 * RightRailCard — Alpine Light (Lot 1).
 *
 * Carte simple pour la colonne droite (synthèse, conseils, météo, etc.).
 * Format compact, fond blanc/soft, titre + contenu.
 *
 * Props :
 * - title : string
 * - subtitle : string optionnel
 * - children : contenu
 * - footer : ReactNode optionnel (lien ou action)
 * - variant : "plain" (défaut) | "soft" (fond légèrement teinté)
 */
function RightRailCard({
  title = "",
  subtitle = "",
  children = null,
  footer = null,
  variant = "plain",
}) {
  const safeVariant = variant === "soft" ? "soft" : "plain";

  return (
    <article className={`alpine-rail-card alpine-rail-card--${safeVariant}`}>
      {title || subtitle ? (
        <header className="alpine-rail-card-head">
          {title ? <h3 className="alpine-rail-card-title">{title}</h3> : null}
          {subtitle ? <p className="alpine-rail-card-subtitle">{subtitle}</p> : null}
        </header>
      ) : null}
      <div className="alpine-rail-card-body">{children}</div>
      {footer ? <footer className="alpine-rail-card-footer">{footer}</footer> : null}
    </article>
  );
}

export default memo(RightRailCard);
