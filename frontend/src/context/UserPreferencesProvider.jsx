import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useAuth from "../hooks/useAuth.js";
import { updatePreferences as apiUpdatePreferences } from "../services/account.service.js";
import { setLanguage as setI18nLanguage } from "../i18n/i18n.js";
import { UserPreferencesContext } from "./UserPreferencesContextBase.js";

const PREFERENCES_DEBOUNCE_MS = 500;

function pickPreferences(user) {
  return {
    theme: user?.themePreference || "light",
    units: user?.unitsPreference || "metric",
    density: user?.densityPreference || "comfort",
  };
}

/**
 * UserPreferencesProvider — Source unique de verite pour les preferences UI.
 *
 * Lit depuis user (auth) :
 *   - themePreference  -> theme  (light | dark | auto)
 *   - unitsPreference  -> units  (metric | imperial)
 *   - densityPreference-> density (comfort | compact)
 *
 * Applique des side effects :
 *   - data-theme="light|dark" sur <html>
 *   - data-density="comfort|compact" sur <html>
 *
 * Sauvegarde via PATCH /auth/preferences quand un setter est appele.
 */
export function UserPreferencesProvider({ children }) {
  const { user, refreshUser } = useAuth();
  // Lecture initiale a partir de l'user courant. Les changements ulterieurs
  // de user.* sont gerees via la cle de remontage (themePreference change ->
  // re-render via useMemo plus bas) + le setPreferences local.
  const initial = pickPreferences(user);
  const [theme, setThemeState] = useState(initial.theme);
  const [units, setUnitsState] = useState(initial.units);
  const [density, setDensityState] = useState(initial.density);

  // Quand user change reellement (login, refresh apres save), aligne le state local.
  const userThemeKey = `${user?.id || "anon"}:${user?.themePreference || "light"}:${user?.unitsPreference || "metric"}:${user?.densityPreference || "comfort"}`;
  useEffect(() => {
    const next = pickPreferences(user);
    setThemeState(next.theme);
    setUnitsState(next.units);
    setDensityState(next.density);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userThemeKey]);

  // Side effect : applique sur <html>
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const resolvedTheme = theme === "auto"
      ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
    root.setAttribute("data-theme", resolvedTheme);
    root.setAttribute("data-density", density);
  }, [theme, density]);

  // i18n : pilote la langue depuis user.language (default 'fr').
  useEffect(() => {
    setI18nLanguage(user?.language || "fr");
  }, [user?.language]);

  // Debounce + coalesce : si l'utilisateur change rapidement theme puis
  // density, on n'envoie qu'1 seul PATCH avec les 2 champs.
  const pendingPayloadRef = useRef({});
  const debounceTimerRef = useRef(null);

  const flushPreferences = useCallback(async () => {
    debounceTimerRef.current = null;
    const payload = pendingPayloadRef.current;
    pendingPayloadRef.current = {};
    if (Object.keys(payload).length === 0) return;
    try {
      await apiUpdatePreferences(payload);
      if (typeof refreshUser === "function") {
        await refreshUser();
      }
    } catch (err) {
      // UX optimiste conservee ; la prochaine sync user remettra d'aplomb.
      if (typeof console !== "undefined") {
        console.error("[UserPreferences] save failed", err);
      }
    }
  }, [refreshUser]);

  // Cleanup au demontage : flush immediat si payload en attente.
  useEffect(() => () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      // Flush sync best-effort (non-await possible car unmount).
      const payload = pendingPayloadRef.current;
      if (Object.keys(payload).length > 0) {
        apiUpdatePreferences(payload).catch(() => {});
      }
      pendingPayloadRef.current = {};
    }
  }, []);

  const setPreferences = useCallback((next) => {
    if (next.theme !== undefined) {
      setThemeState(next.theme);
      pendingPayloadRef.current.theme = next.theme;
    }
    if (next.units !== undefined) {
      setUnitsState(next.units);
      pendingPayloadRef.current.units = next.units;
    }
    if (next.density !== undefined) {
      setDensityState(next.density);
      pendingPayloadRef.current.density = next.density;
    }
    if (Object.keys(pendingPayloadRef.current).length === 0) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(flushPreferences, PREFERENCES_DEBOUNCE_MS);
  }, [flushPreferences]);

  const value = useMemo(() => ({ theme, units, density, setPreferences }), [theme, units, density, setPreferences]);

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}
