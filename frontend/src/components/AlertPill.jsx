import { memo } from "react";
import AlertFamilyIcon from "./AlertFamilyIcon.jsx";
import AlertSeverityIcon from "./AlertSeverityIcon.jsx";

function AlertPill({
  alert = {},
  onClick = null,
  onDismiss = null,
}) {
  const severity = alert.severity || "info";
  const showFamilyIcon = severity !== "positive" && alert.family;

  return (
    <div className={`alert-pill alert-pill-${severity}`}>
      <button
        className="alert-pill-main"
        type="button"
        title={alert.message || alert.title}
        onClick={() => onClick?.(alert.key)}
      >
        <AlertSeverityIcon severity={severity} size={14} />
        {showFamilyIcon ? <AlertFamilyIcon family={alert.family} size={14} /> : null}
        <span>{alert.title}</span>
      </button>
      <button
        className="alert-pill-dismiss"
        type="button"
        aria-label={`Masquer l'alerte ${alert.title || ""}`}
        onClick={() => onDismiss?.(alert.key)}
      >
        ×
      </button>
    </div>
  );
}

export default memo(AlertPill);
