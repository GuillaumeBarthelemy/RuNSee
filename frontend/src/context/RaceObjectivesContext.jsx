import { useCallback, useEffect, useMemo, useState } from "react";
import {
  archiveRaceObjective,
  createRaceObjective,
  listRaceObjectives,
  reactivateRaceObjective,
} from "../services/raceObjective.service.js";
import { RaceObjectivesContext } from "./RaceObjectivesContextBase.js";

/**
 * Provider partage des objectifs de course. Une seule source de verite pour
 * la sidebar (objectif principal + secondaires) ET l'onglet Reglages >
 * Objectifs -> toute mutation (ajout / activation / archivage) rafraichit
 * automatiquement les deux.
 */
export function RaceObjectivesProvider({ children }) {
  const [races, setRaces] = useState([]);
  const [activeRace, setActiveRace] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const applyResult = useCallback((result) => {
    setRaces(result?.races || []);
    setActiveRace(result?.activeRace || null);
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      applyResult(await listRaceObjectives());
    } catch {
      // non bloquant
    } finally {
      setIsLoading(false);
    }
  }, [applyResult]);

  useEffect(() => { refresh(); }, [refresh]);

  const mutate = useCallback(async (fn) => {
    setIsMutating(true);
    try {
      const result = await fn();
      applyResult(result);
      return result;
    } finally {
      setIsMutating(false);
    }
  }, [applyResult]);

  const createRace = useCallback((payload) => mutate(() => createRaceObjective(payload)), [mutate]);
  const archiveRace = useCallback((id) => mutate(() => archiveRaceObjective(id)), [mutate]);
  const reactivateRace = useCallback((id) => mutate(() => reactivateRaceObjective(id)), [mutate]);

  const value = useMemo(() => ({
    races, activeRace, isLoading, isMutating,
    createRace, archiveRace, reactivateRace, refresh,
  }), [races, activeRace, isLoading, isMutating, createRace, archiveRace, reactivateRace, refresh]);

  return (
    <RaceObjectivesContext.Provider value={value}>
      {children}
    </RaceObjectivesContext.Provider>
  );
}
