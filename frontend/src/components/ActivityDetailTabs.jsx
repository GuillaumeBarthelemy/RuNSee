import { memo, useMemo, useState } from "react";
import ActivityMapCard from "./ActivityMapCard.jsx";
import ActivityRpeCard from "./ActivityRpeCard.jsx";
import ActivitySplitsCard from "./ActivitySplitsCard.jsx";
import GarminEnrichmentPanel from "./GarminEnrichmentPanel.jsx";
import IntraSessionInsightsCard from "./IntraSessionInsightsCard.jsx";

const STORAGE_KEY = "runsee-activity-tab";
const DEFAULT_TAB = "intra";
const noop = () => {};

function getStoredTab() {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return DEFAULT_TAB;
  }

  return sessionStorage.getItem(STORAGE_KEY) || DEFAULT_TAB;
}

function persistTab(tabId) {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return;
  }

  sessionStorage.setItem(STORAGE_KEY, tabId);
}

function ActivityDescription({ description = "" }) {
  return (
    <section className="activity-description-panel">
      <h3 className="subcard-title">Description</h3>
      <p className="muted">{description}</p>
    </section>
  );
}

function ActivityDetailTabs({
  activity = null,
  detailedPayload = null,
  trainingAnalyticsSettings = null,
  onActivityUpdated = noop,
  garminSnapshot = null,
}) {
  const [activeTab, setActiveTab] = useState(getStoredTab);
  const description = String(activity?.description || "").trim();

  const tabs = useMemo(() => {
    const nextTabs = [
      {
        id: "map",
        label: "Carte",
        render: () => <ActivityMapCard activity={activity} detailedPayload={detailedPayload} />,
      },
      {
        id: "splits",
        label: "Splits",
        render: () => <ActivitySplitsCard detailedPayload={detailedPayload} />,
      },
      {
        id: "intra",
        label: "Lecture intra-seance",
        render: () => (
          <IntraSessionInsightsCard
            activity={activity}
            trainingAnalyticsSettings={trainingAnalyticsSettings}
          />
        ),
      },
      {
        id: "rpe",
        label: "Effort percu",
        render: () => <ActivityRpeCard activity={activity} onUpdated={onActivityUpdated} />,
      },
    ];

    if (garminSnapshot !== undefined) {
      nextTabs.push({
        id: "garmin",
        label: "Garmin",
        render: () => <GarminEnrichmentPanel snapshot={garminSnapshot} />,
      });
    }

    if (description) {
      nextTabs.push({
        id: "description",
        label: "Description",
        render: () => <ActivityDescription description={description} />,
      });
    }

    return nextTabs;
  }, [activity, description, detailedPayload, garminSnapshot, onActivityUpdated, trainingAnalyticsSettings]);

  const activeTabId = tabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : (tabs.some((tab) => tab.id === DEFAULT_TAB) ? DEFAULT_TAB : tabs[0]?.id);
  const selectedTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];

  return (
    <section className="activity-detail-tabs">
      <div className="activity-tabs-list" role="tablist" aria-label="Details de l'activite">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selectedTab?.id === tab.id}
            className={`activity-tab-button ${selectedTab?.id === tab.id ? "is-active" : ""}`.trim()}
            onClick={() => {
              setActiveTab(tab.id);
              persistTab(tab.id);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="activity-tab-panel"
        role="tabpanel"
        aria-label={selectedTab?.label || "Details"}
      >
        {selectedTab?.render ? selectedTab.render() : null}
      </div>
    </section>
  );
}

export default memo(ActivityDetailTabs);
