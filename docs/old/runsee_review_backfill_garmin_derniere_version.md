# RunNSee — Review dernière version Backfill historique Garmin 180 j/h

## 0. Objectif

Archive analysée : `runsee-source-review.zip`.

Objectif de cette review :
- vérifier la cohérence de la dernière version avec le chantier Backfill historique Garmin 180 j/h ;
- identifier les risques de régression ;
- définir les prochaines étapes avant usage réel large ;
- préparer une base de travail exploitable par CODEX / Claude Code Pro.

Contexte :
- Baseline de départ : `runsee-stable-post-garmin-dedup`.
- Objectif du chantier : importer progressivement l’historique Garmin par fenêtres de 180 jours, avec poursuite automatique, sans recréer de doublons Strava/Garmin.

---

## 1. Verdict synthétique

La dernière version est globalement conforme au chantier demandé.

Les éléments principaux sont présents :

- service backend `garminHistoricalBackfill.service.js` ;
- endpoints :
  - `GET /providers/garmin/activities/backfill/status`
  - `POST /providers/garmin/activities/backfill/start`
  - `POST /providers/garmin/activities/backfill/pause`
  - `POST /providers/garmin/activities/backfill/resume`
  - `POST /providers/garmin/activities/backfill/run-window`
- scheduler automatique au démarrage backend ;
- curseur `ProviderBackfillCursor` ;
- fenêtre de 180 jours configurable ;
- intervalle minimal configurable ;
- contrôle anti-doublon après fenêtre ;
- UI Admin `GarminActivityBackfillCard` ;
- tests unitaires basiques sur le calcul des fenêtres ;
- documentation `.ai` mise à jour.

Cependant, je ne recommande pas encore de lancer un backfill historique complet sans une courte passe de sécurisation.

Points critiques à traiter ou valider avant usage réel :

1. l’archive contient encore des traces `.ai/git_status.txt` indiquant des modifications non commitées ;
2. les compteurs détaillés `matched / Garmin-only / ambiguous` ne semblent pas persistés dans le curseur ;
3. le contrôle anti-doublon après fenêtre détecte les doublons mais ne rollback pas automatiquement les écritures déjà faites ;
4. l’endpoint `run-window` peut forcer une fenêtre via `force`, ce qui peut contourner l’intervalle de sécurité ;
5. les tests sont encore trop faibles : ils couvrent le calcul de fenêtre, mais pas le workflow backfill réel ;
6. la route destructive `DELETE /providers/garmin/data` reste présente et doit rester strictement encadrée.

---

# 2. Points conformes

## 2.1 Service de backfill historique Garmin

Le service suivant existe :

```text
backend/src/services/providers/garminHistoricalBackfill.service.js
```

Il couvre bien les responsabilités principales :

- création/récupération du curseur ;
- démarrage manuel ;
- pause ;
- reprise ;
- exécution d’une fenêtre ;
- scheduler automatique ;
- arrêt en erreur contrôlée ;
- détection de doublons après fenêtre.

## 2.2 Fenêtrage 180 jours

Fonctions présentes :

```js
calculateGarminBackfillWindow()
calculatePreviousGarminWindowEndDate()
```

Tests présents :

```text
garminHistoricalBackfill.service.test.js
```

Cas validés :

- première fenêtre de 180 jours ;
- fenêtre précédente calculée à partir du jour avant le début de la fenêtre précédente.

C’est conforme au plan.

## 2.3 Paramètres environnement

Les paramètres sont présents :

```text
GARMIN_BACKFILL_WINDOW_DAYS
GARMIN_BACKFILL_MIN_INTERVAL_MINUTES
GARMIN_BACKFILL_MAX_WINDOWS_PER_RUN
GARMIN_BACKFILL_SCAN_INTERVAL_MINUTES
GARMIN_BACKFILL_MIN_DATE
GARMIN_ACTIVITY_SYNC_RECENT_DAYS
```

Le code borne notamment :

```text
windowDays >= 30
minInterval >= 15 min
maxWindowsPerRun >= 1
scanInterval >= 5 min
```

La valeur cible 180 jours / 60 minutes est donc configurable.

## 2.4 Scheduler automatique

Le backend démarre le scheduler :

```js
startAutoGarminActivityBackfillScheduler();
```

dans :

```text
backend/src/server.js
```

Le scheduler :
- lance un sweep au démarrage ;
- relance périodiquement ;
- respecte `garminBackfillMaxWindowsPerRun` ;
- respecte `isWindowDue`.

C’est conforme à l’objectif : lancement manuel, puis poursuite automatique.

## 2.5 Réutilisation du flux d’enrichissement Garmin

Le backfill appelle :

```js
enrichGarminActivitiesForUser(appUserId, {
  startDate,
  endDate,
  allowGarminOnly: true,
  force: true
})
```

Cela réutilise le flux existant :

- fetch Garmin ;
- raw Garmin ;
- normalisation ;
- matching Strava/Garmin ;
- enrichissement Strava si match ;
- Garmin-only si `not_found`.

C’est cohérent avec la règle de non-régression.

## 2.6 Contrôle anti-doublon post-fenêtre

Après chaque fenêtre, le service appelle :

```js
detectProviderActivityDuplicates({ appUserId, minScore: 70 })
```

Si des doublons sont détectés :

```text
status = error
lastErrorCode = PROVIDER_DUPLICATE_DETECTED
arrêt automatique
```

C’est un bon garde-fou.

## 2.7 UI Admin

Le composant suivant existe :

```text
frontend/src/components/GarminActivityBackfillCard.jsx
```

Il affiche :

- statut ;
- fenêtres traitées ;
- activités Garmin lues ;
- matchées Strava ;
- Garmin-only créées ;
- ambiguës ignorées ;
- dernière tranche ;
- prochaine tranche ;
- prochain lancement ;
- dernier succès ;
- boutons lancer / pause / reprendre.

C’est conforme au besoin UX.

---

# 3. Points de vigilance / anomalies

## P0 — État Git non clean dans les fichiers `.ai`

### Constat

Les fichiers `.ai/git_status.txt` et `.ai/handoff_status.txt` indiquent encore :

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

Même si le dépôt réel est peut-être propre, la documentation embarquée indique le contraire.

Cela peut induire CODEX / Claude en erreur.

### Action attendue

Avant validation finale :

```bash
git status --short
git diff --stat
git diff --check
```

Puis :

- si le repo est propre : mettre à jour ou supprimer les fichiers `.ai/git_status.txt`, `.ai/handoff_status.txt`, `.ai/handoff_uncommitted.patch` ;
- si le repo n’est pas propre : commit ou revert des changements.

### Priorité

P0 documentaire / fiabilité agent.

---

## P0 — Le contrôle anti-doublon post-fenêtre ne rollback pas les écritures

### Constat

Dans `runGarminActivityBackfillWindowForUser`, le flux est :

```text
1. enrichGarminActivitiesForUser écrit en base
2. detectProviderActivityDuplicates détecte les doublons
3. si doublon : status = error
```

### Risque

Si le garde-fou détecte un doublon après la fenêtre, les écritures problématiques ont déjà eu lieu.

Le service arrête bien le backfill, mais peut laisser une ou plusieurs activités Garmin-only doublons visibles jusqu’à correction.

### Correction recommandée

Deux options possibles.

#### Option A — Transaction / rollback

Après fetch Garmin, faire les écritures de la fenêtre dans une transaction.

Si `detectProviderActivityDuplicates` détecte un doublon, rollback de la transaction.

Point d’attention : l’appel externe Garmin doit rester hors transaction.

#### Option B — Préflight dry-run avant écriture

Faire un passage dry-run sur les activités Garmin de la fenêtre :

```text
fetch Garmin
normaliser
matcher
si risque doublon non maîtrisé -> stop avant écriture
sinon écrire
```

Puis garder le dry-run post-écriture comme second garde-fou.

#### Option C — Auto-soft-merge immédiat

Si un doublon exact/probable est détecté après fenêtre, appliquer directement le soft-merge.

Moins recommandé pour une première version du backfill historique.

### Recommandation

Option B d’abord, puis post-check.

Critère :

```text
Le backfill ne doit pas laisser de doublon visible même si le garde-fou se déclenche.
```

### Priorité

P0 avant backfill historique massif.

---

## P1 — Les compteurs détaillés ne semblent pas persistés

### Constat

`ProviderBackfillCursor` stocke :

```text
totalWindowsProcessed
totalActivitiesImported
```

Mais ne stocke pas :

```text
totalMatched
totalGarminOnlyCreated
totalAmbiguous
totalRejected
lastWindowResult
```

`buildPublicCursor` affiche ces compteurs via `extras`, donc après un simple `GET status`, les compteurs détaillés peuvent revenir à 0.

### Risque

L’UI Admin peut afficher :

```text
fenêtres traitées : 3
activités Garmin lues : 120
matchées Strava : 0
Garmin-only créées : 0
ambiguës : 0
```

alors que les compteurs étaient réels au moment de la fenêtre.

Cela rend le suivi utilisateur trompeur.

### Correction recommandée

Ajouter au modèle ou à une table de log :

Option A — champs cumulés dans `ProviderBackfillCursor` :

```text
totalMatched
totalGarminOnlyCreated
totalAmbiguous
totalRejected
lastWindowResultJson
lastWindowStartDate
lastWindowEndDate
```

Option B — table `ProviderBackfillWindowLog` :

```text
id
cursorId
appUserId
provider
resourceType
windowStartDate
windowEndDate
status
fetchedCount
rawUpsertedCount
matchedCount
garminOnlyCreatedCount
garminOnlyUpdatedCount
ambiguousCount
rejectedCount
duplicateCountAfterWindow
startedAt
endedAt
errorCode
errorMessage
```

### Recommandation

Option B est plus robuste si tu veux suivre l’historique des fenêtres.

Pour une correction rapide, Option A suffit.

### Priorité

P1 avant usage réel prolongé.

---

## P1 — Endpoint `run-window` avec `force`

### Constat

L’endpoint :

```text
POST /providers/garmin/activities/backfill/run-window
```

appelle :

```js
force: Boolean(req.body?.force)
```

Donc un utilisateur authentifié peut potentiellement forcer une fenêtre sans respecter l’intervalle minimal.

### Risque

- contourne la règle 1 fenêtre / heure ;
- peut sursolliciter Garmin ;
- peut déclencher plusieurs fenêtres manuelles trop rapidement.

### Correction recommandée

Réserver `force` à un mode admin/dev explicite.

Options :

1. ignorer `force` côté contrôleur ;
2. autoriser `force` seulement si variable env :

```text
GARMIN_BACKFILL_ALLOW_FORCE_RUN=true
```

3. supprimer l’endpoint `run-window` de l’UI et ne le garder que pour dev local ;
4. journaliser tout usage de `force`.

### Priorité

P1.

---

## P1 — Tests backfill insuffisants

### Constat

Les tests actuels couvrent principalement :

- calcul première fenêtre ;
- calcul fenêtre précédente.

Ils ne couvrent pas encore :

- start ;
- pause ;
- resume ;
- scheduler ;
- erreur Garmin ;
- ambiguous ;
- not_found ;
- création Garmin-only ;
- arrêt si doublon détecté ;
- statut `error`.

### Risque

Le cœur fonctionnel du backfill peut régresser sans test.

### Tests à ajouter

Backend :

```text
start refuse si Garmin non connecté
start passe idle -> running
start ne relance pas si running
pause passe running -> paused
resume passe paused/error -> running
run-window respecte min interval
run-window force non autorisé par défaut
ambiguous ne crée pas Garmin-only
not_found crée Garmin-only
duplicateReport > 0 arrête le backfill
erreur Garmin laisse le curseur non avancé
scheduler ne lance qu'une fenêtre due
```

### Priorité

P1 avant usage réel prolongé.

---

## P1 — Completion sans `GARMIN_BACKFILL_MIN_DATE`

### Constat

Si `GARMIN_BACKFILL_MIN_DATE` n’est pas configuré, le code utilise une règle de cutoff :

```text
10 ans d’historique
```

et complète si une fenêtre vide est rencontrée au-delà de ce cutoff.

### Risque

- backfill long si l’historique Garmin est court ;
- ou arrêt avant des activités plus anciennes que 10 ans.

### Recommandation

Définir explicitement :

```text
GARMIN_BACKFILL_MIN_DATE=YYYY-MM-DD
```

Exemple :

```text
GARMIN_BACKFILL_MIN_DATE=2015-01-01
```

ou date réaliste selon ton historique Garmin.

### Priorité

P1 opérationnel.

---

## P2 — Lock en mémoire uniquement

### Constat

La concurrence est protégée par :

```js
const runningWindows = new Set();
```

### Risque

C’est suffisant pour une instance backend locale ou VM unique.

Mais en multi-instance, deux process pourraient lancer deux fenêtres.

### Recommandation

Documenter :

```text
Backfill Garmin historique supporté uniquement en mono-instance backend.
```

Si futur multi-instance :

- lock DB ;
- champ `lockedAt`;
- transaction de claim.

### Priorité

P2 tant que l’hébergement reste local / VM unique.

---

## P2 — Route destructive Garmin toujours présente

### Constat

La route existe :

```text
DELETE /providers/garmin/data
```

Elle est exposée en Admin avec confirmation UI.

### Risque

Elle peut supprimer les données Garmin non officielles.

### Recommandation

La conserver seulement comme action admin exceptionnelle.

À vérifier :

- pas utilisée par le backfill ;
- confirmation claire ;
- documentation risques ;
- pas de suppression des activités Strava ;
- pas d’usage pour résoudre les doublons.

### Priorité

P2 si déjà acceptée, P1 si non documentée.

---

# 4. Prochaines étapes recommandées

## Étape 1 — Nettoyer l’état documentaire `.ai`

Objectif : éviter que les agents IA repartent d’un faux état “non commité”.

À faire :

```bash
git status --short
git diff --stat
git diff --check
```

Puis mettre à jour :

```text
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
.ai/codebase_map.md
.ai/git_status.txt
.ai/handoff_status.txt
```

Si les fichiers `handoff_*` sont temporaires, les déplacer dans `docs/old/` ou les supprimer selon convention.

---

## Étape 2 — Corriger le risque post-check sans rollback

Avant de lancer un vrai backfill massif, ajouter un garde-fou qui empêche de laisser des doublons visibles si le contrôle post-fenêtre détecte un problème.

Recommandation minimale :

```text
Préflight dry-run de la fenêtre avant écriture.
Si risque détecté, ne rien écrire et status=error.
```

---

## Étape 3 — Persister les compteurs détaillés

Choisir l’une des deux options :

### Option rapide

Ajouter dans `ProviderBackfillCursor` :

```text
totalMatched
totalGarminOnlyCreated
totalAmbiguous
totalRejected
lastWindowResultJson
```

### Option robuste

Créer :

```text
ProviderBackfillWindowLog
```

Recommandation : Option robuste si tu veux auditer l’historique.

---

## Étape 4 — Verrouiller ou encadrer `run-window force`

À faire :

- désactiver `force` par défaut ;
- ou l’autoriser uniquement via env admin ;
- ou retirer l’endpoint de l’usage UI.

Critère :

```text
Un utilisateur authentifié ne peut pas contourner par défaut l’intervalle 1h.
```

---

## Étape 5 — Ajouter les tests backend manquants

Priorité tests :

1. duplicateReport > 0 arrête sans laisser de fenêtre validée ;
2. ambiguous ne crée pas Garmin-only ;
3. not_found crée Garmin-only ;
4. start/pause/resume ;
5. scheduler respecte l’intervalle ;
6. force interdit par défaut.

---

## Étape 6 — Recette réelle contrôlée

Une fois les points précédents corrigés :

1. vérifier dry-run doublons = 0 ;
2. lancer le backfill depuis Admin ;
3. vérifier une seule fenêtre immédiate ;
4. vérifier les compteurs ;
5. vérifier dry-run doublons = 0 ;
6. pause ;
7. resume ;
8. attendre la reprise automatique ;
9. vérifier seconde fenêtre ;
10. vérifier dry-run doublons = 0.

---

# 5. Critères de validation avant usage prolongé

Le chantier backfill est validé uniquement si :

```text
repo clean
.ai aligné
start fonctionne
status fonctionne
pause fonctionne
resume fonctionne
scheduler fonctionne
une seule fenêtre immédiate
reprise automatique après délai
pas de contournement force non autorisé
compteurs fiables après refresh
dry-run doublons = 0 après chaque fenêtre
ambiguous ne crée pas Garmin-only
not_found crée Garmin-only
aucune donnée Garmin supprimée
tests backend OK
tests frontend OK
build OK
```

---

# 6. Recommandation finale

Ne lance pas encore tout l’historique Garmin en continu sans sécuriser les 4 points suivants :

1. **préflight ou rollback si doublon détecté après fenêtre** ;
2. **persistance des compteurs détaillés** ;
3. **encadrement de `run-window force`** ;
4. **tests backend de workflow backfill**.

Après ces corrections, le chantier pourra passer en recette réelle contrôlée.

---

# 7. Message attendu de CODEX / Claude Pro

```text
Correctifs backfill réalisés :
- .ai aligné : ...
- préflight/rollback doublon : ...
- compteurs persistés : ...
- force run-window encadré : ...
- tests backend ajoutés : ...

Recette :
- start : ...
- première fenêtre : ...
- dry-run doublons après fenêtre : ...
- pause : ...
- resume : ...
- reprise automatique : ...
- seconde fenêtre : ...

Tests :
- backend : ...
- frontend : ...
- build : ...

Conclusion :
- prêt pour backfill historique réel : oui/non
- risques résiduels : ...
```
