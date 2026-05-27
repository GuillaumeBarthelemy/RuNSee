import { memo, useEffect, useRef, useState } from "react";

/**
 * PlatformActionsMenu — Dropdown menu pour le bouton "⋮" d'une plateforme.
 *
 * Actions = [{ label, danger?, disabled?, onClick }]
 */
function PlatformActionsMenu({ actions = [] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (!actions.length) return null;

  return (
    <div className="reglages-platform-actions-menu" ref={ref}>
      <button
        type="button"
        className="reglages-platform-more"
        aria-label="Plus d'actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
      >
        ⋮
      </button>
      {open ? (
        <ul className="reglages-platform-menu" role="menu">
          {actions.map((action, i) => (
            <li key={i} role="none">
              <button
                type="button"
                role="menuitem"
                className={`reglages-platform-menu-item ${action.danger ? "is-danger" : ""}`}
                disabled={action.disabled}
                onClick={() => { setOpen(false); action.onClick?.(); }}
              >
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default memo(PlatformActionsMenu);
