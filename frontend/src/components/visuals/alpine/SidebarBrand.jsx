import { Link } from "react-router-dom";
import { memo } from "react";
import BrandMountainIcon from "./BrandMountainIcon.jsx";

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
        <BrandMountainIcon />
      </span>
      <span className="alpine-sidebar-brand-text">
        <strong>RunNSee</strong>
        <span>ALPINE LIGHT</span>
      </span>
    </Link>
  );
}

export default memo(SidebarBrand);
