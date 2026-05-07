# Regression Risks

## Risques surveilles dans la passe de fiabilisation

### Healthcheck backend

- Zone : `backend/src/app.js`.
- Risque : certains consommateurs de `/health` attendaient uniquement `status: OK`.
- Garde-fous presents : le statut reste `OK` quand la DB repond ; les URLs et origines existantes restent exposees.
- Validation requise : verifier `/health` et `/db/health` sur local/prod apres deploiement.

### Format d'erreur API

- Zone : middleware d'erreur Express.
- Risque : casser un client frontend qui lit encore `message/details`.
- Garde-fous presents : `message` est conserve, `details` reste present pour les erreurs non 500 ; le nouvel objet `error` est additif.

### Aptitude RunNSee

- Zone : `frontend/src/utils/recoveryViewModel.js`.
- Risque : changement de libelle de confiance visible sur donnees tres partielles.
- Garde-fous presents : formule de score inchangee ; seule la qualification de confiance est rendue plus prudente.

### Drift schemas Prisma

- Zone : `backend/scripts/db/compare-prisma-schemas.js`.
- Risque : faux positif si un champ est volontairement different entre SQLite et PostgreSQL.
- Garde-fous presents : comparaison limitee aux blocs `model`, pas aux providers datasource/generator.

### Validation GREEN auth-aware

- Zone : `deployment/postgresql/scripts/validate-green-stack.ps1`.
- Risque : croire que les parcours authentifies sont valides alors qu'aucun cookie n'a ete fourni.
- Garde-fous presents : sortie explicite `authenticatedChecks = SKIPPED` sans `-SessionCookie`; routes protegees testees seulement avec cookie.

### Garmin activity recovery time

- Zone : bridge Python et `garminActivityEnrichment.service.js`.
- Risque : mauvaise unite de temps de recuperation si Garmin change les champs exposes.
- Garde-fous presents : priorite explicite heures > minutes > secondes > champ brut, tests backend purs.

### Timestamp Garmin recovery

- Zone : `garminActivityEnrichment.service.js`.
- Risque : une completion activite masque une recovery sync attendue.
- Garde-fous presents : l'enrichissement activite ne met plus a jour `ExternalProviderConnection.lastSyncAt`.

## Eleve

### Migration SQLite vers PostgreSQL

- Zone : `backend/scripts/db/*`, `backend/prisma/schema.prisma`, `backend/prisma-postgresql/schema.prisma`.
- Risque : perte ou duplication de donnees si l'import est lance sur une base non vide sans intention explicite.
- Garde-fous presents : `import-postgresql-dump.js` refuse maintenant l'import sans `--truncate` ou `--allow-append`; `--dry-run` permet de verifier le dump sans base cible.
- Validation requise : backup PostgreSQL avant tout import reel, puis comparaison des compteurs par table.

### Donnees locales et secrets

- Zone : ignore files + Git index.
- Risque : `dev.db`, `.env` ou logs runtime commites par erreur.
- Garde-fous presents : patterns ignores ajoutes ; artefacts deja suivis retires de l'index.
- Validation requise : verifier `git status --short` avant commit.

## Moyen

### Garmin activites non officiel

- Zone : `garminconnect_bridge.py`, `garminconnectBridge.service.js`, `garminActivityEnrichment.service.js`.
- Risque : API Garmin non officielle instable, 429, session expiree, payloads partiels.
- Garde-fous presents : fenetre courte, max 180 jours, pas de backfill massif depuis la fiche, erreurs 429/expired propagees, brut stocke separement.
- Validation requise : test manuel avec compte Garmin reel et activite connue.

### Matching Strava/Garmin

- Zone : `garminActivityEnrichment.service.js`.
- Risque : associer une mauvaise activite si deux sorties proches existent.
- Garde-fous presents : fenetre ±10 min, controle distance/duree/sport, score, statut `ambiguous` non applique automatiquement.
- Validation requise : verifier un cas avec doublon de seance proche.

### Fiche detail activite

- Zone : `ActivityDetailPage.jsx`, `ActivityDetailCard.jsx`, `ActivityDetailTabs.jsx`, `GarminEnrichmentPanel.jsx`.
- Risque : onglet Garmin vide ou crash si snapshot recovery absent mais enrichissement activite present.
- Garde-fous presents : props par defaut, etat vide, action ciblee, mapping tolerant.
- Validation requise : ouvrir une activite avec et sans snapshot Garmin.

## Faible

### Mapping Garmin frontend

- Zone : `frontend/src/utils/activityEnrichment.js`.
- Risque : valeurs nulles, zero ou negatives masquees a tort.
- Garde-fous presents : tests Vitest edge cases pour `performanceCondition`, TE a 0, recovery time, EPOC.
