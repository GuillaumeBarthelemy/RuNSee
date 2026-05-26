import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToastContext } from "./ToastContextBase.js";

let toastIdCounter = 0;

/**
 * ToastProvider — Systeme de notifications transitoires.
 *
 * Usage : const { pushToast } = useToast();
 *         pushToast({ message: "Saved", tone: "success" });
 *
 * Tones : success | error | info | warning
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
    toastIdCounter += 1;
    const id = `toast-${toastIdCounter}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
    if (duration > 0) {
      const tm = setTimeout(() => removeToast(id), duration);
      timersRef.current.set(id, tm);
    }
    return id;
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
            <span className="alpine-toast-message">{t.message}</span>
            <button type="button" className="alpine-toast-close" onClick={() => removeToast(t.id)} aria-label="Fermer">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
