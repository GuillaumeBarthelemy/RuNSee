import { useState } from "react";
import useCompactLayout from "../hooks/useCompactLayout.js";

export default function MobileFoldableSection({
  title,
  subtitle = "",
  defaultOpen = false,
  breakpoint = 640,
  className = "",
  children,
}) {
  const isCompact = useCompactLayout(breakpoint);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!isCompact) {
    return className ? <div className={className}>{children}</div> : <>{children}</>;
  }

  return (
    <section className={`card mobile-foldable ${className}`.trim()}>
      <button
        type="button"
        className="mobile-foldable-trigger"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <div className="mobile-foldable-copy">
          <h3 className="subcard-title">{title}</h3>
          {subtitle ? <p className="small-text">{subtitle}</p> : null}
        </div>
        <span className={`mobile-foldable-chevron ${isOpen ? "is-open" : ""}`.trim()} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {isOpen ? <div className="mobile-foldable-content top-gap-sm">{children}</div> : null}
    </section>
  );
}
