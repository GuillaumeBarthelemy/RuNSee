# RunNSee — Analyse actualisée dernière archive et plan adapté

## 0. Objectif

Archive analysée : `runsee-source-review.zip`.

Objectif :
- revoir l’analyse précédente à partir de la nouvelle archive ;
- identifier ce qui a changé ;
- éviter de proposer un chantier déjà réalisé ;
- adapter le plan de suite à l’état réel du code ;
- inclure la phase de sécurisation post-chantier.

---

## 1. Correction de l’analyse précédente

L’analyse précédente indiquait que le cadre qualité permanent et la réorganisation `/docs` / `.ai` n’étaient pas encore présents.

Avec la nouvelle archive, ce point est corrigé.

La structure qualité est maintenant bien en place :

```text
docs/quality/RUNSEE_QUALITY_GATE.md
docs/quality/RUNSEE_TEST_LOG.md
docs/quality/RUNSEE_VALIDATION_MATRIX.md
docs/quality/RUNSEE_RELEASE_CHECKLIST.md
docs/README.md
.ai/README.md
docs/architecture/
docs/decisions/
docs/releases/
docs/plans/old/
```

Donc le prochain chantier ne doit plus être :

```text
Mettre en place le socle qualité permanent
```

car il est désormais implémenté.

Le plan doit maintenant se concentrer sur :

```text
1. validation finale du backfill Garmin réel ;
2. mise à jour du journal qualité ;
3. décision Go / No-Go pour poursuite automatique ;
4. correction des dettes restantes réellement utiles ;
5. préparation du prochain chantier produit.
```

---

# PARTIE A — Analyse de l’état actuel

---

## 2. Points désormais conformes

### 2.1 Structure documentaire

La nouvelle archive contient bien :

```text
docs/quality/
docs/architecture/
docs/decisions/
docs/releases/
docs/plans/old/
.ai/README.md
docs/README.md
```

C’est conforme à l’organisation cible.

### 2.2 Quality Gate permanent

Le fichier suivant existe :

```text
docs/quality/RUNSEE_QUALITY_GATE.md
```

Il définit bien :

- contrôles Git ;
- tests backend ;
- tests frontend ;
- archive de review ;
- alignement `.ai` ;
- non-régressions métier permanentes.

C’est conforme à la demande.

### 2.3 Journal de recette

Le fichier suivant existe :

```text
docs/quality/RUNSEE_TEST_LOG.md
```

Il contient déjà une entrée :

```text
2026-05-09 - Backfill Garmin, fenêtres 1 et 2
```

Avec :

- tests techniques ;
- backend `18/18` ;
- frontend `148/148` ;
- build Vite OK ;
- CI/CD VM OK ;
- deux fenêtres Garmin réelles ;
- dry-run doublons = 0 ;
- archive de review générée.

C’est une très bonne évolution.

### 2.4 Matrice de validation

Le fichier suivant existe :

```text
docs/quality/RUNSEE_VALIDATION_MATRIX.md
```

Il distingue correctement :

- `OK technique` ;
- `Partiel` ;
- `À vérifier`.

C’est exactement ce qu’il fallait pour arrêter de refaire les mêmes plans.

### 2.5 `.ai` nettoyé

La nouvelle archive ne contient plus les anciens fichiers parasites :

```text
.ai/git_status.txt
.ai/handoff_status.txt
.ai/handoff_uncommitted.patch
.ai/handoff_diff_stat.txt
.ai/handoff_files.txt
```

Le dossier `.ai` est maintenant recentré sur :

```text
.ai/README.md
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
.ai/codebase_map.md
.ai/handoff.md
```

C’est conforme.

### 2.6 Archive source propre

L’archive ne contient pas d’artefacts visibles de type :

```text
node_modules/
dist/
.env
*.db
*.log
runtime/
.tmp/
```

C’est conforme au Quality Gate.

---

## 3. Backfill Garmin : état réel

### 3.1 Points présents

Le service principal existe :

```text
backend/src/services/providers/garminHistoricalBackfill.service.js
```

Il contient :

- curseur `ProviderBackfillCursor` ;
- logs persistants `ProviderBackfillWindowLog` ;
- calcul de fenêtre ;
- scheduler automatique ;
- start / pause / resume ;
- endpoint run-window ;
- contrôle anti-doublon avant fenêtre ;
- dry-run Garmin avant écriture réelle ;
- contrôle anti-doublon après fenêtre ;
- soft-merge automatique post-fenêtre si doublons détectés ;
- arrêt en erreur si le résiduel n’est pas nul ;
- compteurs persistés.

### 3.2 Force run-window

Le force run est encadré :

```text
GARMIN_BACKFILL_ALLOW_FORCE_RUN=false par défaut
```

La fonction :

```text
resolveGarminBackfillForceRun()
```

refuse `force` si l’environnement ne l’autorise pas.

C’est conforme.

### 3.3 Tests existants

Le fichier :

```text
garminHistoricalBackfill.service.test.js
```

couvre :

- première fenêtre 180 jours ;
- fenêtre précédente ;
- refus du force-run si non autorisé.

C’est utile, mais encore minimal.

---

# PARTIE B — Ce qui reste vraiment à faire

---

## 4. P0 — Validation visuelle post-fenêtre 2

### Constat

`RUNSEE_TEST_LOG.md` indique :

```text
UI — Validation visuelle après fenêtre 2 — À compléter
```

`RUNSEE_VALIDATION_MATRIX.md` indique également :

```text
Backfill Garmin : Partiel
Aujourd’hui : À vérifier
Activités : À vérifier
Analytics : À vérifier
Objectifs : À vérifier
```

Donc l’état réel est clair :

```text
La validation technique est bonne.
La validation UI/métier post-fenêtre 2 reste à faire.
```

### Action attendue

Valider en session authentifiée :

```text
Activités
Aujourd’hui
Analytics
Performance
Objectifs si utilisés
```

### Critères

```text
0 doublon visible
0 double comptage volume / charge / D+ / D-
aucun lien /activities/undefined
aucune activité merged visible
Garmin-only réel conservé
randonnées Garmin non injectées dans les records route
```

---

## 5. P0 — Décision Go / No-Go pour poursuite automatique

Le journal indique :

```text
GO technique backfill fenêtres 1 et 2.
GO poursuite automatique uniquement après validation visuelle UI.
```

Donc la prochaine vraie décision est :

```text
Autorise-t-on le backfill à poursuivre automatiquement jusqu’à GARMIN_BACKFILL_MIN_DATE ?
```

### Go si

```text
validation UI post-fenêtre 2 OK
dry-run doublons = 0
aucun double comptage visible
compteurs cohérents
aucune erreur Garmin
```

### No-Go si

```text
doublon visible
double comptage Aujourd’hui ou Analytics
activité légitime masquée
lien cassé
compteur incohérent
status error
```

---

## 6. P1 — Nettoyage des tâches ouvertes anciennes

`.ai/open_tasks.md` est beaucoup mieux structuré, mais contient encore plusieurs tâches anciennes ouvertes.

Exemples :

```text
Tester POST /sync/all avec Strava seul, Garmin seul, puis les deux connectés.
Vérifier visuellement la sidebar provider sur mobile et écran étroit.
Ouvrir une activité route plate : l’onglet Trail ne doit pas apparaître.
Créer un objectif trail et vérifier sa persistance en DB.
Créer le tag stable runsee-stable-YYYYMMDD-garmin-dedup.
```

Certaines peuvent être encore pertinentes, mais elles ne doivent pas bloquer le chantier backfill si elles sont hors scope.

### Action attendue

Dans `.ai/open_tasks.md`, créer deux sections claires :

```text
Tâches actives bloquantes
Dette / hors scope non bloquant
```

Mettre en bloquant uniquement :

```text
Validation visuelle post-fenêtre 2
Décision Go / No-Go poursuite automatique
```

Le reste peut être classé en dette, si non critique.

---

## 7. P1 — Tests backend workflow backfill

Les tests backfill sont encore modestes.

Ajouter progressivement :

```text
start idle -> running
start refuse si already running
pause running -> paused
resume paused -> running
run-window refuse si intervalle non dû
duplicate preflight bloque
duplicate post-window résiduel bloque
scheduler respecte maxWindowsPerRun
scheduler respecte minInterval
```

Ce n’est pas forcément bloquant pour valider la fenêtre 2, mais c’est recommandé avant de considérer le backfill comme industrialisé.

---

# PARTIE C — Plan adapté

---

## 8. Lot 1 — Validation UI post-fenêtre 2

### Objectif

Valider que les deux fenêtres Garmin réelles n’ont pas créé de régression visible.

### Actions

#### Activités

Vérifier :

```text
0 doublon Garmin/Strava visible
aucune activité isMerged visible
badge source cohérent
Garmin-only réel visible
pagination cohérente
aucun lien /activities/undefined
```

#### Aujourd’hui

Vérifier :

```text
volume 7 jours cohérent
charge non doublonnée
D+ / D- cohérents
activités à relire sans doublon
filtre non persisté durablement
Trail uniquement contexte / vigilance / synthèse
```

#### Analytics

Vérifier :

```text
volume hebdo non doublonné
D+ / D- non doublonnés
spécificité trail cohérente
randonnées Garmin non injectées dans records route
```

#### Performance

Vérifier :

```text
records non liés à une activité merged
best efforts cohérents
aucun lien cassé
```

#### Objectifs

Si objectif actif :

```text
préparation non surévaluée par doublons
volume / D+ / D- cohérents
```

### Sortie attendue

Mettre à jour :

```text
docs/quality/RUNSEE_TEST_LOG.md
docs/quality/RUNSEE_VALIDATION_MATRIX.md
.ai/open_tasks.md
```

---

## 9. Lot 2 — Dry-run doublons post-validation UI

### Commande

```bash
cd backend
node scripts/db/detect-provider-activity-duplicates.js
```

### Attendu

```text
duplicateCount = 0
```

### Si KO

Stopper immédiatement le backfill et ne pas autoriser la poursuite automatique.

---

## 10. Lot 3 — Décision Go / No-Go poursuite automatique

### Go

Autoriser la poursuite automatique si :

```text
fenêtres 1 et 2 OK
dry-run doublons = 0
validation UI OK
aucun status error
compteurs cohérents
```

### No-Go

Mettre le backfill en pause si :

```text
doublon visible
dry-run > 0
double comptage UI
activité légitime masquée
erreur Garmin
```

### Trace obligatoire

La décision doit être consignée dans :

```text
docs/quality/RUNSEE_TEST_LOG.md
docs/quality/RUNSEE_VALIDATION_MATRIX.md
.ai/current_context.md
.ai/open_tasks.md
```

---

## 11. Lot 4 — Réorganisation fine de `.ai/open_tasks.md`

### Objectif

Éviter que les anciennes tâches ouvertes soient interprétées comme bloquantes.

### Action

Structurer le fichier ainsi :

```text
## Actif / bloquant

- Validation UI post-fenêtre 2
- Décision Go / No-Go poursuite automatique

## Actif / non bloquant

- Tests workflow backfill complémentaires
- Recette Strava seul / Garmin seul si non refaite récemment

## Dette / hors scope

- Refactor route activityPublicId
- Tests backend providers plus larges
- Mobile sidebar
- Objectifs trail si non prioritaire
```

### Critère

Après ce lot, CODEX / Claude doit pouvoir comprendre immédiatement :

```text
ce qui bloque maintenant
ce qui est juste une dette
ce qui est terminé
```

---

## 12. Lot 5 — Tests backend workflow backfill complémentaires

### Objectif

Renforcer la robustesse.

### Tests recommandés

```text
start idle -> running
start refuse si running
pause running -> paused
resume paused -> running
force refusé si env false
duplicate preflight bloque
duplicate post-window résiduel bloque
scheduler respecte minInterval
scheduler respecte maxWindowsPerRun
```

### Commit recommandé

```text
test(garmin): cover historical backfill workflow
```

Ce lot peut être fait avant ou après Go de poursuite automatique, mais il doit être fait avant un tag “backfill fully stable”.

---

# PARTIE D — Prochain chantier produit après validation

---

## 13. Recommandation

Une fois la validation UI post-fenêtre 2 terminée et la poursuite automatique autorisée, le prochain vrai chantier produit devrait être :

```text
RunNSee — Score de confiance / qualité des analyses
```

Avant de créer un module Coach ou d’ajouter des prédictions, RunNSee doit indiquer :

```text
Peut-on faire confiance à cette analyse ?
```

### Pourquoi ce chantier est prioritaire

RunNSee a maintenant beaucoup de données :

```text
Strava
Garmin
recovery
rawJson
splits
trail
backfill
objectifs
charge
performance
```

Mais toutes les analyses ne reposent pas sur la même qualité de données.

Exemples :

```text
Trail sans D- fiable -> confiance moyenne/faible
Performance sans best efforts récents -> confiance moyenne
Aujourd’hui sans sommeil/HRV récent -> confiance prudente
Garmin-only sans splits -> confiance partielle
```

### Sortie attendue

Créer un modèle transversal :

```text
AnalysisConfidence
```

avec :

```text
high
medium
low
insufficient
```

et des raisons :

```text
FC disponible
Garmin recovery récent
D+ / D- disponible
splits disponibles
période suffisante
activité merged exclue
données récentes
```

### Pages concernées

```text
Aujourd’hui
Analytics
Performance
Objectifs
Trail
Détail activité
```

---

# PARTIE E — Phase finale — Sécurisation post-chantier

---

## 14. Référentiel qualité à utiliser

Ce chantier doit s’appuyer sur :

```text
docs/quality/RUNSEE_QUALITY_GATE.md
docs/quality/RUNSEE_TEST_LOG.md
docs/quality/RUNSEE_VALIDATION_MATRIX.md
docs/quality/RUNSEE_RELEASE_CHECKLIST.md si tag
```

---

## 15. Repo clean

Exécuter :

```bash
git status --short
git diff --stat
git diff --check
```

Attendu :

```text
repo propre
aucun fichier parasite
aucun secret
aucun artefact runtime
```

---

## 16. Tests backend

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

---

## 17. Tests frontend

Exécuter :

```bash
cd frontend
npm ci
npm test -- --run
npm run build
```

---

## 18. Recette contrôlée

Valider :

```text
Activités : 0 doublon
Aujourd’hui : pas de double comptage
Analytics : pas de double comptage
Performance : aucun lien merged/undefined
Garmin-only réel : visible
Backfill Admin : compteurs cohérents
```

---

## 19. Mise à jour qualité

Mettre à jour :

```text
docs/quality/RUNSEE_TEST_LOG.md
docs/quality/RUNSEE_VALIDATION_MATRIX.md
docs/quality/RUNSEE_RELEASE_CHECKLIST.md si tag
```

---

## 20. Mise à jour `.ai`

Mettre à jour :

```text
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
.ai/codebase_map.md
```

---

## 21. Archive source review obligatoire

Générer depuis Git :

```bash
git archive --format=zip --output runsee-source-review.zip HEAD
```

ou via :

```powershell
powershell -ExecutionPolicy Bypass -File deployment\scripts\Export-RunSeeSourceArchive.ps1 -OutputPath C:\Services\RuNSee\runsee-source-review.zip
```

L’archive ne doit contenir aucun artefact interdit.

Ajouter au journal :

```text
nom archive
commit
commande
contenu contrôlé
artefacts interdits : non
```

---

## 22. Baseline / tag si applicable

Créer un tag uniquement si :

```text
validation UI OK
dry-run doublons = 0
tests OK
repo clean
docs quality alignés
.ai aligné
archive review propre
```

Nom proposé si le backfill est autorisé à poursuivre :

```bash
git tag runsee-stable-garmin-backfill-validated
git push origin runsee-stable-garmin-backfill-validated
```

Ne pas taguer si seule une validation partielle est réalisée.

---

# PARTIE F — Message final attendu de CODEX / Claude Code Pro

```text
Suite backfill Garmin — validation finale

Validation UI :
- Activités : ...
- Aujourd’hui : ...
- Analytics : ...
- Performance : ...
- Objectifs : ...

Dry-run :
- duplicateCount : ...

Go / No-Go :
- poursuite automatique : oui/non
- justification : ...

Documentation qualité :
- RUNSEE_TEST_LOG.md : ...
- RUNSEE_VALIDATION_MATRIX.md : ...
- RUNSEE_RELEASE_CHECKLIST.md : ...

.ai :
- current_context.md : ...
- open_tasks.md : ...
- regression_risks.md : ...
- codebase_map.md : ...

Tests :
- backend : ...
- frontend : ...
- build : ...

Archive review :
- générée : ...
- nom : ...
- commit : ...
- contenu contrôlé : ...

Tag :
- créé : oui/non
- nom : ...

Prochain chantier recommandé :
- Score de confiance / qualité des analyses
```
