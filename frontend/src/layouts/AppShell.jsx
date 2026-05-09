import AlpineTopbar from "../components/visuals/alpine/AlpineTopbar.jsx";

/**
 * AppShell — Refonte Alpine Light Lot 2-bis (mockup-faithful).
 *
 * Topbar selon mockup :
 *  - Titre de page à gauche (peut contenir emoji, ex: "Aujourd'hui 👋")
 *  - Sous-titre date longue française (ex: "Mardi 6 mai 2025") si fourni
 *  - À droite : météo placeholder désactivable + 3 boutons icônes
 *
 * Props :
 *  - eyebrow : string optionnel (compatibilité ascendante — placé avant le titre)
 *  - title : string
 *  - subtitle : string (si non fourni, date du jour générée automatiquement)
 *  - actions : ReactNode (override des 3 boutons icônes par défaut)
 *  - withDate : boolean (défaut true) — si subtitle absent, génère la date
 *  - children : sections de la page
 */

function buildLongFrenchDate(value = new Date()) {
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const formatted = date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return "";
  }
}

export default function AppShell({
  eyebrow = "",
  title = "",
  subtitle = "",
  actions = null,
  withDate = true,
  children,
}) {
  // Si pas de subtitle fourni, on génère la date longue française.
  const computedSubtitle = subtitle || (withDate ? buildLongFrenchDate() : "");
  // L'eyebrow (ex: "Aujourd'hui") est conservé en compatibilité — il devient
  // le titre principal si pas de title fourni.
  const computedTitle = title || eyebrow;

  return (
    <>
      <AlpineTopbar
        title={computedTitle}
        subtitle={computedSubtitle}
        actions={actions}
      />
      <div className="app-sections">{children}</div>
    </>
  );
}
