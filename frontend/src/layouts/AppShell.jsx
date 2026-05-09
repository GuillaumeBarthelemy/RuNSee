/**
 * AppShell — wrapper commun pour les pages.
 *
 * Refonte Alpine Light (Lot 2) :
 * - Le header de page utilise désormais le style Alpine Light (eyebrow bleu,
 *   titre sombre, fond doux). Le rendu reste compatible avec toutes les pages
 *   existantes qui passent eyebrow/title/subtitle/actions.
 * - Aucune modification de la prop `children` : les sections existantes
 *   (cards, .section, etc.) restent inchangées.
 */
export default function AppShell({ eyebrow, title, subtitle, actions = null, children }) {
  return (
    <>
      <header className="app-header app-header-alpine">
        <div className="app-header-copy">
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          <h1 className="page-title">{title}</h1>
          {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="app-header-actions">{actions}</div> : null}
      </header>

      <div className="app-sections">{children}</div>
    </>
  );
}
