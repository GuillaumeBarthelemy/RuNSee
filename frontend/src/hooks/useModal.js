import { useCallback, useEffect, useRef } from "react";

/**
 * useModal — hook a11y partage pour les modales :
 *   - ESC pour fermer (si !busy)
 *   - Focus trap : Tab/Shift-Tab cycle dans le modal
 *   - Focus restore : au close, redonne le focus a l'element qui avait
 *     ouvert le modal (passe via openerRef ou capture automatiquement
 *     document.activeElement au moment de l'ouverture).
 *   - Focus initial : place sur le 1er element focusable a l'ouverture.
 *
 * Usage :
 *   const { containerRef } = useModal({ open, onClose, busy });
 *   return open ? <div ref={containerRef} role="dialog" aria-modal="true">...</div> : null;
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type=\"hidden\"])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

function getFocusable(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
}

export default function useModal({ open = false, onClose = () => {}, busy = false } = {}) {
  const containerRef = useRef(null);
  const openerRef = useRef(null);

  // Capture l'opener au moment ou open devient true.
  useEffect(() => {
    if (open) {
      openerRef.current = (typeof document !== "undefined")
        ? document.activeElement
        : null;
    }
  }, [open]);

  // ESC + focus trap
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (e) => {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const focusables = getFocusable(containerRef.current);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, busy, onClose]);

  // Focus initial + restore
  useEffect(() => {
    if (!open) return undefined;
    // Defer focus to next tick so the DOM is mounted.
    const handle = setTimeout(() => {
      const focusables = getFocusable(containerRef.current);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else if (containerRef.current) {
        containerRef.current.focus();
      }
    }, 0);
    return () => {
      clearTimeout(handle);
      // Restore focus a l'opener au close.
      if (openerRef.current && typeof openerRef.current.focus === "function") {
        try { openerRef.current.focus(); } catch { /* element may have been removed */ }
      }
    };
  }, [open]);

  const handleOverlayClick = useCallback((e) => {
    if (!busy && e.target === e.currentTarget) {
      onClose();
    }
  }, [busy, onClose]);

  return { containerRef, handleOverlayClick };
}
