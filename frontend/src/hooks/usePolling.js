import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook de polling avec backoff exponentiel et arret apres N erreurs consecutives.
 *
 * @param {Function} fn — fonction async a executer a chaque tick
 * @param {Object}   opts
 * @param {boolean}  opts.enabled — si false, le polling est suspendu (cleanup propre)
 * @param {number}   opts.baseIntervalMs — intervalle initial (default 5000)
 * @param {number}   opts.maxIntervalMs — plafond du backoff (default 30000)
 * @param {number}   opts.maxConsecutiveErrors — stop apres N echecs (default 10)
 * @param {Function} opts.onError — callback (err, consecutiveErrors)
 * @param {Array<number>} opts.stopOnHttpStatus — arret immediat si l'erreur
 *   contient un de ces status (default [401, 403]). Evite de continuer a
 *   poller apres deconnexion / perte de droits.
 *
 * Retourne `{ stop, restart, errorCount }`. Le cleanup au unmount est garanti.
 */
export default function usePolling(fn, {
  enabled = true,
  baseIntervalMs = 5000,
  maxIntervalMs = 30000,
  maxConsecutiveErrors = 10,
  onError,
  stopOnHttpStatus = [401, 403],
} = {}) {
  const fnRef = useRef(fn);
  const onErrorRef = useRef(onError);
  const timerRef = useRef(null);
  const errorCountRef = useRef(0);
  const stoppedRef = useRef(false);
  const [errorCount, setErrorCount] = useState(0);

  // Maintient des refs frais pour eviter de redemarrer le polling a chaque
  // rerender de fn / onError.
  useEffect(() => {
    fnRef.current = fn;
    onErrorRef.current = onError;
  });

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback(() => {
    if (stoppedRef.current) return;
    // Backoff exponentiel : base * 2^consecutiveErrors, capped.
    const errors = errorCountRef.current;
    const delay = Math.min(baseIntervalMs * Math.pow(2, errors), maxIntervalMs);
    timerRef.current = setTimeout(tick, delay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseIntervalMs, maxIntervalMs]);

  async function tick() {
    if (stoppedRef.current) return;
    try {
      await fnRef.current();
      if (errorCountRef.current !== 0) {
        errorCountRef.current = 0;
        setErrorCount(0);
      }
    } catch (err) {
      errorCountRef.current += 1;
      setErrorCount(errorCountRef.current);
      if (typeof onErrorRef.current === "function") {
        try { onErrorRef.current(err, errorCountRef.current); } catch { /* swallow */ }
      }
      // Stop immediat sur 401/403 (deconnexion, perte de droits).
      const status = err?.response?.status;
      if (status && Array.isArray(stopOnHttpStatus) && stopOnHttpStatus.includes(status)) {
        stoppedRef.current = true;
        return;
      }
      if (errorCountRef.current >= maxConsecutiveErrors) {
        stoppedRef.current = true;
        return;
      }
    }
    scheduleNext();
  }

  const stop = useCallback(() => {
    stoppedRef.current = true;
    clearTimer();
  }, [clearTimer]);

  const restart = useCallback(() => {
    stoppedRef.current = false;
    errorCountRef.current = 0;
    setErrorCount(0);
    clearTimer();
    timerRef.current = setTimeout(tick, baseIntervalMs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseIntervalMs, clearTimer]);

  useEffect(() => {
    if (!enabled) {
      stoppedRef.current = true;
      clearTimer();
      return undefined;
    }
    stoppedRef.current = false;
    errorCountRef.current = 0;
    timerRef.current = setTimeout(tick, baseIntervalMs);
    return () => {
      stoppedRef.current = true;
      clearTimer();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, baseIntervalMs]);

  return { stop, restart, errorCount };
}
