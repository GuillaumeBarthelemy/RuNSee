import { useEffect, useMemo, useState } from "react";
import DashboardDecisionSummaryCard from "../components/DashboardDecisionSummaryCard.jsx";
import RecentActivitiesCard from "../components/RecentActivitiesCard.jsx";
import TodayRecoveryCard from "../components/TodayRecoveryCard.jsx";
import TodayAlertBanner from "../components/TodayAlertBanner.jsx";
import TodayFormCards from "../components/TodayFormCards.jsx";
import TodayHeader from "../components/TodayHeader.jsx";
import TodaySecondaryRow from "../components/TodaySecondaryRow.jsx";
import TodaySnapshotToday from "../components/TodaySnapshotToday.jsx";
import TodayVolumeStrip from "../components/TodayVolumeStrip.jsx";
import { TRAINING_MVP_SECTION_INFO } from "../content/trainingMvpCopy.js";
import useActivityViewModel from "../hooks/useActivityViewModel.js";
import useRaceObjectives from "../hooks/useRaceObjectives.js";
import AppShell from "../layouts/AppShell.jsx";
import { getGarminRecoverySnapshots } from "../services/externalProvider.service.js";
import { startIncrementalSync } from "../services/sync.service.js";
import { filterActivities, getAvailableSportGroups, RUN_SPORT_GROUP_LABEL } from "../utils/activityAggregations.js";
import { buildActivityItems, buildBestEffortRecords, buildRegularitySummary } from "../utils/activityInsights.js";
import { buildCurrentAccountModel } from "../utils/accountPresentation.js";
import { buildAnalyticsDateRange } from "../utils/analyticsPeriods.js";
import { buildLoadDynamicsProfile } from "../utils/loadDynamics.js";
import { buildVdotProfile } from "../utils/runningPerformance.js";
import { buildTodayAlerts } from "../utils/todayAlerts.js";
import {
  buildConsolidatedIntensityDistributionModel,
  buildEfficiencyHistoryModel,
  buildTrainingLoadStateModel,
} from "../utils/trainingMetrics.js";
import { buildIntensityPolarizationProfile, buildLoadVarianceProfile } from "../utils/trainingIntelligence.js";
import {
  buildDashboardDecisionSummary,
  decorateRecentActivities,
} from "../utils/performanceNarratives.js";

const TODAY_PERIOD_PRESET = "7d";
const TODAY_VOLUME_VIEW_MODE = "rolling";
const RECOVERY_SNAPSHOT_DAYS = 56;

function toDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addDays(value, amount) {
  const date = toDate(value) || new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function getActivityDate(activity = {}) {
  return toDate(activity.startDateLocal || activity.startDate || activity.date);
}

export default function DashboardPage() {
  const {
    athlete,
    error,
    isLoading,
    safeActivities,
    options,
    trainingAnalyticsSettings,
    setOption,
    reload,
  } = useActivityViewModel({
    includeActivities: true,
  });
  const { activeRace } = useRaceObjectives();
  const [recoverySnapshotData, setRecoverySnapshotData] = useState(null);

  useEffect(() => {
    let ignore = false;

    getGarminRecoverySnapshots({ days: RECOVERY_SNAPSHOT_DAYS })
      .then((data) => {
        if (!ignore) {
          setRecoverySnapshotData(data || null);
        }
      })
      .catch(() => {
        if (!ignore) {
          setRecoverySnapshotData(null);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const account = useMemo(
    () => buildCurrentAccountModel({ athlete, options }),
    [athlete, options],
  );

  const todayRange = buildAnalyticsDateRange({ preset: TODAY_PERIOD_PRESET });
  const todayAvailableSports = useMemo(
    () => getAvailableSportGroups(safeActivities, { groupSports: true }),
    [safeActivities],
  );
  const requestedTodaySportGroup = options.todaySportGroup || RUN_SPORT_GROUP_LABEL;
  const todaySportGroup = requestedTodaySportGroup === "all" || todayAvailableSports.includes(requestedTodaySportGroup)
    ? requestedTodaySportGroup
    : "all";

  const dashboardFilters = useMemo(
    () => ({
      search: "",
      sportGroup: todaySportGroup,
      dateFrom: todayRange.dateFrom,
      dateTo: todayRange.dateTo,
    }),
    [todayRange.dateFrom, todayRange.dateTo, todaySportGroup],
  );

  const dashboardActivities = useMemo(
    () => filterActivities(safeActivities, dashboardFilters, { groupSports: true }),
    [dashboardFilters, safeActivities],
  );

  const todayPeriodActivities = useMemo(
    () => filterActivities(
      safeActivities,
      { search: "", sportGroup: "all", dateFrom: todayRange.dateFrom, dateTo: todayRange.dateTo },
      { groupSports: true },
    ),
    [safeActivities, todayRange.dateFrom, todayRange.dateTo],
  );

  const dashboardScopeActivities = useMemo(
    () =>
      filterActivities(
        safeActivities,
        { search: "", sportGroup: todaySportGroup, dateFrom: "", dateTo: "" },
        { groupSports: true },
      ),
    [safeActivities, todaySportGroup],
  );

  const trendStartDate = useMemo(() => addDays(todayRange.end, -55), [todayRange.end]);
  const recentIntensityStartDate = useMemo(() => addDays(todayRange.end, -6), [todayRange.end]);

  const trainingLoadModel = useMemo(
    () => buildTrainingLoadStateModel(dashboardScopeActivities, {
      startDate: todayRange.start,
      endDate: todayRange.end,
      granularity: "daily",
      weekStartsOn: options.userWeekStartsOn,
      settings: trainingAnalyticsSettings,
    }),
    [dashboardScopeActivities, options.userWeekStartsOn, todayRange.end, todayRange.start, trainingAnalyticsSettings],
  );

  const trendLoadModel = useMemo(
    () => buildTrainingLoadStateModel(dashboardScopeActivities, {
      startDate: trendStartDate,
      endDate: todayRange.end,
      granularity: "daily",
      weekStartsOn: options.userWeekStartsOn,
      settings: trainingAnalyticsSettings,
    }),
    [dashboardScopeActivities, options.userWeekStartsOn, todayRange.end, trainingAnalyticsSettings, trendStartDate],
  );
  const recoverySnapshots = useMemo(
    () => (Array.isArray(recoverySnapshotData?.snapshots) ? recoverySnapshotData.snapshots : []),
    [recoverySnapshotData],
  );

  const dashboardDecisionModel = useMemo(
    () => buildDashboardDecisionSummary(trainingLoadModel, trendLoadModel, { recoverySnapshots }),
    [recoverySnapshots, trainingLoadModel, trendLoadModel],
  );

  const loadVarianceModel = useMemo(
    () => buildLoadVarianceProfile(dashboardScopeActivities, {
      endDate: todayRange.end,
      settings: trainingAnalyticsSettings,
    }),
    [dashboardScopeActivities, todayRange.end, trainingAnalyticsSettings],
  );

  const weeklySummary = useMemo(
    () => buildRegularitySummary(dashboardScopeActivities, {
      weeks: 4,
      endDate: todayRange.end,
      weekStartsOn: options.userWeekStartsOn,
      viewMode: TODAY_VOLUME_VIEW_MODE,
      settings: trainingAnalyticsSettings,
    }),
    [
      dashboardScopeActivities,
      options.userWeekStartsOn,
      todayRange.end,
      trainingAnalyticsSettings,
    ],
  );

  const efficiencyModel = useMemo(
    () => buildEfficiencyHistoryModel(dashboardScopeActivities, {
      startDate: trendStartDate,
      endDate: todayRange.end,
      granularity: "weekly",
      weekStartsOn: options.userWeekStartsOn,
      settings: trainingAnalyticsSettings,
    }),
    [dashboardScopeActivities, options.userWeekStartsOn, todayRange.end, trainingAnalyticsSettings, trendStartDate],
  );

  const loadDynamicsProfile = useMemo(
    () => buildLoadDynamicsProfile({
      loadModel: trendLoadModel,
      efficiencyModel,
      recoverySnapshots,
    }),
    [efficiencyModel, trendLoadModel, recoverySnapshots],
  );

  const intensityDistributionModel = useMemo(
    () => buildConsolidatedIntensityDistributionModel(dashboardScopeActivities, {
      startDate: recentIntensityStartDate,
      endDate: todayRange.end,
      settings: trainingAnalyticsSettings,
    }),
    [dashboardScopeActivities, recentIntensityStartDate, todayRange.end, trainingAnalyticsSettings],
  );

  const polarizationModel = useMemo(
    () => buildIntensityPolarizationProfile(intensityDistributionModel, "duration"),
    [intensityDistributionModel],
  );

  const bestEffortRecords = useMemo(
    () => buildBestEffortRecords(buildActivityItems(dashboardScopeActivities, { settings: trainingAnalyticsSettings })),
    [dashboardScopeActivities, trainingAnalyticsSettings],
  );

  const vdotProfile = useMemo(
    () => buildVdotProfile({ records: bestEffortRecords, referenceDate: todayRange.end }),
    [bestEffortRecords, todayRange.end],
  );

  const vdotProfilePrevious = useMemo(() => {
    const previousReferenceDate = addDays(todayRange.end, -28);
    const previousRecords = bestEffortRecords.map((record) => {
      const activityDate = getActivityDate(record?.activity);
      return activityDate && activityDate <= previousReferenceDate ? record : { ...record, isAvailable: false };
    });

    return buildVdotProfile({ records: previousRecords, referenceDate: previousReferenceDate });
  }, [bestEffortRecords, todayRange.end]);

  const recentActivities = useMemo(
    () => decorateRecentActivities(
      [...dashboardActivities]
        .sort((left, right) => {
          const leftDate = toDate(left?.startDateLocal || left?.startDate)?.getTime() || 0;
          const rightDate = toDate(right?.startDateLocal || right?.startDate)?.getTime() || 0;
          return rightDate - leftDate;
        })
        .slice(0, 6),
      {
        scopeActivities: dashboardScopeActivities,
        settings: trainingAnalyticsSettings,
        endDate: todayRange.end,
      },
    ),
    [dashboardActivities, dashboardScopeActivities, todayRange.end, trainingAnalyticsSettings],
  );

  const broaderRecentActivities = useMemo(
    () => decorateRecentActivities(
      [...dashboardScopeActivities]
        .sort((left, right) => {
          const leftDate = toDate(left?.startDateLocal || left?.startDate)?.getTime() || 0;
          const rightDate = toDate(right?.startDateLocal || right?.startDate)?.getTime() || 0;
          return rightDate - leftDate;
        })
        .slice(0, 80),
      {
        scopeActivities: dashboardScopeActivities,
        settings: trainingAnalyticsSettings,
        endDate: todayRange.end,
      },
    ),
    [dashboardScopeActivities, todayRange.end, trainingAnalyticsSettings],
  );

  const todayAlerts = useMemo(
    () => buildTodayAlerts({
      loadModel: trendLoadModel,
      loadDynamicsProfile,
      loadVarianceModel,
      polarizationModel,
      vdotProfile,
      vdotProfilePrevious,
      recentActivities: broaderRecentActivities,
      allActivities: dashboardScopeActivities,
      bestEffortRecords,
      weeklySummary,
      trainingAnalyticsSettings,
      activeRace,
      referenceDate: todayRange.end,
    }),
    [
      activeRace,
      bestEffortRecords,
      broaderRecentActivities,
      dashboardScopeActivities,
      loadDynamicsProfile,
      loadVarianceModel,
      polarizationModel,
      todayRange.end,
      trainingAnalyticsSettings,
      trendLoadModel,
      vdotProfile,
      vdotProfilePrevious,
      weeklySummary,
    ],
  );

  const handleTodaySportChange = (value) => {
    setOption("todaySportGroup", value || RUN_SPORT_GROUP_LABEL);
  };

  const handleSyncStrava = async () => {
    await startIncrementalSync();
    await reload?.();
  };

  return (
    <AppShell
      eyebrow="Aujourd'hui"
      title="Pilotage du jour"
      subtitle={`Lecture fixe sur 7 jours glissants, avec perimetre sport ajustable.`}
      account={account}
    >
      {error ? <div className="alert alert-error section">{error}</div> : null}
      {isLoading && !dashboardActivities.length ? <div className="card section">Chargement des activites...</div> : null}

      <div className="dashboard-page-stack">
        <div className="section">
          <TodayHeader
            athlete={athlete}
            activeRace={activeRace}
            date={todayRange.end}
            rangeLabel={todayRange.label}
            sportGroup={todaySportGroup}
            availableSports={todayAvailableSports}
            activityCount={dashboardActivities.length}
            totalCount={todayPeriodActivities.length}
            onSportChange={handleTodaySportChange}
          />
        </div>

        <TodayAlertBanner
          alerts={todayAlerts}
          onSyncStrava={handleSyncStrava}
        />

        <div className="section">
          <DashboardDecisionSummaryCard
            model={dashboardDecisionModel}
            info={TRAINING_MVP_SECTION_INFO.decisionSummary}
          />
        </div>

        {recoverySnapshots.length > 0 ? (
          <div className="section">
            <TodayRecoveryCard snapshots={recoverySnapshots} />
          </div>
        ) : null}

        <div className="section">
          <TodayFormCards
            loadModel={trainingLoadModel}
            trendLoadModel={trendLoadModel}
          />
        </div>

        {false ? (
          <div className="section">
            {/* RecoverySnapshotCard replaced by TodayRecoveryCard above */}
        ) : null}

        <div className="section">
          <TodayVolumeStrip weeklySummary={weeklySummary} />
        </div>

        <div className="section">
          <TodaySecondaryRow
            weeklySummary={weeklySummary}
            loadVarianceModel={loadVarianceModel}
          />
        </div>

        <div className="section">
          <TodaySnapshotToday
            activities={broaderRecentActivities}
            referenceDate={todayRange.end}
            trainingAnalyticsSettings={trainingAnalyticsSettings}
          />
        </div>

        <div className="section">
          <RecentActivitiesCard
            activities={recentActivities}
            limit={3}
            returnPath="/"
            title="Activites recentes"
            subtitle="Les dernieres seances utiles a relire avant de decider la suite du bloc : type estime, charge, dominante d'intensite et contexte rapide."
            info={TRAINING_MVP_SECTION_INFO.recentActivities}
          />
        </div>
      </div>
    </AppShell>
  );
}
