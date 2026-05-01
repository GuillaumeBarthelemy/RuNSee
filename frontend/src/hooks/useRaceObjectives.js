import { useCallback, useEffect, useState } from "react";
import {
  archiveRaceObjective,
  createRaceObjective,
  listRaceObjectives,
  reactivateRaceObjective,
} from "../services/raceObjective.service.js";

const noop = () => {};

export default function useRaceObjectives({ onError = noop } = {}) {
  const [races, setRaces] = useState([]);
  const [activeRace, setActiveRace] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listRaceObjectives();
      setRaces(result.races || []);
      setActiveRace(result.activeRace || null);
    } catch (error) {
      onError(error);
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createRace = useCallback(async (payload) => {
    setIsMutating(true);
    try {
      const result = await createRaceObjective(payload);
      setRaces(result.races || []);
      setActiveRace(result.activeRace || null);
      return result;
    } catch (error) {
      onError(error);
      throw error;
    } finally {
      setIsMutating(false);
    }
  }, [onError]);

  const archiveRace = useCallback(async (raceId) => {
    setIsMutating(true);
    try {
      const result = await archiveRaceObjective(raceId);
      setRaces(result.races || []);
      setActiveRace(result.activeRace || null);
      return result;
    } catch (error) {
      onError(error);
      throw error;
    } finally {
      setIsMutating(false);
    }
  }, [onError]);

  const reactivateRace = useCallback(async (raceId) => {
    setIsMutating(true);
    try {
      const result = await reactivateRaceObjective(raceId);
      setRaces(result.races || []);
      setActiveRace(result.activeRace || null);
      return result;
    } catch (error) {
      onError(error);
      throw error;
    } finally {
      setIsMutating(false);
    }
  }, [onError]);

  return {
    races,
    activeRace,
    isLoading,
    isMutating,
    createRace,
    archiveRace,
    reactivateRace,
    refresh,
  };
}
