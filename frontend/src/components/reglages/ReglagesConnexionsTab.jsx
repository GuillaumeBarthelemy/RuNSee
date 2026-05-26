import { memo } from "react";

/**
 * ReglagesConnexionsTab — Mockup p.22 onglet Connexions.
 *
 * Plateformes connectees (Strava, Garmin) + Autres integrations.
 */

const STRAVA_BRAND = { name: "Strava", color: "#fc4c02" };
const GARMIN_BRAND = { name: "Garmin", color: "#000000" };

function PlatformBadge({ brand, connected }) {
  return (
    <div className="reglages-platform-header">
      <span className="reglages-platform-name" style={{ color: brand.color }}>{brand.name.toUpperCase()}</span>
      <span className={`reglages-platform-status ${connected ? "is-connected" : "is-disconnected"}`}>
        {connected ? "Connecté" : "Non connecté"}
      </span>
    </div>
  );
}

function PlatformCard({ brand, account, lastSync, dataSynced = [], status, connected, onResync, onMore }) {
  return (
    <section className="reglages-card reglages-platform-card">
      <header className="reglages-platform-head">
        <PlatformBadge brand={brand} connected={connected} />
        <div className="reglages-platform-actions">
          <button type="button" className="reglages-btn reglages-btn-soft" onClick={onResync}>Re-synchroniser</button>
          <button type="button" className="reglages-platform-more" onClick={onMore} aria-label="Plus d'actions">⋮</button>
        </div>
      </header>
      <div className="reglages-platform-info">
        <div>
          <small>Compte</small>
          <strong>{account || "—"}</strong>
        </div>
        <div>
          <small>Dernière synchronisation</small>
          <strong>{lastSync || "Jamais"}</strong>
        </div>
        <div>
          <small>Statut</small>
          <strong className={`reglages-status-${status?.tone || "neutral"}`}>
            {status?.label || "—"}
          </strong>
        </div>
      </div>
      {dataSynced.length > 0 ? (
        <div className="reglages-platform-data">
          <small>Données synchronisées</small>
          <ul>
            {dataSynced.map((d, i) => (
              <li key={i}>
                <span className="reglages-platform-data-icon" aria-hidden="true">{d.icon}</span>
                {d.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function IntegrationRow({ name, description, icon, onConnect, connected = false }) {
  return (
    <li className="reglages-integration-row">
      <span className="reglages-integration-icon" aria-hidden="true">{icon}</span>
      <div>
        <strong>{name}</strong>
        <small>{description}</small>
      </div>
      <button
        type="button"
        className={`reglages-btn ${connected ? "reglages-btn-soft" : "reglages-btn-primary"}`}
        onClick={onConnect}
      >
        {connected ? "Déconnecter" : "Connecter"}
      </button>
    </li>
  );
}

function ReglagesConnexionsTab({
  stravaConnected = false,
  stravaAccount = "",
  stravaLastSync = "",
  garminConnected = false,
  garminAccount = "",
  garminLastSync = "",
  onResyncStrava = () => {},
  onResyncGarmin = () => {},
  onConnectStrava = () => {},
  onConnectGarmin = () => {},
}) {
  return (
    <div className="reglages-tab reglages-connexions-tab">
      <h3 className="reglages-section-title">Plateformes connectées</h3>
      <PlatformCard
        brand={STRAVA_BRAND}
        connected={stravaConnected}
        account={stravaAccount}
        lastSync={stravaLastSync}
        status={stravaConnected ? { tone: "positive", label: "Synchronisation OK" } : { tone: "warning", label: "Non connecté" }}
        dataSynced={[
          { icon: "🏃", label: "Activités" },
          { icon: "❤️", label: "Fréquence cardiaque" },
          { icon: "⚡", label: "Puissance" },
          { icon: "🗺️", label: "Parcours" },
        ]}
        onResync={stravaConnected ? onResyncStrava : onConnectStrava}
        onMore={() => {}}
      />

      <PlatformCard
        brand={GARMIN_BRAND}
        connected={garminConnected}
        account={garminAccount}
        lastSync={garminLastSync}
        status={garminConnected ? { tone: "positive", label: "Synchronisation OK" } : { tone: "warning", label: "Non connecté" }}
        dataSynced={[
          { icon: "🏃", label: "Activités" },
          { icon: "❤️", label: "Fréquence cardiaque" },
          { icon: "⌚", label: "Appareils" },
          { icon: "🌙", label: "Sommeil & Récup." },
        ]}
        onResync={garminConnected ? onResyncGarmin : onConnectGarmin}
        onMore={() => {}}
      />

      <h3 className="reglages-section-title">Autres intégrations</h3>
      <ul className="reglages-integrations-list reglages-card">
        <IntegrationRow
          name="Apple Santé"
          description="Importer les données d'activité et de fréquence cardiaque."
          icon="❤️"
          onConnect={() => {}}
        />
        <IntegrationRow
          name="TrainingPeaks"
          description="Planification et suivi de l'entraînement."
          icon="📊"
          onConnect={() => {}}
        />
      </ul>
    </div>
  );
}

export default memo(ReglagesConnexionsTab);
