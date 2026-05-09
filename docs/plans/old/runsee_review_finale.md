# RunNSee — Plan de review ciblée finale post-correctif Garmin/Strava

## 0. Objectif du plan

Ce document est destiné à CODEX / Claude Code Pro ou à une revue manuelle structurée.

Contexte :
- Les doublons Garmin/Strava ont été corrigés par soft-merge.
- La recette post-correctif a été réalisée.
- Les validations annoncées indiquent :
  - 29 doublons Garmin/Strava détectés ;
  - 29/29 soft-merged ;
  - 0 doublon restant détecté ;
  - 29 activités Garmin marquées `isMerged = true` ;
  - 923 activités Strava conservées actives ;
  - santé API/BDD OK ;
  - aucune suppression destructive.

Objectif :
1. réaliser une review ciblée du code réellement livré ;
2. vérifier que le correctif est maintenable et non régressif ;
3. figer une baseline stable avant tout nouveau chantier ;
4. mettre à jour les fichiers `.ai/*.md` ;
5. créer un tag Git de référence si tout est validé.

Ce plan ne doit pas ajouter de nouvelle fonctionnalité.

---

## 1. Règles impératives

### 1.1 Ne pas relancer de développement fonctionnel

Cette review doit rester limitée à :

- vérification ;
- correction mineure si anomalie détectée ;
- documentation ;
- baseline Git.

Ne pas ajouter :
- nouveau dashboard ;
- nouvelle métrique ;
- nouveau flux Garmin ;
- refonte UX ;
- nouveau modèle de prédiction.

### 1.2 Travailler uniquement sur une archive source propre

L’archive de review doit être générée à partir du dépôt Git, pas à partir d’un dossier de travail complet.

Méthode recommandée :

```bash
git archive --format=zip --output runsee-source-review.zip HEAD
```

L’archive ne doit pas contenir :

```text
node_modules/
dist/
.env
.env.*.local
*.db
*.log
runtime/
.tmp/
generated/
*.zip
```

### 1.3 Toute anomalie doit être documentée

Si une anomalie est trouvée :

- décrire le risque ;
- proposer la correction ;
- ne pas masquer l’erreur ;
- ne pas marquer le sujet comme terminé tant que non corrigé/testé.

---

# PARTIE A — Préparation de la review

---

## 2. Vérifier l’état Git

Exécuter :

```bash
git status --short
git diff --stat
git diff --check
```

Attendu :

```text
Pas de diff parasite.
Pas de .env.
Pas de .db.
Pas de node_modules.
Pas de dist.
Pas de logs.
Pas de runtime.
```

Si des fichiers parasites sont présents, corriger avant la review.

---

## 3. Vérifier le dernier commit

Exécuter :

```bash
git log --oneline -n 10
```

Vérifier que les commits liés au correctif sont présents, par exemple :

```text
fix(sync): harden strava garmin activity matching
fix(sync): prevent garmin fallback duplicates
fix(db): repair existing strava garmin duplicate activities
fix(activities): hide merged provider duplicates from list
docs(ai): update duplicate correction context
```

Les noms exacts peuvent varier, mais les sujets doivent être identifiables.

---

## 4. Générer l’archive source propre

Exécuter :

```bash
git archive --format=zip --output runsee-source-review.zip HEAD
```

Puis contrôler son contenu :

```bash
unzip -l runsee-source-review.zip
```

L’archive ne doit pas contenir :

```text
node_modules/
dist/
.env
*.db
*.log
runtime/
.tmp/
```

---

# PARTIE B — Review ciblée backend

---

## 5. Matching Strava/Garmin

### 5.1 Fichiers à auditer

Auditer les fichiers liés au matching provider, par exemple :

```text
backend/src/services/providers/activityProviderMatching.service.js
backend/src/services/providers/garminActivityEnrichment.service.js
backend/src/services/providers/multiSourceActivitySync.service.js
```

Adapter selon l’arborescence réelle.

### 5.2 Points de contrôle

Vérifier que la logique distingue :

```text
exact
probable
ambiguous
not_found
rejected
```

Vérifier que :

- `exact` lie Garmin à Strava ;
- `probable` lie Garmin à Strava ;
- `ambiguous` ne crée pas Garmin-only ;
- `not_found` peut créer Garmin-only ;
- `rejected` n’importe pas ou raw-only selon règle ;
- le nom d’activité n’est pas bloquant ;
- le décalage `startDateLocal` vs `startDate` UTC est corrigé ;
- les dates sont comparées dans une base temporelle cohérente.

### 5.3 Cas réel à vérifier

Les cas suivants doivent matcher en `exact` ou `probable` :

```text
06/05/2026 — 6.70 km — 35 min — 45 m — 144 bpm
05/05/2026 — 8.35 km — 53/54 min — 345 m — 151 bpm
03/05/2026 — 9.66 km — 58 min — 457 m — 174 bpm
```

### 5.4 Risques de régression

- seuils trop larges : fusion d’activités distinctes ;
- seuils trop stricts : recréation doublons ;
- timezone incohérente ;
- randonnée Garmin matchée à tort avec course Strava ;
- activité Garmin-only réelle masquée.

---

## 6. Soft-merge

### 6.1 Fichiers à auditer

Auditer les scripts et services de réparation :

```text
backend/scripts/db/detect-provider-activity-duplicates.js
backend/scripts/db/repair-provider-activity-duplicates.js
backend/src/repositories/activity.repository.js
backend/src/services/providers/*
```

Adapter selon l’arborescence réelle.

### 6.2 Points de contrôle

Vérifier :

- pas de suppression destructive ;
- `isMerged = true` sur les Garmin doublons ;
- `mergedIntoActivityId` renseigné ;
- `mergedAt` renseigné ;
- aucune activité Strava canonique marquée merged à tort ;
- transaction lors du repair ;
- dry-run par défaut ;
- `--apply` explicite pour modification ;
- refus des cas ambigus ;
- raw Garmin conservé ;
- enrichissement Garmin transféré ou accessible.

### 6.3 Contrôle BDD attendu

```text
29 activités Garmin isMerged=true
0 Garmin merged sans mergedIntoActivityId
0 Strava isMerged=true à tort
923 Strava actives
```

---

## 7. Sync globale `/sync/all`

### 7.1 Fichiers à auditer

```text
backend/src/controllers/sync.controller.js
backend/src/routes/sync.routes.js
backend/src/services/sync/syncJob.service.js
backend/src/services/sync/activitySync.service.js
backend/src/services/providers/multiSourceActivitySync.service.js
```

Adapter selon l’arborescence réelle.

### 7.2 Points de contrôle

Vérifier que :

- le job global reste `running` jusqu’à la fin réelle ;
- Strava incremental ne marque pas le job global `success` prématurément ;
- Garmin recovery est lancé si connecté ;
- Garmin activities recent est lancé si connecté ;
- erreurs provider isolées ;
- résumé par provider conservé ;
- aucun doublon recréé après sync globale.

### 7.3 Résultat attendu

Après sync globale :

```text
dry-run doublons = 0
job terminé proprement
aucune activité Garmin-only créée si match Strava exact/probable
```

---

## 8. Modèle multi-source

### 8.1 Fichiers à auditer

```text
backend/prisma/schema.prisma
backend/prisma-postgresql/schema.prisma
backend/src/repositories/activity.repository.js
```

### 8.2 Points de contrôle

Vérifier :

- `sourceProvider` ;
- `sourceActivityId` ;
- `sourcePriority` si présent ;
- `isMerged` ;
- `mergedIntoActivityId` ;
- `mergedAt` ;
- `ActivityProviderLink` ;
- `ActivityProviderEnrichment` ;
- contraintes uniques ;
- compatibilité SQLite/PostgreSQL.

### 8.3 Commandes

```bash
cd backend
npm run prisma:generate
npx prisma validate
npm run prisma:pg:validate
npm run db:compare-schemas
```

---

# PARTIE C — Review ciblée frontend

---

## 9. Liste Activités

### 9.1 Fichiers à auditer

```text
frontend/src/pages/ActivitiesPage.jsx
frontend/src/components/ActivitiesTable.jsx
frontend/src/services/activity.service.js
frontend/src/utils/activityLinks.js
```

Adapter selon l’arborescence réelle.

### 9.2 Points de contrôle

Vérifier :

- les activités `isMerged=true` ne sont pas affichées ;
- les activités fusionnées ne sont pas comptées dans le total ;
- pagination cohérente ;
- badge `Strava + Garmin` si activité Strava enrichie Garmin ;
- badge `Garmin` si Garmin-only réel ;
- badge `Garmin · Randonnée` si randonnée ;
- aucun doublon visible ;
- aucun lien `/activities/undefined`.

---

## 10. Liens activité multi-source

### 10.1 Points de contrôle

Vérifier que les composants ne construisent plus les routes uniquement avec :

```text
activity.stravaActivityId
```

Créer ou utiliser un helper unique :

```text
getActivityPublicId(activity)
```

ou équivalent.

### 10.2 Composants à auditer

```text
ActivityDetailPage
ActivitiesTable
TodayUsefulActivities
BestEffortsPanel
PerformancePage
RecentActivitiesCard si encore utilisé
ActivityRpeCard
```

### 10.3 Critères d’acceptation

```text
Strava cliquable
Strava + Garmin cliquable
Garmin-only cliquable
Garmin randonnée cliquable si affichée
aucun /activities/undefined
```

---

## 11. Aujourd’hui

### 11.1 Fichiers à auditer

```text
frontend/src/pages/DashboardPage.jsx
frontend/src/components/DashboardDecisionSummaryCard.jsx
frontend/src/components/TodayHeader.jsx
frontend/src/components/TodaySevenDaySummary.jsx
frontend/src/components/TodayUsefulActivities.jsx
frontend/src/hooks/useDashboardState.js
```

### 11.2 Points de contrôle

Vérifier :

- 4 blocs maximum ;
- filtre non persisté durablement ;
- chip `Lecture filtrée` affiché uniquement si choix utilisateur ;
- activités à relire max 3 ;
- aucune activité merged dans les activités utiles ;
- pas de double comptage volume/charge ;
- Trail uniquement contexte/vigilance/synthèse ;
- pas de scroll excessif desktop ;
- pas d’overflow mobile.

---

## 12. Analytics / Performance / Objectifs

### 12.1 Points de contrôle

Vérifier que les activités merged sont exclues de :

- volumes ;
- charge ;
- D+ ;
- D- ;
- spécificité trail ;
- records ;
- best efforts ;
- objectifs.

### 12.2 Randonnées Garmin

Vérifier :

- les randonnées Garmin ne polluent pas les records route ;
- elles peuvent contribuer aux volumes trail/randonnée si règle prévue ;
- leur source est claire.

---

# PARTIE D — Tests automatisés

---

## 13. Tests backend

Exécuter :

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

### 13.1 Tests à vérifier

- matching exact ;
- matching probable ;
- matching ambiguous ;
- non-création Garmin-only si exact/probable ;
- non-création Garmin-only si ambiguous ;
- création Garmin-only si not_found ;
- soft-merge ;
- dry-run doublons ;
- repair doublons ;
- sync globale ;
- D- Garmin si concerné ;
- randonnée Garmin.

---

## 14. Tests frontend

Exécuter :

```bash
cd frontend
npm ci
npm test -- --run
npm run build
```

### 14.1 Tests à vérifier

- liste activités sans merged ;
- badge source ;
- activité Garmin-only cliquable ;
- activité Strava + Garmin cliquable ;
- aucun lien undefined ;
- Aujourd’hui sans double comptage ;
- filtre temporaire ;
- Analytics sans merged ;
- Performance sans lien merged.

---

# PARTIE E — Recette manuelle post-review

---

## 15. Recette minimale

Vérifier dans l’interface :

```text
Activités :
- 0 doublon visible
- total cohérent
- badges source cohérents

Détail activité :
- activité anciennement doublonnée OK
- Garmin enrichment conservé

Aujourd’hui :
- volume cohérent
- activités utiles max 3
- pas de doublon
- filtre non persistant

Analytics :
- volume non double-compté

Performance :
- aucun record lié à une activité merged
- aucun lien cassé

Sync globale :
- lancer sync
- dry-run doublons après sync = 0
```

---

# PARTIE F — Documentation `.ai`

---

## 16. Fichiers à vérifier / mettre à jour

```text
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
.ai/codebase_map.md
```

### 16.1 current_context.md

Doit mentionner :

```text
29 doublons Garmin/Strava soft-merged
Cause racine : startDateLocal vs startDate UTC
0 doublon restant après dry-run
Sync globale post-correctif validée si réalisée
```

### 16.2 open_tasks.md

Doit distinguer :

```text
Terminé :
- correction matching
- soft-merge doublons
- recette dry-run 0

Ouvert si applicable :
- backfill historique Garmin complet
- refactor route stravaActivityId
```

### 16.3 regression_risks.md

Doit inclure :

```text
matching Garmin/Strava
soft-merge
ActivityProviderLink
job global /sync/all
liste activités
Aujourd’hui double comptage
Analytics/Performance merged
```

### 16.4 codebase_map.md

Doit inclure :

```text
service matching provider
scripts détection/réparation doublons
champs soft-merge
helper lien activité multi-source
```

---

# PARTIE G — Baseline stable

---

## 17. Créer un tag Git si tout est validé

Si la review est OK :

```bash
git tag runsee-stable-post-garmin-dedup
git push origin runsee-stable-post-garmin-dedup
```

Ou avec date :

```bash
git tag runsee-stable-YYYYMMDD-garmin-dedup
git push origin runsee-stable-YYYYMMDD-garmin-dedup
```

---

## 18. Définition de terminé

La baseline est validée uniquement si :

```text
0 doublon visible Activités
0 doublon dry-run avant sync
0 doublon dry-run après sync globale
29 Garmin merged auditables
923 Strava actives
Garmin enrichment conservé
Aujourd’hui sans double comptage
Analytics sans double comptage
Performance sans lien cassé
Garmin-only réel conservé
tests backend OK
tests frontend OK
build OK
archive source propre
.ai/*.md à jour
tag Git créé
```

---

## 19. Message final attendu de CODEX / Claude Pro

```text
Review ciblée post-correctif :

Git :
- status : ...
- archive source propre : oui/non

Backend :
- matching : ...
- soft-merge : ...
- sync globale : ...
- Prisma : ...

Frontend :
- Activités : ...
- Aujourd’hui : ...
- Analytics : ...
- Performance : ...

Tests :
- backend : ...
- frontend : ...
- build : ...

Documentation :
- .ai/current_context.md : ...
- .ai/open_tasks.md : ...
- .ai/regression_risks.md : ...
- .ai/codebase_map.md : ...

Baseline :
- tag créé : oui/non
- nom du tag : ...

Risques résiduels :
- ...
```
