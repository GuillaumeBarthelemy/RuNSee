# Codebase Map

## Vue generale

Monorepo `C:\Services\RuNSee` :

- `backend/` : Node.js + Express + Prisma, ESM, JS pur.
- `frontend/` : React + Vite + React Router, JS/JSX pur.
- DB dev : SQLite `backend/dev.db` local, ignore Git.
- DB prod cible : PostgreSQL via `backend/prisma-postgresql/schema.prisma`.

## Documentation projet

- `docs/README.md` : point d'entree documentaire et conventions de classement.
- `docs/architecture/` : documents d'architecture vivants, dont `MULTI_SOURCE_AUDIT.md` et `MULTI_SOURCE_ARCHITECTURE.md`.
- `docs/quality/` : quality gate, test log, matrice de validation et checklist release.
- `docs/decisions/` : ADR RunNSee.
- `docs/plans/active/` : plans en cours.
- `docs/plans/old/` : plans termines et archives.
- `docs/releases/` : baselines, tags et notes de release.
- `docs/operations/` : runbooks et procedures operationnelles.
- `.ai/README.md` : cadrage du contexte agent court terme.

## Backend critique

- `src/app.js` : montage routes Express.
- `src/routes/provider.routes.js` : routes Garmin non officiel.
- `src/controllers/provider.controller.js` : controllers providers.
- `GET /providers/status` : statut public filtre Strava/Garmin pour layout global.
- `POST /sync/all` : sync globale sequentielle via job `global_incremental`, Strava incremental + Garmin recovery recent + Garmin activites recentes bornees.
- `src/services/providers/garminProvider.service.js` : connexion Garmin, MFA, purge, metriques sync.
- `src/services/providers/garminRecoveryBackfill.service.js` : recuperation recovery quotidienne.
- `src/services/providers/garminActivityEnrichment.service.js` : enrichissement activites Garmin -> Strava, incluant le mode global borne `recent_missing`.
- `src/services/providers/garminHistoricalBackfill.service.js` : orchestration du backfill historique Garmin activites par fenetres 180 j, pause/reprise et scheduler ; expose aussi des helpers purs pour tester l'eligibilite des fenetres dues.
- `ProviderBackfillWindowLog` : journal persistant par fenetre Garmin, utilise pour les compteurs Admin et les diagnostics d'erreur/doublon.
- `src/services/providers/providerActivityDuplicateDetection.service.js` : detection reutilisable des doublons actifs Strava/Garmin basee sur le matching provider.
- `src/services/providers/garminconnectBridge.service.js` : subprocess Python.
- `scripts/providers/garminconnect_bridge.py` : operations `login`, `fetch_recovery_days`, `fetch_activities`.
- `src/services/providers/garminActivityEnrichment.service.test.js` : tests purs matching Garmin/Strava et normalisation Garmin.
- `repositories/activity.repository.js` : acces Activity, inclut maintenant `providerEnrichments` sur detail user.

## Frontend critique

- `pages/ActivityDetailPage.jsx` : charge detail activite, snapshots Garmin, action enrichment Garmin ciblee.
- `components/ActivityDetailCard.jsx` : compose la fiche activite.
- `components/ActivityDetailTabs.jsx` : onglets Carte/Splits/Intra/RPE/Garmin.
- `components/ActivityTrailCard.jsx` : lecture trail conditionnelle sur le detail activite.
- `components/TrailSpecificityCard.jsx` : synthese trail dans Analytics.
- `components/GarminEnrichmentPanel.jsx` : recovery snapshot + metriques Garmin de seance.
- `components/GarminActivityBackfillCard.jsx` : carte Admin pour lancer, suivre, mettre en pause et reprendre le backfill historique Garmin activites.
- `components/CurrentAccountPanel.jsx` : zone compte sidebar, statuts Strava/Garmin sans doublon et bouton de sync globale.
- `components/DashboardDecisionSummaryCard.jsx` : Lecture du jour, verdict/action/vigilance/signaux cles avec contexte trail integre.
- `components/TodayHeader.jsx` : header compact Aujourd'hui, filtre sport local avec chip actif et reset.
- `components/TodaySevenDaySummary.jsx` : synthese compacte 7 jours (recuperation, charge, volume, trail) sans graphe lourd.
- `components/TodayUsefulActivities.jsx` : selection de 3 activites utiles a relire, compatible identite multi-source.
- `hooks/useProviderStatuses.js` : appel consolide des statuts Strava/Garmin.
- `utils/trailProfile.js` : calculs trail purs (terrain, D+/D-, temps pente, charge descente).
- `utils/activityEnrichment.js` : mapping stable des metriques Garmin par activite.
- `services/externalProvider.service.js` : appels API providers.

## Objectifs course

- `UserRaceObjective` porte maintenant des champs trail optionnels : D+, D-, terrain, duree cible, montee/descente longue, priorite.
- Migration a appliquer : `20260507123000_add_trail_race_objective_fields` (SQLite et PostgreSQL).

## Scripts DB

- `scripts/db/tableDefinitions.js` : liste ordonnee des 15 modeles.
- `scripts/db/export-sqlite-dump.js` : dump JSON SQLite.
- `scripts/db/import-postgresql-dump.js` : import PostgreSQL avec dry-run et garde-fous.
- `scripts/db/compare-prisma-schemas.js` : detection de drift entre modeles Prisma SQLite et PostgreSQL.
- `scripts/db/report-database-snapshot.js` : snapshot counts + integrite Garmin.
- `scripts/db/detect-provider-activity-duplicates.js` : detection dry-run des doublons Strava/Garmin par utilisateur.
- `scripts/db/repair-provider-activity-duplicates.js` : soft-merge explicite Garmin -> Strava, sans suppression physique.
- `docs/plans/old/runsee_review_finale.md` : plan de controle final post-correctif Garmin/Strava et criteres de baseline stable.
- `deployment/scripts/Export-RunSeeSourceArchive.ps1` : archive source propre via `git archive`.
- `deployment/postgresql/scripts/validate-green-stack.ps1` : validation GREEN publique ou authentifiee selon cookie fourni.

## Modeles provider importants

- `ExternalProviderConnection` : etat de connexion provider + session chiffree.
- `ExternalProviderRawData` : brut provider deduplique.
- `ExternalDailyRecoverySnapshot` : recovery quotidien normalise.
- `ActivityProviderEnrichment` : enrichissement d'une activite Strava par provider externe.
- `ActivityProviderLink` : trace de rapprochement provider vers activite canonique, y compris matchs ambigus sans merge.
- `ProviderBackfillCursor` : curseur de backfill historique provider/resource.
- `ProviderBackfillWindowLog` : historique auditable des fenetres de backfill, avec compteurs, statut, erreurs et resume JSON redige.
- `Activity.sourceProvider/sourceActivityId` : identite canonique multi-source, Strava restant prioritaire quand un match Garmin fiable existe.
- `Activity.isMerged/mergedIntoActivityId/mergedAt` : soft-merge non destructif pour masquer un doublon provider repare.
- `Activity.totalElevationLoss` : D- canonique quand une source le fournit.

## Multi-sources activites

- `src/services/providers/garminActivityNormalizer.service.js` : normalisation Garmin activity vers candidate canonique.
- `src/services/providers/activityProviderMatching.service.js` : scoring exact/probable/ambiguous/not_found/rejected ; compare les dates UTC en priorite et reserve `exact` aux matches avec timestamp, distance et duree strictement coherents.
- `garminActivityEnrichment.service.js` : enrichit Strava quand le match est fiable et peut creer une activite Garmin-only quand aucun match fiable n'existe.
- `/sync/all` : retourne un mode provider-aware (`strava_primary_garmin_enrichment_with_fallback`, `strava_only`, `garmin_primary`, `no_provider`).
- `frontend/src/utils/activityLinks.js` : construction d'identifiants/liens publics multi-source pour les composants UI.

## Contraintes de conception

- Strava reste source principale des activites.
- Garmin non officiel reste un enrichissement temporaire.
- Les dashboards ne doivent pas consommer directement le payload Garmin brut.
- Les imports DB reels doivent etre explicites et precedes d'un backup.
