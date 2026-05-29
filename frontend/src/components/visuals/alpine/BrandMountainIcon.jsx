import { memo } from "react";

/**
 * BrandMountainIcon — marque montagne RunNSee (silhouette multi-pics).
 *
 * Source unique de vérité pour le pictogramme de marque utilisé dans la
 * sidebar, les cartes objectif/conseil et les puces "à retenir".
 * Rendu en `currentColor` → se teinte selon le contexte (sidebar sombre,
 * carte claire…) et reste net à toutes les tailles (SVG).
 *
 * Le SVG s'adapte à la taille du conteneur (width/height 100%).
 */
function BrandMountainIcon({ className = "", title = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      width="100%"
      height="100%"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : "true"}
    >
      {title ? <title>{title}</title> : null}
      {/* Massif principal : 3 pics, sommet central dominant */}
      <path
        d="M1.5 20 L6.5 10.5 L9.5 14 L13 6.5 L16.5 13 L19 10 L22.5 20 Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      {/* Capuchons neige (sommets) */}
      <path
        d="M13 6.5 L11.4 9 L13 10 L14.6 9 Z M6.5 10.5 L5.6 11.9 L6.5 12.4 L7.4 11.9 Z"
        fill="currentColor"
        fillOpacity="0.55"
      />
    </svg>
  );
}

export default memo(BrandMountainIcon);
