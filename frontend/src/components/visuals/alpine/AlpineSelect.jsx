import { memo } from "react";

/**
 * AlpineSelect — Sélecteur dropdown stylisé Alpine Light.
 *
 * Remplace les pill toggles quand le mockup montre un `<select>` avec
 * chevron. Conserve le <select> natif (a11y, mobile, keyboard).
 *
 * Props :
 *  - value : valeur courante
 *  - options : [{ value, label }]
 *  - onChange : (newValue) => void
 *  - ariaLabel : libellé accessibilité
 *  - size : "sm" (défaut) | "md"
 */
function AlpineSelect({ value, options = [], onChange = () => {}, ariaLabel = "", size = "sm" }) {
  return (
    <div className={`alpine-select alpine-select--${size}`}>
      <select
        className="alpine-select-control"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <svg className="alpine-select-chevron" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
        <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default memo(AlpineSelect);
