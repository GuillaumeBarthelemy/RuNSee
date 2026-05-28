import {
  buildAerobicDecouplingProfile,
  buildVariabilityIndex,
  buildSessionTimeInZone,
  buildCadenceProfile,
} from "./intraSessionMetrics.js";
import { getSessionTypeDef } from "../constants/sessionTaxonomy.js";

/**
 * Construit 3-4 "À retenir" synthetiques pour une activite, a partir des
 * metriques deja disponibles (classification, zones FC, decouplage, VI,
 * cadence). Chaque bullet : { key, icon, text, tone }.
 *
 * tone : "positive" | "neutral" | "warning"
 */
export function buildActivityTakeaways(activity = {}, { settings = null } = {}) {
  if (!activity) return [];
  const bullets = [];

  // 1. Type d'effort (classification user)
  const typeDef = getSessionTypeDef(activity.userSessionType);
  if (typeDef) {
    bullets.push({
      key: "type",
      icon: typeDef.icon,
      text: `Séance classée « ${typeDef.label} »${activity.userClassifiedAt ? "" : " (auto)"}.`,
      tone: "neutral",
    });
  }

  // 2. Repartition zones FC (dominante)
  const zones = buildSessionTimeInZone(activity, { settings });
  if (zones.hasData && Array.isArray(zones.zones)) {
    const dominant = [...zones.zones].sort((a, b) => b.sharePercent - a.sharePercent)[0];
    if (dominant && dominant.sharePercent > 0) {
      const easy = ["z1", "z2"].includes(dominant.key);
      bullets.push({
        key: "zones",
        icon: easy ? "🟢" : dominant.key === "z3" ? "🟡" : "🔴",
        text: `Dominante ${dominant.shortLabel} (${dominant.sharePercent} % du temps).`,
        tone: easy ? "positive" : dominant.key === "z3" ? "neutral" : "warning",
      });
    }
  }

  // 3. Derive cardiaque (course uniquement, pertinente en aerobie)
  const decoupling = buildAerobicDecouplingProfile(activity, { settings });
  if (decoupling.hasData) {
    const stable = decoupling.decouplingPercent < 5;
    bullets.push({
      key: "decoupling",
      icon: stable ? "💚" : "📈",
      text: stable
        ? `Dérive cardiaque faible (${decoupling.decouplingPercent} %) : effort bien géré.`
        : `Dérive cardiaque marquée (${decoupling.decouplingPercent} %) : fatigue ou allure trop haute.`,
      tone: stable ? "positive" : "warning",
    });
  } else {
    // 3b. Fallback : Variability Index si pas de decouplage
    const vi = buildVariabilityIndex(activity);
    if (vi.hasData) {
      const steady = vi.variabilityIndex <= 1.05;
      bullets.push({
        key: "vi",
        icon: steady ? "📏" : "🎢",
        text: steady
          ? `Effort linéaire (VI ${vi.variabilityIndex.toFixed(2)}).`
          : `Effort fractionné (VI ${vi.variabilityIndex.toFixed(2)}).`,
        tone: "neutral",
      });
    }
  }

  // 4. Cadence vs cible
  const cadence = buildCadenceProfile(activity);
  if (cadence.hasData && cadence.cadenceSpm > 0) {
    const inTarget = cadence.cadenceSpm >= 170 && cadence.cadenceSpm <= 185;
    bullets.push({
      key: "cadence",
      icon: "👟",
      text: inTarget
        ? `Cadence dans la cible (${cadence.cadenceSpm} spm).`
        : cadence.cadenceSpm < 170
          ? `Cadence basse (${cadence.cadenceSpm} spm) : vise 170-185 pour limiter l'impact.`
          : `Cadence élevée (${cadence.cadenceSpm} spm).`,
      tone: inTarget ? "positive" : "neutral",
    });
  }

  return bullets;
}
