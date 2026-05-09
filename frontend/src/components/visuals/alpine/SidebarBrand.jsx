import { Link } from "react-router-dom";
import { memo } from "react";

/**
 * SidebarBrand — Alpine Light (Lot 2-bis).
 *
 * Brand de la sidebar avec icône montagne + nom + sous-titre "ALPINE LIGHT".
 * Conforme au mockup validé.
 */
function SidebarBrand() {
  return (
    <Link
      to="/"
      className="alpine-sidebar-brand"
      aria-label="RunNSee Alpine Light, retour à l'accueil"
    >
      <span className="alpine-sidebar-brand-icon" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path
            d="M3 26 L11 12 L17 20 L21 14 L29 26 Z"
            fill="var(--al-primary, #1268f3)"
            fillOpacity="0.9"
          />
          <path
            d="M11 12 L13 9 L15 12"
            stroke="var(--al-primary-stronger, #0a4fbb)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="alpine-sidebar-brand-text">
        <strong>RunNSee</strong>
        <span>ALPINE LIGHT</span>
      </span>
    </Link>
  );
}

export default memo(SidebarBrand);
