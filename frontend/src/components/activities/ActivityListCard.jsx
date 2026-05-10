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

function SportIcon({ sport = "" }) {
  const s = String(sport).toLowerCase();
  if (s.includes("hike") || s.includes("rando")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 20 L9 10 L13 14 L21 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="6" r="2" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  if (s.includes("ride") || s.includes("velo") || s.includes("cycle")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="6" cy="17" r="3.5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="18" cy="17" r="3.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6 17 L10 8 L15 8 L18 17 M10 8 L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  // Default : run
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="14" cy="5" r="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 13 L11 11 L13 13 L15 12 M11 11 L11 17 L9 21 M13 13 L15 17 L17 20"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
