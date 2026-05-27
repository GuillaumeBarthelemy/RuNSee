/**
 * Helpers de presentation pour la qualite des donnees (Reglages > Donnees).
 * Extrait du composant pour respecter react-refresh (un fichier ne peut
 * exporter que des composants OU des helpers, pas les deux).
 */

export function pickColor(pct) {
  if (pct >= 90) return "#15803d";
  if (pct >= 70) return "#22c55e";
  if (pct >= 50) return "#eab308";
  return "#f97316";
}

/**
 * Transforme la reponse `/sync/data-quality` en barres affichables.
 * Omet la barre `power` si le backend retourne `power: null`.
 */
export function buildQualityBars(payload) {
  if (!payload || typeof payload !== "object") {
    return { total: 0, bars: [] };
  }
  const { total = 0, complete, fc, power, altimetry } = payload;
  const mkBar = (key, label, m) => (m
    ? { key, label, value: m.pct, of: m.count, total, color: pickColor(m.pct) }
    : null
  );
  const bars = [
    mkBar("complete",  "Activités complètes", complete),
    mkBar("fc",        "FC continue",         fc),
    mkBar("power",     "Puissance",           power),
    mkBar("altimetry", "Altimétrie",          altimetry),
  ].filter(Boolean);
  return { total, bars };
}
