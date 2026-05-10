import { memo } from "react";
import { Link } from "react-router-dom";
import SourceBadge from "../visuals/alpine/SourceBadge.jsx";
import ActivityIntensityBadge from "./ActivityIntensityBadge.jsx";
import {
  getActivityProviderLabel,
  getActivityProviderKey,
  getActivityIntensity,
} from "../../utils/activitiesViewModel.js";
import { buildActivityDetailPath, getActivityPublicId } from "../../utils/activityLinks.js";

/**
 * ActivityListCard — Alpine Light (Lot 03, mockup PDF page 6).
 *
 * Carte horizontale d'activité :
 *   icône sport + titre + sous-type + badges + distance + durée + D+ + FC + heure + source
 *
 * Règles anti-régression :
 *  - Si distance absente → "—" (pas "0 km")
 *  - Si D+ absent → "—" (sauf si l'activité contient explicitement 0)
 *  - Si FC absente → "—" (pas d'estimation)
 *  - Lien détail uniquement si publicId présent (jamais "/activities/undefined")
 */

// Helpers de format → renvoient { value, unit }.
// Si la valeur est absente : value="—" et unit="" (jamais "— km" / "— bpm" / "— m").
// D+ : si la valeur est explicitement 0 → "0" + "m" (cas sortie sans dénivelé, autorisé plan §10.2).

function formatDistance(meters) {
  if (!Number.isFinite(meters) || meters <= 0) return { value: "—", unit: "" };
  const km = meters / 1000;
  return {
    value: km.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    unit: "km",
  };
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return { value: "—", unit: "" };
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return { value: `${m}`, unit: "min" };
  return { value: `${h}h${String(m).padStart(2, "0")}`, unit: "" };
}

function formatElevation(activity) {
  const raw = activity?.totalElevationGain;
  if (raw == null) return { value: "—", unit: "" };
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return { value: "—", unit: "" };
  return { value: Math.round(n).toLocaleString("fr-FR"), unit: "m" };
}

function formatHr(activity) {
  const raw = activity?.averageHeartrate;
  const n = Number(raw);
  if (raw == null || !Number.isFinite(n) || n <= 0) return { value: "—", unit: "" };
  return { value: `${Math.round(n)}`, unit: "bpm" };
}

function Stat({ label, value, unit }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}{unit ? <span> {unit}</span> : null}</dd>
    </div>
  );
}

function formatTime(activity) {
  const raw = activity?.startDate || activity?.startDateLocal;
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// Pictogrammes sport — Alpine Light Lot 14
// Icônes lisibles à 22px (taille rendu .alpine-activity-card-icon svg).
// Stroke 1.8 uniforme, paths compacts, pas de détails illisibles à petite taille.
function SportIcon({ sport = "" }) {
  const s = String(sport).toLowerCase();

  // Vélo : 2 roues + cadre triangulaire + selle
  if (s.includes("ride") || s.includes("velo") || s.includes("vélo") || s.includes("cycle") || s.includes("bike")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="6" cy="17" r="3.5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="18" cy="17" r="3.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6 17 L11 9 L16 17 M11 9 L13 6 L16 6 M11 9 L18 17"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // Randonnée / hike : montagne stylisée + soleil
  if (s.includes("hike") || s.includes("rando") || s.includes("walk") || s.includes("marche")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="17" cy="6" r="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 20 L8 12 L11 16 L15 9 L21 20 Z"
          stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }

  // Natation : vagues + tête
  if (s.includes("swim") || s.includes("nage") || s.includes("natation")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="8" cy="6" r="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 13 q3 -2 6 0 q3 2 6 0 q3 -2 6 0 M3 18 q3 -2 6 0 q3 2 6 0 q3 -2 6 0"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </svg>
    );
  }

  // Renforcement / cross-training : haltère
  if (s.includes("workout") || s.includes("strength") || s.includes("musculation") || s.includes("crossfit")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2" y="9" width="3" height="6" rx="1" stroke="currentColor" strokeWidth="1.8" />
        <rect x="19" y="9" width="3" height="6" rx="1" stroke="currentColor" strokeWidth="1.8" />
        <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="6" y1="10" x2="6" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="18" y1="10" x2="18" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  // Yoga / mobilité : silhouette assise
  if (s.includes("yoga") || s.includes("mobility") || s.includes("stretch")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 19 q4 -3 8 0 M12 8 L12 14 M12 14 L8 19 M12 14 L16 19"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }

  // Course (défaut) : silhouette en mouvement simplifiée
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="15" cy="5" r="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M14 9 L10 13 L7 12 M14 9 L17 12 L19 16 M14 9 L13 14 L9 19 M13 14 L17 17"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function ActivityListCard({ activity = {}, settings = null }) {
  const publicId = getActivityPublicId(activity);
  const detailPath = publicId ? buildActivityDetailPath(activity) : null;
  const providerLabel = getActivityProviderLabel(activity);
  const providerKey = getActivityProviderKey(activity);
  const intensity = getActivityIntensity(activity, settings);
  const sport = activity?.sportType || activity?.type || "Activité";
  const time = formatTime(activity);

  const distance = formatDistance(Number(activity?.distance));
  const duration = formatDuration(Number(activity?.movingTime));
  const elevation = formatElevation(activity);
  const heartrate = formatHr(activity);

  const cardContent = (
    <>
      <div className="alpine-activity-card-icon">
        <SportIcon sport={sport} />
      </div>
      <div className="alpine-activity-card-main">
        <div className="alpine-activity-card-head">
          <strong className="alpine-activity-card-title">{activity?.name || "Activité"}</strong>
          <div className="alpine-activity-card-badges">
            <SourceBadge
              source={providerKey === "merged" ? "runsee" : providerKey}
              label={providerLabel}
            />
            {intensity ? <ActivityIntensityBadge intensity={intensity} /> : null}
          </div>
        </div>
        <span className="alpine-activity-card-sport">{sport}{time ? ` · ${time}` : ""}</span>
      </div>
      <dl className="alpine-activity-card-stats">
        <Stat label="Distance" value={distance.value} unit={distance.unit} />
        <Stat label="Durée"    value={duration.value} unit={duration.unit} />
        <Stat label="D+"       value={elevation.value} unit={elevation.unit} />
        <Stat label="FC"       value={heartrate.value} unit={heartrate.unit} />
      </dl>
    </>
  );

  if (detailPath) {
    return (
      <Link className="alpine-activity-card alpine-activity-card--clickable" to={detailPath}>
        {cardContent}
      </Link>
    );
  }
  // Pas de publicId : carte non cliquable, mais visible (anti-régression :
  // ne pas masquer une activité réelle parce que l'id est absent)
  return <article className="alpine-activity-card">{cardContent}</article>;
}

export default memo(ActivityListCard);
