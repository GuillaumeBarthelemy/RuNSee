import { memo } from "react";
import InfoTooltip from "./InfoTooltip.jsx";

const noop = () => {};

const STATUS_LABELS = {
  idle: "Prêt",
  running: "En cours",
  paused: "En pause",
  completed: "Terminé",
  error: "En erreur",
  started: "Démarrage",
};

const STATUS_CLASSES = {
  idle: "status-idle",
  running: "status-running",
  paused: "status-queued",
  completed: "status-success",
  error: "status-failed",
  started: "status-running",
};

function formatDate(value) {
  if (!value) return "Non planifiée";

  try {
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00.000Z`));
  } catch {
    return String(value);
  }
}

function formatDateTime(value) {
  if (!value) return "Jamais";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function formatNextRun(value) {
  if (!value) return "Dès que possible";
  const deltaMs = new Date(value).getTime() - Date.now();

  if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
    return "Dès que possible";
  }

  const minutes = Math.ceil(deltaMs / 60000);
  if (minutes < 60) {
    return `dans ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `dans ${hours} h ${remainingMinutes} min` : `dans ${hours} h`;
}

function WindowLabel({ window = null }) {
  if (!window?.startDate || !window?.endDate) {
    return <span>Non planifiée</span>;
  }

  return (
    <span>
      {formatDate(window.startDate)}
      {" -> "}
      {formatDate(window.endDate)}
    </span>
  );
}

function Stat({ label = "", value = 0 }) {
  return (
    <span>
      <strong>{Number(value || 0)}</strong>
      {" "}
      {label}
    </span>
  );
}

function GarminActivityBackfillCard({
  backfill = null,
  isPending = false,
  isConnected = false,
  onStart = noop,
  onPause = noop,
  onResume = noop,
}) {
  const status = backfill?.status || "idle";
  const totals = backfill?.totals || {};
  const statusLabel = STATUS_LABELS[status] || status;
  const statusClass = STATUS_CLASSES[status] || "status-idle";
  const canStart = isConnected && !isPending && ["idle", "error"].includes(status);
  const canPause = isConnected && !isPending && status === "running";
  const canResume = isConnected && !isPending && ["paused", "error"].includes(status);

  return (
    <div className="garmin-recovery-panel garmin-activity-backfill-panel top-gap-md">
      <div className="card-header-row wrap-on-mobile compact-header">
        <div>
          <h3 className="subcard-title title-with-info">
            Historique Garmin activités
            <InfoTooltip
              title="Historique Garmin activités"
              content={[
                {
                  label: "Objectif",
                  text: "Importer progressivement tes anciennes activités Garmin sans recréer les doublons Strava déjà corrigés.",
                },
                {
                  label: "Cadence",
                  text: "Une tranche de 180 jours maximum est traitée, puis la suite reprend automatiquement après le délai de sécurité.",
                },
                {
                  label: "Sécurité",
                  text: "Les correspondances ambiguës sont ignorées et le backfill s'arrête si un doublon actif est détecté.",
                },
              ]}
            />
          </h3>
          <p className="small-text">
            L'import commence par les activités les plus récentes, puis remonte l'historique par tranches contrôlées.
          </p>
        </div>
        <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
      </div>

      {backfill?.lastErrorMessage ? (
        <p className="alert alert-warning top-gap-sm">
          {backfill.lastErrorMessage}
        </p>
      ) : null}

      <div className="garmin-recovery-stats top-gap-sm">
        <Stat label="fenêtre(s) traitée(s)" value={totals.windowsProcessed} />
        <Stat label="activité(s) Garmin lue(s)" value={totals.activitiesImported} />
        <Stat label="matchée(s) Strava" value={totals.matched} />
        <Stat label="Garmin-only créée(s)" value={totals.createdGarminOnly} />
        <Stat label="ambiguë(s) ignorée(s)" value={totals.ambiguous} />
      </div>

      <div className="garmin-backfill-window-grid top-gap-sm">
        <div>
          <span className="diagnostic-label">Dernière tranche</span>
          <strong><WindowLabel window={backfill?.lastWindow} /></strong>
        </div>
        <div>
          <span className="diagnostic-label">Prochaine tranche</span>
          <strong><WindowLabel window={backfill?.nextWindow} /></strong>
        </div>
        <div>
          <span className="diagnostic-label">Prochain lancement</span>
          <strong>{status === "running" ? formatNextRun(backfill?.nextRunNotBefore) : "Non actif"}</strong>
        </div>
        <div>
          <span className="diagnostic-label">Dernier succès</span>
          <strong>{formatDateTime(backfill?.lastSuccessAt)}</strong>
        </div>
      </div>

      <div className="actions-row top-gap-sm">
        <button
          type="button"
          className="button button-outline"
          onClick={() => onStart()}
          disabled={!canStart}
        >
          {isPending && canStart ? "Lancement..." : "Lancer l'import historique"}
        </button>
        <button
          type="button"
          className="button button-outline"
          onClick={() => onPause()}
          disabled={!canPause}
        >
          Mettre en pause
        </button>
        <button
          type="button"
          className="button button-outline"
          onClick={() => onResume()}
          disabled={!canResume}
        >
          Reprendre
        </button>
      </div>
    </div>
  );
}

export default memo(GarminActivityBackfillCard);
