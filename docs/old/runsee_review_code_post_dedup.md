# RunNSee — Review ciblée finale post-correctif Garmin/Strava

## 1. Verdict

La version est globalement dans la bonne direction :
- modèle multi-source en place ;
- `isMerged`, `mergedIntoActivityId`, `mergedAt` présents ;
- les lectures repository excluent `isMerged = false` ;
- `totalElevationLoss` est présent côté SQLite/PostgreSQL ;
- le job global utilise `manageJobLifecycle=false` pour éviter un success prématuré Strava ;
- les scripts de détection/réparation doublons existent ;
- le helper frontend `getActivityPublicId()` existe.

Mais je ne recommande pas encore de taguer cette version comme baseline stable sans une courte passe de correction/validation.

Points bloquants ou à arbitrer :
1. `.ai/git_status.txt` et `.ai/handoff_uncommitted.patch` indiquent des modifications non commitées.
2. Une route destructive `DELETE /providers/garmin/data` apparaît dans le patch non stabilisé.
3. Le statut `exact` du matching semble dépendre surtout de l’écart temporel, pas assez des écarts distance/durée.
4. `.ai/open_tasks.md` garde des tâches ouvertes alors que la recette serait terminée.
5. Les tests complets n’ont pas pu être rejoués dans l’environnement de review.

---

## 2. Points conformes

### Multi-source / soft-merge

Conforme :
- `Activity.sourceProvider`
- `Activity.sourceActivityId`
- `Activity.sourcePriority`
- `Activity.isMerged`
- `Activity.mergedIntoActivityId`
- `Activity.mergedAt`
- `ActivityProviderLink`
- `ActivityProviderEnrichment`

Le repository exclut les merged :

```js
isMerged: false
```

C’est le bon garde-fou pour éviter le double comptage dans :
- Activités ;
- Aujourd’hui ;
- Analytics ;
- Performance ;
- Objectifs.

### D- Trail

Conforme :
- `Activity.totalElevationLoss` existe ;
- Strava mappe `total_elevation_loss` / `elevation_loss` ;
- Garmin mappe `elevationLoss`.

### Job global

Conforme :
- `/sync/all` utilise un job `global_incremental`;
- Strava incremental est lancé avec `manageJobLifecycle=false`;
- Garmin recovery et Garmin activities sont traités ensuite.

### Frontend multi-source

Conforme partiellement :
- `getActivityPublicId(activity)` existe ;
- `ActivitiesTable` l’utilise ;
- cela réduit le risque `/activities/undefined`.

---

## 3. Anomalies restantes

## P0 — État Git / archive pas totalement clean

### Constat

`.ai/git_status.txt` indique encore :

```text
M backend/src/controllers/provider.controller.js
M backend/src/routes/provider.routes.js
M backend/src/services/providers/garminProvider.service.js
M backend/src/services/providers/garminRecoveryAutoSync.service.js
M backend/src/services/providers/garminRecoveryBackfill.service.js
M backend/src/services/providers/garminconnectBridge.service.js
M frontend/src/services/externalProvider.service.js
?? .ai/
?? backend/src/services/providers/loggerSanitization.js
```

### Risque

La review ne garantit pas que l’archive correspond exactement au dernier commit Git.

### Action

Avant baseline :

```bash
git status --short
git diff --stat
git diff --check
```

Puis :
- commit atomique des changements voulus ;
- ou revert des changements hors scope ;
- puis nouvelle archive via `git archive`.

---

## P0 — Route destructive Garmin à arbitrer

### Constat

Le patch ajoute :

```text
DELETE /providers/garmin/data
```

avec :
- `purgeGarminDataController`;
- `purgeGarminDataForUser`.

Même si la route est protégée et demande confirmation, elle est destructive.

### Risque

Suppression involontaire de :
- raw Garmin ;
- snapshots recovery ;
- enrichissements ;
- données utiles à la traçabilité.

### Décision attendue

Option A — Conserver :
- ajouter tests ;
- documenter ;
- vérifier que Strava n’est jamais supprimé ;
- vérifier que Garmin-only légitime n’est pas supprimé à tort ;
- journaliser le nombre d’éléments purgés ;
- ajouter dans `.ai/regression_risks.md`.

Option B — Retirer :
- revert route/controller/service/frontend associé.

Recommandation : ne pas inclure dans baseline stable sans tests et documentation.

---

## P1 — Matching `exact` potentiellement trop permissif

### Constat

Le statut semble être :

```js
status: deltaMs <= EXACT_WINDOW_MS ? "exact" : "probable"
```

Donc un match peut devenir `exact` uniquement parce que l’heure est proche, même si distance/durée sont plutôt au niveau `probable`.

### Risque

Soft-merge trop confiant de deux activités proches.

### Correction recommandée

Définir `exact` avec critères forts :

```text
delta <= 2 min
ET distanceRatio <= 1 à 2 %
ET durationRatio <= 2 à 3 %
ET D+ compatible si disponible
ET FC compatible si disponible
```

Sinon retourner `probable`.

---

## P1 — Enrichissement Garmin potentiellement non transféré si Strava a déjà un enrichment

### Constat

Dans le script de réparation, si l’activité Strava possède déjà un enrichment Garmin, l’enrichment de l’activité Garmin doublon n’est pas transféré.

### Risque

Une donnée Garmin plus complète peut rester attachée à l’activité merged, donc être invisible côté canonique.

### Action

Ajouter un contrôle post-merge :

```text
Garmin merged avec enrichment non transféré
Strava cible sans enrichment
Strava cible avec providerActivityId différent
```

---

## P1 — Documentation `.ai` pas alignée avec la recette terminée

### Constat

`.ai/open_tasks.md` garde ouverts :
- validation visuelle Activités ;
- sync post-correctif ;
- recette visuelle Aujourd’hui ;
- filtre Aujourd’hui.

### Action

Mettre à jour :
- tâches terminées si réellement validées ;
- tâches ouvertes si non réalisées ;
- commit/date de validation.

---

## P1 — Backfill historique Garmin non terminé

### Constat

`ProviderBackfillCursor` existe, mais l’orchestration complète du backfill 180 j/h reste ouverte.

### Action

Conserver explicitement en tâche ouverte :

```text
Backfill historique Garmin 180 j/h non encore implémenté fonctionnellement.
Doit réutiliser le matching UTC-first et les règles exact/probable/ambiguous.
```

---

## P2 — Nommage frontend encore `stravaActivityId`

### Constat

La route reste :

```text
/activities/:stravaActivityId
```

Le backend accepte un public id multi-source, donc ce n’est pas bloquant.

### Dette

Prévoir plus tard :

```text
/activities/:activityPublicId
```

---

## 4. Contrôles obligatoires avant tag

### Git

```bash
git status --short
git diff --stat
git diff --check
```

### Doublons

```bash
cd backend
node scripts/db/detect-provider-activity-duplicates.js
```

Attendu :

```text
duplicateCount = 0
```

### Tests backend

```bash
cd backend
npm ci
npm run prisma:generate
npx prisma validate
npm run prisma:pg:validate
npm run db:compare-schemas
npm test
node --check src/app.js
node --check src/server.js
```

### Tests frontend

```bash
cd frontend
npm ci
npm test -- --run
npm run build
```

### UI

Vérifier :
- Activités : 0 doublon visible ;
- Détail activité : Garmin enrichment conservé ;
- Aujourd’hui : pas de double comptage ;
- Analytics : pas de double comptage ;
- Performance : aucun lien vers merged ;
- Garmin-only réel : toujours visible.

---

## 5. Recommandation finale

Ne pas taguer immédiatement.

À faire avant baseline :
1. nettoyer l’état Git réel ;
2. arbitrer la route purge Garmin ;
3. durcir le statut `exact` du matching ;
4. vérifier les enrichissements post-merge ;
5. mettre à jour `.ai/open_tasks.md` ;
6. rejouer les tests complets ;
7. générer une nouvelle archive propre via `git archive`.

Une fois validé :

```bash
git tag runsee-stable-post-garmin-dedup
git push origin runsee-stable-post-garmin-dedup
```

---

## 6. Message attendu de CODEX / Claude Pro

```text
Actions réalisées :
- Git clean : oui/non
- Route purge Garmin : conservée/revertée + justification
- Matching exact durci : oui/non
- Enrichissements post-merge vérifiés : oui/non
- .ai/*.md mis à jour : oui/non

Tests :
- backend : ...
- frontend : ...
- build : ...
- dry-run doublons : ...

Résultat :
- baseline stable : oui/non
- tag créé : ...
- risques résiduels : ...
```
