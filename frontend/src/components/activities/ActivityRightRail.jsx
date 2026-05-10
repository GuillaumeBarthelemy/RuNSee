import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import RightRailCard from "../visuals/alpine/RightRailCard.jsx";
import {
  computeWeeklySummary,
  computeSportDistribution,
  selectBestActivity,
} from "../../utils/activitiesViewModel.js";
import { buildActivityDetailPath, getActivityPublicId } from "../../utils/activityLinks.js";

/**
 * ActivityRightRail — Alpine Light (Lot 03, mockup PDF page 6).
 *
 * Right rail desktop :
 *  - Vue hebdomadaire (semaine courante)
 *  - Répartition des sports (sur le filtre courant)
 *  - Meilleure sortie (règle stable : plus longue distance — sinon "Données insuffisantes")
 *
 * Anti-régression :
 *  - Aucun score inventé.
 *  - Si la règle "meilleure sortie" ne donne rien d'exploitable → message neutre.
 */

function formatKm(meters) {
  if (!Number.isFinite(meters) || meters <= 0) return "—";
  return (meters / 1000).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatHours(hours) {
  if (!Number.isFinite(hours) || hours <= 0) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} min`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

function ActivityRightRail({ activities = [], weekStartDay = 1 }) {
  const week = useMemo(
    () => computeWeeklySummary(activities, { weekStartDay }),
    [activities, weekStartDay],
  );
  const sports = useMemo(() => computeSportDistribution(activities).slice(0, 5), [activities]);
  const best = useMemo(() => selectBestActivity(activities), [activities]);

  const sportTotal = sports.reduce((s, e) => s + e.count, 0);

  return (
    <aside className="alpine-activity-right-rail">
      <RightRailCard title="Vue hebdomadaire">
        {week.count > 0 ? (
          <ul className="alpine-rr-list">
            <li><span>Sorties</span><strong>{week.count}</strong></li>
            <li><span>Distance</span><strong>{formatKm(week.distanceMeters)} km</strong></li>
            <li><span>Temps</span><strong>{formatHours(week.hours)}</strong></li>
            <li><span>D+</span><strong>{week.elevationMeters > 0 ? `${Math.round(week.elevationMeters).toLocaleString("fr-FR")} m` : "—"}</strong></li>
          </ul>
        ) : (
          <p className="alpine-rr-empty">Aucune sortie cette semaine.</p>
        )}
      </RightRailCard>

      <RightRailCard title="Répartition des sports">
        {sports.length > 0 ? (
          <ul className="alpine-rr-distribution">
            {sports.map((entry) => {
              const pct = sportTotal > 0 ? Math.round((entry.count / sportTotal) * 100) : 0;
              return (
                <li key={entry.sport}>
                  <div className="alpine-rr-distribution-row">
                    <span className="alpine-rr-distribution-label">{entry.sport}</span>
                    <span className="alpine-rr-distribution-meta">{entry.count} · {formatKm(entry.distanceMeters)} km</span>
                  </div>
                  <div className="alpine-rr-distribution-bar" aria-hidden="true">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="alpine-rr-empty">Données insuffisantes.</p>
        )}
      </RightRailCard>

      <RightRailCard title="Meilleure sortie">
        {best && Number(best?.distance) > 0 ? (
          <div className="alpine-rr-best">
            <strong className="alpine-rr-best-name">{best?.name || "Sortie"}</strong>
            <div className="alpine-rr-best-stats">
              <span>{formatKm(best?.distance)} km</span>
              {Number.isFinite(Number(best?.totalElevationGain)) && Number(best?.totalElevationGain) > 0
                ? <span>{Math.round(Number(best?.totalElevationGain)).toLocaleString("fr-FR")} m D+</span>
                : null}
            </div>
            {getActivityPublicId(best) ? (
              <Link className="alpine-rr-best-link" to={buildActivityDetailPath(best)}>
                Voir la sortie →
              </Link>
            ) : null}
            <p className="alpine-rr-best-note">Critère : plus longue distance sur la période filtrée.</p>
          </div>
        ) : (
          <p className="alpine-rr-empty">Données insuffisantes pour désigner une meilleure sortie.</p>
        )}
      </RightRailCard>
    </aside>
  );
}

export default memo(ActivityRightRail);
