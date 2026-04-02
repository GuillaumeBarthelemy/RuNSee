const noop = () => {};

export default function SyncActions({
  onConnectStrava = noop,
  onStartHistorical = noop,
  onStartIncremental = noop,
  isBusy = false,
}) {
  return (
    <section className="hero-card">
      <div className="hero-card-content">
        <div>
          <span className="eyebrow">Connexion et synchro</span>
          <h2 className="hero-title">Relier ou mettre a jour la source du compte actif</h2>
          <p className="hero-text">
            Connecte Strava, recharge l'historique local ou synchronise uniquement les nouvelles activites du compte en cours.
          </p>
        </div>
        <div className="actions-row hero-actions">
          <button type="button" className="button button-primary" onClick={onConnectStrava}>
            Connecter Strava
          </button>
          <button type="button" className="button button-glass" onClick={onStartHistorical} disabled={isBusy}>
            Recharger l'historique
          </button>
          <button type="button" className="button button-dark" onClick={onStartIncremental} disabled={isBusy}>
            Synchroniser les nouveautes
          </button>
        </div>
      </div>
      <div className="hero-card-footnote">
        {isBusy
          ? "Une synchronisation est deja en cours. Les actions sont temporairement verrouillees."
          : "Astuce : connectez d'abord Strava, lancez un historique complet, puis utilisez l'incremental au quotidien."}
      </div>
    </section>
  );
}
