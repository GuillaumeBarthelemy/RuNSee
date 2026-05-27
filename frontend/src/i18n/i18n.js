/**
 * i18n minimal maison — wrapper pour migration future vers react-i18next.
 *
 * API publique (compatible react-i18next) :
 *   const t = useTranslation();
 *   t("common.save")                // -> "Enregistrer"
 *   t("common.unknown", "Defaut")   // -> "Defaut" si cle manquante
 *
 * Le pilotage de la langue est fait par UserPreferencesProvider qui appelle
 * setLanguage(user.language).
 *
 * Limitations volontaires :
 *   - pas d'interpolation {{var}} (a ajouter si besoin)
 *   - pas de pluralisation
 *   - resolution synchrone (pas de lazy load)
 *
 * Pour migrer vers react-i18next plus tard : remplacer ce fichier par
 * `import { useTranslation } from "react-i18next"` et garder la meme API.
 */
import { useCallback, useEffect, useState } from "react";
import fr from "./locales/fr.js";
import en from "./locales/en.js";

const LOCALES = { fr, en };
const DEFAULT_LOCALE = "fr";

let currentLocale = DEFAULT_LOCALE;
const subscribers = new Set();

function resolveKey(table, key) {
  return String(key || "").split(".").reduce((acc, k) => {
    if (acc && typeof acc === "object") return acc[k];
    return undefined;
  }, table);
}

export function getLocale() {
  return currentLocale;
}

export function setLanguage(lang) {
  const next = LOCALES[lang] ? lang : DEFAULT_LOCALE;
  if (next === currentLocale) return;
  currentLocale = next;
  subscribers.forEach((cb) => cb(next));
}

export function t(key, fallback = "") {
  const table = LOCALES[currentLocale] || LOCALES[DEFAULT_LOCALE];
  const found = resolveKey(table, key);
  if (typeof found === "string") return found;
  if (fallback) return fallback;
  // En dev, retourne la cle pour aider a reperer les manques.
  return key;
}

/**
 * Hook React : retourne `t` qui re-rend le composant quand la langue change.
 */
export function useTranslation() {
  const [, setTick] = useState(currentLocale);
  useEffect(() => {
    const cb = (next) => setTick(next);
    subscribers.add(cb);
    return () => { subscribers.delete(cb); };
  }, []);
  const translate = useCallback((key, fallback) => t(key, fallback), []);
  return translate;
}
