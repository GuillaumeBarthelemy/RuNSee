import { Link } from "react-router-dom";

/**
 * GlossaryLink — Lien compact vers une entrée du glossaire.
 *
 * Privilégier ce composant aux longues infobulles (cf. UX_CHARTE.md règles
 * tooltip mobile).
 *
 * Props :
 * - termKey : string — clé de l'entrée (ex: "vfc", "gap", "ctl")
 * - children : optionnel — texte du lien (défaut : "Voir définition complète →")
 * - className : optionnel
 */
export default function GlossaryLink({ termKey, children, className = "" }) {
  if (!termKey) return null;

  return (
    <Link
      to={`/glossaire#${termKey}`}
      className={`glossary-link ${className}`.trim()}
    >
      {children || "Voir définition complète →"}
    </Link>
  );
}
