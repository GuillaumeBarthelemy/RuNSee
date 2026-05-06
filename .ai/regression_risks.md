# Regression Risks

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
