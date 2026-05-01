import { formatAccountDate } from "../utils/accountPresentation.js";

const noop = () => {};

export default function AccountSecurityCard({
  account,
  onForgotPassword = noop,
  onDisconnectStrava = noop,
  onLogout = noop,
  isPending = false,
}) {
  const safeAccount = account || {};
  const stravaConnected = Boolean(safeAccount.stravaConnected);

  return (
    <section className="card">
      <div className="card-header-row wrap-on-mobile">
        <div>
          <h2 className="card-title">Securite et sessions</h2>
          <p className="card-subtitle">
            Session actuelle, deconnexion et liaison Strava du compte RunNSee connecte.
          </p>
        </div>
        <span className={`status-pill ${stravaConnected ? "status-success" : "status-idle"}`}>
          {safeAccount.accountStatusLabel || "Compte actif"}
        </span>
      </div>

      <div className="inline-meta-grid">
        <span><strong>Session</strong> {safeAccount.sessionLabel || "Ce navigateur"}</span>
        <span><strong>Role</strong> {safeAccount.roleLabel || "Proprietaire"}</span>
        <span><strong>Derniere connexion</strong> {formatAccountDate(safeAccount.lastLoginAt)}</span>
      </div>

      <div className="grid two-columns top-gap-sm">
        <div className="metric-card compact-metric">
          <span className="metric-label">Session en cours</span>
          <div className="metric-value small-metric">Navigateur actuel</div>
          <div className="metric-secondary">Cookie HTTP-only actif pour ce navigateur.</div>
        </div>

        <div className="metric-card compact-metric">
          <span className="metric-label">Connexion Strava</span>
          <div className="metric-value small-metric">{stravaConnected ? "Liee" : "Non liee"}</div>
          <div className="metric-secondary">
            {stravaConnected
              ? "Le compte Strava actif est rattache a cet utilisateur RunNSee."
              : "Liaison optionnelle a faire depuis le bouton Connecter Strava."}
          </div>
        </div>

        <div className="metric-card compact-metric">
          <span className="metric-label">Authentification</span>
          <div className="metric-value small-metric">E-mail + mot de passe</div>
          <div className="metric-secondary">Connexion RunNSee classique, independante de Strava.</div>
        </div>

        <div className="metric-card compact-metric">
          <span className="metric-label">Protection</span>
          <div className="metric-value small-metric">Sessions securisees</div>
          <div className="metric-secondary">Le mot de passe est stocke cote serveur et la session est signee par cookie.</div>
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
          Delier Strava
        </button>
        <button type="button" className="button button-dark" onClick={onLogout} disabled={isPending}>
          Se deconnecter
        </button>
      </div>

      <p className="small-text top-gap-sm">
        Les autres sessions et le reset de mot de passe complet pourront etre enrichis ensuite sans changer le coeur du modele.
      </p>
    </section>
  );
}
