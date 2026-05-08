# Regression Risks

## Risques surveilles dans la passe de fiabilisation

### Statuts providers dans le layout

- Zone : `CurrentAccountPanel`, `useProviderStatuses`, `GET /providers/status`.
- Risque : surcharge visuelle de la sidebar ou exposition involontaire de secrets.
- Garde-fous presents : reponse provider filtree, pas de token/session, pastilles compactes desktop/mobile.
- Validation requise : verifier sidebar sur desktop, ecran etroit et mobile.

### Synchronisation globale

- Zone : `POST /sync/all`, `queueGlobalSyncForUser`, job `global_incremental`.
- Risque : relancer un historique Strava, masquer une erreur provider partielle ou lancer un backfill Garmin activite non borne.
- Garde-fous presents : Strava incremental uniquement, Garmin recovery recent, Garmin activites en mode `recent_missing` plafonne a 30 jours, erreurs provider isolees dans `resultJson`.
- Validation requise : tester avec Strava seul, Garmin seul, les deux connectes, puis verifier les sync individuelles existantes.

### Lecture trail

- Zone : `trailProfile.js`, `DashboardDecisionSummaryCard`, `ActivityTrailCard`, `TrailSpecificityCard`.
- Risque : afficher une conclusion trail sur une sortie route plate ou donner trop de poids au trail dans Aujourd'hui.
- Garde-fous presents : affichage conditionnel, qualite altitude, wording prudent, contexte trail integre a la decision du jour sans bloc analytique lourd.
- Validation requise : tester une activite plate, une sortie vallonnee, une activite sans `rawJson`, puis la carte Lecture du jour sur mobile.

### Aujourd'hui compact

- Zone : `DashboardPage`, `TodayHeader`, `DashboardDecisionSummaryCard`, `TodaySevenDaySummary`, `TodayUsefulActivities`.
- Risque : perdre une information utile de pilotage en retirant l'empilement historique des cartes Aujourd'hui.
- Garde-fous presents : les calculs sous-jacents restent inchanges ; les signaux recovery/charge/volume/trail sont fusionnes dans la decision ou la synthese 7 jours.
- Validation requise : verifier desktop/mobile, filtre actif/reset, affichage sans recovery Garmin et activite Garmin-only.

### Filtre sport Aujourd'hui

- Zone : `useDashboardState`, `useActivityViewModel`, `DashboardPage`.
- Risque : une ancienne valeur `todaySportGroup` stockee en localStorage biaise la lecture quotidienne.
- Garde-fous presents : suppression de la valeur des defaults persistants, sanitation du state charge, et etat local dans Aujourd'hui.
- Validation requise : refresh navigateur et nouvelle session doivent revenir au perimetre Course a pied / trail.

### Sidebar providers

- Zone : `CurrentAccountPanel`, `useProviderStatuses`, `GET /providers/status`.
- Risque : perdre la lisibilite des sources connectees ou rendre le bouton sync ambigu.
- Garde-fous presents : une seule ligne provider, labels `aria-label` explicites, Strava et Garmin au meme niveau visuel.
- Validation requise : verifier Strava/Garmin connectes, un seul provider connecte, erreur provider et affichage etroit.

### Objectifs trail optionnels

- Zone : schemas Prisma, migrations `20260507123000_add_trail_race_objective_fields`, `RaceObjectivesCard`.
- Risque : migration non appliquee en prod ou formulaire trop dense en admin.
- Garde-fous presents : champs nullable, objectifs route conserves, serializers retrocompatibles.
- Validation requise : appliquer migration avant usage prod, creer/reactiver/archiver un objectif route et trail.

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

## Multi-sources Strava/Garmin

### Activites Garmin-only

- Zone : `Activity`, `activity.repository.js`, `garminActivityEnrichment.service.js`, routes `/activities`.
- Risque : casser les parcours historiques qui supposaient `athleteId` et `stravaActivityId` obligatoires.
- Garde-fous presents : champs Strava conserves, identite canonique additive `sourceProvider/sourceActivityId`, filtres repository compatibles, badge source frontend.
- Validation requise : ouvrir une activite Strava historique, une activite Strava enrichie Garmin et une activite Garmin-only.

### Migration multi-source Activity

- Zone : migrations `20260507190000_add_multisource_activity_foundation`.
- Risque : migration sensible car `Activity` est au centre des analyses.
- Garde-fous presents : donnees Strava historiques remplies avec `sourceProvider='strava'`, `sourceActivityId=stravaActivityId`, `sourceUrl` Strava ; contraintes uniques ajoutees sans supprimer les champs existants.
- Validation requise : backup avant prod, `prisma migrate deploy`, comparaison schemas, compte activites avant/apres.

### Fallback Garmin automatique

- Zone : sync globale et enrichissement Garmin recent.
- Risque : creer une activite Garmin-only a tort si un match Strava ambigu existe.
- Garde-fous presents : aucun Garmin-only n'est cree quand le matching est `ambiguous`; le cas est journalise dans `ActivityProviderLink`. Une activite Garmin deja liee ne recree pas un fallback lors d'une sync suivante.
- Validation requise : tester deux activites proches le meme jour et verifier que le fallback ne cree pas de doublon.

### Reparation de doublons provider

- Zone : `Activity.isMerged`, scripts `detect-provider-activity-duplicates.js` et `repair-provider-activity-duplicates.js`.
- Risque : masquer une activite Garmin-only legitime si le matching est trop permissif.
- Garde-fous presents : detection dry-run par defaut, seuil de score configurable, reparation exige `--apply --confirm=merge-provider-duplicates`, aucune suppression physique.
- Validation requise : controler le rapport JSON avant tout apply et verifier les liens `ActivityProviderLink` apres reparation.
- Validation prod realisee : 29 doublons Garmin/Strava detectes en `exact`, 29 soft-merges appliques, detection residuelle a 0, 29 lignes Garmin conservees avec `isMerged=true`.
- Point de vigilance ajoute : toujours comparer les timestamps provider en UTC (`startDate`) avant le local (`startDateLocal`) pour eviter les faux ecarts de fuseau horaire.
- Garde-fou ajoute : `exact` ne depend plus uniquement de l'ecart temporel ; distance et duree doivent aussi rester dans une tolerance stricte. Les cas proches moins parfaits restent `probable`.
- Route purge Garmin : action destructive admin conservee avec confirmation explicite `PURGE_GARMIN`; ne pas l'exposer hors administration ni l'utiliser comme mecanisme de merge/nettoyage d'activites.

### Lifecycle sync globale

- Zone : `executeGlobalIncrementalSyncJob`, `executeIncrementalSyncJob`.
- Risque : regression sur les jobs Strava incrementaux individuels.
- Garde-fous presents : option `manageJobLifecycle=false` utilisee uniquement par `/sync/all`; les jobs incrementaux directs conservent leur lifecycle historique.
- Validation requise : tester une sync incrementale simple puis une sync globale.
- Validation automatisee de review : tests backend/frontend/build/Prisma OK et dry-run doublons prod a 0.
- Risque residuel : une nouvelle sync globale Strava + Garmin doit encore etre lancee en session utilisateur pour confirmer qu'aucun doublon n'est recree en conditions reelles.
