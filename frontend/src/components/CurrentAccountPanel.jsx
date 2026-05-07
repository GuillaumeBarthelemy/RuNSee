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
  providerStatuses = {},
  providerStatusLoading = false,
  providerStatusError = "",
}) {
  const safeAccount = account || buildCurrentAccountModel();
  const syncButtonLabel = isSyncing
    ? "Synchronisation en cours"
    : canSync
      ? "Synchroniser Strava et Garmin"
      : "Connecte Strava ou Garmin d'abord";
  const stravaStatus = providerStatuses?.strava || {};
  const garminStatus = providerStatuses?.garmin || {};
  const providerItems = [
    { key: "strava", short: "S", label: "Strava", status: stravaStatus.status, connected: stravaStatus.connected },
    { key: "garmin", short: "G", label: "Garmin", status: garminStatus.status, connected: garminStatus.connected },
  ];

  const getProviderTone = (provider) => {
    if (providerStatusLoading || provider.status === "unknown") {
      return "is-pending";
    }
    if (["error", "expired"].includes(provider.status)) {
      return "is-error";
    }
    if (["syncing", "connecting", "mfa_required"].includes(provider.status)) {
      return "is-warning";
    }
    return provider.connected ? "is-connected" : "is-pending";
  };

  const getProviderLabel = (provider) => {
    if (providerStatusLoading || provider.status === "unknown") {
      return `${provider.label} en verification`;
    }
    if (provider.connected) {
      return `${provider.label} connecte`;
    }
    if (provider.status === "error") {
      return `${provider.label} en erreur`;
    }
    if (provider.status === "expired") {
      return `${provider.label} expire`;
    }
    if (provider.status === "syncing") {
      return `${provider.label} en synchronisation`;
    }
    return `${provider.label} non connecte`;
  };

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

      <div className="sidebar-provider-row" aria-label="Statut des sources connectees">
        {providerItems.map((provider) => (
          <span
            key={provider.key}
            className={`sidebar-provider-pill ${getProviderTone(provider)}`.trim()}
            title={getProviderLabel(provider)}
          >
            <span className="sidebar-provider-short">{provider.short}</span>
            <span className="sidebar-provider-dot" aria-hidden="true" />
            <span className="sidebar-provider-label">{getProviderLabel(provider)}</span>
          </span>
        ))}
      </div>
      {providerStatusError ? (
        <p className="sidebar-provider-error">{providerStatusError}</p>
      ) : null}

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
