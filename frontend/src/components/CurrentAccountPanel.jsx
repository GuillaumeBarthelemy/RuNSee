import { memo } from "react";
import { buildCurrentAccountModel } from "../utils/accountPresentation.js";

function CurrentAccountPanel({ account = null }) {
  const safeAccount = account || buildCurrentAccountModel();

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
    </section>
  );
}

export default memo(CurrentAccountPanel);
