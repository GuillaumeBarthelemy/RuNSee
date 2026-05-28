import { useContext } from "react";
import { RaceObjectivesContext } from "../context/RaceObjectivesContextBase.js";

/**
 * Accede aux objectifs de course partages (RaceObjectivesProvider).
 * API conservee : races, activeRace, isLoading, isMutating, createRace,
 * archiveRace, reactivateRace, refresh.
 */
export default function useRaceObjectives() {
  const ctx = useContext(RaceObjectivesContext);
  if (!ctx) {
    throw new Error("useRaceObjectives doit etre utilise dans RaceObjectivesProvider.");
  }
  return ctx;
}
