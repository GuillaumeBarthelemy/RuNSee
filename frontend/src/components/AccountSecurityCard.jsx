import { formatAccountDate } from "../utils/accountPresentation.js";

export default function AccountSecurityCard({ account }) {
  const safeAccount = account || {};

  return (
    <section className="card">
      <div className="card-header-row wrap-on-mobile">
        <div>
          <h2 className="card-title">Securite et sessions</h2>
          <p className="card-subtitle">
            Zone reservee a la future gestion de connexion, de mot de passe et de sessions multiples.
          </p>
        </div>
        <span className="status-pill status-idle">A brancher</span>
      </div>

      <div className="inline-meta-grid">
        <span><strong>Session</strong> {safeAccount.sessionLabel || "Ce navigateur"}</span>
        <span><strong>Role</strong> {safeAccount.roleLabel || "Proprietaire"}</span>
        <span><strong>Derniere synchro</strong> {formatAccountDate(safeAccount.lastSyncAt)}</span>
      </div>

      <div className="grid two-columns top-gap-sm">
        <div className="metric-card compact-metric">
          <span className="metric-label">Session en cours</span>
          <div className="metric-value small-metric">Navigateur actuel</div>
          <div className="metric-secondary">Session locale active sur cet appareil.</div>
        </div>

        <div className="metric-card compact-metric">
          <span className="metric-label">Autres sessions</span>
          <div className="metric-value small-metric">A preparer</div>
          <div className="metric-secondary">Liste des autres appareils a connecter au vrai backend multi-utilisateur.</div>
        </div>

        <div className="metric-card compact-metric">
          <span className="metric-label">Authentification</span>
          <div className="metric-value small-metric">Mot de passe / SSO</div>
          <div className="metric-secondary">Emplacement prevu pour l'authentification retenue.</div>
        </div>

        <div className="metric-card compact-metric">
          <span className="metric-label">Protection</span>
          <div className="metric-value small-metric">MFA plus tard</div>
          <div className="metric-secondary">Zone prevue pour la double authentification si besoin.</div>
        </div>
      </div>

      <div className="actions-row top-gap-sm">
        <button type="button" className="button button-outline" disabled>
          Changer le mot de passe
        </button>
        <button type="button" className="button button-outline" disabled>
          Deconnecter les autres sessions
        </button>
        <button type="button" className="button button-dark" disabled>
          Se deconnecter
        </button>
      </div>

      <p className="small-text top-gap-sm">
        Cette carte reste volontairement en maquette pour figer l'UX avant le branchement du vrai systeme de comptes.
      </p>
    </section>
  );
}
