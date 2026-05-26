import { useCallback, useEffect, useMemo, useState } from "react";
import useAuth from "../hooks/useAuth.js";
import { updatePreferences as apiUpdatePreferences } from "../services/account.service.js";
import { UserPreferencesContext } from "./UserPreferencesContextBase.js";

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

  const setPreferences = useCallback(async (next) => {
    const payload = {};
    if (next.theme !== undefined) {
      setThemeState(next.theme);
      payload.theme = next.theme;
    }
    if (next.units !== undefined) {
      setUnitsState(next.units);
      payload.units = next.units;
    }
    if (next.density !== undefined) {
      setDensityState(next.density);
      payload.density = next.density;
    }
    if (Object.keys(payload).length > 0) {
      try {
        await apiUpdatePreferences(payload);
        if (typeof refreshUser === "function") {
          await refreshUser();
        }
      } catch (err) {
        // Si le backend echoue, on rollback dans la prochaine sync user
        // mais on n'efface pas l'UX optimiste. On expose juste l'erreur.
        if (typeof console !== "undefined") {
          console.error("[UserPreferences] save failed", err);
        }
        throw err;
      }
    }
  }, [refreshUser]);

  const value = useMemo(() => ({ theme, units, density, setPreferences }), [theme, units, density, setPreferences]);

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}
