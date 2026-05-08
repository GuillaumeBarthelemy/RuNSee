# Current Context

## Mise a jour de fiabilisation en cours

- Nouveau plan actif lu : `docs/runsee_plan_fiabilisation_frontend_backend_science_ux.md`.
- Objectif de cette passe : finaliser les garde-fous frontend/backend sans modifier les calculs metier centraux.
- Backend : route assistant existante montee sur `/assistant`, `/health` enrichi avec probe DB, reponse d'erreur standardisee en conservant le format legacy `message/details`.
- Frontend : confiance de l'Aptitude RunNSee rendue plus explicite (`coveredWeight`, `sourcesCount`, statut `Insuffisante` quand aucune source exploitable).
- Glossaire : libelle canonique `Aptitude RunNSee`, ancien `Aptitude RunSee` conserve en alias.
- DB : ajout d'un controle `npm run db:compare-schemas` pour detecter une divergence de modeles Prisma SQLite/PostgreSQL.
- Nouveau plan de stabilisation pre-ajouts lu : `docs/runsee_plan_stabilisation_pre_ajouts_codex.md`.
- Stabilisation pre-ajouts en cours : packaging Git, validation GREEN auth-aware, bridge Garmin activite, timestamps Garmin, import PostgreSQL, tests backend purs.
- `lastSyncAt` reste reserve a la synchronisation recovery Garmin ; l'enrichissement activite Garmin ne doit plus le deplacer.
- Les metriques Garmin de seance sont libellees comme estimations/donnees Garmin, pas comme mesures physiologiques directes.

## Objectif actif

Finalisation de la stabilisation RunNSee autour de 4 priorites :

1. securiser les fondations du repo et exclure les artefacts locaux/secrets ;
2. completer la chaine SQLite vers PostgreSQL ;
3. terminer Garmin Phase K : enrichir les activites Strava avec les metriques d'activite Garmin ;
4. renforcer les garde-fous frontend sur les metriques Garmin d'activite.

## Etat realise dans cette passe

- `.gitignore`, `backend/.gitignore`, `frontend/.gitignore`, `.dockerignore` backend/frontend renforces.
- Artefacts locaux suivis par erreur retires de l'index Git : bases SQLite, `.env` frontend, logs runtime.
- Migration SQLite locale appliquee jusqu'a schema a jour.
- `tableDefinitions.js` couvre maintenant les 15 modeles Prisma actuels dans un ordre compatible FK.
- Export SQLite valide avec les tables Garmin et settings recentes.
- Import PostgreSQL durci : refus par defaut sans `--truncate` ou `--allow-append`, dry-run disponible, comparaison de comptage post-import.
- Snapshot DB etendu : comptes des tables providers/settings + integrite Garmin.
- Garmin Phase K cablee cote backend et frontend :
  - bridge Node expose `fetchGarminActivities`.
  - service `garminActivityEnrichment.service.js` recupere une fenetre courte, stocke le brut, matche prudemment Strava/Garmin et cree `ActivityProviderEnrichment`.
  - endpoint `POST /providers/garmin/activities/enrich`.
  - fiche activite : bouton de completion Garmin ciblee, sans backfill massif.
  - reponse detail activite expose `garminActivityEnrichment`.

## Decisions metier conservees

- Strava reste la source principale des activites.
- Garmin non officiel sert uniquement d'enrichissement.
- Pas de backfill massif Garmin activites depuis l'UI detail : ciblage par activite ou fenetre bornee max 180 jours.
- Matching ambigu non applique automatiquement.
- Donnees brutes provider conservees dans `ExternalProviderRawData`; donnees normalisees exposees via `ActivityProviderEnrichment`.

## Validations realisees

- `backend`: `npm run prisma:generate`, `npx prisma validate`, `npm run prisma:pg:validate`, `npm run prisma:pg:generate`.
- `backend`: `node --check` sur services, routes, controllers et scripts DB touches.
- `frontend`: ESLint zero warning sur les fichiers touches.
- `frontend`: `npm test -- --run` -> 139 tests verts.
- `frontend`: `npm run build` OK.
- DB: `npm run db:export:sqlite`, puis `npm run db:import:postgres -- --dry-run` OK.

## Points restant a valider manuellement

- Test Garmin reel sur une activite Strava connue avec session Garmin connectee.
- Verification d'un cas ambiguous : aucune association automatique ne doit etre appliquee.
- Verification VM/prod apres push CI/CD : endpoint provider, fiche activite, onglet Garmin.

## Plan Trail + statuts providers + sync globale

- Nouveau plan execute : `docs/runsee_plan_trail_sync_global_codex_v2.md`.
- Backend : ajout de `GET /providers/status` pour exposer un etat filtre Strava/Garmin sans secret.
- Backend : ajout de `POST /sync/all`, orchestration prudente Strava incremental + Garmin recovery recent ; Garmin activity enrichment reste volontairement skippe hors contexte activite.
- Frontend layout : le panneau compte affiche maintenant les pastilles Strava/Garmin et un bouton de synchronisation globale compact.
- Trail : ajout du socle `trailProfile.js` avec classification terrain prudente, D+/D-/km, temps montee/descente, charge descente et qualite altitude.
- Aujourd'hui : le contexte trail reste minimal et conditionnel dans la synthese decisionnelle.
- Detail activite : onglet `Lecture trail` affiche uniquement si le profil terrain est pertinent.
- Analytics : nouvelle carte `Specificite trail` sur la selection filtree.
- Objectifs : les courses peuvent porter des champs trail optionnels (D+, D-, terrain, duree cible, montee/descente longue, priorite).
- Glossaire : entrees trail ajoutees pour D+, D-, D+/km, VAM, charge descente et specificite trail.

## Correctif post Trail + providers + sync globale

- Nouveau plan traite : `docs/runsee_plan_correctif_post_trail_provider_sync.md`, archive ensuite sous `docs/old/`.
- Sidebar compte : le statut Strava historique du header est retire ; Strava et Garmin sont affiches une seule fois au meme niveau dans les pastilles provider.
- `Lecture du jour` : la carte est reorganisee en verdict, action du jour, vigilance et signaux cles ; le contexte trail est integre a la decision au lieu d'un bloc analytique separe.
- Sync globale : `/sync/all` cree un job `global_incremental` sequentiel qui lance Strava incremental, Garmin recuperation recente puis Garmin activites recentes bornees.
- Garmin activites global : enrichissement recent en mode `recent_missing`, fenetre configuree par `GARMIN_ACTIVITY_ENRICHMENT_GLOBAL_DAYS` avec plafond applicatif a 30 jours.
- Documentation : convention d'archive standardisee sur `docs/old/`.

## Plan multi-sources Strava/Garmin avec fallback Garmin

- Nouveau plan traite : `docs/runsee_plan_multisource_garmin_fallback_v2.md`, archive ensuite sous `docs/old/`.
- Modele : `Activity` porte maintenant une identite canonique multi-source (`appUserId`, `sourceProvider`, `sourceActivityId`, `sourcePriority`) en conservant `stravaActivityId` pour compatibilite.
- Modele : ajout de `ActivityProviderLink` pour tracer les matchs provider et de `ProviderBackfillCursor` pour preparer le backfill Garmin historique par fenetres.
- Backend Garmin : ajout d'un normaliseur d'activites Garmin et d'un scorer de matching provider reutilisable.
- Sync globale : Garmin activites recentes peut maintenant creer des activites Garmin-only quand aucun match Strava fiable n'existe et que le cas n'est pas ambigu.
- Frontend : les listes et fiches activites utilisent un identifiant stable (`id` puis fallback source/Strava) et affichent un badge source Strava/Garmin.
- Documentation : ajout de `docs/MULTI_SOURCE_AUDIT.md` et `docs/MULTI_SOURCE_ARCHITECTURE.md`.

## Correctif UX Aujourd'hui

- Nouveau plan traite : `docs/runsee_plan_correctif_ux_aujourdhui.md`, a archiver sous `docs/old/`.
- Aujourd'hui reste une lecture fixe sur 7 jours glissants ; seul le perimetre sport est ajustable localement.
- Le filtre sport d'Aujourd'hui n'est plus persiste dans le state dashboard long terme ; il revient par defaut sur `Course a pied / trail` et affiche un chip + reset lorsqu'il est modifie.
- La page Aujourd'hui est ramenee a 4 blocs majeurs : header compact, lecture du jour, synthese 7 jours, activites a relire.
- Les anciens blocs empiles (`TodayReadinessCard`, `TodayFormCards`, `TodayVolumeStrip`, `TodaySecondaryRow`, `TodaySnapshotToday`, `RecentActivitiesCard`) ne sont plus rendus dans Aujourd'hui ; leurs informations utiles sont fusionnees.
- Le trail reste un contexte/vigilance dans Aujourd'hui ; les analyses detaillees restent dans Activite, Analytics et Objectifs.

## Correctif doublons Strava/Garmin et stabilisation multi-source

- Nouveau plan traite : `docs/runsee_correctif_doublons.md`, archive ensuite sous `docs/old/`.
- Matching Strava/Garmin renforce : fenetre possible 20 min si les metriques sont fortes, controle distance/duree/D+/FC, sport compatible, nom non bloquant.
- Garmin-only securise : une activite Garmin deja liee ou ambigue ne recree pas de fallback canonique.
- Duplicats existants : ajout de scripts dry-run/apply pour detecter puis soft-merger Garmin vers Strava sans suppression physique.
- `Activity` porte maintenant `isMerged`, `mergedIntoActivityId`, `mergedAt` et `totalElevationLoss`.
- Les lectures repository excluent les activites fusionnees et les profils trail peuvent utiliser le D- stocke en fallback.
- `/sync/all` ne laisse plus le job global etre marque success par la sous-sync Strava avant la fin des etapes Garmin.
- Frontend : liens activites importants centralises sur un identifiant public canonique compatible Strava/Garmin-only.
