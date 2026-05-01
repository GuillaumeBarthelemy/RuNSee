import { memo } from "react";
import { buildCurrentAccountModel, formatAccountDate } from "../utils/accountPresentation.js";

const noop = () => {};

function CurrentAccountPanel({
  account = null,
  onLogout = noop,
  onSync = noop,
  isPending = false,
  isSyncing = false,
  canSync = false,
}) {
  const safeAccount = account || buildCurrentAccountModel();
  const syncButtonLabel = isSyncing
    ? "Synchronisation en cours"
    : safeAccount.stravaConnected
      ? "Synchroniser Strava"
      : "Connecter Strava d'abord";

  return (
    <section className="sidebar-account-card">
      <div className="sidebar-account-head">
        <span className="sidebar-account-kicker">Compte actif</span>
        <span className={`sidebar-account-status ${safeAccount.stravaConnected ? "is-connected" : "is-pending"}`.trim()}>
          <span className="sidebar-account-status-dot" aria-hidden="true" />
          {safeAccount.stravaStatusLabel}
        </span>
      </div>

      <div className="sidebar-account-main">
        <div className="sidebar-account-avatar-shell">
          {safeAccount.avatarUrl ? (
            <img
              className="sidebar-account-avatar-image"
              src={safeAccount.avatarUrl}
              alt={`Avatar de ${safeAccount.displayName}`}
            />
          ) : (
            <div className="sidebar-account-avatar">{safeAccount.initials}</div>
          )}
        </div>

        <div className="sidebar-account-copy">
          <strong>{safeAccount.displayName}</strong>
          <span className="sidebar-account-identifier">{safeAccount.identifier}</span>
        </div>
      </div>

      <div className="sidebar-account-meta-row">
        <span className="sidebar-account-meta-label">Dernier rafraichissement</span>
        <strong className="sidebar-account-meta-value">{formatAccountDate(safeAccount.lastSyncAt)}</strong>
      </div>

      <div className="sidebar-account-actions">
        <button
          type="button"
          className={`sidebar-icon-button ${isSyncing ? "is-busy" : ""}`.trim()}
          onClick={onSync}
          disabled={isPending || isSyncing || !canSync}
          title={syncButtonLabel}
          aria-label={syncButtonLabel}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 11a8 8 0 0 0-14.9-4M4 13a8 8 0 0 0 14.9 4" />
            <path d="M5 4v4h4M19 20v-4h-4" />
          </svg>
        </button>
        <button
          type="button"
          className="button button-glass sidebar-account-action"
          onClick={onLogout}
          disabled={isPending}
        >
          Se deconnecter
        </button>
      </div>
    </section>
  );
}

export default memo(CurrentAccountPanel);
