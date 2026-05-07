import { formatAccountDate } from "../utils/accountPresentation.js";

const noop = () => {};

export default function AccountOverviewCard({
  account,
  onForgotPassword = noop,
  onDisconnectStrava = noop,
  onLogout = noop,
  isPending = false,
}) {
  const safeAccount = account || {};
  const stravaConnected = Boolean(safeAccount.stravaConnected);

  return (
    <section className="card card-accent" id="mon-compte">
      <div className="card-header-row wrap-on-mobile">
        <div>
          <h2 className="card-title">Compte actif</h2>
          <p className="card-subtitle">Profil actuellement utilisé dans RuNSee.</p>
        </div>
        <span className={`status-pill ${safeAccount.stravaConnected ? "status-success" : "status-idle"}`}>
          {safeAccount.stravaStatusLabel}
        </span>
      </div>

      <div className="account-identity-row top-gap-sm">
        {safeAccount.avatarUrl ? (
          <img
            className="account-identity-avatar-image"
            src={safeAccount.avatarUrl}
            alt={`Avatar de ${safeAccount.displayName}`}
          />
        ) : (
          <div className="account-identity-avatar">{safeAccount.initials}</div>
        )}

        <div className="account-identity-copy">
          <h3 className="subcard-title">{safeAccount.displayName}</h3>
          <p className="card-subtitle">
            {safeAccount.identifier}
            {safeAccount.location ? ` - ${safeAccount.location}` : ""}
          </p>
          <div className="inline-meta-grid top-gap-sm">
            <span><strong>Rôle</strong> {safeAccount.roleLabel || "-"}</span>
            <span><strong>Langue</strong> {safeAccount.localeLabel || "-"}</span>
            <span><strong>Fuseau</strong> {safeAccount.timezoneLabel || "-"}</span>
          </div>
        </div>
      </div>

      <div className="grid three-columns top-gap-sm">
        <div className="metric-card compact-metric">
          <span className="metric-label">Adresse e-mail</span>
          <div className="metric-value medium-metric">{safeAccount.emailDisplay || "-"}</div>
          <div className="metric-secondary">{safeAccount.emailHint || "Aucune adresse e-mail distante disponible."}</div>
        </div>

        <div className="metric-card compact-metric">
          <span className="metric-label">Dernière synchro</span>
          <div className="metric-value medium-metric">{formatAccountDate(safeAccount.lastSyncAt)}</div>
          <div className="metric-secondary">Dernière mise à jour connue des données locales.</div>
        </div>

        <div className="metric-card compact-metric">
          <span className="metric-label">Membre depuis</span>
          <div className="metric-value medium-metric">{formatAccountDate(safeAccount.joinedAt)}</div>
          <div className="metric-secondary">Date de création ou première connexion disponible.</div>
        </div>
      </div>

      <div className="actions-row top-gap-sm">
        <button type="button" className="button button-outline" onClick={onForgotPassword} disabled={isPending}>
          Changer le mot de passe
        </button>
        <button
          type="button"
          className="button button-outline"
          onClick={onDisconnectStrava}
          disabled={isPending || !stravaConnected}
        >
          Délier Strava
        </button>
        <button type="button" className="button button-dark" onClick={onLogout} disabled={isPending}>
          Se déconnecter
        </button>
      </div>
    </section>
  );
}
