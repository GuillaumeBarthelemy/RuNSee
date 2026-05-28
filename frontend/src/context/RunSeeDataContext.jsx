import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentAthlete } from "../services/athlete.service.js";
import { getActivities } from "../services/activity.service.js";
import { getCurrentSyncJob, getSyncSummary } from "../services/sync.service.js";
import { getTrainingAnalyticsSettings } from "../services/trainingAnalyticsSettings.service.js";
import { readActivitiesCache, writeActivitiesCache, readBaseCache, writeBaseCache } from "../utils/activityCache.js";
import useAuth from "../hooks/useAuth.js";
import { RunSeeDataContext } from "./RunSeeDataContextBase.js";

const BASE_STALE_MS = 60_000;
const ACTIVITIES_STALE_MS = 60_000;
const BACKGROUND_REFRESH_MS = 60_000;

const INITIAL_STATE = {
  athlete: null,
  summary: null,
  currentJob: null,
  trainingAnalyticsSettings: null,
  trainingAnalyticsSettingsHistory: [],
  activities: [],
  isBaseLoading: false,
  isActivitiesLoading: false,
  baseLoaded: false,
  activitiesLoaded: false,
  rawLoaded: false,
  error: "",
};

function extractErrorMessage(error, fallback) {
  return error?.response?.data?.userMessage || error?.response?.data?.message || error?.message || fallback;
}


export function RunSeeDataProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);
  const stateRef = useRef(INITIAL_STATE);
  const baseRequestRef = useRef(null);
  const activitiesRequestRef = useRef(null);
  const lastBaseLoadedAtRef = useRef(0);
  const lastActivitiesLoadedAtRef = useRef(0);
  const rawLoadedRef = useRef(false);
  const { user } = useAuth();
  const userIdRef = useRef(null);
  userIdRef.current = user?.id || null;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const setError = useCallback((value) => {
    setState((current) => ({ ...current, error: String(value || "") }));
  }, []);

  const loadBase = useCallback(async ({ force = false } = {}) => {
    const current = stateRef.current;

    if (baseRequestRef.current) {
      return baseRequestRef.current;
    }

    if (!force && current.baseLoaded && Date.now() - lastBaseLoadedAtRef.current < BASE_STALE_MS) {
      return current;
    }

    setState((previous) => ({ ...previous, isBaseLoading: true }));

    // SWR : hydrate la base depuis le cache pour un rendu instantane (Accueil,
    // entetes) pendant la revalidation reseau.
    if (!current.baseLoaded && userIdRef.current) {
      readBaseCache(userIdRef.current).then((cached) => {
        if (cached && !stateRef.current.baseLoaded) {
          setState((previous) => ({
            ...previous,
            athlete: cached.athlete ?? previous.athlete,
            summary: cached.summary ?? previous.summary,
            trainingAnalyticsSettings: cached.trainingAnalyticsSettings ?? previous.trainingAnalyticsSettings,
            trainingAnalyticsSettingsHistory: cached.trainingAnalyticsSettingsHistory ?? previous.trainingAnalyticsSettingsHistory,
            baseLoaded: true,
            isBaseLoading: true, // revalidation en cours
          }));
        }
      }).catch(() => {});
    }

    const request = (async () => {
      try {
        const [athleteRes, summaryRes, currentJobRes, trainingSettingsRes] = await Promise.allSettled([
          getCurrentAthlete(),
          getSyncSummary(),
          getCurrentSyncJob(),
          getTrainingAnalyticsSettings(),
        ]);

        const errors = [];
        let athlete = null;
        let summary = null;
        let currentJob = null;
        let trainingAnalyticsSettings = null;
        let trainingAnalyticsSettingsHistory = [];

        if (athleteRes.status === "fulfilled") {
          athlete = athleteRes.value ?? null;
        } else if (athleteRes.reason?.response?.status !== 404) {
          errors.push(athleteRes.reason);
        }

        if (summaryRes.status === "fulfilled") {
          summary = summaryRes.value ?? null;
        } else {
          errors.push(summaryRes.reason);
        }

        if (currentJobRes.status === "fulfilled") {
          currentJob = currentJobRes.value ?? null;
        } else {
          errors.push(currentJobRes.reason);
        }

        if (trainingSettingsRes.status === "fulfilled") {
          trainingAnalyticsSettings = trainingSettingsRes.value?.settings ?? null;
          trainingAnalyticsSettingsHistory = Array.isArray(trainingSettingsRes.value?.history)
            ? trainingSettingsRes.value.history
            : [];
        } else {
          errors.push(trainingSettingsRes.reason);
        }

        lastBaseLoadedAtRef.current = Date.now();
        setState((previous) => ({
          ...previous,
          athlete,
          summary,
          currentJob,
          trainingAnalyticsSettings,
          trainingAnalyticsSettingsHistory,
          isBaseLoading: false,
          baseLoaded: true,
          error: errors.length ? extractErrorMessage(errors[0], "Erreur de chargement des donnees RuNSee.") : "",
        }));
        // Persiste la base (hors currentJob, volatil) pour le SWR.
        if (userIdRef.current) {
          writeBaseCache(userIdRef.current, {
            athlete, summary, trainingAnalyticsSettings, trainingAnalyticsSettingsHistory,
          });
        }
      } catch (error) {
        setState((previous) => ({
          ...previous,
          athlete: null,
          summary: null,
          currentJob: null,
          trainingAnalyticsSettings: null,
          trainingAnalyticsSettingsHistory: [],
          isBaseLoading: false,
          baseLoaded: true,
          error: extractErrorMessage(error, "Erreur de chargement des donnees RuNSee."),
        }));
      }
    })();

    baseRequestRef.current = request.finally(() => {
      baseRequestRef.current = null;
    });

    return baseRequestRef.current;
  }, []);

  const loadActivities = useCallback(async ({ force = false, includeRaw = false } = {}) => {
    const current = stateRef.current;

    if (activitiesRequestRef.current) {
      return activitiesRequestRef.current;
    }

    // Si on demande les splits (includeRaw) mais qu'ils ne sont pas encore
    // charges, on force le rechargement meme si la liste legere est fraiche.
    const needsRawUpgrade = includeRaw && !rawLoadedRef.current;

    if (!force && !needsRawUpgrade && current.activitiesLoaded
        && Date.now() - lastActivitiesLoadedAtRef.current < ACTIVITIES_STALE_MS) {
      return current.activities;
    }

    setState((previous) => ({ ...previous, isActivitiesLoading: true }));

    // Conserve le mode raw une fois active (les refresh background gardent
    // les splits si une page Performance les a demandes).
    const wantRaw = includeRaw || rawLoadedRef.current;
    const cacheMode = wantRaw ? "raw" : "light";

    // SWR : si rien en memoire, on hydrate depuis IndexedDB pour un rendu
    // quasi-instantane pendant que la requete reseau revalide en fond.
    // Performance (raw) : si pas de cache raw, on retombe sur le cache light
    // pour afficher tout de suite (les records se peuplent quand le raw
    // arrive). -> 1er affichage instantane meme sur la page Performance.
    if (!current.activitiesLoaded && userIdRef.current) {
      (async () => {
        let cached = await readActivitiesCache(userIdRef.current, cacheMode).catch(() => null);
        let hydratedRaw = wantRaw;
        if (!cached && wantRaw) {
          cached = await readActivitiesCache(userIdRef.current, "light").catch(() => null);
          hydratedRaw = false; // donnees light -> raw pas encore charge
        }
        if (cached && !stateRef.current.activitiesLoaded) {
          setState((previous) => ({
            ...previous,
            activities: cached.activities,
            activitiesLoaded: true,
            rawLoaded: hydratedRaw,
            isActivitiesLoading: true, // revalidation (raw) en cours
          }));
        }
      })();
    }

    const request = (async () => {
      try {
        const activities = await getActivities(wantRaw ? { includeRaw: true } : {});
        lastActivitiesLoadedAtRef.current = Date.now();
        rawLoadedRef.current = wantRaw;
        const arr = Array.isArray(activities) ? activities : [];
        setState((previous) => ({
          ...previous,
          activities: arr,
          isActivitiesLoading: false,
          activitiesLoaded: true,
          rawLoaded: wantRaw,
          error: "",
        }));
        // Met a jour le cache persistant (best-effort, non bloquant).
        if (userIdRef.current) writeActivitiesCache(userIdRef.current, cacheMode, arr);
      } catch (error) {
        setState((previous) => ({
          ...previous,
          activities: [],
          isActivitiesLoading: false,
          activitiesLoaded: true,
          error: extractErrorMessage(error, "Erreur de chargement des donnees RuNSee."),
        }));
      }
    })();

    activitiesRequestRef.current = request.finally(() => {
      activitiesRequestRef.current = null;
    });

    return activitiesRequestRef.current;
  }, []);

  const ensureData = useCallback(async ({ includeActivities = false, includeRaw = false, force = false } = {}) => {
    await loadBase({ force });

    if (includeActivities) {
      await loadActivities({ force, includeRaw });
    }
  }, [loadActivities, loadBase]);

  const reload = useCallback(async ({ includeActivities = false, includeRaw = false } = {}) => {
    await ensureData({ includeActivities, includeRaw, force: true });
  }, [ensureData]);

  useEffect(() => {
    ensureData({ includeActivities: false }).catch(() => {});
  }, [ensureData]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadBase({ force: true }).catch(() => {});

      if (stateRef.current.activitiesLoaded) {
        loadActivities({ force: true }).catch(() => {});
      }
    }, BACKGROUND_REFRESH_MS);

    return () => clearInterval(timer);
  }, [loadActivities, loadBase]);

  const isBusy = ["queued", "running"].includes(state.currentJob?.status);

  useEffect(() => {
    if (!isBusy) {
      return undefined;
    }

    const timer = setInterval(() => {
      loadBase({ force: true }).catch(() => {});

      if (stateRef.current.activitiesLoaded) {
        loadActivities({ force: true }).catch(() => {});
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [isBusy, loadActivities, loadBase]);

  const value = useMemo(
    () => ({
      state,
      setError,
      ensureData,
      reload,
    }),
    [ensureData, reload, setError, state],
  );

  return (
    <RunSeeDataContext.Provider value={value}>
      {children}
    </RunSeeDataContext.Provider>
  );
}
