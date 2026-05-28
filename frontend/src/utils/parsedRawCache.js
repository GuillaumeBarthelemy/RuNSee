/**
 * Parse `activity.rawJson` UNE seule fois et memoize le resultat sur l'objet
 * activite (champ non enumerable `__rawParsed`). Evite que chaque modele
 * Performance (records, best efforts, narratives, HR segments...) re-parse
 * le meme rawJson (~15 Mo sur 980 activites) -> supprime le blocage du
 * thread principal a l'ouverture de l'onglet Performance.
 */
export function getActivityRawPayload(activity) {
  if (!activity || typeof activity !== "object") return null;
  if (Object.prototype.hasOwnProperty.call(activity, "__rawParsed")) {
    return activity.__rawParsed;
  }
  let parsed = null;
  const raw = activity.rawJson;
  if (raw) {
    if (typeof raw === "object") {
      parsed = raw;
    } else if (typeof raw === "string") {
      try { parsed = JSON.parse(raw); } catch { parsed = null; }
    }
  }
  try {
    Object.defineProperty(activity, "__rawParsed", {
      value: parsed,
      enumerable: false,
      configurable: true,
      writable: true,
    });
  } catch {
    // objet gele : on renvoie sans cacher (rare)
  }
  return parsed;
}
