# RunNSee — Cadre permanent de recette, suivi qualité et non-régression

## 0. Objectif

Ce document définit un système permanent de suivi qualité pour RunNSee.

Objectif :
- éviter de refaire une recette complète à chaque chantier ;
- tracer les tests réellement exécutés ;
- distinguer les tests permanents des tests spécifiques ;
- conserver les preuves de validation ;
- éviter les boucles de vérification répétitives ;
- donner à CODEX / Claude Code Pro une base stable avant chaque nouveau développement.

Ce document est à placer idéalement ici :

```text
docs/quality/RUNSEE_QUALITY_GATE.md
```

Le système complet recommandé est :

```text
docs/
  quality/
    RUNSEE_QUALITY_GATE.md
    RUNSEE_TEST_LOG.md
    RUNSEE_VALIDATION_MATRIX.md
    RUNSEE_RELEASE_CHECKLIST.md
  plans/
    old/
.ai/
  current_context.md
  open_tasks.md
  regression_risks.md
  codebase_map.md
```

---

## 1. Diagnostic

Les derniers chantiers RunNSee ont nécessité plusieurs cycles de vérification :

- intégration Garmin ;
- synchronisation globale Garmin/Strava ;
- fallback Garmin-only ;
- correction doublons Garmin/Strava ;
- soft-merge ;
- refonte Aujourd’hui ;
- backfill historique Garmin ;
- contrôles Analytics / Performance / Objectifs ;
- tests backend / frontend ;
- mise à jour `.ai`.

Le problème n’est pas la rigueur des contrôles.

Le problème est que ces contrôles sont redéfinis à chaque plan au lieu d’être suivis dans un référentiel stable.

Conséquences :
- impression de tourner en rond ;
- répétition des mêmes recettes ;
- difficulté à savoir ce qui est déjà validé ;
- risque que CODEX / Claude reprenne des tâches déjà terminées ;
- risque inverse : oublier une non-régression critique.

---

# 2. Principe cible

Mettre en place 4 niveaux.

## Niveau 1 — Quality Gate permanent

Fichier :

```text
docs/quality/RUNSEE_QUALITY_GATE.md
```

Il contient les contrôles permanents :
- Git clean ;
- tests backend ;
- tests frontend ;
- build ;
- archive source propre ;
- alignement `.ai` ;
- non-régressions métier invariantes.

## Niveau 2 — Journal de recette

Fichier :

```text
docs/quality/RUNSEE_TEST_LOG.md
```

Il trace les recettes réellement exécutées :
- date ;
- chantier ;
- commit ;
- tests exécutés ;
- résultat ;
- preuves ;
- anomalies ;
- décision Go / No-Go.

## Niveau 3 — Matrice de validation

Fichier :

```text
docs/quality/RUNSEE_VALIDATION_MATRIX.md
```

Il donne une vision synthétique de l’état de validation par domaine :
- Sync Strava ;
- Garmin recovery ;
- Garmin activités ;
- matching Garmin/Strava ;
- backfill Garmin ;
- Aujourd’hui ;
- Activités ;
- Analytics ;
- Performance ;
- Objectifs ;
- Trail.

## Niveau 4 — Checklist release / tag

Fichier :

```text
docs/quality/RUNSEE_RELEASE_CHECKLIST.md
```

Il sert avant chaque baseline / tag.

---

# 3. Quality Gate permanent

## 3.1 Contrôle Git

À exécuter systématiquement :

```bash
git status --short
git diff --stat
git diff --check
```

Attendu :

```text
aucun fichier parasite
aucun secret
aucun artefact runtime
aucun diff non souhaité
```

Contrôler l’absence de :

```text
node_modules/
dist/
.env
.env.*.local
*.db
*.log
runtime/
.tmp/
*.zip
```

---

## 3.2 Tests backend permanents

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

Résultat attendu :

```text
Prisma OK
SQLite/PostgreSQL alignés
tests backend OK
syntaxe Node OK
```

---

## 3.3 Tests frontend permanents

```bash
cd frontend
npm ci
npm test -- --run
npm run build
```

Résultat attendu :

```text
tests frontend OK
build OK
pas d’erreur bloquante
```

---

## 3.4 Archive source propre

Avant chaque review :

```bash
git archive --format=zip --output runsee-source-review.zip HEAD
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

## 3.5 Alignement `.ai/*.md`

À chaque fin de chantier :

```text
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
.ai/codebase_map.md
```

Questions obligatoires :
- `current_context.md` reflète-t-il l’état réel ?
- `open_tasks.md` contient-il encore des tâches déjà terminées ?
- `regression_risks.md` contient-il les nouveaux risques ?
- `codebase_map.md` contient-il les nouveaux fichiers/services ?

---

# 4. Matrice permanente de non-régression métier

## 4.1 Providers / connexions

| Test | Fréquence |
|---|---|
| Statut Strava affiché | À chaque modification layout/auth/provider |
| Statut Garmin affiché | À chaque modification layout/auth/provider |
| Sync globale Strava + Garmin | À chaque modification sync/provider |
| Strava seul | À chaque modification sync/provider |
| Garmin seul | À chaque modification sync/provider |
| Aucun provider | À chaque modification onboarding/provider |

## 4.2 Activités

| Test | Fréquence |
|---|---|
| Liste Activités sans doublons | À chaque modification sync/import |
| Activité Strava ouvrable | Permanent |
| Activité Garmin-only ouvrable | À chaque modification multi-source |
| Activité Strava + Garmin affichée en une ligne | À chaque modification matching |
| Activité merged masquée | À chaque modification repository/liste |
| Pagination cohérente | À chaque modification liste Activités |

## 4.3 Doublons Garmin/Strava

| Test | Fréquence |
|---|---|
| Dry-run doublons = 0 | Après chaque sync/backfill |
| Match exact/probable ne crée pas Garmin-only | Tests backend |
| Match ambiguous ne crée pas Garmin-only | Tests backend |
| Soft-merge non destructif | Après réparation |
| ActivityProviderLink cohérent | Après réparation/backfill |

## 4.4 Aujourd’hui

| Test | Fréquence |
|---|---|
| Filtre non persisté durablement | À chaque modification dashboard |
| 4 blocs maximum | À chaque modification UX Aujourd’hui |
| Activités à relire max 3 | À chaque modification Aujourd’hui |
| Pas de double comptage | Après sync/backfill |
| Trail uniquement contexte/vigilance/synthèse | À chaque modification Trail/Dashboard |

## 4.5 Analytics / Performance / Objectifs

| Test | Fréquence |
|---|---|
| Volumes sans merged | Après sync/backfill |
| Charge sans merged | Après sync/backfill |
| D+ / D- cohérents | Après Trail/backfill |
| Records sans randonnée Garmin parasite | Après Garmin-only/randonnées |
| Aucun lien `/activities/undefined` | À chaque modification routes/liens |
| Objectifs non surévalués par doublons | Après sync/backfill |

## 4.6 Backfill Garmin

| Test | Fréquence |
|---|---|
| Start backfill | À chaque modification backfill |
| Pause / reprise | À chaque modification backfill |
| Scheduler respecte intervalle | À chaque modification backfill |
| `GARMIN_BACKFILL_ALLOW_FORCE_RUN=false` | Permanent |
| Une fenêtre = dry-run doublons 0 | Après chaque fenêtre réelle |
| Compteurs persistés | Après modification logs |
| Pas d’usage route purge | Permanent |

---

# 5. Modèle `RUNSEE_TEST_LOG.md`

Créer :

```text
docs/quality/RUNSEE_TEST_LOG.md
```

Contenu modèle :

```md
# RunNSee — Journal de recette

## YYYY-MM-DD — Nom du chantier

### Contexte

- Branche :
- Commit :
- Tag de départ :
- Plan utilisé :
- Responsable :

### Tests techniques

| Test | Résultat | Preuve |
|---|---|---|
| git status --short | OK/KO | ... |
| git diff --check | OK/KO | ... |
| backend npm test | OK/KO | ... |
| frontend npm test | OK/KO | ... |
| frontend build | OK/KO | ... |
| db compare schemas | OK/KO | ... |

### Recette métier

| Domaine | Test | Résultat | Commentaire |
|---|---|---|---|
| Activités | 0 doublon visible | OK/KO | ... |
| Aujourd’hui | pas de double comptage | OK/KO | ... |
| Analytics | volume cohérent | OK/KO | ... |
| Performance | liens OK | OK/KO | ... |
| Garmin-only | visible si réel | OK/KO | ... |

### Anomalies détectées

| Anomalie | Gravité | Décision |
|---|---|---|
| ... | P0/P1/P2 | corriger / accepter / reporter |

### Décision

```text
GO / NO-GO
```

### Suite

- ...
```

---

# 6. Modèle `RUNSEE_VALIDATION_MATRIX.md`

Créer :

```text
docs/quality/RUNSEE_VALIDATION_MATRIX.md
```

Contenu modèle :

```md
# RunNSee — Matrice de validation

| Domaine | Dernière validation | Commit | Statut | Commentaire |
|---|---|---|---|---|
| Sync Strava | ... | ... | OK | ... |
| Sync Garmin recovery | ... | ... | OK | ... |
| Sync Garmin activités | ... | ... | OK | ... |
| Matching Garmin/Strava | ... | ... | OK | ... |
| Soft-merge doublons | ... | ... | OK | ... |
| Backfill Garmin | ... | ... | Partiel | Fenêtre 1/2 validée |
| Aujourd’hui | ... | ... | OK | ... |
| Activités | ... | ... | OK | ... |
| Analytics | ... | ... | OK | ... |
| Performance | ... | ... | OK | ... |
| Objectifs | ... | ... | À vérifier | ... |
| Trail | ... | ... | OK | ... |
```

---

# 7. Modèle `RUNSEE_RELEASE_CHECKLIST.md`

Créer :

```text
docs/quality/RUNSEE_RELEASE_CHECKLIST.md
```

Contenu modèle :

```md
# RunNSee — Checklist baseline / tag

## 1. Préconditions

- [ ] Repo clean
- [ ] Branche correcte
- [ ] Aucun secret
- [ ] Archive source propre
- [ ] `.ai/*.md` alignés

## 2. Tests

- [ ] Backend tests OK
- [ ] Frontend tests OK
- [ ] Build OK
- [ ] Prisma validate OK
- [ ] PostgreSQL validate OK
- [ ] db compare OK

## 3. Recette métier

- [ ] Activités OK
- [ ] Aujourd’hui OK
- [ ] Analytics OK
- [ ] Performance OK
- [ ] Objectifs OK si concernés
- [ ] Sync providers OK si concernés
- [ ] Backfill OK si concerné

## 4. Non-régression spécifique

- [ ] Pas de doublons provider
- [ ] Pas de double comptage
- [ ] Pas de lien undefined
- [ ] Pas de merged visible
- [ ] Garmin-only réel conservé

## 5. Décision

- [ ] GO tag
- [ ] NO-GO

## 6. Tag

```bash
git tag <tag-name>
git push origin <tag-name>
```
```

---

# 8. Règle pour les futurs plans `.md`

Chaque futur plan RunNSee doit contenir :

## 8.1 Référentiel qualité à utiliser

```text
Ce chantier doit s’appuyer sur :
- docs/quality/RUNSEE_QUALITY_GATE.md
- docs/quality/RUNSEE_TEST_LOG.md
- docs/quality/RUNSEE_VALIDATION_MATRIX.md
- docs/quality/RUNSEE_RELEASE_CHECKLIST.md si tag/baseline
```

## 8.2 Contrôles spécifiques au chantier

Ne pas répéter toute la recette permanente.

Lister uniquement les tests spécifiques.

Exemple backfill :

```text
dry-run doublons après chaque fenêtre
pause/reprise
scheduler
compteurs persistés
```

## 8.3 Mise à jour du journal de recette

À la fin du chantier, ajouter une entrée dans :

```text
docs/quality/RUNSEE_TEST_LOG.md
```

## 8.4 Mise à jour de la matrice

À la fin du chantier, mettre à jour :

```text
docs/quality/RUNSEE_VALIDATION_MATRIX.md
```

## 8.5 Phase finale de sécurisation post-chantier

Toujours inclure :

```text
repo clean
.ai aligné
tests backend
tests frontend
build
recette contrôlée
non-régression
archive source propre générée depuis Git
archive de review référencée dans RUNSEE_TEST_LOG.md
baseline/tag si applicable
```

---

# 9. Plan de mise en place

## Lot 1 — Créer l’arborescence qualité

Créer :

```text
docs/quality/
docs/plans/
docs/plans/old/
```

Commit :

```text
docs(quality): add runsee quality structure
```

---

## Lot 2 — Créer le Quality Gate permanent

Créer :

```text
docs/quality/RUNSEE_QUALITY_GATE.md
```

Commit :

```text
docs(quality): add permanent quality gate
```

---

## Lot 3 — Créer le journal de recette

Créer :

```text
docs/quality/RUNSEE_TEST_LOG.md
```

Ajouter une première entrée pour :

```text
Correction doublons Garmin/Strava
Backfill Garmin fenêtre 1/2 si déjà validées
```

Commit :

```text
docs(quality): add validation test log
```

---

## Lot 4 — Créer la matrice de validation

Créer :

```text
docs/quality/RUNSEE_VALIDATION_MATRIX.md
```

Commit :

```text
docs(quality): add validation matrix
```

---

## Lot 5 — Créer la checklist release

Créer :

```text
docs/quality/RUNSEE_RELEASE_CHECKLIST.md
```

Commit :

```text
docs(quality): add release checklist
```

---

## Lot 6 — Mettre à jour `.ai/*.md`

Mettre à jour :

```text
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
.ai/codebase_map.md
```

Ajouter la règle :

```text
Tout chantier doit alimenter RUNSEE_TEST_LOG.md.
Tout chantier doit mettre à jour RUNSEE_VALIDATION_MATRIX.md.
Tout tag doit passer RUNSEE_RELEASE_CHECKLIST.md.
```

Commit :

```text
docs(ai): reference permanent quality gate
```

---

# 10. Application immédiate au chantier Backfill Garmin

## 10.1 Ajouter une entrée dans `RUNSEE_TEST_LOG.md`

Entrée :

```text
Backfill Garmin — Fenêtre 1 et 2
```

Avec :

- commit ;
- date ;
- dry-run doublons ;
- validation UI ;
- pause/reprise ;
- scheduler ;
- statut Go/No-Go.

## 10.2 Mettre à jour `RUNSEE_VALIDATION_MATRIX.md`

Mettre :

```text
Backfill Garmin : Partiel ou OK selon validation fenêtre 2
```

## 10.3 Si fenêtre 2 UI reste à valider

Ne pas recréer un nouveau plan.

Ajouter simplement dans `RUNSEE_TEST_LOG.md` :

```text
À compléter : validation visuelle Activités/Aujourd’hui/Analytics après fenêtre 2.
```

## 10.4 Quand terminé

Ajouter :

```text
GO poursuite automatique
```

ou :

```text
NO-GO — raison
```

---

---

# 13. Obligation d’archive de review du code

## 13.1 Principe

À la fin de chaque chantier RunNSee, CODEX / Claude Code Pro doit générer une archive de review du code.

Cette archive sert à :

- permettre une review fiable du code réellement commité ;
- éviter les archives contenant des artefacts locaux ;
- garantir que la review se base sur `HEAD` ;
- conserver une preuve du périmètre livré ;
- faciliter une analyse externe sans transmettre de secrets, logs, bases locales ou dépendances.

Cette archive est obligatoire avant toute demande de review finale.

---

## 13.2 Commande obligatoire

L’archive doit être générée depuis Git avec :

```bash
git archive --format=zip --output runsee-source-review.zip HEAD
```

Si un tag de baseline existe, générer aussi une archive du tag :

```bash
git archive --format=zip --output runsee-source-<tag>.zip <tag>
```

Exemple :

```bash
git archive --format=zip --output runsee-source-runsee-stable-post-garmin-dedup.zip runsee-stable-post-garmin-dedup
```

---

## 13.3 Interdiction de zipper le dossier local complet

Ne jamais créer une archive par compression directe du dossier de travail complet.

Interdit :

```text
zip du dossier RunNSee complet
zip depuis l’explorateur Windows
archive incluant node_modules, dist, .env, logs, db locale
```

Raison :

```text
Un zip du dossier local peut contenir des secrets, artefacts runtime, builds obsolètes, bases locales, logs ou fichiers non commités.
```

---

## 13.4 Contrôle du contenu de l’archive

Après génération, contrôler le contenu :

```bash
unzip -l runsee-source-review.zip
```

ou outil équivalent sous Windows.

L’archive ne doit pas contenir :

```text
node_modules/
dist/
.env
.env.*.local
*.db
*.sqlite
*.sqlite3
*.log
runtime/
.tmp/
generated/
coverage/
*.zip
```

Si l’un de ces éléments est présent, l’archive est invalide.

---

## 13.5 Nom de fichier recommandé

Format recommandé :

```text
runsee-source-review-YYYYMMDD-<chantier>.zip
```

Exemples :

```text
runsee-source-review-20260508-garmin-backfill.zip
runsee-source-review-20260508-quality-gate.zip
runsee-source-review-20260508-today-ux.zip
```

---

## 13.6 Traçabilité dans le journal de recette

Chaque entrée de `docs/quality/RUNSEE_TEST_LOG.md` doit mentionner l’archive générée.

Ajouter dans chaque entrée :

```md
### Archive de review

- Archive générée : oui/non
- Nom du fichier :
- Commande utilisée :
- Basée sur commit :
- Basée sur tag :
- Contenu contrôlé : oui/non
- Artefacts interdits détectés : oui/non
```

Exemple :

```md
### Archive de review

- Archive générée : oui
- Nom du fichier : runsee-source-review-20260508-garmin-backfill.zip
- Commande utilisée : git archive --format=zip --output runsee-source-review-20260508-garmin-backfill.zip HEAD
- Basée sur commit : abc1234
- Basée sur tag : non
- Contenu contrôlé : oui
- Artefacts interdits détectés : non
```

---

## 13.7 Intégration dans la release checklist

`docs/quality/RUNSEE_RELEASE_CHECKLIST.md` doit contenir une section obligatoire :

```md
## Archive de review

- [ ] Archive générée depuis Git
- [ ] Archive basée sur HEAD ou tag
- [ ] Archive contrôlée
- [ ] Aucun artefact interdit
- [ ] Archive référencée dans RUNSEE_TEST_LOG.md
```

---

## 13.8 Critère de validation

Un chantier RunNSee ne peut pas être considéré comme terminé si :

```text
aucune archive de review n’a été générée
ou archive générée hors Git
ou archive contenant des artefacts interdits
ou archive non référencée dans RUNSEE_TEST_LOG.md
```

---

## 13.9 Message attendu de CODEX / Claude Code Pro

À la fin de chaque chantier, le message final doit inclure :

```text
Archive de review :
- générée : oui/non
- nom : ...
- commande : ...
- commit : ...
- tag : ...
- contrôle contenu : OK/KO
- artefacts interdits : oui/non
```


---

# 14. Réorganisation recommandée de `/docs` et `.ai`

## 14.1 Analyse

L’idée de réorganiser `/docs` et `.ai` est pertinente, mais elle comporte un risque si elle est faite trop largement ou trop vite.

Le problème actuel n’est pas seulement le nom des dossiers. Le vrai sujet est la séparation des rôles :

```text
/docs = documentation durable du projet
.ai   = contexte opérationnel court terme pour CODEX / Claude Code Pro
```

Si ces deux espaces mélangent plans, recettes, historique, risques, contexte courant et archives, les agents IA finissent par relire trop de contenu, rouvrir de vieux sujets ou perdre le fil de ce qui est réellement actif.

La réorganisation est donc utile, à condition de respecter trois principes :

1. **ne pas disperser** la documentation dans trop de sous-dossiers ;
2. **ne pas déplacer brutalement** tous les anciens fichiers sans table de correspondance ;
3. **ne pas mettre dans `.ai` des documents longs ou historiques** qui devraient vivre dans `/docs`.

---

## 14.2 Rôle cible des deux espaces

### `/docs`

`/docs` doit contenir la documentation durable :

- architecture ;
- qualité ;
- plans validés ;
- historiques ;
- recettes ;
- décisions ;
- releases ;
- guides d’exploitation.

C’est la mémoire projet stable.

### `.ai`

`.ai` doit contenir uniquement le contexte court terme utile aux agents :

- état courant ;
- tâches ouvertes ;
- risques actifs ;
- cartographie courte du code ;
- consignes de travail ;
- pointeurs vers `/docs`.

`.ai` ne doit pas devenir une archive complète.

---

## 14.3 Structure cible recommandée

Créer ou converger vers la structure suivante :

```text
docs/
  architecture/
    ARCHITECTURE_OVERVIEW.md
    DATA_MODEL.md
    PROVIDERS_STRAVA_GARMIN.md
    BACKFILL_GARMIN.md
  quality/
    RUNSEE_QUALITY_GATE.md
    RUNSEE_TEST_LOG.md
    RUNSEE_VALIDATION_MATRIX.md
    RUNSEE_RELEASE_CHECKLIST.md
  plans/
    active/
    old/
  decisions/
    ADR-0001-multi-source-strava-garmin.md
    ADR-0002-garmin-backfill-policy.md
  releases/
    RELEASE_LOG.md
    BASELINES.md
  operations/
    LOCAL_RUNBOOK.md
    DEPLOYMENT_RUNBOOK.md
    TROUBLESHOOTING.md

.ai/
  README.md
  current_context.md
  open_tasks.md
  regression_risks.md
  codebase_map.md
  handoff.md
```

---

## 14.4 Pourquoi ne pas tout mettre dans `.ai`

Ne pas mettre dans `.ai` :

```text
plans historiques longs
archives de recettes
release logs
documentation architecture complète
guides d’exploitation complets
anciens prompts
anciens rapports volumineux
```

Raison :

```text
.ai doit rester court, exploitable et orienté action.
```

Si `.ai` grossit trop, CODEX / Claude risque de :

- consommer trop de contexte ;
- confondre ancien et actuel ;
- rouvrir des tâches terminées ;
- perdre les décisions validées.

---

## 14.5 Contenu cible de `.ai/README.md`

Créer un fichier :

```text
.ai/README.md
```

Contenu recommandé :

```md
# RunNSee — Contexte agent IA

Ce dossier contient uniquement les fichiers de contexte court terme pour CODEX / Claude Code Pro.

## Fichiers actifs

| Fichier | Rôle |
|---|---|
| current_context.md | État courant synthétique du projet |
| open_tasks.md | Tâches ouvertes réellement actives |
| regression_risks.md | Risques de régression actifs |
| codebase_map.md | Cartographie courte du code |
| handoff.md | Passage de relais du dernier chantier |

## Références longues

Les documents longs sont dans `/docs` :

- Qualité : `docs/quality/`
- Architecture : `docs/architecture/`
- Plans : `docs/plans/`
- Décisions : `docs/decisions/`
- Releases : `docs/releases/`

## Règle

Ne pas archiver de longs plans dans `.ai`.
Ne pas laisser de tâches terminées dans `open_tasks.md`.
Chaque fichier `.ai` doit rester court, utile et à jour.
```

---

## 14.6 Contenu cible de `/docs/README.md`

Créer un fichier :

```text
docs/README.md
```

Contenu recommandé :

```md
# RunNSee — Documentation projet

## Structure

| Dossier | Rôle |
|---|---|
| architecture/ | Architecture durable, modèle de données, providers |
| quality/ | Quality Gate, journal de recette, matrice de validation |
| plans/active/ | Plans en cours |
| plans/old/ | Plans terminés / historisés |
| decisions/ | ADR et décisions structurantes |
| releases/ | Baselines, tags, release log |
| operations/ | Runbooks locaux, déploiement, dépannage |

## Règle

Un plan terminé doit être historisé dans `docs/plans/old/`.
Une décision durable doit être transformée en ADR dans `docs/decisions/`.
Une recette doit être tracée dans `docs/quality/RUNSEE_TEST_LOG.md`.
Un tag ou une baseline doit être tracé dans `docs/releases/BASELINES.md`.
```

---

## 14.7 Politique d’historisation des plans

Les plans actifs doivent être dans :

```text
docs/plans/active/
```

Une fois terminés :

```text
docs/plans/old/YYYYMMDD_<nom_du_plan>.md
```

Règles :

- ne pas écraser un ancien plan ;
- utiliser un nom horodaté ;
- ne pas supprimer l’historique ;
- référencer le plan terminé dans `RUNSEE_TEST_LOG.md` si une recette y est liée.

---

## 14.8 Politique de décisions structurantes

Pour les décisions durables, créer des ADR :

```text
docs/decisions/ADR-0001-multi-source-strava-garmin.md
docs/decisions/ADR-0002-garmin-backfill-policy.md
docs/decisions/ADR-0003-quality-gate.md
```

Modèle ADR :

```md
# ADR-000X — Titre

## Statut

Accepté / Remplacé / Obsolète

## Contexte

...

## Décision

...

## Conséquences

...

## Risques

...

## Date

YYYY-MM-DD
```

Décisions RunNSee à documenter en ADR :

- Strava prioritaire si match Garmin fiable ;
- Garmin-only créé si `not_found` ;
- `ambiguous` ne crée pas Garmin-only ;
- soft-merge non destructif ;
- backfill Garmin par 180 jours ;
- Quality Gate permanent ;
- `.ai` réservé au contexte court terme.

---

## 14.9 Politique de releases / baselines

Créer :

```text
docs/releases/BASELINES.md
```

Contenu recommandé :

```md
# RunNSee — Baselines

| Date | Tag | Commit | Objet | Statut |
|---|---|---|---|---|
| 2026-05-08 | runsee-stable-post-garmin-dedup | f703fa5 | Correction doublons Garmin/Strava | Stable |
```

Créer aussi :

```text
docs/releases/RELEASE_LOG.md
```

Pour tracer les évolutions livrées.

---

## 14.10 Plan de migration progressif

Ne pas faire un énorme déplacement en une fois.

Procéder par lots.

### Lot 1 — Créer la structure

Créer :

```text
docs/architecture/
docs/quality/
docs/plans/active/
docs/plans/old/
docs/decisions/
docs/releases/
docs/operations/
.ai/README.md
docs/README.md
```

Commit :

```text
docs(structure): introduce centralized documentation layout
```

### Lot 2 — Déplacer les documents qualité

Déplacer ou créer :

```text
docs/quality/RUNSEE_QUALITY_GATE.md
docs/quality/RUNSEE_TEST_LOG.md
docs/quality/RUNSEE_VALIDATION_MATRIX.md
docs/quality/RUNSEE_RELEASE_CHECKLIST.md
```

Commit :

```text
docs(quality): centralize validation framework
```

### Lot 3 — Historiser les plans terminés

Déplacer les anciens plans terminés vers :

```text
docs/plans/old/
```

Garder uniquement les plans en cours dans :

```text
docs/plans/active/
```

Commit :

```text
docs(plans): archive completed implementation plans
```

### Lot 4 — Créer les premières ADR

Créer au minimum :

```text
ADR-0001-multi-source-strava-garmin.md
ADR-0002-garmin-backfill-policy.md
ADR-0003-quality-gate.md
```

Commit :

```text
docs(decisions): record core runsee architecture decisions
```

### Lot 5 — Nettoyer `.ai`

Réduire `.ai` à :

```text
README.md
current_context.md
open_tasks.md
regression_risks.md
codebase_map.md
handoff.md
```

Supprimer ou déplacer les fichiers temporaires :

```text
git_status.txt
handoff_status.txt
handoff_uncommitted.patch
anciens prompts longs
anciens plans longs
```

Commit :

```text
docs(ai): reduce agent context to active handoff files
```

### Lot 6 — Mettre à jour les références

Rechercher les anciens chemins :

```bash
grep -R "docs/_old\|docs/old\|docs/plans\|\.ai/" .
```

Mettre à jour les références cassées.

Commit :

```text
docs: update documentation cross references
```

---

## 14.11 Garde-fous de migration

Avant migration :

```bash
git status --short
```

Pendant migration :

- utiliser `git mv` pour conserver l’historique ;
- ne pas supprimer de contenu ;
- ne pas renommer les documents métiers sans nécessité ;
- ne pas déplacer des fichiers utilisés par des scripts sans vérifier.

Après migration :

```bash
git status --short
git diff --stat
git diff --check
```

Puis vérifier :

```text
liens relatifs OK
README docs OK
.ai README OK
RUNSEE_TEST_LOG.md présent
RUNSEE_VALIDATION_MATRIX.md présent
```

---

## 14.12 Risques de la réorganisation

| Risque | Niveau | Garde-fou |
|---|---:|---|
| Perte de contexte historique | Moyen | utiliser `git mv`, pas de suppression |
| `.ai` trop vidé | Moyen | garder current_context/open_tasks/risks/map |
| Trop de dossiers | Moyen | limiter aux dossiers proposés |
| Références cassées | Moyen | grep des anciens chemins |
| CODEX ne trouve plus les consignes | Élevé | `.ai/README.md` + docs/README.md |
| Anciennes tâches réouvertes | Moyen | nettoyer open_tasks.md |

---

## 14.13 Critères d’acceptation

La réorganisation est validée si :

```text
docs/README.md existe
.ai/README.md existe
docs/quality/ contient les 4 fichiers qualité
docs/plans/active et docs/plans/old existent
docs/decisions contient les ADR initiales
docs/releases contient BASELINES.md
.ai ne contient plus de longs plans historiques
.ai/open_tasks.md ne contient que les tâches réellement ouvertes
les anciens chemins sont corrigés
repo clean
tests backend/frontend non impactés
archive review générée depuis Git
```

---

## 14.14 Message attendu de CODEX / Claude Code Pro

```text
Réorganisation docs/.ai :

Structure créée :
- docs/architecture : ...
- docs/quality : ...
- docs/plans : ...
- docs/decisions : ...
- docs/releases : ...
- docs/operations : ...
- .ai/README.md : ...

Documents déplacés :
- ...

ADR créées :
- ...

Références mises à jour :
- ...

Tests :
- backend : ...
- frontend : ...
- build : ...

Archive review :
- générée : ...
- nom : ...
- contenu contrôlé : ...

Conclusion :
- structure documentaire centralisée prête : oui/non
- risques résiduels : ...
```


# 11. Définition de terminé

Le système qualité est en place si :

```text
docs/quality/RUNSEE_QUALITY_GATE.md existe
docs/quality/RUNSEE_TEST_LOG.md existe
docs/quality/RUNSEE_VALIDATION_MATRIX.md existe
docs/quality/RUNSEE_RELEASE_CHECKLIST.md existe
.ai/*.md référencent ce système
le chantier Backfill Garmin est inscrit dans le journal
les futures recettes utilisent ce référentiel au lieu de recréer un plan complet
l’obligation d’archive de review du code est intégrée au Quality Gate
RUNSEE_TEST_LOG.md trace l’archive de review générée pour chaque chantier
la structure `/docs` et `.ai` est centralisée et documentée
`.ai` ne contient que le contexte actif court terme
```

---

# 12. Message attendu de CODEX / Claude Code Pro

```text
Système qualité RunNSee :

Fichiers créés :
- RUNSEE_QUALITY_GATE.md : ...
- RUNSEE_TEST_LOG.md : ...
- RUNSEE_VALIDATION_MATRIX.md : ...
- RUNSEE_RELEASE_CHECKLIST.md : ...

Backfill Garmin :
- entrée journal ajoutée : ...
- matrice mise à jour : ...
- statut Go/No-Go : ...

.ai :
- current_context.md : ...
- open_tasks.md : ...
- regression_risks.md : ...
- codebase_map.md : ...

Tests :
- backend : ...
- frontend : ...
- build : ...

Archive de review :
- générée : ...
- nom : ...
- commit/tag : ...
- contenu contrôlé : ...
- artefacts interdits : ...

Structure documentaire :
- docs/README.md : ...
- .ai/README.md : ...
- docs/quality : ...
- docs/plans : ...
- docs/decisions : ...
- docs/releases : ...

Conclusion :
- système qualité prêt : oui/non
- prochaines recettes à suivre via RUNSEE_TEST_LOG.md
```
