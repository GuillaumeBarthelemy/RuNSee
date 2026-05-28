import prisma from "../../config/prisma.js";

/**
 * Classification utilisateur des seances — taxonomie + heuristiques d'auto-
 * suggestion + persistance.
 *
 * 3 axes :
 *   - sessionType  : 1 valeur enum (obligatoire pour classifier)
 *   - markers      : multi-select tags (max 4)
 *   - notes        : texte libre 500 chars
 *
 * Un userClassifiedAt non null signale que la valeur a ete confirmee par
 * l'utilisateur (vs auto-suggestion en attente).
 */

export const SESSION_TYPES = Object.freeze({
  endurance_fond:  { label: "Endurance fondamentale", intensity: "low" },
  sortie_longue:   { label: "Sortie longue",          intensity: "low" },
  recuperation:    { label: "Récupération",           intensity: "low" },
  tempo:           { label: "Tempo / Seuil 2",        intensity: "mid" },
  seuil:           { label: "Seuil / Lactate",        intensity: "mid" },
  vma_courte:      { label: "VMA courte",             intensity: "high" },
  vma_longue:      { label: "VMA longue",             intensity: "high" },
  fartlek:         { label: "Fartlek",                intensity: "mid" },
  cote:            { label: "Côtes",                  intensity: "mid" },
  competition:     { label: "Compétition / Course",   intensity: "high" },
  test:            { label: "Test / Évaluation",      intensity: "high" },
  decouverte:      { label: "Découverte / Tourisme",  intensity: "none" },
  autre:           { label: "Autre",                  intensity: "none" },
});

export const SESSION_MARKERS = Object.freeze({
  difficile_meteo:    "Météo difficile",
  specifique:         "Séance spécifique",
  club:               "Sortie club",
  trail:              "Terrain trail",
  altitude:           "Altitude",
  retour_blessure:    "Retour de blessure",
  forme_excellente:   "Forme excellente",
  fatigue:            "Fatigue / mauvaises sensations",
});

const MAX_MARKERS = 4;
const MAX_NOTES_LENGTH = 500;

function buildHttpError(message, userMessage, status) {
  const err = new Error(message);
  err.httpStatus = status;
  err.userMessage = userMessage;
  return err;
}

/**
 * Auto-suggestion : devine un type d'effort a partir des metriques de la
 * seance. Best-effort, l'utilisateur doit confirmer pour figer.
 *
 * @param {Object} activity — colonnes Activity (movingTime, distance,
 *   averageHeartrate, totalElevationGain, workoutType Strava, etc.)
 * @param {Object} ctx — optionnel : { fcMax, heartRateZones }
 * @returns {string|null} cle SESSION_TYPES ou null si pas confiant
 */
export function suggestSessionType(activity = {}, ctx = {}) {
  const movingTime = Number(activity.movingTime) || 0;          // secondes
  const distance = Number(activity.distance) || 0;              // metres
  const elevGain = Number(activity.totalElevationGain) || 0;    // metres
  const avgHr = Number(activity.averageHeartrate) || 0;         // bpm
  const maxHr = Number(activity.maxHeartrate) || 0;             // bpm
  const fcMax = Number(ctx.fcMax) || 0;
  const workoutType = Number(activity.workoutType);             // Strava enum

  // 1. Compétition (signal explicite Strava : workout_type=1 ou 11)
  if (workoutType === 1 || workoutType === 11) return "competition";

  // 2. Sortie longue : > 90 min ET > 18 km (course a pied)
  if (movingTime >= 90 * 60 && distance >= 18000) return "sortie_longue";

  // 3. Cotes : ratio D+ / distance eleve
  if (distance > 0 && elevGain / (distance / 1000) > 50) {
    // > 50 m de D+/km = grosse pente
    return "cote";
  }

  // 4. Recuperation : FC moyenne basse + duree courte
  if (avgHr > 0 && fcMax > 0) {
    const hrPct = avgHr / fcMax;
    if (hrPct < 0.68 && movingTime < 45 * 60) return "recuperation";
    if (hrPct < 0.72) return "endurance_fond";
    // FC max > 92% FCmax suggere VMA
    if (maxHr > 0 && maxHr / fcMax > 0.92) {
      return movingTime < 40 * 60 ? "vma_courte" : "vma_longue";
    }
    // Zone tempo/seuil 78-88% FCmax
    if (hrPct >= 0.78 && hrPct < 0.88) return "tempo";
    if (hrPct >= 0.88) return "seuil";
  }

  // 5. Fallback duree-based
  if (movingTime >= 60 * 60) return "endurance_fond";
  if (movingTime > 0) return "autre";
  return null;
}

function parseMarkers(raw) {
  if (raw === undefined || raw === null) return undefined;
  if (raw === "" || (Array.isArray(raw) && raw.length === 0)) return null;
  if (!Array.isArray(raw)) {
    throw buildHttpError("Markers must be an array.", "Marqueurs invalides.", 400);
  }
  if (raw.length > MAX_MARKERS) {
    throw buildHttpError(
      "Too many markers.",
      `Maximum ${MAX_MARKERS} marqueurs autorisés.`,
      400,
    );
  }
  const cleaned = [];
  for (const m of raw) {
    const key = String(m || "").trim();
    if (!SESSION_MARKERS[key]) {
      throw buildHttpError(
        `Unknown marker: ${key}`,
        `Marqueur inconnu : ${key}`,
        400,
      );
    }
    if (!cleaned.includes(key)) cleaned.push(key);
  }
  return JSON.stringify(cleaned);
}

/**
 * Met a jour la classification d'une activite. Verifie l'appartenance au
 * user (cross-user isolation).
 *
 * @param {Object} params
 * @param {string} params.appUserId
 * @param {string} params.activityId
 * @param {string} [params.sessionType] — cle SESSION_TYPES, "" pour reset
 * @param {Array<string>} [params.markers]
 * @param {string} [params.notes]
 */
export async function classifyActivity({ appUserId, activityId, sessionType, markers, notes }) {
  if (!appUserId) throw buildHttpError("Missing user id.", "Utilisateur introuvable.", 400);
  if (!activityId) throw buildHttpError("Missing activityId.", "Identifiant manquant.", 400);

  const existing = await prisma.activity.findFirst({
    where: { id: activityId, appUserId },
    select: { id: true },
  });
  if (!existing) {
    throw buildHttpError("Activity not found.", "Activité introuvable.", 404);
  }

  const data = { userClassifiedAt: new Date() };

  if (sessionType !== undefined) {
    const v = String(sessionType || "").trim();
    if (v && !SESSION_TYPES[v]) {
      throw buildHttpError(
        `Unknown sessionType: ${v}`,
        `Type d'effort inconnu : ${v}`,
        400,
      );
    }
    data.userSessionType = v || null;
  }

  const parsedMarkers = parseMarkers(markers);
  if (parsedMarkers !== undefined) {
    data.userSessionMarkers = parsedMarkers;
  }

  if (notes !== undefined) {
    const v = String(notes || "").trim();
    if (v.length > MAX_NOTES_LENGTH) {
      throw buildHttpError(
        "Notes too long.",
        `Notes limitées à ${MAX_NOTES_LENGTH} caractères.`,
        400,
      );
    }
    data.userNotes = v || null;
  }

  return prisma.activity.update({
    where: { id: activityId },
    data,
  });
}

/**
 * Serialise les marqueurs JSON en array. Utilise par le serializer activity.
 */
export function deserializeMarkers(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
