# RunNSee — Handoff Claude Code Pro : traiter le prochain plan sans régression et sans surcharge de contexte

## 0. Objectif

Ce document est destiné à Claude Code Pro.

Objectif :
- reprendre RunNSee après le chantier `Score de confiance / qualité des analyses` ;
- comprendre rapidement l’existant sans charger inutilement tout le dépôt ;
- éviter les régressions ;
- respecter le Quality Gate permanent ;
- clôturer proprement le chantier en cours avant d’en ouvrir un nouveau ;
- utiliser une méthode de travail courte, vérifiable et traçable.

---

## 1. État actuel résumé

Le chantier `Score de confiance / qualité des analyses` est techniquement implémenté.

Éléments présents :
- moteur : `frontend/src/utils/analysisConfidence.js`
- tests : `frontend/src/utils/analysisConfidence.test.js`
- composant UI : `frontend/src/components/AnalysisConfidenceBadge.jsx`
- intégrations :
  - Aujourd’hui ;
  - Analytics ;
  - Performance ;
  - Objectifs ;
  - Détail activité Trail ;
- documentation :
  - `docs/architecture/ANALYSIS_CONFIDENCE_MODEL.md`
  - `docs/quality/RUNSEE_TEST_LOG.md`
  - `docs/quality/RUNSEE_VALIDATION_MATRIX.md`
  - `.ai/current_context.md`
  - `.ai/open_tasks.md`

Tests tracés dans `RUNSEE_TEST_LOG.md` :
- `analysisConfidence.test.js` : 8/8 OK ;
- frontend tests : 156/156 OK ;
- frontend build : OK ;
- backend tests : 21/21 OK ;
- Prisma SQLite/PostgreSQL : OK ;
- `db:compare-schemas` : OK.

Décision actuelle :
```text
GO technique.
Validation visuelle authentifiée conseillée avant baseline UX stable.
```

---

## 2. Ce que Claude doit faire en premier

Avant tout nouveau développement, traiter la clôture du chantier `Score de confiance`.

### 2.1 Validation visuelle ciblée

Vérifier en session authentifiée :

```text
Aujourd’hui
Analytics
Performance
Objectifs si objectif actif
Détail activité Trail
Mobile / écran étroit si possible
```

Contrôles attendus :

```text
badge visible mais non intrusif
pas de surcharge UX
pas de décalage d’interface
tooltip lisible
libellés compréhensibles
aucun bloc trop haut
aucun overflow horizontal
aucune régression des calculs existants
```

### 2.2 Validation métier

Vérifier :

```text
Confiance élevée si données complètes
Confiance moyenne si recovery absent mais charge exploitable
Données insuffisantes si objectif absent
Confiance faible ou moyenne si D- absent sur Trail
Pas de promesse pseudo-scientifique excessive
```

### 2.3 Décision

Après validation :

```text
GO baseline score confiance
```

ou :

```text
NO-GO avec liste d’anomalies
```

---

## 3. Règle de consommation minimale de contexte

Claude ne doit pas charger tout le dépôt au départ.

Lire uniquement dans cet ordre.

### 3.1 Contexte agent court

```text
.ai/README.md
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
.ai/codebase_map.md
```

### 3.2 Référentiel qualité

```text
docs/quality/RUNSEE_QUALITY_GATE.md
docs/quality/RUNSEE_TEST_LOG.md
docs/quality/RUNSEE_VALIDATION_MATRIX.md
docs/quality/RUNSEE_RELEASE_CHECKLIST.md
```

### 3.3 Documentation du chantier courant

```text
docs/architecture/ANALYSIS_CONFIDENCE_MODEL.md
docs/plans/active/runsee_chantier_score_confiance_analyses.md
```

Si le plan a déjà été archivé :

```text
docs/plans/old/runsee_chantier_score_confiance_analyses.md
```

### 3.4 Fichiers code à lire seulement si nécessaire

Pour le chantier score confiance :

```text
frontend/src/utils/analysisConfidence.js
frontend/src/utils/analysisConfidence.test.js
frontend/src/components/AnalysisConfidenceBadge.jsx
frontend/src/pages/DashboardPage.jsx
frontend/src/pages/AnalyticsPage.jsx
frontend/src/pages/PerformancePage.jsx
frontend/src/components/ActivityTrailCard.jsx
frontend/src/components/TrailSpecificityCard.jsx
frontend/src/components/VdotProfileCard.jsx
frontend/src/components/RaceCountdownCard.jsx
frontend/src/styles.css
```

Ne lire les fichiers backend que pour le Quality Gate ou en cas de suspicion de régression.

---

## 4. Règle anti-régression

Ne jamais modifier :
- sync Strava ;
- sync Garmin ;
- backfill Garmin ;
- matching provider ;
- soft-merge ;
- modèle Prisma ;
- routes provider ;
- imports historiques ;
- calculs de charge existants ;

sauf si le plan courant le demande explicitement.

Le chantier score confiance doit rester principalement frontend / documentation.

---

## 5. Quality Gate obligatoire

Claude doit s’appuyer sur :

```text
docs/quality/RUNSEE_QUALITY_GATE.md
docs/quality/RUNSEE_TEST_LOG.md
docs/quality/RUNSEE_VALIDATION_MATRIX.md
docs/quality/RUNSEE_RELEASE_CHECKLIST.md
```

À la fin du chantier, exécuter ou faire exécuter :

### Backend

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

### Frontend

```bash
cd frontend
npm ci
npm test -- --run
npm run build
```

### Git

```bash
git status --short
git diff --stat
git diff --check
```

---

## 6. Journalisation obligatoire

Après validation ou correction, mettre à jour :

```text
docs/quality/RUNSEE_TEST_LOG.md
docs/quality/RUNSEE_VALIDATION_MATRIX.md
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
.ai/codebase_map.md
```

### 6.1 RUNSEE_TEST_LOG.md

Ajouter une entrée ou compléter l’entrée existante :

```text
2026-05-09 - Score de confiance des analyses
```

Ajouter :
- validation visuelle ;
- statut desktop ;
- statut mobile ;
- anomalies ;
- décision GO/NO-GO ;
- archive de review ;
- commit.

### 6.2 RUNSEE_VALIDATION_MATRIX.md

Mettre à jour :

```text
Score confiance analyses : OK visuel
```

ou :

```text
Score confiance analyses : Partiel / corrections requises
```

### 6.3 .ai/open_tasks.md

Si validation OK :
- retirer la tâche bloquante de validation visuelle ;
- déplacer les dettes éventuelles en non bloquant.

---

## 7. Archive de review obligatoire

À la fin :

```bash
git archive --format=zip --output runsee-source-review-analysis-confidence-final.zip HEAD
```

Ou via le script projet si disponible :

```powershell
powershell -ExecutionPolicy Bypass -File deployment\scripts\Export-RunSeeSourceArchive.ps1 -OutputPath C:\Services\RuNSee\runsee-source-review-analysis-confidence-final.zip
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

Tracer l’archive dans :

```text
docs/quality/RUNSEE_TEST_LOG.md
```

---

## 8. Tag / baseline

Créer un tag uniquement si :
- validation visuelle OK ;
- tests backend OK ;
- tests frontend OK ;
- build OK ;
- Quality Gate OK ;
- archive review propre ;
- `.ai` aligné.

Tag proposé :

```bash
git tag runsee-stable-analysis-confidence
git push origin runsee-stable-analysis-confidence
```

Si la validation visuelle est partielle, ne pas taguer.

---

## 9. Méthode de travail attendue de Claude

Claude doit travailler par étapes courtes.

### Étape 1 — Lecture minimale

Lire les fichiers listés en section 3.

### Étape 2 — Résumé avant action

Produire un résumé court :

```text
J’ai compris :
- état courant ;
- chantier à clôturer ;
- fichiers concernés ;
- risques ;
- tests attendus.
```

### Étape 3 — Audit ciblé

Vérifier uniquement :
- intégration badges ;
- wording ;
- responsive ;
- cohérence des niveaux ;
- non-régression UI ;
- docs qualité.

### Étape 4 — Corrections minimales si nécessaires

Ne corriger que les anomalies observées.

Ne pas refactorer largement.

### Étape 5 — Quality Gate

Lancer les tests.

### Étape 6 — Documentation

Mettre à jour `docs/quality` et `.ai`.

### Étape 7 — Archive review

Générer l’archive.

### Étape 8 — Décision

GO tag ou NO-GO.

---

## 10. Prompt court à donner à Claude

```text
Tu reprends RunNSee après le chantier "Score de confiance / qualité des analyses".

Objectif : clôturer ce chantier sans régression, avec consommation minimale de contexte.

Lis uniquement, dans cet ordre :
1. .ai/README.md
2. .ai/current_context.md
3. .ai/open_tasks.md
4. .ai/regression_risks.md
5. .ai/codebase_map.md
6. docs/quality/RUNSEE_QUALITY_GATE.md
7. docs/quality/RUNSEE_TEST_LOG.md
8. docs/quality/RUNSEE_VALIDATION_MATRIX.md
9. docs/architecture/ANALYSIS_CONFIDENCE_MODEL.md
10. docs/plans/active/runsee_chantier_score_confiance_analyses.md ou son équivalent dans docs/plans/old/

Ne lis les fichiers code que si nécessaire, en priorité :
- frontend/src/utils/analysisConfidence.js
- frontend/src/utils/analysisConfidence.test.js
- frontend/src/components/AnalysisConfidenceBadge.jsx
- DashboardPage.jsx
- AnalyticsPage.jsx
- PerformancePage.jsx
- ActivityTrailCard.jsx
- TrailSpecificityCard.jsx
- VdotProfileCard.jsx
- RaceCountdownCard.jsx
- styles.css

Ne modifie pas backend, sync, Garmin, Strava, Prisma, matching provider ou backfill sauf anomalie bloquante explicitement liée.

Ta mission :
1. valider ou corriger l’intégration UI du score de confiance ;
2. vérifier absence de surcharge UX et absence d’overflow mobile ;
3. vérifier les libellés et le wording scientifique prudent ;
4. compléter RUNSEE_TEST_LOG.md et RUNSEE_VALIDATION_MATRIX.md ;
5. mettre à jour .ai/*.md ;
6. exécuter tests frontend/backend/build selon RUNSEE_QUALITY_GATE.md ;
7. générer une archive de review via git archive ou script projet ;
8. décider GO/NO-GO pour le tag runsee-stable-analysis-confidence.

Avant de modifier, produis un résumé de compréhension et la liste exacte des fichiers que tu comptes toucher.
```

---

## 11. Prochain chantier après clôture

Ne pas lancer maintenant.

Une fois le score de confiance stabilisé, prochain chantier recommandé :

```text
RunNSee Coach — recommandation hebdomadaire et prochaine séance
```

Mais seulement après :
- tag ou validation stable du score confiance ;
- backfill Garmin toujours sans doublons ;
- Quality Gate OK.

---

## 12. Définition de terminé

Le passage de relais Claude est réussi si :

```text
Claude lit uniquement le contexte minimal
Claude ne rouvre pas des sujets terminés
Claude ne modifie pas sync/Garmin/Prisma/backfill hors scope
Validation visuelle score confiance faite
RUNSEE_TEST_LOG.md mis à jour
RUNSEE_VALIDATION_MATRIX.md mise à jour
.ai/*.md alignés
tests backend OK
tests frontend OK
build OK
archive review générée
GO/NO-GO clairement documenté
```

---

## 13. Message final attendu de Claude

```text
Score confiance — clôture chantier

Contexte lu :
- ...

Fichiers modifiés :
- ...

Validation UI :
- Aujourd’hui : ...
- Analytics : ...
- Performance : ...
- Objectifs : ...
- Trail : ...
- Mobile : ...

Tests :
- frontend : ...
- backend : ...
- build : ...

Documentation :
- RUNSEE_TEST_LOG.md : ...
- RUNSEE_VALIDATION_MATRIX.md : ...
- .ai/*.md : ...

Archive review :
- générée : ...
- nom : ...
- contrôle contenu : ...

Décision :
- GO/NO-GO tag : ...
- tag créé : oui/non
- risques résiduels : ...
```
