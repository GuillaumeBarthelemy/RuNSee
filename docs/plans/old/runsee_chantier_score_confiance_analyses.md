# RunNSee — GO chantier suivant : Score de confiance / qualité des analyses

## 0. Objectif

Ce document est destiné à CODEX / Claude Code Pro.

Archive analysée : `runsee-source-review.zip`.

Objectif :
- valider si l’état actuel permet de passer au chantier suivant ;
- synthétiser les constats de review ;
- définir le prochain chantier produit prioritaire ;
- fournir un plan complet, mais cadré, pour développer un score de confiance / qualité des analyses ;
- s’appuyer sur le nouveau référentiel qualité permanent RunNSee.

---

## 1. Verdict de review

La dernière archive permet de passer au chantier suivant.

Le projet a franchi un palier important :

- structure documentaire `/docs` et `.ai` réorganisée ;
- Quality Gate permanent en place ;
- journal de recette présent ;
- matrice de validation présente ;
- archive source propre ;
- backfill Garmin réel validé sur deux fenêtres ;
- dry-run doublons = 0 ;
- validation UI post-fenêtre 2 documentée ;
- GO surveillé pour poursuite automatique du backfill ;
- tests backend/frontend/build tracés ;
- `ProviderBackfillWindowLog` présent ;
- scheduler backfill en place ;
- garde-fous anti-doublons présents.

Conclusion :

```text
GO pour démarrer un nouveau chantier produit, sous réserve de conserver la surveillance backfill en tâche non bloquante.
```

---

## 2. Points de vigilance non bloquants

Les éléments suivants restent à surveiller, mais ne bloquent pas le chantier suivant.

## 2.1 Backfill Garmin

Le backfill est en GO surveillé.

À conserver dans `open_tasks.md` :

```text
Surveiller la prochaine fenêtre automatique.
Relancer detect-provider-activity-duplicates.js après une fenêtre importante.
Confirmer la complétion jusqu’à GARMIN_BACKFILL_MIN_DATE.
```

Ce n’est plus un blocage pour travailler sur un chantier produit indépendant.

## 2.2 Dette technique non bloquante

À conserver en dette :

```text
Refactor route /activities/:stravaActivityId -> /activities/:activityPublicId.
Tests backend providers plus larges.
Lock DB si futur déploiement multi-instance.
```

## 2.3 Route purge Garmin

La route destructive Garmin doit rester documentée comme outil admin exceptionnel.

Elle ne doit pas être utilisée dans le chantier suivant.

---

# PARTIE A — Pourquoi le prochain chantier doit être le score de confiance

---

## 3. Analyse produit

RunNSee dispose maintenant de nombreuses analyses :

- charge ;
- CTL / ATL / TSB ;
- intensité ;
- performance ;
- VDOT ;
- objectifs ;
- trail ;
- D+ / D- ;
- Garmin recovery ;
- HRV ;
- sommeil ;
- backfill historique ;
- Garmin-only ;
- Strava + Garmin enrichi.

Le risque principal n’est plus seulement d’ajouter de nouveaux indicateurs.

Le vrai risque devient :

```text
L’utilisateur peut lire une analyse avancée sans savoir si les données qui la supportent sont fiables.
```

Exemples :

```text
Une analyse Trail sans D- fiable ne doit pas être présentée avec la même confiance.
Une lecture Aujourd’hui sans données Garmin recovery récentes doit être prudente.
Une estimation performance sans course récente significative doit afficher une confiance moyenne ou faible.
Un objectif Trail sans assez d’exposition D+/D- doit signaler une incertitude.
Une activité Garmin-only sans splits doit être analysée avec prudence.
```

Le prochain saut qualitatif n’est donc pas d’ajouter encore un graphique.

Le prochain saut est de dire :

```text
Cette analyse est fiable / partielle / prudente, et voici pourquoi.
```

---

## 4. Objectif fonctionnel du chantier

Créer une couche transverse :

```text
AnalysisConfidence
```

Elle doit produire, selon la page ou le bloc :

```text
high
medium
low
insufficient
```

avec :

```text
score numérique optionnel
niveau lisible
raisons positives
raisons de prudence
données manquantes
actions recommandées
```

Exemple UI :

```text
Confiance élevée
Données récentes, FC disponible, recovery Garmin synchronisé, aucun doublon détecté.
```

Ou :

```text
Confiance moyenne
D- partiellement disponible et recovery Garmin absent sur les 3 derniers jours.
```

Ou :

```text
Lecture prudente
Données insuffisantes pour conclure sur la charge descente.
```

---

# PARTIE B — Périmètre du chantier

---

## 5. Pages concernées

Le chantier doit intégrer un score de confiance dans :

```text
Aujourd’hui
Analytics
Performance
Objectifs
Détail activité
Trail
Garmin recovery
```

Mais de manière progressive.

### Lot MVP recommandé

Pour éviter de surcharger l’UX, commencer par :

```text
Aujourd’hui
Analytics
Performance
Objectifs
Détail activité Trail
```

Garmin recovery pourra être intégré via les signaux utilisés dans Aujourd’hui et Analytics.

---

## 6. Ce que le chantier ne doit pas faire

Ne pas faire dans ce chantier :

```text
nouvelle prédiction chrono complète
nouveau coach hebdomadaire
nouvelle refonte UX globale
nouveau modèle ML
nouvelle synchronisation provider
refactor massif backend/frontend
```

Ce chantier doit rester transverse, mais maîtrisé.

---

# PARTIE C — Modèle conceptuel

---

## 7. Modèle `AnalysisConfidence`

Créer un modèle frontend utilitaire, probablement dans :

```text
frontend/src/utils/analysisConfidence.js
```

ou domaine :

```text
frontend/src/domain/confidence/analysisConfidence.js
```

Sortie standard :

```js
{
  level: "high" | "medium" | "low" | "insufficient",
  score: 0-100,
  title: "Confiance élevée",
  summary: "...",
  positiveSignals: [],
  warnings: [],
  missingData: [],
  recommendations: [],
  scope: "today" | "analytics" | "performance" | "objective" | "activityTrail"
}
```

### 7.1 Niveaux

| Niveau | Interprétation |
|---|---|
| high | Données suffisantes, récentes, cohérentes |
| medium | Analyse exploitable mais avec limites |
| low | Analyse fragile, prudence forte |
| insufficient | Données insuffisantes pour conclure |

### 7.2 Règle importante

Ne pas afficher un score pseudo-scientifique trop précis si la logique reste heuristique.

Préférer :

```text
Confiance élevée / moyenne / faible
```

Le score numérique peut rester interne ou discret.

---

## 8. Critères transverses

## 8.1 Fraîcheur des données

Critères :

```text
activité récente disponible
Garmin recovery récent si connecté
backfill en cours ou terminé
sync récente
```

Exemples :

| Cas | Effet |
|---|---|
| dernière activité < 3 jours | positif |
| pas d’activité depuis > 7 jours | prudence |
| Garmin recovery < 48 h | positif |
| recovery absent depuis > 5 jours | prudence |

## 8.2 Couverture activité

Critères :

```text
nombre d’activités sur la période
nombre d’activités avec FC
nombre d’activités avec D+
nombre d’activités avec D-
nombre d’activités avec splits
nombre d’activités merged exclues
```

## 8.3 Qualité physiologique

Critères :

```text
FC moyenne disponible
FC max disponible
HRV / VFC disponible
sommeil disponible
RPE disponible si existant
```

## 8.4 Qualité Trail

Critères :

```text
D+ disponible
D- disponible
splits ou streams altitude
activité trail récente
randonnées correctement typées
```

## 8.5 Qualité Performance

Critères :

```text
best efforts récents
records récents
activités route pertinentes
exclusion randonnées
absence de Garmin-only sans données de performance suffisantes
```

## 8.6 Qualité Objectifs

Critères :

```text
objectif actif
date objectif
distance objectif
D+ objectif si trail
historique récent suffisant
sortie longue récente
charge récente fiable
spécificité suffisante
```

---

# PARTIE D — Implémentation technique

---

## 9. Lot 1 — Audit des données disponibles

### Objectif

Identifier les données réellement disponibles dans les view models actuels.

### Fichiers à auditer

```text
frontend/src/utils/activityInsights.js
frontend/src/utils/trainingMetrics.js
frontend/src/utils/trainingIntelligence.js
frontend/src/utils/runningPerformance.js
frontend/src/utils/trailProfile.js
frontend/src/utils/recoveryViewModel.js
frontend/src/utils/recoveryCorrelations.js
frontend/src/utils/raceObjectivePlanner.js
frontend/src/pages/DashboardPage.jsx
frontend/src/pages/AnalyticsPage.jsx
frontend/src/pages/PerformancePage.jsx
frontend/src/pages/ActivityDetailPage.jsx
```

### Livrable

Créer un court document :

```text
docs/architecture/ANALYSIS_CONFIDENCE_MODEL.md
```

Contenant :

```text
données disponibles
données manquantes
pages concernées
règles de confiance retenues
limites assumées
```

### Commit

```text
docs(analytics): document analysis confidence model
```

---

## 10. Lot 2 — Créer le moteur de confiance

### Objectif

Créer une fonction transverse testable.

### Fichier recommandé

```text
frontend/src/utils/analysisConfidence.js
```

ou :

```text
frontend/src/domain/confidence/analysisConfidence.js
```

### Fonctions recommandées

```js
buildTodayConfidence(input)
buildAnalyticsConfidence(input)
buildPerformanceConfidence(input)
buildObjectiveConfidence(input)
buildActivityTrailConfidence(input)
```

Et une fonction commune :

```js
buildConfidenceResult({ scope, checks })
```

### Exemple de check

```js
{
  id: "recent_activities",
  passed: true,
  weight: 20,
  positive: "Activités récentes disponibles",
  warning: "Peu d’activités récentes",
}
```

### Commit

```text
feat(analytics): add analysis confidence engine
```

---

## 11. Lot 3 — UI légère `ConfidenceBadge`

### Objectif

Afficher la confiance sans surcharger.

### Composant

```text
frontend/src/components/ConfidenceBadge.jsx
```

ou :

```text
frontend/src/components/AnalysisConfidenceBadge.jsx
```

### Design

Format compact :

```text
Confiance élevée
```

Avec tooltip ou détail déroulant :

```text
Pourquoi ?
- FC disponible sur 92 % des activités
- Garmin recovery synchronisé hier
- Aucun doublon provider détecté
Limites :
- D- partiellement disponible
```

### Règles UX

- ne pas mettre de gros bloc partout ;
- utiliser un badge compact ;
- détail accessible au clic ou tooltip ;
- ne pas culpabiliser l’utilisateur ;
- wording simple.

### Commit

```text
feat(ui): add analysis confidence badge
```

---

## 12. Lot 4 — Intégration Aujourd’hui

### Objectif

Ajouter un indicateur de confiance dans `Aujourd’hui`.

### Emplacement recommandé

Dans la carte Lecture du jour, près du verdict :

```text
Lecture du jour  ·  Confiance élevée
```

### Critères Today

Prendre en compte :

```text
activités 7 jours
charge disponible
FC disponible
Garmin recovery récent
sommeil / HRV si disponibles
doublons provider absents
backfill non en erreur
```

### Exemples de messages

```text
Confiance élevée : données récentes et recovery Garmin disponible.
```

```text
Confiance moyenne : recovery Garmin absent récemment, mais charge d’entraînement exploitable.
```

```text
Lecture prudente : peu d’activités récentes.
```

### Commit

```text
feat(today): show daily analysis confidence
```

---

## 13. Lot 5 — Intégration Analytics

### Objectif

Afficher la confiance des tendances.

### Emplacement recommandé

Dans l’en-tête Analytics ou près des filtres.

### Critères Analytics

```text
période sélectionnée
nombre d’activités
couverture FC
D+ / D-
exclusion merged
présence Garmin-only
backfill en cours ou terminé
```

### Commit

```text
feat(analytics): show trend confidence level
```

---

## 14. Lot 6 — Intégration Performance

### Objectif

Afficher la confiance des records / tendances.

### Critères Performance

```text
best efforts récents
nombre d’activités route
exclusion randonnée
présence données allure/FC
période suffisamment longue
```

### Règle importante

Si peu de courses route récentes :

```text
Confiance moyenne ou faible
```

Ne pas surinterpréter une tendance sur quelques activités.

### Commit

```text
feat(performance): show performance confidence level
```

---

## 15. Lot 7 — Intégration Objectifs

### Objectif

Afficher si l’évaluation de préparation à un objectif est fiable.

### Critères Objectifs

```text
date objectif renseignée
distance renseignée
D+ objectif si trail
volume récent
sortie longue récente
charge récente
spécificité trail si trail
recovery récent
```

### Exemple

```text
Confiance moyenne : l’objectif est renseigné, mais l’exposition descente récente est insuffisante pour conclure.
```

### Commit

```text
feat(objectives): show objective readiness confidence
```

---

## 16. Lot 8 — Intégration Détail activité Trail

### Objectif

Éviter de donner une lecture Trail trop ferme si les données altitude sont partielles.

### Critères

```text
D+ disponible
D- disponible
splits / streams disponibles
distance suffisante
activité typée trail/randonnée
```

### Exemple

```text
Confiance faible : D- absent, charge descente non calculable.
```

### Commit

```text
feat(trail): show trail analysis confidence
```

---

# PARTIE E — Tests

---

## 17. Tests unitaires

Créer :

```text
frontend/src/utils/analysisConfidence.test.js
```

Tests minimaux :

```text
high si données complètes
medium si recovery absent mais charge présente
low si peu d’activités
insufficient si aucune donnée
trail low si D- absent
performance medium si peu de best efforts récents
objective low si objectif incomplet
```

---

## 18. Tests composants

Ajouter tests si infrastructure existante :

```text
ConfidenceBadge affiche le bon label
ConfidenceBadge affiche les raisons
Aujourd’hui affiche confiance
Analytics affiche confiance
Performance affiche confiance
```

---

# PARTIE F — Wording

---

## 19. Libellés recommandés

| Niveau | Libellé |
|---|---|
| high | Confiance élevée |
| medium | Confiance moyenne |
| low | Confiance faible |
| insufficient | Données insuffisantes |

Ne pas utiliser :

```text
score fiable à 92 %
prédiction certaine
diagnostic
```

Préférer :

```text
Lecture prudente
Données partielles
Analyse exploitable avec limites
```

---

# PARTIE G — Référentiel qualité à utiliser

---

## 20. Documents obligatoires

Ce chantier doit s’appuyer sur :

```text
docs/quality/RUNSEE_QUALITY_GATE.md
docs/quality/RUNSEE_TEST_LOG.md
docs/quality/RUNSEE_VALIDATION_MATRIX.md
docs/quality/RUNSEE_RELEASE_CHECKLIST.md si tag
```

---

# PARTIE H — Phase finale — Sécurisation post-chantier

---

## 21. Repo clean

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

## 22. Tests backend

Même si chantier frontend, exécuter :

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

## 23. Tests frontend

Exécuter :

```bash
cd frontend
npm ci
npm test -- --run
npm run build
```

---

## 24. Recette contrôlée

Valider :

```text
Aujourd’hui : confiance affichée, pas de surcharge UX
Analytics : confiance cohérente
Performance : confiance cohérente
Objectifs : confiance cohérente
Détail Trail : confiance basse si D- absent
Activités : aucune régression
Backfill : aucune régression
```

---

## 25. Non-régression métier

Contrôler :

```text
0 doublon visible
dry-run doublons = 0
pas de double comptage Aujourd’hui
pas de double comptage Analytics
aucun lien /activities/undefined
Garmin-only réel visible
randonnées Garmin non injectées dans records route
```

---

## 26. Mise à jour qualité

Mettre à jour :

```text
docs/quality/RUNSEE_TEST_LOG.md
docs/quality/RUNSEE_VALIDATION_MATRIX.md
```

Journaliser :

```text
chantier AnalysisConfidence
commit
tests
recette
risques résiduels
archive review
```

---

## 27. Mise à jour `.ai`

Mettre à jour :

```text
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
.ai/codebase_map.md
```

---

## 28. Archive source review obligatoire

Générer depuis Git :

```bash
git archive --format=zip --output runsee-source-review-analysis-confidence.zip HEAD
```

ou via le script projet :

```powershell
powershell -ExecutionPolicy Bypass -File deployment\scripts\Export-RunSeeSourceArchive.ps1 -OutputPath C:\Services\RuNSee\runsee-source-review-analysis-confidence.zip
```

L’archive ne doit contenir aucun artefact interdit.

---

## 29. Baseline / tag si applicable

Créer un tag uniquement si :

```text
tests OK
recette OK
docs quality alignés
.ai aligné
archive review propre
pas de régression métier
```

Nom proposé :

```bash
git tag runsee-stable-analysis-confidence
git push origin runsee-stable-analysis-confidence
```

---

# PARTIE I — Critères d’acceptation

---

## 30. Critères fonctionnels

Le chantier est terminé si :

```text
Aujourd’hui affiche une confiance lisible
Analytics affiche une confiance lisible
Performance affiche une confiance lisible
Objectifs affiche une confiance lisible si objectif actif
Détail Trail signale les données insuffisantes
Les raisons de confiance sont compréhensibles
Aucun bloc UI lourd ajouté
Aucune promesse scientifique excessive
```

---

## 31. Critères techniques

```text
analysisConfidence.js testé
ConfidenceBadge testé ou recetté
pas de duplication excessive des règles
pas de régression build
pas de régression backend
docs quality mis à jour
archive review générée
```

---

# PARTIE J — Message final attendu de CODEX / Claude Code Pro

```text
Chantier Score de confiance / qualité des analyses

Développements :
- moteur confidence : ...
- badge UI : ...
- Aujourd’hui : ...
- Analytics : ...
- Performance : ...
- Objectifs : ...
- Trail : ...

Tests :
- analysisConfidence.test.js : ...
- frontend tests : ...
- backend tests : ...
- build : ...

Recette :
- Aujourd’hui : ...
- Analytics : ...
- Performance : ...
- Objectifs : ...
- Trail : ...

Qualité :
- RUNSEE_TEST_LOG.md : ...
- RUNSEE_VALIDATION_MATRIX.md : ...
- .ai/*.md : ...
- archive review : ...

Conclusion :
- prêt à merger : oui/non
- risques résiduels : ...
```
