# Current Context

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
