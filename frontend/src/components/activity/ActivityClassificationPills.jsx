import { memo } from "react";
import { getSessionTypeDef, getMarkerDef } from "../../constants/sessionTaxonomy.js";

/**
 * ActivityClassificationPills — Affiche le type d'effort + marqueurs d'une
 * activite sous forme de pills, avec bouton d'edition.
 *
 * Props :
 *   - activity (objet avec userSessionType, userSessionMarkers[], userClassifiedAt)
 *   - onEdit() : ouvre le modal de classification
 */
function ActivityClassificationPills({ activity = null, onEdit = () => {} }) {
  const typeKey = activity?.userSessionType || "";
  const typeDef = getSessionTypeDef(typeKey);
  const markers = Array.isArray(activity?.userSessionMarkers) ? activity.userSessionMarkers : [];
  const isAuto = !activity?.userClassifiedAt && Boolean(typeKey);

  return (
    <div className="activity-class-pills">
      {typeDef ? (
        <span className={`activity-class-pill activity-class-pill-${typeDef.tone}`}>
          <span aria-hidden="true">{typeDef.icon}</span>
          {typeDef.label}
          {isAuto ? <span className="activity-class-pill-auto" title="Suggestion auto, à confirmer">auto</span> : null}
        </span>
      ) : (
        <span className="activity-class-pill activity-class-pill-empty">
          Non classifiée
        </span>
      )}

      {markers.map((key) => {
        const def = getMarkerDef(key);
        if (!def) return null;
        return (
          <span key={key} className="activity-class-pill activity-class-pill-marker">
            <span aria-hidden="true">{def.icon}</span>
            {def.label}
          </span>
        );
      })}

      <button type="button" className="activity-class-edit-btn" onClick={onEdit}>
        ✏ {typeDef ? "Modifier" : "Classifier"}
      </button>
    </div>
  );
}

export default memo(ActivityClassificationPills);
