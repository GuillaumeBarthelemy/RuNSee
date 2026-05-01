const noop = () => {};

export default function SyncActions({
  onConnectStrava = noop,
  onStartHistorical = noop,
  onStartIncremental = noop,
  onStartDetailBackfill = noop,
  isBusy = false,
  isStravaConnected = false,
  hasImportedActivities = false,
  missingDetailCount = 0,
  currentJob = null,
}) {
  const isDetailBackfillRunning = Boolean(isBusy && currentJob?.jobType === "detail_backfill");
  const primaryAction = !isStravaConnected
    ? {
        label: "Connecter Strava",
        onClick: onConnectStrava,
      }
    : !hasImportedActivities
      ? {
          label: "Importer l'historique",
          onClick: onStartHistorical,
        }
      : {
          label: "Synchroniser maintenant",
        onClick: onStartIncremental,
      };
  const primaryActionLabel = isBusy
    ? isDetailBackfillRunning
      ? "Enrichissement en cours"
      : "Synchronisation en cours"
    : primaryAction.label;

  const helperText = isBusy
    ? isDetailBackfillRunning
      ? `${currentJob?.message || "Enrichissement detaille historique en cours."} RunNSee relance automatiquement les lots tant qu'il reste des activites exploitables a completer.`
      : currentJob?.message || "Synchronisation en cours."
    : !isStravaConnected
      ? "Etape suivante : connecter Strava."
      : !hasImportedActivities
        ? "Etape suivante : importer l'historique."
        : missingDetailCount > 0
          ? `${missingDetailCount} activite(s) restent a enrichir en detail pour consolider la base analytique.`
          : "Strava est connecte. Les nouvelles activites seront enrichies automatiquement a la sync incrementale.";

  return (
    <section className="hero-card">
      <div className="hero-card-content">
        <div>
          <span className="eyebrow">2. Connexion Strava</span>
          <h2 className="hero-title">Connecter puis synchroniser</h2>
          <p className="hero-text">
            Une action principale suit l'etape du compte, avec un backfill detaille disponible quand l'historique en a besoin.
          </p>
        </div>
        <div className="actions-row hero-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={primaryAction.onClick}
            disabled={isBusy}
          >
            {primaryActionLabel}
          </button>
          {isStravaConnected && hasImportedActivities && missingDetailCount > 0 && !isBusy ? (
            <button type="button" className="button button-outline" onClick={onStartDetailBackfill}>
              Completer l'historique detaille
            </button>
          ) : null}
          {isStravaConnected && !isBusy ? (
            <button type="button" className="button button-outline" onClick={onConnectStrava}>
              Reconnecter Strava
            </button>
          ) : null}
        </div>
      </div>
      <div className="hero-card-footnote">{helperText}</div>
    </section>
  );
}
