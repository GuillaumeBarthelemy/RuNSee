export default function SyncActions({ onConnectStrava, onStartHistorical, onStartIncremental, isBusy }) {
  return (
    <section className="hero-card">
      <div className="hero-card-content">
        <div>
          <span className="eyebrow">Contrôle de synchronisation</span>
          <h2 className="hero-title">Pilote RuNSee sans quitter le tableau de bord</h2>
          <p className="hero-text">
            Connecte Strava, recharge l'historique local ou synchronise uniquement les nouvelles activités.
          </p>
        </div>
        <div className="actions-row hero-actions">
          <button className="button button-primary" onClick={onConnectStrava}>
            Connecter Strava
          </button>
          <button className="button button-glass" onClick={onStartHistorical} disabled={isBusy}>
            Recharger l'historique
          </button>
          <button className="button button-dark" onClick={onStartIncremental} disabled={isBusy}>
            Synchroniser les nouveautés
          </button>
        </div>
      </div>
      <div className="hero-card-footnote">
        {isBusy ? "Une synchronisation est déjà en cours. Les actions sont temporairement verrouillées." : "Astuce : commence par un historique complet, puis utilise l'incrémental au quotidien."}
      </div>
    </section>
  );
}
