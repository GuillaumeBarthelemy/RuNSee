import { memo } from "react";
import RaceObjectivesCard from "../RaceObjectivesCard.jsx";
import useRaceObjectives from "../../hooks/useRaceObjectives.js";

/**
 * ReglagesRaceObjectives — Gestion des objectifs de course, migree depuis
 * l'ancienne page /admin (supprimee) vers Reglages > Entrainement.
 * L'objectif actif pilote le countdown / taper du Dashboard.
 */
function ReglagesRaceObjectives() {
  const {
    races,
    activeRace,
    isLoading,
    isMutating,
    createRace,
    archiveRace,
    reactivateRace,
  } = useRaceObjectives();

  return (
    <RaceObjectivesCard
      races={races}
      activeRace={activeRace}
      isLoading={isLoading}
      isMutating={isMutating}
      onCreate={createRace}
      onArchive={archiveRace}
      onReactivate={reactivateRace}
    />
  );
}

export default memo(ReglagesRaceObjectives);
