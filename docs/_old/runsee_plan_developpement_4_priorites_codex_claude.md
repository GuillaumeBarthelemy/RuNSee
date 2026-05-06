# RunNSee â€” Plan de dÃ©veloppement complet pour CODEX / Claude Code

**Objectif du document**
Ce fichier sert de base de travail opÃ©rationnelle pour un agent de dÃ©veloppement type **CODEX** ou **Claude Code**.
Lâ€™agent doit analyser le code existant, rÃ©aliser les dÃ©veloppements, mettre Ã  jour la documentation projet dans `.ai/*.md`, puis commit/push sur GitHub afin dâ€™activer la chaÃ®ne CI/CD.

---

## 0. Mission gÃ©nÃ©rale

Tu interviens sur lâ€™application **RunNSee**, monorepo composÃ© de :

```text
backend/      Node.js 22 + Express 5 + Prisma 7, ESM, JavaScript pur
frontend/     React 19 + Vite 8 + React Router 7, ESM, JavaScript/JSX pur
deployment/   scripts Windows/Linux/PostgreSQL/Cloudflare
```

Base active actuelle : **SQLite** via `backend/prisma/schema.prisma`.
Cible en prÃ©paration : **PostgreSQL** via `backend/prisma-postgresql/schema.prisma`.

Lâ€™application a dÃ©jÃ  fait lâ€™objet dâ€™une refonte UX/UI importante :

- vocabulaire FR canonique : `VFC`, `Ã‰nergie`, `Allure ajustÃ©e`, `DÃ©rive cardiaque`, `Dette dâ€™oxygÃ¨ne`, `Aptitude` ;
- composants visuels : `MetricGauge`, `RangeBar`, `MicroBars`, `TrendChip`, `BandPositioner` ;
- Dashboard refondu avec `TodayReadinessCard` ;
- Activity Detail enrichi avec `ActivityIntensityCard` ;
- rÃ©glages refondus via `TabbedSettings` ;
- glossaire dÃ©diÃ© via `/glossaire` ;
- Phase K Garmin prÃ©parÃ©e cÃ´tÃ© frontend, mais backend non finalisÃ©.

La mission couvre **4 prioritÃ©s de dÃ©veloppement** :

1. SÃ©curiser les fondations projet : packaging, secrets, base SQLite, dÃ©marrage propre.
2. ComplÃ©ter et fiabiliser la migration/import SQLite â†’ PostgreSQL.
3. Terminer la Phase K Garmin : enrichissement des activitÃ©s Strava par donnÃ©es Garmin.
4. Corriger et durcir la logique frontend/backend dâ€™enrichissement activitÃ© Garmin.

Ã€ la fin, tu dois :

- avoir modifiÃ© le code ;
- avoir exÃ©cutÃ© les validations disponibles ;
- avoir mis Ã  jour `.ai/current_context.md`, `.ai/open_tasks.md`, `.ai/regression_risks.md`, `.ai/codebase_map.md` ;
- avoir produit un commit Git propre ;
- avoir poussÃ© sur GitHub pour dÃ©clencher la CI/CD.

---

## 1. RÃ¨gles impÃ©ratives de dÃ©veloppement

### 1.1 PrÃ©servation fonctionnelle

Ne jamais remplacer une logique mÃ©tier existante par une version supposÃ©e â€œplus propreâ€ sans dÃ©montrer lâ€™Ã©quivalence fonctionnelle.

Avant chaque modification, vÃ©rifier :

- les imports existants ;
- les routes backend existantes ;
- les modÃ¨les Prisma existants ;
- les composants frontend consommateurs ;
- les tests existants ;
- les risques de pertes de donnÃ©es ;
- les risques de doublons ;
- les risques de page blanche cÃ´tÃ© React.

### 1.2 JavaScript pur uniquement

Ne pas introduire TypeScript dans le code applicatif.

Ã€ respecter :

```text
backend : .js ESM uniquement
frontend : .js/.jsx ESM uniquement
CSS : vanilla CSS uniquement
```

Ne pas ajouter Tailwind, CSS-in-JS, Zustand, Redux, TanStack Query ou autre framework sans demande explicite.

### 1.3 Secrets et fichiers runtime

Ne jamais committer :

```text
.env
.env.*.local
*.db
*.sqlite
*.sqlite3
node_modules/
dist/
generated/
runtime/
.tmp/
*.log
*.pid
coverage/
```

Conserver uniquement des exemples sÃ»rs :

```text
.env.example
.env.*.example
config.example.yml
README.md
VALIDATION.md
```

Si des secrets sont dÃ©jÃ  suivis par Git, les retirer du suivi avec `git rm --cached` sans supprimer le fichier local de lâ€™utilisateur.

### 1.4 Documentation IA obligatoire

AprÃ¨s dÃ©veloppement, mettre Ã  jour ou crÃ©er le dossier :

```text
.ai/
```

avec au minimum :

```text
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
.ai/codebase_map.md
```

Si ces fichiers existent dÃ©jÃ  ailleurs Ã  la racine, les consolider dans `.ai/` sans dÃ©truire lâ€™historique utile.

### 1.5 Git / GitHub obligatoire

Ã€ la fin :

```bash
git status
git diff --stat
git diff --check
```

Puis commit :

```bash
git add <fichiers utiles uniquement>
git commit -m "feat: secure foundations and complete Garmin activity enrichment"
git push
```

Si le dÃ©pÃ´t impose une branche dÃ©diÃ©e :

```bash
git checkout -b chore/runsee-foundations-garmin-phase-k
git push -u origin chore/runsee-foundations-garmin-phase-k
```

Ne jamais ajouter les fichiers runtime/secrets au commit.

---

## 2. Ã‰tat connu Ã  vÃ©rifier avant dÃ©veloppement

Avant de coder, exÃ©cuter une analyse locale courte et produire un rÃ©sumÃ© dans `.ai/current_context.md`.

### 2.1 Inventaire attendu

VÃ©rifier la prÃ©sence des Ã©lÃ©ments suivants :

```text
backend/src/app.js
backend/src/routes/provider.routes.js
backend/src/controllers/provider.controller.js
backend/src/services/providers/garminconnectBridge.service.js
backend/src/services/providers/garminProvider.service.js
backend/src/services/providers/garminRecoveryBackfill.service.js
backend/src/repositories/activity.repository.js
backend/src/services/activityEnrichment.service.js
backend/prisma/schema.prisma
backend/prisma-postgresql/schema.prisma
backend/scripts/db/tableDefinitions.js

frontend/src/pages/ActivityDetailPage.jsx
frontend/src/components/ActivityDetailCard.jsx
frontend/src/components/ActivityDetailTabs.jsx
frontend/src/components/GarminEnrichmentPanel.jsx
frontend/src/utils/activityEnrichment.js
frontend/src/services/activity.service.js
frontend/src/services/externalProvider.service.js
```

### 2.2 ContrÃ´les initiaux

ExÃ©cuter si possible :

```bash
cd backend
npm ci
npm run prisma:generate
npm run prisma:migrate -- --name verify_current_state

cd ../frontend
npm ci
npm test
npm run build
```

Si une commande Ã©choue Ã  cause de lâ€™Ã©tat local, documenter :

- commande lancÃ©e ;
- erreur exacte ;
- cause probable ;
- correction effectuÃ©e ou raison du report.

Ne pas masquer une erreur.

---

# PRIORITÃ‰ 1 â€” SÃ©curiser fondations projet, packaging, SQLite et dÃ©marrage propre

## 3. Objectif

Garantir que le dÃ©pÃ´t est propre, reproductible, sans secrets/runtime committÃ©s, et que la base SQLite active est cohÃ©rente avec le schÃ©ma Prisma courant.

Cette prioritÃ© est un **lot de correction et sÃ©curisation**, pas un changement fonctionnel.

---

## 4. Travaux Ã  rÃ©aliser

### 4.1 Nettoyer `.gitignore` et `.dockerignore`

VÃ©rifier et complÃ©ter :

```text
backend/.gitignore
frontend/.gitignore
deployment/windows/.gitignore
deployment/cloudflare/.gitignore
.gitignore Ã©ventuel Ã  la racine
backend/.dockerignore
frontend/.dockerignore
```

Ajouter si absent :

```gitignore
# Dependencies
node_modules/

# Build outputs
dist/
build/
generated/

# Runtime
runtime/
.tmp/
*.log
*.pid

# Local databases
*.db
*.sqlite
*.sqlite3

# Local env / secrets
.env
.env.*.local
*.local

# Test / coverage
coverage/
.vitest/

# OS / IDE
.DS_Store
Thumbs.db
.vscode/
.idea/
```

Attention : ne pas exclure les fichiers `.example`.

---

### 4.2 Retirer du suivi Git les artefacts interdits

Identifier les fichiers suivis Ã  tort :

```bash
git ls-files | grep -E '(^|/)(node_modules|dist|generated|runtime|\.tmp)(/|$)|\.env$|\.env\..*\.local$|\.(db|sqlite|sqlite3|log|pid)$'
```

Pour chaque fichier suivi Ã  tort :

```bash
git rm --cached <fichier>
```

Ne pas supprimer les fichiers locaux utiles Ã  lâ€™utilisateur, sauf artefacts manifestement recrÃ©ables.

Documenter la liste retirÃ©e dans `.ai/current_context.md`.

---

### 4.3 VÃ©rifier lâ€™Ã©tat SQLite rÃ©el

ContrÃ´ler :

```bash
cd backend
npx prisma migrate status
```

Puis vÃ©rifier les tables rÃ©elles si `dev.db` existe :

```bash
sqlite3 dev.db ".tables"
sqlite3 dev.db "select migration_name, finished_at from _prisma_migrations order by finished_at;"
```

Comparer avec les modÃ¨les attendus dans `backend/prisma/schema.prisma` :

```text
AppUser
UserRaceObjective
UserTrainingAnalyticsSettings
UserAiAssistantConfig
UserSession
StravaConnection
UserStravaApp
Athlete
Activity
ExternalProviderConnection
ExternalProviderRawData
ExternalDailyRecoverySnapshot
ActivityProviderEnrichment
SyncJob
SyncCursor
```

Si la base SQLite locale est obsolÃ¨te :

1. ne pas lâ€™Ã©craser directement ;
2. crÃ©er une sauvegarde locale non committÃ©e :

```bash
cp backend/dev.db backend/dev.db.backup-before-foundation-fix
```

3. appliquer les migrations :

```bash
cd backend
npm run prisma:migrate
```

4. relancer le contrÃ´le des tables.

Si les migrations Ã©chouent, documenter prÃ©cisÃ©ment et proposer une correction minimale.

---

### 4.4 VÃ©rifier le montage des routes backend

Ouvrir `backend/src/app.js`.

VÃ©rifier que les routes rÃ©ellement utilisÃ©es sont montÃ©es :

```text
/auth
/athlete
/activities
/sync
/settings
/providers
```

VÃ©rifier aussi lâ€™Ã©tat de lâ€™assistant IA :

- si `backend/src/routes/assistant.routes.js` existe et que le frontend lâ€™utilise encore, monter la route dans `app.js` ;
- si le frontend ne lâ€™utilise plus, documenter le code comme dormant dans `.ai/codebase_map.md` et ne pas le supprimer dans ce lot.

Ne pas supprimer le code assistant sans demande explicite.

---

### 4.5 Validation prioritÃ© 1

ExÃ©cuter :

```bash
cd backend
npm ci
npm run prisma:generate
npx prisma validate
node --check src/server.js
node --check src/app.js

cd ../frontend
npm ci
npm test
npm run build
```

Si `npm ci` reconstruit correctement les modules natifs, cela valide que `node_modules/` nâ€™a pas besoin dâ€™Ãªtre archivÃ©.

### CritÃ¨res dâ€™acceptation prioritÃ© 1

- Aucun secret ou runtime nâ€™est ajoutÃ© au commit.
- `.gitignore` protÃ¨ge les artefacts critiques.
- SQLite est cohÃ©rente avec le schÃ©ma Prisma, ou lâ€™Ã©cart est documentÃ©.
- Le backend dÃ©marre aprÃ¨s installation propre.
- Le frontend teste/build aprÃ¨s installation propre.
- `.ai/current_context.md` et `.ai/regression_risks.md` sont mis Ã  jour.

---

# PRIORITÃ‰ 2 â€” ComplÃ©ter et fiabiliser SQLite â†’ PostgreSQL

## 5. Objectif

Rendre la migration/import SQLite â†’ PostgreSQL complÃ¨te, contrÃ´lable et non destructrice.

Cette prioritÃ© est un **lot de correction technique et fiabilisation data**.

---

## 6. Travaux Ã  rÃ©aliser

### 6.1 Comparer les schÃ©mas Prisma SQLite et PostgreSQL

Comparer :

```text
backend/prisma/schema.prisma
backend/prisma-postgresql/schema.prisma
```

VÃ©rifier pour chaque modÃ¨le :

- prÃ©sence du modÃ¨le dans les deux schÃ©mas ;
- mÃªmes relations fonctionnelles ;
- mÃªmes `@@unique` ;
- mÃªmes index fonctionnels ;
- types DateTime cohÃ©rents ;
- champs JSON stockÃ©s en String ou type adaptÃ© selon conventions actuelles ;
- `onDelete: Cascade` cohÃ©rent.

Ne pas modifier les noms de champs sans nÃ©cessitÃ© absolue.

---

### 6.2 ComplÃ©ter `tableDefinitions.js`

Ouvrir :

```text
backend/scripts/db/tableDefinitions.js
```

Le fichier doit couvrir tous les modÃ¨les utiles :

```text
AppUser
UserRaceObjective
UserTrainingAnalyticsSettings
UserAiAssistantConfig
UserSession
StravaConnection
UserStravaApp
Athlete
Activity
ExternalProviderConnection
ExternalProviderRawData
ExternalDailyRecoverySnapshot
ActivityProviderEnrichment
SyncJob
SyncCursor
```

Ordre dâ€™import recommandÃ© :

```text
1. AppUser
2. UserSession
3. UserStravaApp
4. StravaConnection
5. Athlete
6. Activity
7. UserTrainingAnalyticsSettings
8. UserRaceObjective
9. UserAiAssistantConfig
10. ExternalProviderConnection
11. ExternalProviderRawData
12. ExternalDailyRecoverySnapshot
13. ActivityProviderEnrichment
14. SyncJob
15. SyncCursor
```

Si une relation impose un ordre diffÃ©rent, suivre le schÃ©ma Prisma rÃ©el.

---

### 6.3 Rendre lâ€™import idempotent ou explicitement contrÃ´lÃ©

Analyser :

```text
backend/scripts/db/export-sqlite-dump.js
backend/scripts/db/import-postgresql-dump.js
backend/scripts/db/report-database-snapshot.js
```

Objectif : Ã©viter les doublons et les imports partiels silencieux.

ImplÃ©menter au minimum :

- contrÃ´le du nombre de lignes exportÃ©es par table ;
- contrÃ´le du nombre de lignes importÃ©es par table ;
- mode transaction si techniquement possible ;
- logs clairs par table ;
- erreur bloquante si une table attendue est absente ;
- option ou comportement documentÃ© pour rÃ©import :
  - soit `truncate + import` en environnement dev/green uniquement ;
  - soit `upsert` si les clÃ©s naturelles sont fiables.

Ne pas appliquer un `truncate` Ã  une base de production sans garde-fou explicite.

---

### 6.4 Ajouter un rapport de comparaison post-import

Le script de comparaison doit produire un rÃ©sumÃ© lisible :

```text
Table                         SQLite   PostgreSQL   Statut
AppUser                       1        1            OK
Activity                      897      897          OK
ExternalProviderRawData       120      120          OK
ActivityProviderEnrichment    35       35           OK
...
```

Si possible, ajouter des contrÃ´les de cohÃ©rence :

- nombre dâ€™activitÃ©s par utilisateur ;
- nombre dâ€™activitÃ©s avec `rawJson` ;
- nombre dâ€™activitÃ©s avec `startDate` non null ;
- nombre de snapshots Garmin par qualitÃ© ;
- nombre dâ€™enrichissements Garmin par statut.

---

### 6.5 Validation prioritÃ© 2

ExÃ©cuter :

```bash
cd backend
npm run prisma:pg:validate
npm run prisma:pg:generate
npm run db:export:sqlite
npm run db:import:postgres
npm run db:snapshot
```

Puis lancer les scripts deployment si disponibles :

```powershell
deployment/postgresql/scripts/start-dev-db.ps1
deployment/postgresql/scripts/import-current-sqlite-to-dev-postgres.ps1
deployment/postgresql/scripts/compare-current-sqlite-and-postgres.ps1
deployment/postgresql/scripts/validate-green-stack.ps1
```

### CritÃ¨res dâ€™acceptation prioritÃ© 2

- Tous les modÃ¨les Prisma utiles sont couverts par lâ€™export/import.
- Les volumes SQLite/PostgreSQL sont comparÃ©s table par table.
- Les erreurs dâ€™import sont bloquantes et explicites.
- Aucun import partiel silencieux.
- La documentation PostgreSQL est mise Ã  jour si les commandes changent.
- `.ai/regression_risks.md` mentionne lâ€™Ã©tat rÃ©siduel du risque PostgreSQL.

---

# PRIORITÃ‰ 3 â€” Terminer Phase K Garmin : enrichissement activitÃ©

## 7. Objectif

Permettre Ã  RunNSee dâ€™enrichir les activitÃ©s Strava existantes avec des mÃ©triques Garmin issues de Garmin Connect, sans crÃ©er de doublon fonctionnel et sans crÃ©er un univers Garmin sÃ©parÃ©.

Principe produit validÃ© : **Option B Garmin**.
Strava reste le rÃ©fÃ©rentiel principal des activitÃ©s. Garmin apporte des mÃ©triques complÃ©mentaires par sÃ©ance.

Cette prioritÃ© est un **changement fonctionnel**. Elle doit Ãªtre testÃ©e et documentÃ©e.

---

## 8. Backend â€” bridge Garmin

### 8.1 Ajouter lâ€™appel Node vers `fetch_activities`

Ouvrir :

```text
backend/src/services/providers/garminconnectBridge.service.js
```

Ajouter une fonction exportÃ©e, en respectant les conventions existantes :

```js
export async function fetchGarminActivities({ session, startDate, endDate }) {
  return runGarminconnectBridge({
    operation: "fetch_activities",
    session,
    startDate,
    endDate,
  });
}
```

Adapter la signature exacte Ã  lâ€™existant si `runGarminconnectBridge` utilise une autre forme.

Contraintes :

- valider `startDate` et `endDate` avant appel ;
- limiter la pÃ©riode par dÃ©faut, par exemple 30 jours si aucune pÃ©riode donnÃ©e ;
- refuser une pÃ©riode excessive, par exemple > 180 jours, sauf constante clairement documentÃ©e ;
- conserver la gestion existante des erreurs subprocess : timeout, stderr, exit code, JSON invalide.

---

## 9. Backend â€” service `garminActivityEnrichment.service.js`

CrÃ©er :

```text
backend/src/services/providers/garminActivityEnrichment.service.js
```

### 9.1 ResponsabilitÃ©s du service

Le service doit :

1. vÃ©rifier que lâ€™utilisateur a une connexion Garmin active ;
2. rÃ©cupÃ©rer et dÃ©chiffrer la session Garmin existante ;
3. appeler le bridge `fetchGarminActivities` ;
4. stocker les activitÃ©s Garmin brutes dans `ExternalProviderRawData` ;
5. rÃ©cupÃ©rer les activitÃ©s Strava locales sur la pÃ©riode ;
6. matcher Garmin â†” Strava ;
7. refuser les cas ambigus ;
8. upsert les mÃ©triques normalisÃ©es dans `ActivityProviderEnrichment` ;
9. retourner un rÃ©sumÃ© exploitable par lâ€™UI.

### 9.2 Fonction publique attendue

CrÃ©er une fonction du type :

```js
export async function enrichGarminActivitiesForUser(appUserId, options = {}) {
  // options: { startDate, endDate, stravaActivityId, dryRun }
}
```

Elle doit retourner au minimum :

```js
{
  providerCode: "garmin",
  period: { startDate, endDate },
  dryRun: false,
  fetchedCount: 0,
  rawUpsertedCount: 0,
  enrichmentUpsertedCount: 0,
  matchedCount: 0,
  ambiguousCount: 0,
  notFoundCount: 0,
  errorCount: 0,
  items: [
    {
      stravaActivityId,
      activityId,
      providerActivityId,
      status,
      matchConfidence,
      matchedAt,
      reason
    }
  ]
}
```

### 9.3 Stockage raw Garmin

Utiliser le modÃ¨le existant :

```text
ExternalProviderRawData
```

Champs importants :

```text
appUserId
providerCode
dataType
providerDateKey
providerResourceId
payloadJson
payloadHash
status
syncedAt
```

Convention recommandÃ©e :

```text
providerCode       = "garmin"
dataType           = "activity"
providerDateKey    = date Garmin locale YYYY-MM-DD si disponible
providerResourceId = activityId Garmin si disponible
payloadJson        = JSON.stringify(payload brut Garmin filtrÃ© ou complet selon convention existante)
payloadHash        = hash stable du payload
status             = "success" ou "error"
```

Respecter le `@@unique([appUserId, providerCode, dataType, providerDateKey, providerResourceId])`.

### 9.4 Stockage enrichment normalisÃ©

Utiliser :

```text
ActivityProviderEnrichment
```

Champs importants :

```text
appUserId
activityId
providerCode
providerActivityId
matchConfidence
matchedAt
status
normalizedJson
rawDataId
lastErrorCode
lastErrorMessage
```

Statuts recommandÃ©s :

```text
matched_exact
matched_tolerated
ambiguous
not_found
error
```

Ne pas enrichir automatiquement un cas `ambiguous`.

### 9.5 Normalisation Garmin

CrÃ©er des helpers privÃ©s dans le service ou un fichier dÃ©diÃ© si nÃ©cessaire :

```js
normalizeGarminActivity(raw)
buildGarminActivityDateKey(raw)
extractGarminProviderActivityId(raw)
buildGarminActivityPayloadHash(raw)
```

Le JSON normalisÃ© doit contenir si disponible :

```js
{
  aerobicTrainingEffect,
  anaerobicTrainingEffect,
  vo2max,
  performanceCondition,
  recoveryHeartRate,
  recoveryTime,
  epoc,
  trainingLoad,
  startTimeLocal,
  startTimeGmt,
  duration,
  distance,
  sportType,
  source: "garmin"
}
```

Ne pas supprimer les champs Garmin utiles uniquement parce quâ€™ils valent `0` ou sont nÃ©gatifs. Exemple : `performanceCondition = -5` est une information valable.

---

## 10. Backend â€” matching Garmin â†” Strava

### 10.1 RÃ¨gle de matching

Ne pas se limiter au timestamp si des donnÃ©es complÃ©mentaires sont disponibles.

Score recommandÃ© :

```text
timestamp : 50%
distance  : 25%
duration  : 15%
sportType  : 10%
```

FenÃªtre de tolÃ©rance recommandÃ©e :

```text
exact           : delta timestamp <= 60 secondes
matched_tolerated : delta timestamp <= 10 minutes + distance/durÃ©e cohÃ©rentes
ambiguous       : plusieurs candidats acceptables
not_found       : aucun candidat fiable
```

### 10.2 Garde-fous

Refuser le matching automatique si :

- plusieurs activitÃ©s Strava sont dans la fenÃªtre avec un score proche ;
- distance incohÃ©rente au-delÃ  dâ€™un seuil, par exemple > 15 % ;
- durÃ©e incohÃ©rente au-delÃ  dâ€™un seuil, par exemple > 15 % ;
- type sport manifestement incompatible.

Documenter les seuils dans le code via constantes.

---

## 11. Backend â€” contrÃ´leur et route

### 11.1 Ajouter les contrÃ´leurs

Dans :

```text
backend/src/controllers/provider.controller.js
```

Ajouter :

```js
export async function enrichGarminActivitiesController(req, res, next) {
  try {
    const user = getRequiredAuthUser(req);
    const result = await enrichGarminActivitiesForUser(user.id, req.body || {});
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}
```

Adapter selon les conventions existantes.

### 11.2 Ajouter la route

Dans :

```text
backend/src/routes/provider.routes.js
```

Ajouter :

```js
router.post("/garmin/activities/enrich", requireAuth, enrichGarminActivitiesController);
```

### 11.3 Exposer les enrichissements dans la lecture activitÃ©

Option recommandÃ©e : enrichir la rÃ©ponse existante de :

```text
GET /activities/:stravaActivityId
```

Modifier `getStoredActivityByStravaIdForUser` ou ajouter une fonction repository dÃ©diÃ©e pour inclure :

```js
activityProviderEnrichments: {
  where: { providerCode: "garmin" }
}
```

Si le nom de relation Prisma nâ€™est pas gÃ©nÃ©rÃ© explicitement, vÃ©rifier avec Prisma Client et adapter.

La rÃ©ponse frontend doit contenir une donnÃ©e exploitable sous une des formes suivantes :

```js
activity.activityProviderEnrichments[0]
```

ou

```js
activity.garminActivityEnrichment
```

Choisir une forme stable et documentÃ©e.

---

## 12. Frontend â€” service API

Modifier :

```text
frontend/src/services/externalProvider.service.js
```

Ajouter :

```js
export async function enrichGarminActivities(payload = {}) {
  const { data } = await api.post("/providers/garmin/activities/enrich", payload);
  return data;
}
```

Si le projet utilise un client axios centralisÃ© diffÃ©rent, respecter lâ€™existant.

---

## 13. Frontend â€” Activity Detail

### 13.1 Charger lâ€™enrichissement activitÃ©

Modifier :

```text
frontend/src/pages/ActivityDetailPage.jsx
```

Objectif : transmettre lâ€™enrichissement Garmin Ã  `ActivityDetailCard`.

Approche recommandÃ©e :

- rÃ©cupÃ©rer lâ€™enrichissement depuis la rÃ©ponse `GET /activities/:stravaActivityId` ;
- convertir `normalizedJson` en objet si nÃ©cessaire ;
- stocker dans un state `garminActivityEnrichment` ou le dÃ©river de `activity` via `useMemo` ;
- transmettre Ã  `ActivityDetailCard`.

### 13.2 Propagation composant

Modifier si nÃ©cessaire :

```text
frontend/src/components/ActivityDetailCard.jsx
frontend/src/components/ActivityDetailTabs.jsx
```

Passer :

```jsx
<GarminEnrichmentPanel
  snapshot={garminSnapshot}
  activityEnrichment={garminActivityEnrichment}
/>
```

Ne pas casser lâ€™affichage existant du snapshot recovery Garmin.

### 13.3 Action manuelle dâ€™enrichissement Garmin

Ajouter un bouton ou une action dans lâ€™onglet Garmin ou RÃ©glages Connexions, selon lâ€™UX existante.

Texte recommandÃ© :

```text
Enrichir les activitÃ©s Garmin
```

ou sur une activitÃ© :

```text
Chercher les mÃ©triques Garmin de cette sÃ©ance
```

Lâ€™action doit :

- appeler `POST /providers/garmin/activities/enrich` avec `stravaActivityId` ou pÃ©riode ciblÃ©e ;
- afficher un message succÃ¨s/Ã©chec ;
- recharger lâ€™activitÃ© aprÃ¨s enrichissement ;
- ne pas crÃ©er de page blanche si Garmin nâ€™est pas connectÃ©.

---

## 14. Validation prioritÃ© 3

### Backend

```bash
cd backend
node --check src/services/providers/garminActivityEnrichment.service.js
node --check src/controllers/provider.controller.js
node --check src/routes/provider.routes.js
npm run prisma:generate
```

Tester manuellement :

```http
POST /providers/garmin/activities/enrich
{
  "startDate": "2026-04-01",
  "endDate": "2026-04-30",
  "dryRun": true
}
```

Puis sans dry-run sur une petite pÃ©riode :

```http
POST /providers/garmin/activities/enrich
{
  "startDate": "2026-04-01",
  "endDate": "2026-04-07"
}
```

### Frontend

```bash
cd frontend
npm test
npm run build
```

VÃ©rifier visuellement :

- Dashboard inchangÃ© ;
- Activity Detail sâ€™ouvre ;
- onglet Garmin affiche toujours les snapshots recovery ;
- bloc â€œMÃ©triques de la sÃ©anceâ€ sâ€™affiche si enrichment disponible ;
- absence de donnÃ©es Garmin = message propre, pas erreur.

### CritÃ¨res dâ€™acceptation prioritÃ© 3

- Endpoint backend disponible et protÃ©gÃ© par `requireAuth`.
- Raw Garmin stockÃ© dans `ExternalProviderRawData`.
- Enrichissement stockÃ© dans `ActivityProviderEnrichment`.
- Matching ambigu non appliquÃ© automatiquement.
- Activity Detail affiche les mÃ©triques Garmin par sÃ©ance.
- Relancer lâ€™enrichissement sur la mÃªme pÃ©riode ne crÃ©e pas de doublons.
- RÃ©sumÃ© dâ€™exÃ©cution exploitable par lâ€™utilisateur et par les logs.

---

# PRIORITÃ‰ 4 â€” Corriger et durcir `activityEnrichment`

## 15. Objectif

Corriger les incohÃ©rences fonctionnelles de la logique dâ€™enrichissement Garmin cÃ´tÃ© frontend et garantir une lecture fiable des mÃ©triques.

Cette prioritÃ© est Ã  la fois une **correction fonctionnelle** et une **sÃ©curisation de non-rÃ©gression**.

---

## 16. Corrections frontend attendues

Modifier :

```text
frontend/src/utils/activityEnrichment.js
frontend/src/components/GarminEnrichmentPanel.jsx
frontend/src/utils/activityEnrichment.test.js si existant
```

### 16.1 Ne pas ignorer `performanceCondition <= 0`

RÃ¨gle :

```text
performanceCondition = -5 est une donnÃ©e valide.
performanceCondition = 0 est une donnÃ©e valide si Garmin la retourne explicitement.
performanceCondition = null/undefined est absent.
```

Ne pas utiliser une condition globale du type :

```js
value != null && value > 0
```

pour dÃ©cider si une activitÃ© a des mÃ©triques Garmin exploitables.

### 16.2 IntÃ©grer rÃ©ellement `recoveryTime`

Si Garmin retourne un temps de rÃ©cupÃ©ration, le flux doit le conserver.

Ã€ vÃ©rifier cÃ´tÃ© backend normalisation et frontend :

```text
recoveryTime
recoveryTimeSeconds
recoveryTimeHours
```

Choisir un nom canonique unique. Recommandation :

```text
recoveryTimeHours
```

CÃ´tÃ© UI, afficher :

```text
RÃ©cupÃ©ration conseillÃ©e : 18 h
```

ou :

```text
RÃ©cupÃ©ration conseillÃ©e : 1 j 6 h
```

selon le helper existant.

### 16.3 Afficher `epoc` si disponible

Le composant `GarminEnrichmentPanel` extrait `epoc`, mais ne lâ€™affiche pas actuellement dans le bloc sÃ©ance.

Ajouter une ligne claire :

```text
Dette dâ€™oxygÃ¨ne Garmin
```

Attention : ne pas confondre cette donnÃ©e Garmin avec lâ€™EPOC qualitatif calculÃ© cÃ´tÃ© RunNSee dans `ActivityIntensityCard`.

LibellÃ© recommandÃ© pour Ã©viter la confusion :

```text
Dette dâ€™oxygÃ¨ne Garmin
```

### 16.4 GÃ©rer `0` correctement

Ne pas masquer une donnÃ©e valide uniquement parce quâ€™elle vaut `0`.

Cas Ã  distinguer :

```text
0 explicite    => peut Ãªtre affichÃ© selon la mÃ©trique
null/undefined => absent
```

Exemple :

- effet anaÃ©robie `0.0` peut Ãªtre normal sur une sortie facile ;
- performance condition `0` peut Ãªtre neutre ;
- recovery heart rate `0` est probablement inexploitable ;
- VO2max `0` est inexploitable.

Documenter ces choix dans les tests.

---

## 17. Tests frontend Ã  ajouter/adapter

Ajouter ou complÃ©ter les tests Vitest sur :

```text
frontend/src/utils/activityEnrichment.test.js
```

Cas obligatoires :

1. `performanceCondition: -5` produit un modÃ¨le exploitable.
2. `performanceCondition: 0` produit un modÃ¨le neutre exploitable.
3. `aerobicTrainingEffect: 0` ne casse pas la normalisation.
4. `anaerobicTrainingEffect: 0` est traitÃ© comme donnÃ©e connue mais faible/neutre.
5. `recoveryTimeHours` est formatÃ© correctement.
6. `epoc` est conservÃ© dans le modÃ¨le.
7. activitÃ© Garmin sans mÃ©trique exploitable retourne `null` ou un modÃ¨le vide selon convention existante.
8. matching ambigu retourne un statut ambigu ou null, pas un faux match.
9. matching exact timestamp retourne un score fort.
10. matching avec distance incohÃ©rente est rejetÃ© ou fortement dÃ©gradÃ©.

---

## 18. Validation prioritÃ© 4

```bash
cd frontend
npm test -- activityEnrichment
npm test
npm run build
```

VÃ©rifier visuellement sur Activity Detail :

- performance condition nÃ©gative visible ;
- performance condition neutre visible ;
- effet anaÃ©robie Ã  0 ne provoque pas dâ€™erreur ;
- recovery time visible si disponible ;
- EPOC Garmin visible si disponible ;
- aucun bloc vide nâ€™est affichÃ©.

### CritÃ¨res dâ€™acceptation prioritÃ© 4

- Les mÃ©triques Garmin nÃ©gatives ou nulles utiles ne sont pas perdues.
- `recoveryTime` est rÃ©ellement intÃ©grÃ© au flux.
- `epoc` est affichÃ© ou explicitement documentÃ© comme non affichÃ©.
- Les tests couvrent les cas limites.
- Aucune rÃ©gression sur les tests existants GAP, dÃ©rive cardiaque, EPOC RunNSee, tonePicker, glossary.

---

# 19. Mise Ã  jour obligatoire `.ai/*.md`

Ã€ la fin des dÃ©veloppements, mettre Ã  jour :

## `.ai/current_context.md`

Contenu attendu :

- Ã©tat rÃ©el aprÃ¨s dÃ©veloppement ;
- commit courant ;
- prioritÃ©s terminÃ©es ;
- commandes exÃ©cutÃ©es ;
- tests rÃ©ussis/Ã©chouÃ©s ;
- Ã©tat Phase K Garmin ;
- Ã©tat SQLite/PostgreSQL ;
- limites restantes.

## `.ai/open_tasks.md`

DÃ©placer en terminÃ© :

- nettoyage packaging ;
- vÃ©rification SQLite ;
- import PostgreSQL complet ;
- service backend Garmin activity enrichment ;
- endpoint enrichissement ;
- intÃ©gration Activity Detail ;
- corrections `activityEnrichment`.

Conserver en ouvert uniquement les vrais restes, par exemple :

- test avec compte Garmin rÃ©el si non rÃ©alisable localement ;
- validation CI/CD distante ;
- recette utilisateur visuelle ;
- Ã©ventuelles limites API Garmin Connect.

## `.ai/regression_risks.md`

Mettre Ã  jour les niveaux de risque :

- migration SQLite â†’ PostgreSQL ;
- bridge Garmin subprocess ;
- Garmin activity enrichment ;
- matching Garmin â†” Strava ;
- `ActivityDetailPage` ;
- `GarminEnrichmentPanel` ;
- `ActivityProviderEnrichment` ;
- secrets/runtime packaging.

Inclure pour chaque risque :

```text
Zone
Risque
Garde-fou
Statut aprÃ¨s dÃ©veloppement
```

## `.ai/codebase_map.md`

Ajouter/mettre Ã  jour :

- nouveau service `garminActivityEnrichment.service.js` ;
- nouvelle route `POST /providers/garmin/activities/enrich` ;
- tables couvertes par import PostgreSQL ;
- flux Garmin activitÃ© : Bridge Python â†’ RawData â†’ Matching â†’ ActivityProviderEnrichment â†’ Activity Detail ;
- conventions de statuts matching.

---

# 20. Recette complÃ¨te avant commit

ExÃ©cuter au minimum :

```bash
# Backend
cd backend
npm ci
npm run prisma:generate
npx prisma validate
node --check src/server.js
node --check src/app.js
node --check src/routes/provider.routes.js
node --check src/controllers/provider.controller.js
node --check src/services/providers/garminconnectBridge.service.js
node --check src/services/providers/garminActivityEnrichment.service.js
npm run prisma:pg:validate
npm run prisma:pg:generate
npm run db:export:sqlite

# Frontend
cd ../frontend
npm ci
npm test
npm run build
npm run lint
```

Si `npm run lint` Ã©choue sur de la dette prÃ©existante non liÃ©e au lot, documenter prÃ©cisÃ©ment et ne pas corriger massivement hors pÃ©rimÃ¨tre sans nÃ©cessitÃ©.

---

# 21. Recette manuelle fonctionnelle

Ã€ rÃ©aliser si lâ€™environnement local est disponible :

1. dÃ©marrer backend ;
2. dÃ©marrer frontend ;
3. se connecter ;
4. ouvrir Dashboard ;
5. ouvrir Activity Detail dâ€™une activitÃ© existante ;
6. vÃ©rifier onglet Garmin sans enrichment ;
7. lancer enrichissement Garmin sur petite pÃ©riode ;
8. rouvrir la mÃªme activitÃ© ;
9. vÃ©rifier bloc â€œMÃ©triques de la sÃ©anceâ€ ;
10. relancer enrichissement mÃªme pÃ©riode ;
11. vÃ©rifier absence de doublon ;
12. vÃ©rifier PostgreSQL import dev si stack disponible.

---

# 22. Non-rÃ©gression mÃ©tier obligatoire

Comparer avant/aprÃ¨s sur un Ã©chantillon dâ€™activitÃ©s :

```text
stravaActivityId
distance
movingTime
elapsedTime
totalElevationGain
averageHeartrate
maxHeartrate
sufferScore
rawJson prÃ©sent ou absent
isDetailed
```

Aucun de ces champs ne doit changer Ã  cause de lâ€™enrichissement Garmin.

Lâ€™enrichissement Garmin doit ajouter des donnÃ©es dans :

```text
ExternalProviderRawData
ActivityProviderEnrichment
```

Il ne doit pas modifier les champs Strava historiques sauf nÃ©cessitÃ© explicitement documentÃ©e.

---

# 23. StratÃ©gie de commit

Avant commit :

```bash
git status
git diff --stat
git diff --check
```

VÃ©rifier quâ€™aucun fichier interdit nâ€™apparaÃ®t :

```bash
git status --short | grep -E 'node_modules|dist|generated|runtime|\.tmp|\.env|\.db|\.sqlite|\.log|\.pid'
```

Si la commande retourne des fichiers, les retirer du staging ou du suivi Git.

Commit recommandÃ© :

```bash
git add backend frontend deployment .ai .gitignore

git commit -m "feat: secure foundations and complete Garmin activity enrichment"

git push
```

Si le dÃ©pÃ´t utilise des branches :

```bash
git checkout -b chore/runsee-foundations-garmin-phase-k
# rÃ©aliser ou conserver les modifications
git push -u origin chore/runsee-foundations-garmin-phase-k
```

---

# 24. Message final attendu de lâ€™agent DEV

Ã€ la fin, produire une synthÃ¨se courte avec :

```text
1. DÃ©veloppements rÃ©alisÃ©s
2. Fichiers modifiÃ©s
3. Tests exÃ©cutÃ©s et rÃ©sultats
4. Points de vigilance restants
5. Commit GitHub / branche poussÃ©e
6. Ã‰tat CI/CD si disponible
```

Ne pas dÃ©clarer â€œterminÃ©â€ si :

- les tests nâ€™ont pas Ã©tÃ© lancÃ©s ;
- lâ€™enrichissement Garmin nâ€™est pas cÃ¢blÃ© jusquâ€™Ã  Activity Detail ;
- `.ai/*.md` nâ€™a pas Ã©tÃ© mis Ã  jour ;
- le commit/push nâ€™a pas Ã©tÃ© fait ;
- des secrets/runtime sont encore suivis par Git.

---

# 25. RÃ©sultat cible

Ã€ lâ€™issue du lot, RunNSee doit avoir :

- un dÃ©pÃ´t propre et non polluÃ© par les artefacts locaux ;
- une base SQLite cohÃ©rente avec le schÃ©ma Prisma ;
- une migration PostgreSQL plus complÃ¨te et contrÃ´lable ;
- un enrichissement Garmin activitÃ© fonctionnel de bout en bout ;
- une UI Activity Detail capable dâ€™afficher les mÃ©triques Garmin de sÃ©ance ;
- une logique `activityEnrichment` robuste sur les cas nÃ©gatifs, nuls et ambigus ;
- une documentation `.ai/` Ã  jour ;
- un commit GitHub dÃ©clenchant la CI/CD.
