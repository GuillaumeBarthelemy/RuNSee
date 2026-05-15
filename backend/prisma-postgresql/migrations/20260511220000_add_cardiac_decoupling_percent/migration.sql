-- Ajout de la dérive cardiaque (Pa:Hr decoupling) précalculée par activité.
-- Permet d'afficher l'indicateur sur la Vue d'ensemble Analyse sans
-- recharger les splits côté frontend.
-- Source scientifique : Allen H, Coggan AR (2010), Training and Racing with
-- a Power Meter, 2e éd. — chapitre Aerobic Decoupling.

ALTER TABLE "Activity" ADD COLUMN "cardiacDecouplingPercent" DOUBLE PRECISION;
ALTER TABLE "Activity" ADD COLUMN "cardiacDecouplingComputedAt" TIMESTAMP(3);
