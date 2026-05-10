import { memo, useMemo } from "react";
import ActivityDateGroup from "./ActivityDateGroup.jsx";
import EmptyState from "../visuals/alpine/EmptyState.jsx";
import { groupActivitiesByDate } from "../../utils/activitiesViewModel.js";

/**
 * ActivityCardsView — Alpine Light (Lot 03).
 * Vue principale : groupe les activités par date et rend ActivityDateGroup.
 *
 * Empty state si aucune activité.
 */
function ActivityCardsView({ activities = [], onSyncRequest = null }) {
  const groups = useMemo(() => groupActivitiesByDate(activities), [activities]);

  if (!groups.length) {
    return (
      <EmptyState
        title="Aucune activité sur cette période"
        description="Affine les filtres ou synchronise tes sources pour voir tes sorties."
        action={onSyncRequest ? { label: "Synchroniser Strava", onClick: onSyncRequest } : null}
      />
    );
  }

  return (
    <div className="alpine-activities-list">
      {groups.map((group) => (
        <ActivityDateGroup
          key={group.key}
          label={group.label}
          items={group.items}
        />
      ))}
    </div>
  );
}

export default memo(ActivityCardsView);
