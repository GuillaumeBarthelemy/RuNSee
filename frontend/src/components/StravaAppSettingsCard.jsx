import { useMemo, useState } from "react";

const noop = () => {};

function getStatusLabel(stravaApp) {
  if (stravaApp?.personalAppConfigured) {
    return "App Strava perso";
  }

  if (stravaApp?.sharedAppAvailable) {
    return "App RunNSee partagee";
  }

  return "App perso requise";
}

function getConnectionSourceLabel(stravaApp) {
  if (stravaApp?.connectionSource === "personal") {
    return "Application personnelle";
  }

  if (stravaApp?.sharedAppAvailable) {
    return "Application partagee RunNSee";
  }

  return "Aucune application active";
}

export default function StravaAppSettingsCard({
  stravaApp,
  isPending = false,
  onSave = noop,
  onDelete = noop,
  onDisconnectStrava = noop,
  canDisconnectStrava = false,
}) {
  const configuredClientId = String(stravaApp?.personalClientId || "").trim();
  const [clientId, setClientId] = useState(() => configuredClientId);
  const [clientSecret, setClientSecret] = useState("");

  const statusLabel = useMemo(() => getStatusLabel(stravaApp), [stravaApp]);
  const connectionSourceLabel = useMemo(() => getConnectionSourceLabel(stravaApp), [stravaApp]);
  const showAdvancedActions = Boolean(stravaApp?.personalAppConfigured || canDisconnectStrava);

  return (
    <section className="card">
      <div className="card-header-row wrap-on-mobile">
        <div>
          <h2 className="card-title">1. Mon application Strava</h2>
          <p className="card-subtitle">
            Renseigne ton Client ID et ton Client Secret, puis enregistre.
          </p>
        </div>
        <span className={`status-pill ${stravaApp?.personalAppConfigured ? "status-success" : "status-idle"}`}>
          {statusLabel}
        </span>
      </div>

      <p className="small-text">
        Callback domain a renseigner dans Strava : <strong>{stravaApp?.callbackDomain || "-"}</strong>
        {stravaApp?.personalAppConfigured ? ` · ${connectionSourceLabel}` : ""}
      </p>

      <div className="grid two-columns top-gap-sm">
        <label className="field">
          <span className="field-label">Client ID Strava</span>
          <input
            type="text"
            className="field-input"
            inputMode="numeric"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            placeholder="Ex. 123456"
            disabled={isPending}
          />
        </label>

        <label className="field">
          <span className="field-label">Client Secret Strava</span>
          <input
            type="password"
            className="field-input"
            autoComplete="new-password"
            value={clientSecret}
            onChange={(event) => setClientSecret(event.target.value)}
            placeholder={
              stravaApp?.personalAppConfigured
                ? "Laisser vide pour conserver le secret actuel"
                : "Secret de ton application Strava"
            }
            disabled={isPending}
          />
        </label>
      </div>

      <div className="actions-row top-gap-sm">
        <button
          type="button"
          className="button button-primary"
          onClick={() => onSave({ clientId, clientSecret })}
          disabled={isPending}
        >
          Enregistrer
        </button>
      </div>

      {showAdvancedActions ? (
        <details className="minimal-details top-gap-sm">
          <summary>Options avancees</summary>
          <div className="actions-row top-gap-sm">
            {stravaApp?.personalAppConfigured ? (
              <button
                type="button"
                className="button button-outline"
                onClick={() => onDelete()}
                disabled={isPending}
              >
                Retirer mon app
              </button>
            ) : null}
            {canDisconnectStrava ? (
              <button
                type="button"
                className="button button-outline"
                onClick={() => onDisconnectStrava()}
                disabled={isPending}
              >
                Delier Strava
              </button>
            ) : null}
          </div>
        </details>
      ) : null}
    </section>
  );
}
