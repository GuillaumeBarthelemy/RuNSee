# Audit multi-sources Strava / Garmin

## Synthese

RunNSee etait encore structure autour d'une hypothese forte : une activite visible dans l'application provenait toujours de Strava. Cette hypothese etait portee par le modele `Activity` (`athleteId` obligatoire, `stravaActivityId` obligatoire et unique), par les routes `/activities/:stravaActivityId` et par plusieurs composants frontend qui rendaient une ligne non cliquable si `stravaActivityId` etait absent.

Le chantier multi-sources impose donc une transition progressive : conserver la compatibilite Strava existante, mais introduire une identite canonique provider (`sourceProvider` + `sourceActivityId`) et un rattachement direct a `AppUser`.

## Points Strava implicites identifies

| Zone | Fichiers | Risque |
|---|---|---|
| Modele DB | `backend/prisma*/schema.prisma` | `Activity` ne pouvait pas representer une activite Garmin-only. |
| Repository activites | `backend/src/repositories/activity.repository.js` | Les filtres utilisateur passaient par `Athlete -> StravaConnection`; les filtres d'integrite excluaient toute activite sans `stravaActivityId`. |
| Routes detail activite | `backend/src/routes/activity.routes.js`, `backend/src/controllers/activity.controller.js` | Le parametre etait nomme `stravaActivityId` et utilise comme identifiant universel. |
| Enrichissement Garmin | `backend/src/services/providers/garminActivityEnrichment.service.js` | Le flux savait matcher et enrichir Strava, mais ignorait les activites Garmin sans match. |
| Sync globale | `backend/src/services/sync/syncJob.service.js` | Garmin recent etait traite comme enrichissement de Strava, pas comme source possible. |
| Liste activites | `frontend/src/components/ActivitiesTable.jsx` | Une ligne sans `stravaActivityId` n'etait pas cliquable. |
| Activites recentes | `frontend/src/components/RecentActivitiesCard.jsx` | Navigation detail bloquee sans `stravaActivityId`. |
| Fiche activite | `frontend/src/components/ActivityDetailCard.jsx`, `frontend/src/components/ActivityRpeCard.jsx` | Bouton Strava et RPE supposaient l'identifiant Strava. |

## Decisions techniques appliquees

- `Activity` devient une activite canonique multi-source via `appUserId`, `sourceProvider`, `sourceActivityId`, `sourcePriority`.
- `stravaActivityId` et `athleteId` deviennent optionnels dans le schema pour autoriser Garmin-only.
- Les activites Strava historiques sont migrees avec `sourceProvider = "strava"` et `sourceActivityId = stravaActivityId`.
- Les activites Garmin-only utilisent `sourceProvider = "garmin"` et `sourceActivityId = activityId Garmin`.
- `ActivityProviderLink` trace le rapprochement provider sans melanger identite et enrichissement.
- `ProviderBackfillCursor` prepare le backfill historique Garmin par fenetres bornees.

## Risques residuels

- Certains composants utilitaires utilisent encore `stravaActivityId` pour des liens vers les records ou enrichissements Strava. Ils restent compatibles avec Strava, mais devront etre audites si Garmin-only devient majoritaire.
- Les activites Garmin-only n'ont pas de lien Strava externe, pas de kudos/commentaires/segments Strava, et certains blocs doivent rester en etat partiel.
- Le backfill historique complet est prepare cote modele, mais son orchestration UI longue duree reste a finaliser avant usage massif.
