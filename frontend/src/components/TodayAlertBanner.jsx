import { memo, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AlertCard from "./AlertCard.jsx";
import AlertPill from "./AlertPill.jsx";
import AlertScoreBadge from "./AlertScoreBadge.jsx";
import AlertSeverityIcon from "./AlertSeverityIcon.jsx";

const SEVERITY_ORDER = {
  danger: 0,
  warning: 1,
  info: 2,
  positive: 3,
};

function getDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getIgnoredStorageKey(alertKey, dayKey) {
  return `runsee-alert-ignored-${alertKey}-${dayKey}`;
}

function getSilentStorageKey(dayKey) {
  return `runsee-alerts-silent-${dayKey}`;
}

function readStorageValue(key) {
  if (!key || typeof window === "undefined" || !window.sessionStorage) {
    return "";
  }

  try {
    return window.sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeStorageValue(key, value = "1") {
  if (!key || typeof window === "undefined" || !window.sessionStorage) {
    return;
  }

  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Le rendu local reste mis a jour meme si sessionStorage est bloque.
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getAttentionScore(alerts = []) {
  const dangerCount = alerts.filter((alert) => alert.severity === "danger").length;
  const warningCount = alerts.filter((alert) => alert.severity === "warning").length;
  const infoCount = alerts.filter((alert) => alert.severity === "info").length;
  return clamp(100 - (dangerCount * 25 + warningCount * 10 + infoCount * 3), 0, 100);
}

function getScoreTone(score) {
  if (score >= 80) return "positive";
  if (score >= 60) return "neutral";
  if (score >= 40) return "warning";
  return "danger";
}

function sortAlerts(alerts = []) {
  return alerts
    .map((alert, index) => ({ ...alert, __index: index }))
    .sort(
      (left, right) =>
        (SEVERITY_ORDER[left.severity] ?? SEVERITY_ORDER.info)
        - (SEVERITY_ORDER[right.severity] ?? SEVERITY_ORDER.info)
        || left.__index - right.__index,
    );
}

function PositiveOnlyBanner({ alerts = [], onAction = null }) {
  const count = alerts.length;
  const title = count === 1
    ? "Tout va bien - 1 bonne nouvelle"
    : `Tout va bien - ${count} bonnes nouvelles`;

  return (
    <section className="alert-banner alert-banner-positive" aria-label="Bonnes nouvelles du jour">
      <header className="alert-banner-positive-header">
        <AlertSeverityIcon severity="positive" size={20} />
        <h2>{title}</h2>
      </header>
      <div className="alert-banner-positive-list">
        {alerts.map((alert) => {
          const content = (
            <>
              <AlertSeverityIcon severity="positive" size={14} />
              <span>{alert.title}</span>
            </>
          );

          return alert.action ? (
            <button
              className="alert-banner-positive-item"
              key={alert.key}
              type="button"
              onClick={() => onAction?.(alert.action)}
            >
              {content}
            </button>
          ) : (
            <span className="alert-banner-positive-item" key={alert.key}>
              {content}
            </span>
          );
        })}
      </div>
    </section>
  );
}

function TodayAlertBanner({
  alerts = [],
  onSyncStrava = null,
}) {
  const navigate = useNavigate();
  const dayKey = getDayKey();
  const [ignoredKeys, setIgnoredKeys] = useState(new Set());
  const [isSilent, setIsSilent] = useState(() => readStorageValue(getSilentStorageKey(dayKey)) === "1");
  const [expandedKey, setExpandedKey] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [actionStatus, setActionStatus] = useState("");

  const activeAlerts = useMemo(
    () => sortAlerts(
      alerts.filter((alert) => {
        if (!alert?.key || ignoredKeys.has(alert.key)) {
          return false;
        }

        return readStorageValue(getIgnoredStorageKey(alert.key, dayKey)) !== "1";
      }),
    ),
    [alerts, dayKey, ignoredKeys],
  );

  const handleDismiss = (alertKey) => {
    if (!alertKey) {
      return;
    }

    writeStorageValue(getIgnoredStorageKey(alertKey, dayKey));
    setIgnoredKeys((current) => new Set([...current, alertKey]));
  };

  const handleSilence = () => {
    writeStorageValue(getSilentStorageKey(dayKey));
    setIsSilent(true);
  };

  const handleAction = async (action = {}) => {
    if (!action?.href) {
      return;
    }

    if (action.href === "sync-strava") {
      setActionStatus("Synchronisation en cours...");
      try {
        await onSyncStrava?.();
        setActionStatus("Synchronisation lancee.");
      } catch {
        setActionStatus("Synchronisation impossible pour le moment.");
      }
      return;
    }

    if (String(action.href).startsWith("/")) {
      navigate(action.href);
    }
  };

  if (isSilent || !activeAlerts.length) {
    return null;
  }

  const isPositiveOnly = activeAlerts.every((alert) => alert.severity === "positive");
  if (isPositiveOnly) {
    return <PositiveOnlyBanner alerts={activeAlerts} onAction={handleAction} />;
  }

  const score = getAttentionScore(activeAlerts);
  const scoreTone = getScoreTone(score);
  const resolvedExpandedKey = activeAlerts.some((alert) => alert.key === expandedKey)
    ? expandedKey
    : activeAlerts[0]?.key;
  const primaryAlert = activeAlerts.find((alert) => alert.key === resolvedExpandedKey) || activeAlerts[0];
  const secondaryAlerts = activeAlerts.filter((alert) => alert.key !== primaryAlert.key);
  const visiblePills = showAll ? secondaryAlerts : secondaryAlerts.slice(0, 2);
  const hiddenCount = Math.max(0, secondaryAlerts.length - visiblePills.length);
  const title = activeAlerts.length === 1
    ? "Point a surveiller"
    : `Points a surveiller (${activeAlerts.length})`;

  return (
    <section className="alert-banner" aria-label="Points a surveiller">
      <header className="alert-banner-header">
        <div className="alert-banner-title-group">
          <h2 className="alert-banner-title">{title}</h2>
          <AlertScoreBadge
            score={score}
            tone={scoreTone}
            tooltipContent="Score base sur le nombre et la gravite des alertes actives."
          />
        </div>
        <button className="alert-banner-silence" type="button" onClick={handleSilence}>
          Tout masquer aujourd'hui
        </button>
      </header>

      <div className="alert-banner-body">
        <AlertCard
          alert={primaryAlert}
          onAction={handleAction}
          onDismiss={handleDismiss}
        />

        {visiblePills.length ? (
          <div className="alert-banner-pill-row">
            {visiblePills.map((alert) => (
              <AlertPill
                alert={alert}
                key={alert.key}
                onClick={setExpandedKey}
                onDismiss={handleDismiss}
              />
            ))}
            {hiddenCount > 0 ? (
              <button className="alert-banner-show-all" type="button" onClick={() => setShowAll(true)}>
                +{hiddenCount} autre{hiddenCount > 1 ? "s" : ""}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {actionStatus ? <p className="alert-banner-status">{actionStatus}</p> : null}
    </section>
  );
}

export default memo(TodayAlertBanner);
