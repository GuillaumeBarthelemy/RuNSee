import { useCallback, useContext, useEffect, useMemo } from "react";
import { RunSeeDataContext } from "../context/RunSeeDataContextBase.js";

export default function useRunSeeData({ includeActivities = true } = {}) {
  const context = useContext(RunSeeDataContext);

  if (!context) {
    throw new Error("useRunSeeData doit etre utilise dans RunSeeDataProvider.");
  }

  const { state, setError, ensureData, reload } = context;

  useEffect(() => {
    ensureData({ includeActivities }).catch(() => {});
  }, [ensureData, includeActivities]);

  const isBusy = useMemo(
    () => ["queued", "running"].includes(state.currentJob?.status),
    [state.currentJob],
  );

  const isLoading = state.isBaseLoading || (includeActivities && (!state.activitiesLoaded || state.isActivitiesLoading));
  const scopedReload = useCallback(
    () => reload({ includeActivities }),
    [includeActivities, reload],
  );

  return {
    athlete: state.athlete,
    summary: state.summary,
    currentJob: state.currentJob,
    trainingAnalyticsSettings: state.trainingAnalyticsSettings,
    trainingAnalyticsSettingsHistory: state.trainingAnalyticsSettingsHistory,
    activities: includeActivities ? state.activities : [],
    isLoading,
    error: state.error,
    setError,
    reload: scopedReload,
    isBusy,
  };
}
