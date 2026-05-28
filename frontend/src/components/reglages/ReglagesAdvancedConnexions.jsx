import { memo, useCallback, useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth.js";
import useToast from "../../hooks/useToast.js";
import GarminActivityBackfillCard from "../GarminActivityBackfillCard.jsx";
import StravaAppSettingsCard from "../StravaAppSettingsCard.jsx";
import {
  saveStravaAppConfig,
  deleteStravaAppConfig,
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
 * GarminBackfillSection — Import historique d'activites Garmin.
 * A inserer dans la carte plateforme Garmin (parametres avances).
 */
function GarminBackfillSectionImpl({ garminConnected = false }) {
  const { pushToast } = useToast();
  const [backfill, setBackfill] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadBackfill = useCallback(async () => {
    try { setBackfill(await getGarminActivityBackfillStatus()); } catch { /* non bloquant */ }
  }, []);

  useEffect(() => { if (garminConnected) loadBackfill(); }, [garminConnected, loadBackfill]);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn();
      pushToast({ message: okMsg, tone: "success" });
      await loadBackfill();
    } catch (err) {
      pushToast({ message: extractErr(err, "Erreur."), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (!garminConnected) return null;

  return (
    <GarminActivityBackfillCard
      backfill={backfill}
      isConnected={garminConnected}
      isPending={busy}
      onStart={() => run(startGarminActivityBackfill, "Import historique Garmin lancé.")}
      onPause={() => run(pauseGarminActivityBackfill, "Import en pause.")}
      onResume={() => run(resumeGarminActivityBackfill, "Import repris.")}
    />
  );
}

/**
 * StravaAppSection — Configuration d'une application Strava personnelle.
 * A inserer dans la carte plateforme Strava (parametres avances).
 */
function StravaAppSectionImpl() {
  const { user, refreshUser } = useAuth();
  const { pushToast } = useToast();
  const [busy, setBusy] = useState(false);

  const handleSave = async ({ clientId, clientSecret }) => {
    setBusy(true);
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
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteStravaAppConfig();
      if (typeof refreshUser === "function") await refreshUser();
      pushToast({ message: "Application Strava personnelle retirée.", tone: "success" });
    } catch (err) {
      pushToast({ message: extractErr(err, "Erreur lors du retrait de l'application Strava."), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  // Note : la deconnexion Strava est geree par le menu de la carte plateforme
  // (evite le doublon). On masque donc le bouton de la carte app.
  return (
    <StravaAppSettingsCard
      stravaApp={user?.stravaApp || null}
      isPending={busy}
      onSave={handleSave}
      onDelete={handleDelete}
      canDisconnectStrava={false}
    />
  );
}

export const GarminBackfillSection = memo(GarminBackfillSectionImpl);
export const StravaAppSection = memo(StravaAppSectionImpl);
