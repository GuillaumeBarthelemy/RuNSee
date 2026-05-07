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
