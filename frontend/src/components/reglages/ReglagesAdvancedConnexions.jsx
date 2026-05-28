import { memo, useCallback, useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth.js";
import useToast from "../../hooks/useToast.js";
import GarminActivityBackfillCard from "../GarminActivityBackfillCard.jsx";
import StravaAppSettingsCard from "../StravaAppSettingsCard.jsx";
import {
  saveStravaAppConfig,
  deleteStravaAppConfig,
  disconnectStravaAccount,
} from "../../services/auth.service.js";
import {
  getGarminActivityBackfillStatus,
  startGarminActivityBackfill,
  pauseGarminActivityBackfill,
  resumeGarminActivityBackfill,
} from "../../services/externalProvider.service.js";

function extractErr(err, fallback) {
  return err?.response?.data?.userMessage || err?.response?.data?.message || err?.message || fallback;
}

/**
 * ReglagesAdvancedConnexions — Section "Paramètres avancés" (repliable) de
 * l'onglet Connexions. Regroupe les fonctions migrees depuis l'ancienne
 * page /admin (supprimee) :
 *   - Import historique d'activites Garmin (backfill).
 *   - Configuration d'une application Strava personnelle (clientId/secret).
 */
function ReglagesAdvancedConnexions({ garminConnected = false, stravaConnected = false }) {
  const { user, refreshUser } = useAuth();
  const { pushToast } = useToast();
  const [backfill, setBackfill] = useState(null);
  const [garminBusy, setGarminBusy] = useState(false);
  const [stravaBusy, setStravaBusy] = useState(false);

  const loadBackfill = useCallback(async () => {
    try {
      setBackfill(await getGarminActivityBackfillStatus());
    } catch {
      // silencieux : section avancee, non bloquante
    }
  }, []);

  useEffect(() => {
    if (garminConnected) loadBackfill();
  }, [garminConnected, loadBackfill]);

  const runGarmin = async (fn, okMsg) => {
    setGarminBusy(true);
    try {
      await fn();
      pushToast({ message: okMsg, tone: "success" });
      await loadBackfill();
    } catch (err) {
      pushToast({ message: extractErr(err, "Erreur."), tone: "error" });
    } finally {
      setGarminBusy(false);
    }
  };

  const handleSaveStravaApp = async ({ clientId, clientSecret }) => {
    setStravaBusy(true);
    try {
      const result = await saveStravaAppConfig({ clientId, clientSecret });
      if (typeof refreshUser === "function") await refreshUser();
      pushToast({
        message: result?.reauthorizationRequired
          ? "Application Strava enregistrée. Reconnecte Strava pour l'activer."
          : "Application Strava personnelle enregistrée.",
        tone: "success",
      });
    } catch (err) {
      pushToast({ message: extractErr(err, "Erreur lors de l'enregistrement de l'application Strava."), tone: "error" });
    } finally {
      setStravaBusy(false);
    }
  };

  const handleDeleteStravaApp = async () => {
    setStravaBusy(true);
    try {
      await deleteStravaAppConfig();
      if (typeof refreshUser === "function") await refreshUser();
      pushToast({ message: "Application Strava personnelle retirée.", tone: "success" });
    } catch (err) {
      pushToast({ message: extractErr(err, "Erreur lors du retrait de l'application Strava."), tone: "error" });
    } finally {
      setStravaBusy(false);
    }
  };

  const handleDisconnectStrava = async () => {
    setStravaBusy(true);
    try {
      await disconnectStravaAccount();
      if (typeof refreshUser === "function") await refreshUser();
      pushToast({ message: "Compte Strava déconnecté.", tone: "success" });
    } catch (err) {
      pushToast({ message: extractErr(err, "Erreur lors de la déconnexion Strava."), tone: "error" });
    } finally {
      setStravaBusy(false);
    }
  };

  return (
    <details className="reglages-advanced">
      <summary className="reglages-advanced-summary">Paramètres avancés</summary>
      <div className="reglages-advanced-body">
        {garminConnected ? (
          <GarminActivityBackfillCard
            backfill={backfill}
            isConnected={garminConnected}
            isPending={garminBusy}
            onStart={() => runGarmin(startGarminActivityBackfill, "Import historique Garmin lancé.")}
            onPause={() => runGarmin(pauseGarminActivityBackfill, "Import en pause.")}
            onResume={() => runGarmin(resumeGarminActivityBackfill, "Import repris.")}
          />
        ) : null}

        <StravaAppSettingsCard
          stravaApp={user?.stravaApp || null}
          isPending={stravaBusy}
          onSave={handleSaveStravaApp}
          onDelete={handleDeleteStravaApp}
          onDisconnectStrava={handleDisconnectStrava}
          canDisconnectStrava={stravaConnected}
        />
      </div>
    </details>
  );
}

export default memo(ReglagesAdvancedConnexions);
