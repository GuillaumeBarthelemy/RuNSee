import { memo } from "react";
import AlertFamilyIcon from "./AlertFamilyIcon.jsx";
import AlertSeverityIcon from "./AlertSeverityIcon.jsx";

function AlertCard({
  alert = {},
  onAction = null,
  onDismiss = null,
}) {
  const severity = alert.severity || "info";
  const showFamilyIcon = severity !== "positive" && alert.family;

  return (
    <article className={`alert-card alert-card-${severity}`}>
      <button
        className="alert-card-dismiss"
        type="button"
        aria-label={`Masquer l'alerte ${alert.title || ""}`}
        onClick={() => onDismiss?.(alert.key)}
      >
        ×
      </button>
      <header className="alert-card-header">
        <span className="alert-icon-stack">
          <AlertSeverityIcon severity={severity} size={22} />
          {showFamilyIcon ? <AlertFamilyIcon family={alert.family} size={19} /> : null}
        </span>
        <h3>{alert.title}</h3>
      </header>
      <p className="alert-card-message">{alert.message}</p>
      {alert.action ? (
        <footer className="alert-card-footer">
          <button
            className="alert-card-action"
            type="button"
            onClick={() => onAction?.(alert.action)}
          >
            {alert.action.label}
            <span aria-hidden="true">-&gt;</span>
          </button>
        </footer>
      ) : null}
    </article>
  );
}

export default memo(AlertCard);
