import { memo, useMemo, useState, useCallback } from "react";
import InfoTooltip from "./InfoTooltip.jsx";
import {
  GARMIN_EXPERIMENTAL_COPY,
  getGarminExperimentalStatus,
} from "../content/garminExperimentalCopy.js";

const noop = () => {};

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function GarminExperimentalCard({
  status = "unavailable",
  canConnect = false,
  connection = null,
  recoveryBackfill = null,
  metrics = null,
  isPending = false,
  isBackfillPending = false,
  isSyncPending = false,
  isPurgePending = false,
  isRenormalizePending = false,
  onConnect = noop,
  onDisconnect = noop,
  onStartRecoveryBackfill = noop,
  onSyncRecentRecovery = noop,
  onRenormalizeRecovery = noop,
  onPurgeGarminData = noop,
}) {
  const resolvedStatusCode = connection?.status || status;
  const resolvedStatus = getGarminExperimentalStatus(resolvedStatusCode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const isConnected = Boolean(connection?.connected);
  const isMfaRequired = resolvedStatusCode === "mfa_required";
  const isRateLimited = connection?.lastErrorCode === "GARMINCONNECT_RATE_LIMITED";
  const recoveryProgress = Math.max(
    0,
    Math.min(100, Number(recoveryBackfill?.progressPercent || 0)),
  );
  const isRecoveryRunning = Boolean(recoveryBackfill?.isRunning || resolvedStatusCode === "syncing");
  const isRecoveryComplete = Boolean(recoveryBackfill?.isComplete);
  const formattedLastSync = formatDateTime(connection?.lastSyncAt || recoveryBackfill?.lastSyncedAt);
  const hasBaseCredentials = Boolean(email.trim() && password && consentAccepted);
  const canSubmit = Boolean(
    canConnect
      && !isPending
      && hasBaseCredentials
      && (!isMfaRequired || mfaCode.trim()),
  );
  const formCaption = isConnected
    ? GARMIN_EXPERIMENTAL_COPY.connectedCaption
    : isMfaRequired
      ? GARMIN_EXPERIMENTAL_COPY.mfaCaption
      : GARMIN_EXPERIMENTAL_COPY.credentialsCaption;
  const connectButtonLabel = useMemo(() => {
    if (!canConnect) {
      return GARMIN_EXPERIMENTAL_COPY.connectionUnavailableAction;
    }

    if (isConnected) {
      return GARMIN_EXPERIMENTAL_COPY.reconnectAction;
    }

    return isMfaRequired
      ? GARMIN_EXPERIMENTAL_COPY.mfaSubmitAction
      : GARMIN_EXPERIMENTAL_COPY.connectAction;
  }, [canConnect, isConnected, isMfaRequired]);
  const recoveryButtonLabel = useMemo(() => {
    if (isRecoveryRunning || isBackfillPending) {
      return GARMIN_EXPERIMENTAL_COPY.recoveryRunningAction;
    }

    if (isRecoveryComplete) {
      return GARMIN_EXPERIMENTAL_COPY.recoveryCompleteAction;
    }

    return Number(recoveryBackfill?.syncedDays || 0) > 0
      ? GARMIN_EXPERIMENTAL_COPY.recoveryContinueAction
      : GARMIN_EXPERIMENTAL_COPY.recoveryStartAction;
  }, [
    isBackfillPending,
    isRecoveryComplete,
    isRecoveryRunning,
    recoveryBackfill?.syncedDays,
  ]);
  const recentSyncButtonLabel = isSyncPending || isRecoveryRunning
    ? GARMIN_EXPERIMENTAL_COPY.recoverySyncRunningAction
    : GARMIN_EXPERIMENTAL_COPY.recoverySyncRecentAction;

  // B1 — purge confirmation state
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purgeText, setPurgeText] = useState("");
  const canConfirmPurge = purgeText.trim().toUpperCase() === "PURGE";

  const handlePurgeClick = useCallback(() => {
    setShowPurgeConfirm(true);
    setPurgeText("");
  }, []);

  const handlePurgeCancel = useCallback(() => {
    setShowPurgeConfirm(false);
    setPurgeText("");
  }, []);

  const handlePurgeConfirm = useCallback(async () => {
    if (!canConfirmPurge || typeof onPurgeGarminData !== "function") return;
    setShowPurgeConfirm(false);
    setPurgeText("");
    await onPurgeGarminData();
  }, [canConfirmPurge, onPurgeGarminData]);

  // B2 — diagnostic panel toggle
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canSubmit || typeof onConnect !== "function") {
      return;
    }

    const submittedMfaCode = isMfaRequired ? mfaCode : "";

    if (!isMfaRequired && mfaCode) {
      setMfaCode("");
    }

    const result = await onConnect({
      email,
      password,
      mfaCode: submittedMfaCode,
      consentAccepted,
    });

    if (result?.connection?.connected) {
      setPassword("");
      setMfaCode("");
    }
  }

  return (
    <section className="card garmin-experimental-card">
      <div className="card-header-row wrap-on-mobile">
        <div>
          <span className="eyebrow">{GARMIN_EXPERIMENTAL_COPY.eyebrow}</span>
          <h2 className="card-title title-with-info">
            {GARMIN_EXPERIMENTAL_COPY.title}
            <InfoTooltip
              title={GARMIN_EXPERIMENTAL_COPY.title}
              content={GARMIN_EXPERIMENTAL_COPY.tooltip}
            />
          </h2>
          <p className="card-subtitle">{GARMIN_EXPERIMENTAL_COPY.subtitle}</p>
        </div>
        <span className={`status-pill ${resolvedStatus.className}`}>{resolvedStatus.label}</span>
      </div>

      <p className="garmin-experimental-notice">{GARMIN_EXPERIMENTAL_COPY.notice}</p>
      <p className="small-text">{resolvedStatus.helper}</p>
      {connection?.accountIdentifier ? (
        <p className="small-text">
          Compte Garmin associe : <strong>{connection.accountIdentifier}</strong>
        </p>
      ) : null}
      {connection?.lastErrorMessage ? (
        <p className="alert alert-warning top-gap-sm">{connection.lastErrorMessage}</p>
      ) : null}

      <div className="garmin-experimental-grid top-gap-sm">
        <div className="garmin-experimental-panel">
          <h3 className="subcard-title">{GARMIN_EXPERIMENTAL_COPY.consentTitle}</h3>
          <ul className="garmin-experimental-list">
            {GARMIN_EXPERIMENTAL_COPY.consentItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="garmin-experimental-panel">
          <h3 className="subcard-title">{GARMIN_EXPERIMENTAL_COPY.priorityTitle}</h3>
          <div className="garmin-signal-tags">
            {GARMIN_EXPERIMENTAL_COPY.prioritySignals.map((signal) => (
              <span className="status-pill status-idle" key={signal}>{signal}</span>
            ))}
          </div>
        </div>

        <div className="garmin-experimental-panel">
          <h3 className="subcard-title">{GARMIN_EXPERIMENTAL_COPY.usageTitle}</h3>
          <ul className="garmin-experimental-list">
            {GARMIN_EXPERIMENTAL_COPY.usageItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <form className="garmin-connect-form top-gap-md" onSubmit={handleSubmit}>
        <div className="card-header-row wrap-on-mobile compact-header">
          <div>
            <h3 className="subcard-title">{GARMIN_EXPERIMENTAL_COPY.formTitle}</h3>
            <p className="small-text">{formCaption}</p>
          </div>
        </div>

        <label className="garmin-consent-row">
          <input
            type="checkbox"
            checked={consentAccepted}
            onChange={(event) => setConsentAccepted(event.target.checked)}
            disabled={isPending}
          />
          <span>{GARMIN_EXPERIMENTAL_COPY.consentCheckbox}</span>
        </label>

        {isPending ? (
          <p className="alert alert-info top-gap-sm">
            {GARMIN_EXPERIMENTAL_COPY.pendingCaption}
          </p>
        ) : null}

        {isMfaRequired ? (
          <p className="alert alert-info top-gap-sm">
            {GARMIN_EXPERIMENTAL_COPY.mfaPromptCaption}
          </p>
        ) : null}

        {isRateLimited ? (
          <p className="alert alert-info top-gap-sm">
            {GARMIN_EXPERIMENTAL_COPY.rateLimitCaption}
          </p>
        ) : null}

        <div className={`grid ${isMfaRequired ? "three-columns" : "two-columns"} top-gap-sm`}>
          <label className="field">
            <span className="field-label">{GARMIN_EXPERIMENTAL_COPY.emailLabel}</span>
            <input
              type="email"
              className="field-input"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isPending || !canConnect}
              placeholder="nom@exemple.fr"
            />
          </label>

          <label className="field">
            <span className="field-label">{GARMIN_EXPERIMENTAL_COPY.passwordLabel}</span>
            <input
              type="password"
              className="field-input"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isPending || !canConnect}
              placeholder="Non stocke"
            />
          </label>

          {isMfaRequired ? (
            <label className="field">
              <span className="field-label">{GARMIN_EXPERIMENTAL_COPY.mfaLabel}</span>
              <input
                type="text"
                className="field-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                disabled={isPending || !canConnect}
                placeholder="Code recu"
              />
            </label>
          ) : null}
        </div>

        <div className="actions-row top-gap-sm">
          <button
            type="submit"
            className="button button-primary"
            disabled={!canSubmit}
          >
            {isPending ? "Connexion..." : connectButtonLabel}
          </button>
          {isConnected ? (
            <button
              type="button"
              className="button button-outline"
              onClick={() => onDisconnect()}
              disabled={isPending}
            >
              {GARMIN_EXPERIMENTAL_COPY.disconnectAction}
            </button>
          ) : null}
        </div>
      </form>

      {/* B2 — Diagnostic section */}
      {isConnected && metrics ? (
        <div className="garmin-diagnostic-panel top-gap-md">
          <button
            type="button"
            className="button button-ghost garmin-diagnostic-toggle"
            onClick={() => setShowDiagnostic((v) => !v)}
          >
            {showDiagnostic ? "▲ Masquer le diagnostic" : "▼ Diagnostic sync"}
          </button>
          {showDiagnostic ? (
            <div className="garmin-diagnostic-grid top-gap-sm">
              <div className="garmin-diagnostic-item">
                <span className="diagnostic-label">Snapshots totaux</span>
                <strong>{metrics.totalSnapshots ?? "—"}</strong>
              </div>
              <div className="garmin-diagnostic-item">
                <span className="diagnostic-label">Snapshots 30 j</span>
                <strong>{metrics.snapshotsLast30Days ?? "—"}</strong>
              </div>
              <div className="garmin-diagnostic-item">
                <span className="diagnostic-label">Erreurs 30 j</span>
                <strong className={metrics.errorsLast30Days > 0 ? "diagnostic-warn" : ""}>
                  {metrics.errorsLast30Days ?? "—"}
                </strong>
              </div>
              <div className="garmin-diagnostic-item">
                <span className="diagnostic-label">Derniere sync</span>
                <strong>{metrics.lastSyncAt ? formatDateTime(metrics.lastSyncAt) : "Jamais"}</strong>
              </div>
              <div className="garmin-diagnostic-item">
                <span className="diagnostic-label">Etat connexion</span>
                <strong>{metrics.connectionStatus ?? "—"}</strong>
              </div>
              {metrics.lastErrorCode ? (
                <div className="garmin-diagnostic-item">
                  <span className="diagnostic-label">Derniere erreur</span>
                  <strong className="diagnostic-warn">{metrics.lastErrorCode}</strong>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {isConnected ? (
        <div className="garmin-recovery-panel top-gap-md">
          <div className="card-header-row wrap-on-mobile compact-header">
            <div>
              <h3 className="subcard-title">{GARMIN_EXPERIMENTAL_COPY.recoveryTitle}</h3>
              <p className="small-text">{GARMIN_EXPERIMENTAL_COPY.recoveryCaption}</p>
            </div>
            <div className="actions-row compact-actions">
              <button
                type="button"
                className="button button-outline"
                onClick={() => onSyncRecentRecovery()}
                disabled={isSyncPending || isBackfillPending || isRecoveryRunning || isRenormalizePending}
              >
                {recentSyncButtonLabel}
              </button>
              <button
                type="button"
                className="button button-outline"
                onClick={() => onStartRecoveryBackfill()}
                disabled={isBackfillPending || isSyncPending || isRecoveryRunning || isRecoveryComplete || isRenormalizePending}
              >
                {recoveryButtonLabel}
              </button>
              <button
                type="button"
                className="button button-outline"
                onClick={() => onRenormalizeRecovery()}
                disabled={isRenormalizePending || isBackfillPending || isSyncPending || isRecoveryRunning}
                title="Recalcule les snapshots depuis les raw data déjà stockées (sans rappel Garmin)"
              >
                {isRenormalizePending ? "Re-normalisation..." : "Re-normaliser"}
              </button>
            </div>
          </div>

          <div className="progress-shell garmin-recovery-progress" aria-hidden="true">
            <span
              className="progress-bar-fill"
              style={{ width: `${recoveryProgress}%` }}
            />
          </div>

          <div className="garmin-recovery-stats">
            <span>
              <strong>{Number(recoveryBackfill?.syncedDays || 0)}</strong>
              {" / "}
              {Number(recoveryBackfill?.windowDays || 180)}
              {" "}
              {GARMIN_EXPERIMENTAL_COPY.recoveryProgressLabel}
            </span>
            <span>
              <strong>{Number(recoveryBackfill?.remainingDays || 0)}</strong>
              {" "}
              {GARMIN_EXPERIMENTAL_COPY.recoveryRemainingLabel}
            </span>
            {recoveryBackfill?.nextPendingDate ? (
              <span>
                {GARMIN_EXPERIMENTAL_COPY.recoveryNextDateLabel}
                {" : "}
                <strong>{recoveryBackfill.nextPendingDate}</strong>
              </span>
            ) : null}
            {formattedLastSync ? (
              <span>
                {GARMIN_EXPERIMENTAL_COPY.recoveryLastSyncLabel}
                {" : "}
                <strong>{formattedLastSync}</strong>
              </span>
            ) : null}
          </div>
          <p className="small-text top-gap-sm">
            {GARMIN_EXPERIMENTAL_COPY.recoveryDailySyncCaption}
          </p>
        </div>
      ) : null}

      {/* B1 — Purge section */}
      {isConnected ? (
        <div className="garmin-purge-panel top-gap-md">
          {!showPurgeConfirm ? (
            <button
              type="button"
              className="button button-outline-danger garmin-purge-trigger"
              onClick={handlePurgeClick}
              disabled={isPurgePending}
            >
              {isPurgePending ? "Suppression..." : "Supprimer mes donnees Garmin"}
            </button>
          ) : (
            <div className="garmin-purge-confirm-block">
              <p className="alert alert-warning">
                <strong>Action irréversible.</strong> Toutes tes données Garmin (connexion, sommeil, HRV,
                FC repos, stress, Body Battery) seront supprimées définitivement.
              </p>
              <label className="field top-gap-sm">
                <span className="field-label">Tape <strong>PURGE</strong> pour confirmer</span>
                <input
                  type="text"
                  className="field-input"
                  value={purgeText}
                  onChange={(e) => setPurgeText(e.target.value)}
                  placeholder="PURGE"
                  autoComplete="off"
                />
              </label>
              <div className="actions-row top-gap-sm">
                <button
                  type="button"
                  className="button button-danger"
                  onClick={handlePurgeConfirm}
                  disabled={!canConfirmPurge}
                >
                  Confirmer la suppression
                </button>
                <button
                  type="button"
                  className="button button-outline"
                  onClick={handlePurgeCancel}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

export default memo(GarminExperimentalCard);
