import { memo, useCallback, useEffect, useRef, useState } from "react";
import useToast from "../../hooks/useToast.js";
import {
  connectStrava,
  disconnectGarminAccount,
  disconnectStrava,
  fetchProviderStatuses,
  formatRelativeDate,
  purgeGarminData,
  resyncGarmin,
  resyncStrava,
} from "../../services/connexions.service.js";
import ConfirmDialog from "./ConfirmDialog.jsx";
import GarminConnectModal from "./GarminConnectModal.jsx";
import PlatformActionsMenu from "./PlatformActionsMenu.jsx";
import { GarminBackfillSection, StravaAppSection } from "./ReglagesAdvancedConnexions.jsx";

const STRAVA_BRAND = { name: "Strava", color: "#fc4c02" };
const GARMIN_BRAND = { name: "Garmin", color: "#1a1a1a" };

const STRAVA_DATA = [
  { icon: "🏃", label: "Activités" },
  { icon: "❤️", label: "Fréquence cardiaque" },
  { icon: "⚡", label: "Puissance" },
  { icon: "🗺️", label: "Parcours" },
];
const GARMIN_DATA = [
  { icon: "🏃", label: "Activités" },
  { icon: "❤️", label: "Fréquence cardiaque" },
  { icon: "⌚", label: "Appareils" },
  { icon: "🌙", label: "Sommeil & Récup." },
];

function extractErrorMessage(err, fallback = "Erreur.") {
  return err?.response?.data?.userMessage || err?.response?.data?.message || err?.message || fallback;
}

function PlatformBadge({ brand, connected, hasError }) {
  let label;
  let cls;
  if (hasError) { label = "Erreur"; cls = "is-error"; }
  else if (connected) { label = "Connecté"; cls = "is-connected"; }
  else { label = "Non connecté"; cls = "is-disconnected"; }
  return (
    <div className="reglages-platform-header">
      <span className="reglages-platform-name" style={{ color: brand.color }}>{brand.name.toUpperCase()}</span>
      <span className={`reglages-platform-status ${cls}`}>{label}</span>
    </div>
  );
}

function PlatformCard({
  brand,
  status,
  dataLabels,
  syncing,
  onConnect,
  onResync,
  menuActions,
  advanced = null,
  advancedLabel = "Paramètres avancés",
}) {
  const connected = Boolean(status?.connected);
  const hasError = Boolean(status?.lastErrorCode && status?.lastErrorAt);
  const statusTone = hasError ? "warning" : connected ? "positive" : "neutral";
  const statusLabel = hasError
    ? "Erreur de synchronisation"
    : connected
      ? "Synchronisation OK"
      : "Non connecté";

  return (
    <section className="reglages-card reglages-platform-card">
      <header className="reglages-platform-head">
        <PlatformBadge brand={brand} connected={connected} hasError={hasError} />
        <div className="reglages-platform-actions">
          {connected ? (
            <button
              type="button"
              className="reglages-btn reglages-btn-soft"
              onClick={onResync}
              disabled={syncing}
            >
              {syncing ? "Synchronisation…" : "Re-synchroniser"}
            </button>
          ) : (
            <button
              type="button"
              className="reglages-btn reglages-btn-primary"
              onClick={onConnect}
              disabled={syncing}
            >
              Se connecter
            </button>
          )}
          {connected && menuActions?.length > 0 ? <PlatformActionsMenu actions={menuActions} /> : null}
        </div>
      </header>
      <div className="reglages-platform-info">
        <div>
          <small>Compte</small>
          <strong>
            {status?.displayName || status?.accountIdentifier || "—"}
          </strong>
        </div>
        <div>
          <small>Dernière synchronisation</small>
          <strong>{formatRelativeDate(status?.lastSyncAt)}</strong>
        </div>
        <div>
          <small>Statut</small>
          <strong className={`reglages-status-${statusTone}`}>{statusLabel}</strong>
        </div>
      </div>
      {hasError && status?.lastErrorMessage ? (
        <div className="reglages-modal-error reglages-platform-error">
          ⚠️ {status.lastErrorMessage}
        </div>
      ) : null}
      <div className="reglages-platform-data">
        <small>Données synchronisées</small>
        <ul>
          {dataLabels.map((d, i) => (
            <li key={i}>
              <span className="reglages-platform-data-icon" aria-hidden="true">{d.icon}</span>
              {d.label}
            </li>
          ))}
        </ul>
      </div>
      {advanced ? (
        <details className="reglages-platform-advanced">
          <summary className="reglages-advanced-summary">{advancedLabel}</summary>
          <div className="reglages-advanced-body">{advanced}</div>
        </details>
      ) : null}
    </section>
  );
}

function IntegrationRow({ name, description, icon, comingSoon = true, onConnect }) {
  return (
    <li className="reglages-integration-row">
      <span className="reglages-integration-icon" aria-hidden="true">{icon}</span>
      <div>
        <strong>{name}</strong>
        <small>{description}</small>
      </div>
      <button
        type="button"
        className="reglages-btn"
        onClick={onConnect}
        disabled={comingSoon}
        title={comingSoon ? "Disponible prochainement" : ""}
      >
        {comingSoon ? "Bientôt" : "Connecter"}
      </button>
    </li>
  );
}

/**
 * ReglagesConnexionsTab — Mockup p.22 onglet Connexions (Phase 2).
 *
 * Wiring complet :
 *   - GET /providers/status au montage + polling 30s pendant un sync en cours
 *   - Boutons Re-synchroniser : POST /sync/incremental (Strava) / recovery+enrich
 *     (Garmin), avec spinner et toast
 *   - Bouton Se connecter (Strava) : redirection OAuth
 *   - Bouton Se connecter (Garmin) : ouvre GarminConnectModal (email + password)
 *   - Menu ⋮ : Déconnecter / Purger données (Garmin)
 *   - Confirmations via ConfirmDialog
 */
function ReglagesConnexionsTab() {
  const { pushToast } = useToast();
  const [statuses, setStatuses] = useState({ strava: null, garmin: null });
  const [loading, setLoading] = useState(false);
  const [stravaSyncing, setStravaSyncing] = useState(false);
  const [garminSyncing, setGarminSyncing] = useState(false);
  const [garminModalOpen, setGarminModalOpen] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(null); // 'strava' | 'garmin' | null
  const [confirmPurgeGarmin, setConfirmPurgeGarmin] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const pollingRef = useRef(null);

  const loadStatuses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchProviderStatuses();
      const providers = data?.providers || data || {};
      setStatuses({
        strava: providers.strava || null,
        garmin: providers.garmin || null,
      });
    } catch (err) {
      pushToast({ message: extractErrorMessage(err, "Impossible de charger l'état des connexions."), tone: "error" });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    loadStatuses();
    return () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
  }, [loadStatuses]);

  // Pendant un sync, poll toutes les 10s pour rafraichir lastSyncAt / lastErrorAt
  useEffect(() => {
    if (stravaSyncing || garminSyncing) {
      if (!pollingRef.current) {
        pollingRef.current = setInterval(loadStatuses, 10000);
      }
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [stravaSyncing, garminSyncing, loadStatuses]);

  const handleResyncStrava = async () => {
    setStravaSyncing(true);
    try {
      await resyncStrava();
      pushToast({ message: "Synchronisation Strava lancée.", tone: "success" });
      // Rafraichit apres 3s pour capturer le lastSyncAt si rapide
      setTimeout(loadStatuses, 3000);
    } catch (err) {
      pushToast({ message: extractErrorMessage(err, "Échec de la synchronisation Strava."), tone: "error" });
    } finally {
      // Garde le state syncing 5s minimum pour feedback visuel
      setTimeout(() => setStravaSyncing(false), 5000);
    }
  };

  const handleResyncGarmin = async () => {
    setGarminSyncing(true);
    try {
      await resyncGarmin();
      pushToast({ message: "Synchronisation Garmin lancée.", tone: "success" });
      setTimeout(loadStatuses, 3000);
    } catch (err) {
      pushToast({ message: extractErrorMessage(err, "Échec de la synchronisation Garmin."), tone: "error" });
    } finally {
      setTimeout(() => setGarminSyncing(false), 5000);
    }
  };

  const handleConnectStrava = () => {
    try {
      connectStrava();
    } catch (err) {
      pushToast({ message: extractErrorMessage(err, "Impossible d'initier la connexion Strava."), tone: "error" });
    }
  };

  const handleDisconnect = async (provider) => {
    setActionBusy(true);
    try {
      if (provider === "strava") {
        await disconnectStrava();
      } else if (provider === "garmin") {
        await disconnectGarminAccount();
      }
      pushToast({ message: `${provider === "strava" ? "Strava" : "Garmin"} déconnecté.`, tone: "success" });
      setConfirmDisconnect(null);
      await loadStatuses();
    } catch (err) {
      pushToast({ message: extractErrorMessage(err, "Échec de la déconnexion."), tone: "error" });
    } finally {
      setActionBusy(false);
    }
  };

  const handlePurgeGarmin = async () => {
    setActionBusy(true);
    try {
      await purgeGarminData();
      pushToast({ message: "Données Garmin purgées.", tone: "success" });
      setConfirmPurgeGarmin(false);
      await loadStatuses();
    } catch (err) {
      pushToast({ message: extractErrorMessage(err, "Échec de la purge."), tone: "error" });
    } finally {
      setActionBusy(false);
    }
  };

  const stravaConnected = Boolean(statuses.strava?.connected);
  const garminConnected = Boolean(statuses.garmin?.connected);

  return (
    <div className="reglages-tab reglages-connexions-tab">
      <h3 className="reglages-section-title">
        Plateformes connectées
        {loading ? <small> · chargement…</small> : null}
      </h3>

      <PlatformCard
        brand={STRAVA_BRAND}
        status={statuses.strava}
        dataLabels={STRAVA_DATA}
        syncing={stravaSyncing}
        onConnect={handleConnectStrava}
        onResync={handleResyncStrava}
        menuActions={stravaConnected ? [
          { label: "Déconnecter Strava", danger: true, onClick: () => setConfirmDisconnect("strava") },
        ] : []}
        advancedLabel="Application Strava personnelle"
        advanced={<StravaAppSection stravaConnected={stravaConnected} />}
      />

      <PlatformCard
        brand={GARMIN_BRAND}
        status={statuses.garmin}
        dataLabels={GARMIN_DATA}
        syncing={garminSyncing}
        onConnect={() => setGarminModalOpen(true)}
        onResync={handleResyncGarmin}
        menuActions={garminConnected ? [
          { label: "Purger les données Garmin", danger: true, onClick: () => setConfirmPurgeGarmin(true) },
          { label: "Déconnecter Garmin", danger: true, onClick: () => setConfirmDisconnect("garmin") },
        ] : []}
        advancedLabel="Import historique des activités"
        advanced={garminConnected ? <GarminBackfillSection garminConnected={garminConnected} /> : null}
      />

      <h3 className="reglages-section-title">Autres intégrations</h3>
      <ul className="reglages-integrations-list reglages-card">
        <IntegrationRow
          name="Apple Santé"
          description="Importer les données d'activité et de fréquence cardiaque."
          icon="❤️"
          comingSoon
        />
        <IntegrationRow
          name="TrainingPeaks"
          description="Planification et suivi de l'entraînement."
          icon="📊"
          comingSoon
        />
      </ul>

      {/* Modals */}
      <GarminConnectModal
        open={garminModalOpen}
        onClose={() => setGarminModalOpen(false)}
        onSuccess={loadStatuses}
      />
      <ConfirmDialog
        open={confirmDisconnect !== null}
        title={`Déconnecter ${confirmDisconnect === "strava" ? "Strava" : "Garmin"} ?`}
        description={`Tu pourras te reconnecter à tout moment. Les données déjà synchronisées seront conservées.`}
        confirmLabel={actionBusy ? "Déconnexion…" : "Déconnecter"}
        cancelLabel="Annuler"
        tone="danger"
        onConfirm={() => handleDisconnect(confirmDisconnect)}
        onCancel={() => !actionBusy && setConfirmDisconnect(null)}
      />
      <ConfirmDialog
        open={confirmPurgeGarmin}
        title="Purger les données Garmin ?"
        description={`Toutes les données Garmin (sommeil, HRV, FC repos, fitness/endurance scores) seront supprimées. Cette action est irréversible. Les activités Strava ne sont pas affectées.`}
        confirmLabel={actionBusy ? "Suppression…" : "Tout purger"}
        cancelLabel="Annuler"
        tone="danger"
        onConfirm={handlePurgeGarmin}
        onCancel={() => !actionBusy && setConfirmPurgeGarmin(false)}
      />
    </div>
  );
}

export default memo(ReglagesConnexionsTab);
