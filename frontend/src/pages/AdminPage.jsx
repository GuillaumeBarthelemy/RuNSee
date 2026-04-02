import { useCallback, useMemo, useState } from "react";
import AccountOverviewCard from "../components/AccountOverviewCard.jsx";
import HeartRateSettingsCard from "../components/HeartRateSettingsCard.jsx";
import SyncActions from "../components/SyncActions.jsx";
import SyncStatusCard from "../components/SyncStatusCard.jsx";
import SyncSummaryCard from "../components/SyncSummaryCard.jsx";
import UserPreferencesCard from "../components/UserPreferencesCard.jsx";
import useDashboardState from "../hooks/useDashboardState.js";
import useRunSeeData from "../hooks/useRunSeeData.js";
import { forgotPasswordUrl, stravaLoginUrl } from "../config/env.js";
import AppShell from "../layouts/AppShell.jsx";
import { buildCurrentAccountModel } from "../utils/accountPresentation.js";
import { startHistoricalSync, startIncrementalSync } from "../services/sync.service.js";

function extractErrorMessage(error, fallback) {
  return error?.response?.data?.userMessage || error?.response?.data?.message || error?.message || fallback;
}

const noop = () => {};

export default function AdminPage() {
  const {
    athlete,
    summary,
    currentJob,
    error,
    setError,
    reload,
    isBusy,
  } = useRunSeeData({ includeActivities: false });
  const { dashboardState, dashboardActions } = useDashboardState();
  const [passwordResetNotice, setPasswordResetNotice] = useState("");
  const safeSetError = setError ?? noop;
  const safeReload = reload ?? noop;
  const safeSetOption = dashboardActions?.setOption ?? noop;

  const userPreferenceOptions = useMemo(
    () => ({
      userLocale: dashboardState?.options?.userLocale || "fr-FR",
      userDistanceUnit: dashboardState?.options?.userDistanceUnit || "km",
      userWeekStartsOn: dashboardState?.options?.userWeekStartsOn || "monday",
    }),
    [dashboardState?.options],
  );

  const heartRateOptions = useMemo(
    () => ({
      heartRateMax: dashboardState?.options?.heartRateMax || "",
      heartRateZone1Max: dashboardState?.options?.heartRateZone1Max || "",
      heartRateZone2Max: dashboardState?.options?.heartRateZone2Max || "",
      heartRateZone3Max: dashboardState?.options?.heartRateZone3Max || "",
      heartRateZone4Max: dashboardState?.options?.heartRateZone4Max || "",
    }),
    [dashboardState?.options],
  );

  const account = useMemo(
    () => buildCurrentAccountModel({ athlete, options: dashboardState?.options || {}, summary }),
    [athlete, dashboardState?.options, summary],
  );

  const handleConnectStrava = useCallback(() => {
    if (typeof window !== "undefined" && stravaLoginUrl) {
      window.location.href = stravaLoginUrl;
    }
  }, []);

  const handleForgotPassword = useCallback(() => {
    if (typeof window !== "undefined" && forgotPasswordUrl) {
      setPasswordResetNotice("");
      window.location.href = forgotPasswordUrl;
      return;
    }

    setPasswordResetNotice(
      "Le lien de reinitialisation du mot de passe n'est pas encore branche. Des qu'une page de reset existe, ce bouton pourra y pointer directement.",
    );
  }, []);

  const handleStartHistorical = useCallback(async () => {
    safeSetError("");
    try {
      await startHistoricalSync();
      await safeReload();
    } catch (err) {
      safeSetError(extractErrorMessage(err, "Erreur lors du lancement du rechargement historique."));
    }
  }, [safeReload, safeSetError]);

  const handleStartIncremental = useCallback(async () => {
    safeSetError("");
    try {
      await startIncrementalSync();
      await safeReload();
    } catch (err) {
      safeSetError(extractErrorMessage(err, "Erreur lors du lancement de la synchronisation incrementale."));
    }
  }, [safeReload, safeSetError]);

  return (
    <AppShell
      eyebrow="Administration"
      title="Administration"
      subtitle="L'essentiel pour le compte actif, Strava et les reglages utiles."
      account={account}
    >
      {error ? <div className="alert alert-error section">{error}</div> : null}
      {passwordResetNotice ? <div className="alert alert-info section">{passwordResetNotice}</div> : null}

      <section className="section">
        <AccountOverviewCard account={account} onForgotPassword={handleForgotPassword} />
      </section>

      <section className="section">
        <SyncActions
          onConnectStrava={handleConnectStrava}
          onStartHistorical={handleStartHistorical}
          onStartIncremental={handleStartIncremental}
          isBusy={Boolean(isBusy)}
        />
      </section>

      <div className="grid two-columns section">
        <SyncSummaryCard summary={summary} athlete={athlete} />
        <SyncStatusCard currentJob={currentJob} />
      </div>

      <div className="grid two-columns section">
        <UserPreferencesCard
          options={userPreferenceOptions}
          onOptionChange={(name, value) => safeSetOption(name, value)}
        />
        <HeartRateSettingsCard
          options={heartRateOptions}
          onOptionChange={(name, value) => safeSetOption(name, value)}
        />
      </div>
    </AppShell>
  );
}
