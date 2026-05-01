import { memo } from "react";
import InfoTooltip from "./InfoTooltip.jsx";
import {
  GARMIN_EXPERIMENTAL_COPY,
  getGarminExperimentalStatus,
} from "../content/garminExperimentalCopy.js";

function GarminExperimentalCard({
  status = "unavailable",
  canConnect = false,
  onConnect = null,
}) {
  const resolvedStatus = getGarminExperimentalStatus(status);
  const connectButtonLabel = canConnect ? "Connecter Garmin" : GARMIN_EXPERIMENTAL_COPY.connectionUnavailableAction;

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

      <div className="actions-row top-gap-sm">
        <button
          type="button"
          className="button button-outline"
          onClick={canConnect && typeof onConnect === "function" ? onConnect : undefined}
          disabled={!canConnect}
        >
          {connectButtonLabel}
        </button>
      </div>
    </section>
  );
}

export default memo(GarminExperimentalCard);
