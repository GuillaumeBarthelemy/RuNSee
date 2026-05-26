import { memo, useEffect } from "react";

/**
 * ConfirmDialog — Modal de confirmation reutilisable.
 */
function ConfirmDialog({
  open = false,
  title = "Confirmation",
  description = "",
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  tone = "primary",
  onConfirm = () => {},
  onCancel = () => {},
}) {
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="reglages-modal-overlay" onClick={onCancel} role="presentation">
      <div className="reglages-modal" role="dialog" aria-modal="true" aria-labelledby="reglages-confirm-title" onClick={(e) => e.stopPropagation()}>
        <h3 id="reglages-confirm-title" className="reglages-modal-title">{title}</h3>
        {description ? <p className="reglages-modal-description">{description}</p> : null}
        <div className="reglages-modal-actions">
          <button type="button" className="reglages-btn" onClick={onCancel}>{cancelLabel}</button>
          <button
            type="button"
            className={`reglages-btn ${tone === "danger" ? "reglages-btn-danger" : "reglages-btn-primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ConfirmDialog);
