import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import GarminExperimentalCard from "../components/GarminExperimentalCard.jsx";
import PhysiologicalProfileCard from "../components/PhysiologicalProfileCard.jsx";
import RaceObjectivesCard from "../components/RaceObjectivesCard.jsx";
import StravaAppSettingsCard from "../components/StravaAppSettingsCard.jsx";
import SyncActions from "../components/SyncActions.jsx";
import SyncSummaryCard from "../components/SyncSummaryCard.jsx";
import TrainingAnalyticsSettingsCard from "../components/TrainingAnalyticsSettingsCard.jsx";
import UserPreferencesCard from "../components/UserPreferencesCard.jsx";
import useDashboardState from "../hooks/useDashboardState.js";
import useAuth from "../hooks/useAuth.js";
import useRaceObjectives from "../hooks/useRaceObjectives.js";
import useRunSeeData from "../hooks/useRunSeeData.js";
import { getStravaLoginUrl } from "../config/env.js";
import AppShell from "../layouts/AppShell.jsx";
import {
  connectGarmin,
  disconnectGarmin,
  getGarminConnectionStatus,
  startGarminRecoveryBackfill,
} from "../services/externalProvider.service.js";
import { saveTrainingAnalyticsSettings } from "../services/trainingAnalyticsSettings.service.js";
import { startDetailBackfill, startHistoricalSync, startIncrementalSync } from "../services/sync.service.js";

function extractErrorMessage(error, fallback) {
  return error?.response?.data?.userMessage || error?.response?.data?.message || error?.message || fallback;
}

const noop = () => {};

export default function AdminPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    user,
    refreshUser,
    disconnectStrava,
    saveStravaApp,
    deleteStravaApp,
  } = useAuth();
  const {
    athlete,
    summary,
    currentJob,
    trainingAnalyticsSettings,
    trainingAnalyticsSettingsHistory,
    error,
    setError,
    reload,
    isBusy,
  } = useRunSeeData({ includeActivities: false });
  const { dashboardState, dashboardActions } = useDashboardState();
  const [actionNotice, setActionNotice] = useState("");
  const [infoNotice, setInfoNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGarminSubmitting, setIsGarminSubmitting] = useState(false);
  const [isGarminBackfillSubmitting, setIsGarminBackfillSubmitting] = useState(false);
  const [garminConnection, setGarminConnection] = useState(null);
  const [garminRecoveryBackfill, setGarminRecoveryBackfill] = useState(null);
  const [trainingSettingsOverride, setTrainingSettingsOverride] = useState(null);
  const [trainingSettingsHistoryOverride, setTrainingSettingsHistoryOverride] = useState(null);
  const safeSetError = setError ?? noop;
  const safeReload = reload ?? noop;
  const safeSetOption = dashboardActions?.setOption ?? noop;

  const handleRaceObjectiveError = useCallback((error) => {
    safeSetError(error?.response?.data?.userMessage || error?.message || "Erreur lors de la gestion des courses objectifs.");
  }, [safeSetError]);

  const {
    races: raceObjectives,
    activeRace: activeRaceObjective,
    isLoading: isLoadingRaces,
    isMutating: isMutatingRaces,
    createRace: createRaceObjective,
    archiveRace: archiveRaceObjective,
    reactivateRace: reactivateRaceObjective,
  } = useRaceObjectives({ onError: handleRaceObjectiveError });

  const userPreferenceOptions = useMemo(
    () => ({
      userLocale: dashboardState?.options?.userLocale || "fr-FR",
      userDistanceUnit: dashboardState?.options?.userDistanceUnit || "km",
      userWeekStartsOn: dashboardState?.options?.userWeekStartsOn || "monday",
    }),
    [dashboardState?.options],
  );

  const stravaApp = user?.stravaApp || null;
  const isStravaConnected = Boolean(user?.stravaConnected || athlete);
  const hasImportedActivities = Number(summary?.totalActivities || 0) > 0;
  const missingDetailCount = Number(summary?.pendingDetailEnrichment || 0);
  const displayedTrainingAnalyticsSettings = trainingSettingsOverride || trainingAnalyticsSettings;
  const displayedTrainingAnalyticsSettingsHistory = trainingSettingsHistoryOverride || trainingAnalyticsSettingsHistory;
  const isFormSubmitting = Boolean(isSubmitting || isGarminSubmitting);

  const loadGarminConnection = useCallback(async () => {
    try {
      const result = await getGarminConnectionStatus();
      setGarminConnection(result?.connection || null);
      setGarminRecoveryBackfill(result?.recoveryBackfill || null);
    } catch {
      setGarminConnection(null);
      setGarminRecoveryBackfill(null);
    }
  }, []);

  const handleConnectStrava = useCallback(() => {
    if (!stravaApp?.personalAppConfigured && !stravaApp?.sharedAppAvailable) {
      safeSetError("Ajoute d'abord ton application Strava personnelle pour connecter ce compte.");
      return;
    }

    if (typeof window !== "undefined") {
      const nextUrl = getStravaLoginUrl(window.location.href);

      if (nextUrl) {
        window.location.href = nextUrl;
      }
    }
  }, [safeSetError, stravaApp?.personalAppConfigured, stravaApp?.sharedAppAvailable]);

  useEffect(() => {
    const stravaStatus = String(searchParams.get("strava") || "").trim();

    if (stravaStatus !== "connected") {
      return;
    }

    setActionNotice("Compte Strava lie avec succes a cet utilisateur RunNSee.");
    refreshUser({ silent: true }).catch(() => {});
    Promise.resolve(safeReload()).catch(() => {});

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("strava");
    setSearchParams(nextSearchParams, { replace: true });
  }, [refreshUser, safeReload, searchParams, setSearchParams]);

  useEffect(() => {
    loadGarminConnection().catch(() => {});
  }, [loadGarminConnection]);

  useEffect(() => {
    const isRecoveryRunning = Boolean(
      garminRecoveryBackfill?.isRunning || garminConnection?.status === "syncing",
    );

    if (!isRecoveryRunning) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      loadGarminConnection().catch(() => {});
    }, 5000);

    return () => window.clearInterval(timer);
  }, [garminConnection?.status, garminRecoveryBackfill?.isRunning, loadGarminConnection]);

  useEffect(() => {
    const authStatus = String(searchParams.get("auth") || "").trim();

    if (!authStatus) {
      return;
    }

    if (authStatus === "strava_refused") {
      setInfoNotice("La connexion Strava a ete annulee. Tu peux relancer l'autorisation quand tu veux.");
    } else if (authStatus === "strava_already_linked") {
      safeSetError(
        "Ce compte Strava est deja lie a un autre compte RunNSee. Deconnecte-toi de Strava dans ce navigateur ou utilise une fenetre privee pour lier ton propre compte.",
      );
    } else if (authStatus === "strava_app_missing") {
      safeSetError(
        "L'application Strava personnelle utilisee pour cette connexion n'est plus disponible. Reenregistre-la puis reconnecte Strava.",
      );
    } else if (authStatus === "session_required") {
      safeSetError("Reconnecte-toi a ton compte RunNSee avant de lier Strava.");
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("auth");
    setSearchParams(nextSearchParams, { replace: true });
  }, [safeSetError, searchParams, setSearchParams]);

  useEffect(() => {
    if (location.hash !== "#race-objectives" || typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById("race-objectives")?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    });
  }, [location.hash]);

  const handleDisconnectStrava = useCallback(async () => {
    const shouldDisconnect =
      typeof window === "undefined" ||
      window.confirm(
        "Delier Strava supprimera aussi les activites et synchronisations importees pour ce compte. Continuer ?",
      );

    if (!shouldDisconnect) {
      return;
    }

    safeSetError("");
    setInfoNotice("");
    setActionNotice("");
    setIsSubmitting(true);

    try {
      await disconnectStrava();
      await safeReload();
      setActionNotice("La liaison Strava et les donnees synchronisees ont bien ete supprimees.");
    } catch (error) {
      safeSetError(extractErrorMessage(error, "Erreur lors de la deconnexion de Strava."));
    } finally {
      setIsSubmitting(false);
    }
  }, [disconnectStrava, safeReload, safeSetError]);

  const handleSaveStravaApp = useCallback(async ({ clientId, clientSecret }) => {
    safeSetError("");
    setInfoNotice("");
    setActionNotice("");
    setIsSubmitting(true);

    try {
      const result = await saveStravaApp({ clientId, clientSecret });
      await safeReload();
      setActionNotice(
        result?.reauthorizationRequired
          ? "Application Strava personnelle enregistree. Reconnecte maintenant Strava pour activer cette nouvelle application."
          : "Application Strava personnelle enregistree pour ce compte.",
      );
    } catch (error) {
      safeSetError(extractErrorMessage(error, "Erreur lors de l'enregistrement de l'application Strava."));
    } finally {
      setIsSubmitting(false);
    }
  }, [safeReload, safeSetError, saveStravaApp]);

  const handleDeleteStravaApp = useCallback(async () => {
    const shouldDelete =
      typeof window === "undefined" ||
      window.confirm(
        "Retirer l'application Strava personnelle forcera une reconnexion si elle etait encore utilisee. Continuer ?",
      );

    if (!shouldDelete) {
      return;
    }

    safeSetError("");
    setInfoNotice("");
    setActionNotice("");
    setIsSubmitting(true);

    try {
      const result = await deleteStravaApp();
      await safeReload();
      setActionNotice(
        result?.reauthorizationRequired
          ? "Application Strava personnelle retiree. Reconnecte Strava pour repasser sur l'application partagee RunNSee."
          : "Application Strava personnelle retiree pour ce compte.",
      );
    } catch (error) {
      safeSetError(extractErrorMessage(error, "Erreur lors de la suppression de l'application Strava."));
    } finally {
      setIsSubmitting(false);
    }
  }, [deleteStravaApp, safeReload, safeSetError]);

  const handleStartHistorical = useCallback(async () => {
    safeSetError("");
    setInfoNotice("");
    setActionNotice("");
    try {
      await startHistoricalSync();
      await safeReload();
    } catch (err) {
      safeSetError(extractErrorMessage(err, "Erreur lors du lancement du rechargement historique."));
    }
  }, [safeReload, safeSetError]);

  const handleStartIncremental = useCallback(async () => {
    safeSetError("");
    setInfoNotice("");
    setActionNotice("");
    try {
      await startIncrementalSync();
      await safeReload();
    } catch (err) {
      safeSetError(extractErrorMessage(err, "Erreur lors du lancement de la synchronisation incrementale."));
    }
  }, [safeReload, safeSetError]);

  const handleStartDetailBackfill = useCallback(async () => {
    safeSetError("");
    setInfoNotice("");
    setActionNotice("");
    try {
      await startDetailBackfill();
      await safeReload();
      setActionNotice("L'enrichissement detaille historique a ete lance. RunNSee poursuivra les lots automatiquement tant qu'il reste du stock a completer.");
    } catch (err) {
      safeSetError(extractErrorMessage(err, "Erreur lors du lancement de l'enrichissement detaille."));
    }
  }, [safeReload, safeSetError]);

  const handleConnectGarmin = useCallback(async (payload) => {
    safeSetError("");
    setInfoNotice("");
    setActionNotice("");
    setIsGarminSubmitting(true);

    try {
      const result = await connectGarmin(payload);
      setGarminConnection(result?.connection || null);
      if (result?.recoveryBackfill) {
        setGarminRecoveryBackfill(result.recoveryBackfill);
      }
      setActionNotice(result?.message || "Connexion Garmin mise a jour.");
      return result;
    } catch (error) {
      const connection = error?.response?.data?.connection;
      if (connection) {
        setGarminConnection(connection);
      } else {
        await loadGarminConnection();
      }

      safeSetError(extractErrorMessage(error, "Erreur lors de la connexion Garmin."));
      return null;
    } finally {
      setIsGarminSubmitting(false);
    }
  }, [loadGarminConnection, safeSetError]);

  const handleDisconnectGarmin = useCallback(async () => {
    const shouldDisconnect =
      typeof window === "undefined" ||
      window.confirm("Deconnecter Garmin supprimera la session stockee pour ce compte. Continuer ?");

    if (!shouldDisconnect) {
      return;
    }

    safeSetError("");
    setInfoNotice("");
    setActionNotice("");
    setIsGarminSubmitting(true);

    try {
      const result = await disconnectGarmin();
      setGarminConnection(result?.connection || null);
      setGarminRecoveryBackfill(result?.recoveryBackfill || null);
      setActionNotice(result?.message || "Garmin est deconnecte.");
    } catch (error) {
      safeSetError(extractErrorMessage(error, "Erreur lors de la deconnexion Garmin."));
    } finally {
      setIsGarminSubmitting(false);
    }
  }, [safeSetError]);

  const handleStartGarminRecoveryBackfill = useCallback(async () => {
    safeSetError("");
    setInfoNotice("");
    setActionNotice("");
    setIsGarminBackfillSubmitting(true);

    try {
      const result = await startGarminRecoveryBackfill();
      setGarminConnection(result?.connection || null);
      setGarminRecoveryBackfill(result?.recoveryBackfill || null);
      setActionNotice(result?.message || "Recuperation Garmin lancee.");
    } catch (error) {
      const connection = error?.response?.data?.connection;
      if (connection) {
        setGarminConnection(connection);
      } else {
        await loadGarminConnection();
      }

      safeSetError(extractErrorMessage(error, "Erreur lors de la recuperation Garmin."));
    } finally {
      setIsGarminBackfillSubmitting(false);
    }
  }, [loadGarminConnection, safeSetError]);

  const handleSaveTrainingAnalyticsSettings = useCallback(async (payload) => {
    safeSetError("");
    setInfoNotice("");
    setActionNotice("");
    setIsSubmitting(true);

    try {
      const result = await saveTrainingAnalyticsSettings(payload);
      if (result?.settings) {
        setTrainingSettingsOverride(result.settings);
      }
      if (Array.isArray(result?.history)) {
        setTrainingSettingsHistoryOverride(result.history);
      }
      await safeReload();
      setActionNotice("Les parametres analytics ont ete enregistres et versionnes pour ce compte.");
    } catch (error) {
      safeSetError(extractErrorMessage(error, "Erreur lors de l'enregistrement des parametres analytics."));
    } finally {
      setIsSubmitting(false);
    }
  }, [safeReload, safeSetError]);

  const handleRestoreTrainingAnalyticsSettings = useCallback(async (entry) => {
    if (!entry) {
      return;
    }

    await handleSaveTrainingAnalyticsSettings({
      heartRateMax: entry.heartRateMax,
      restingHeartrate: entry.restingHeartrate ?? entry.heartRateRest,
      biologicalSex: entry.biologicalSex,
      heartRateZone1Max: entry.heartRateZone1Max,
      heartRateZone2Max: entry.heartRateZone2Max,
      heartRateZone3Max: entry.heartRateZone3Max,
      heartRateZone4Max: entry.heartRateZone4Max,
      intensitySourcePriority: entry.intensitySourcePriority,
      efficiencyMinDurationMinutes: entry.efficiencyMinDurationMinutes,
      efficiencyMaxElevationPerKm: entry.efficiencyMaxElevationPerKm,
      efficiencyExcludeTrail: entry.efficiencyExcludeTrail,
    });
  }, [handleSaveTrainingAnalyticsSettings]);

  return (
    <AppShell
      eyebrow="Reglages"
      title="Reglages"
      subtitle="Ajuste ton profil, tes objectifs, tes preferences et tes sources de donnees."
    >
      {error ? <div className="alert alert-error section">{error}</div> : null}
      {infoNotice ? <div className="alert alert-info section">{infoNotice}</div> : null}
      {actionNotice ? <div className="alert alert-success section">{actionNotice}</div> : null}
      {!summary && isBusy ? <div className="card section">Chargement des reglages...</div> : null}

      <section className="section">
        <PhysiologicalProfileCard
          settings={displayedTrainingAnalyticsSettings}
          isPending={isFormSubmitting}
          onSave={handleSaveTrainingAnalyticsSettings}
        />
      </section>

      <section id="race-objectives" className="section admin-anchor-section">
        <RaceObjectivesCard
          races={raceObjectives}
          activeRace={activeRaceObjective}
          isLoading={isLoadingRaces}
          isMutating={isMutatingRaces}
          onCreate={createRaceObjective}
          onArchive={archiveRaceObjective}
          onReactivate={reactivateRaceObjective}
        />
      </section>

      <section className="section">
        <UserPreferencesCard
          options={userPreferenceOptions}
          onOptionChange={(name, value) => safeSetOption(name, value)}
        />
      </section>

      <section className="section">
        <TrainingAnalyticsSettingsCard
          settings={displayedTrainingAnalyticsSettings}
          history={displayedTrainingAnalyticsSettingsHistory}
          isPending={isFormSubmitting}
          onSave={handleSaveTrainingAnalyticsSettings}
          onRestore={handleRestoreTrainingAnalyticsSettings}
          showPhysiologyPanel={false}
        />
      </section>

      <section className="section">
        <GarminExperimentalCard
          status={garminConnection?.status || "disconnected"}
          connection={garminConnection}
          recoveryBackfill={garminRecoveryBackfill}
          canConnect
          isPending={isGarminSubmitting}
          isBackfillPending={isGarminBackfillSubmitting}
          onConnect={handleConnectGarmin}
          onDisconnect={handleDisconnectGarmin}
          onStartRecoveryBackfill={handleStartGarminRecoveryBackfill}
        />
      </section>

      <section className="section admin-strava-section">
        <div className="admin-strava-heading">
          <span className="eyebrow admin-card-kicker">Strava</span>
          <h2 className="card-title">Connexion et synchronisation</h2>
          <p className="card-subtitle">
            Tout ce qui concerne l'application Strava, la connexion du compte et les imports reste regroupe en bas de page.
          </p>
        </div>
        <div className="admin-strava-grid">
          <StravaAppSettingsCard
            stravaApp={stravaApp}
            isPending={isFormSubmitting}
            onSave={handleSaveStravaApp}
            onDelete={handleDeleteStravaApp}
            onDisconnectStrava={handleDisconnectStrava}
            canDisconnectStrava={isStravaConnected}
          />
          <SyncActions
            onConnectStrava={handleConnectStrava}
            onStartHistorical={handleStartHistorical}
            onStartIncremental={handleStartIncremental}
            onStartDetailBackfill={handleStartDetailBackfill}
            isBusy={Boolean(isBusy || isFormSubmitting)}
            isStravaConnected={isStravaConnected}
            hasImportedActivities={hasImportedActivities}
            missingDetailCount={missingDetailCount}
            currentJob={currentJob}
          />
          <SyncSummaryCard
            summary={summary}
            athlete={athlete}
            currentJob={currentJob}
            isStravaConnected={isStravaConnected}
          />
        </div>
      </section>
    </AppShell>
  );
}
