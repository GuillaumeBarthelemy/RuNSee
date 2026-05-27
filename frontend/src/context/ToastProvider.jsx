import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToastContext } from "./ToastContextBase.js";

let toastIdCounter = 0;
const MAX_VISIBLE_TOASTS = 5;
const DEDUP_WINDOW_MS = 3000;

/**
 * ToastProvider — Systeme de notifications transitoires.
 *
 * Usage : const { pushToast } = useToast();
 *         pushToast({ message: "Saved", tone: "success" });
 *
 * Tones : success | error | info | warning
 *
 * Garanties :
 *   - max MAX_VISIBLE_TOASTS visibles simultanement (les plus anciens evinces)
 *   - dedup : si un toast identique (message + tone) est emis dans la fenetre
 *     DEDUP_WINDOW_MS, on incremente son compteur au lieu d'empiler un doublon
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const tm = timersRef.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timersRef.current.delete(id);
    }
  }, []);

  const pushToast = useCallback(({ message, tone = "info", duration = 4500 }) => {
    const now = Date.now();
    // Pre-generation de l'id : on decide hors callback pour pouvoir creer le timer.
    toastIdCounter += 1;
    const newId = `toast-${toastIdCounter}`;
    let usedId = newId;
    setToasts((prev) => {
      const dup = prev.find(
        (t) => t.message === message && t.tone === tone && now - t.createdAt < DEDUP_WINDOW_MS,
      );
      if (dup) {
        usedId = dup.id;
        return prev.map((t) => (t.id === dup.id
          ? { ...t, count: (t.count || 1) + 1, createdAt: now }
          : t));
      }
      const next = [...prev, { id: newId, message, tone, count: 1, createdAt: now }];
      if (next.length > MAX_VISIBLE_TOASTS) {
        const evicted = next.slice(0, next.length - MAX_VISIBLE_TOASTS);
        evicted.forEach((t) => {
          const tm = timersRef.current.get(t.id);
          if (tm) {
            clearTimeout(tm);
            timersRef.current.delete(t.id);
          }
        });
        return next.slice(next.length - MAX_VISIBLE_TOASTS);
      }
      return next;
    });
    // Si dedup : reset le timer existant pour prolonger sa visibilite.
    if (usedId !== newId) {
      const oldTm = timersRef.current.get(usedId);
      if (oldTm) clearTimeout(oldTm);
    }
    if (duration > 0) {
      const tm = setTimeout(() => removeToast(usedId), duration);
      timersRef.current.set(usedId, tm);
    }
    return usedId;
  }, [removeToast]);

  useEffect(() => () => {
    timersRef.current.forEach((tm) => clearTimeout(tm));
    timersRef.current.clear();
  }, []);

  const value = useMemo(() => ({ pushToast, removeToast }), [pushToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="alpine-toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`alpine-toast alpine-toast-${t.tone}`} onClick={() => removeToast(t.id)}>
            <span className="alpine-toast-message">
              {t.message}
              {t.count > 1 ? <span className="alpine-toast-count"> ×{t.count}</span> : null}
            </span>
            <button type="button" className="alpine-toast-close" onClick={() => removeToast(t.id)} aria-label="Fermer">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
