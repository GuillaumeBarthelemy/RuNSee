import { memo, useMemo, useState } from "react";
import InfoTooltip from "./InfoTooltip.jsx";
import {
  GARMIN_EXPERIMENTAL_COPY,
  getGarminExperimentalStatus,
} from "../content/garminExperimentalCopy.js";

const noop = () => {};

function GarminExperimentalCard({
  status = "unavailable",
  canConnect = false,
  connection = null,
  isPending = false,
  onConnect = noop,
  onDisconnect = noop,
}) {
  const resolvedStatusCode = connection?.status || status;
  const resolvedStatus = getGarminExperimentalStatus(resolvedStatusCode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const isConnected = Boolean(connection?.connected);
  const isMfaRequired = resolvedStatusCode === "mfa_required";
  const canSubmit = Boolean(canConnect && !isPending && email.trim() && password && consentAccepted);
  const formCaption = isConnected
    ? GARMIN_EXPERIMENTAL_COPY.connectedCaption
    : isMfaRequired
      ? GARMIN_EXPERIMENTAL_COPY.mfaCaption
      : GARMIN_EXPERIMENTAL_COPY.credentialsCaption;
  const connectButtonLabel = useMemo(() => {
    if (!canConnect) {
      return GARMIN_EXPERIMENTAL_COPY.connectionUnavailableAction;
    }

    return isConnected
      ? GARMIN_EXPERIMENTAL_COPY.reconnectAction
      : GARMIN_EXPERIMENTAL_COPY.connectAction;
  }, [canConnect, isConnected]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canSubmit || typeof onConnect !== "function") {
      return;
    }

    const result = await onConnect({
      email,
      password,
      mfaCode,
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

        <div className="grid three-columns top-gap-sm">
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
              placeholder={isMfaRequired ? "Code requis" : "Si demande"}
            />
          </label>
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
    </section>
  );
}

export default memo(GarminExperimentalCard);
