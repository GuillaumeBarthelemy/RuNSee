import { memo } from "react";
import ActivityListCard from "./ActivityListCard.jsx";
import { getActivityPublicId } from "../../utils/activityLinks.js";

/**
 * ActivityDateGroup — Alpine Light (Lot 03).
 * Section avec un séparateur de date + liste de cartes activités.
 */
function ActivityDateGroup({ label = "", items = [], settings = null }) {
  if (!items.length) return null;
  return (
    <section className="alpine-activity-group">
      <h3 className="alpine-activity-group-label">{label}</h3>
      <div className="alpine-activity-group-list">
        {items.map((activity, idx) => {
          const key = getActivityPublicId(activity) || `${label}-${idx}`;
          return <ActivityListCard key={key} activity={activity} settings={settings} />;
        })}
      </div>
    </section>
  );
}

export default memo(ActivityDateGroup);
