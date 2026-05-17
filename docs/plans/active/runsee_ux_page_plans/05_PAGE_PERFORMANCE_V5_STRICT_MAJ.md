# RunNSee — Lot Performance V5 strict — MAJ mockups pages 12 à 16

## 1. Objectif

Construire une page **Performance** centrée sur le niveau sportif, les allures, la fréquence cardiaque de performance et les records.

Cette page ne doit pas refaire **Analyse** et ne doit pas refaire **Progression**.

Règle métier validée :

```text
Analyse     = comprendre l’état d’entraînement actuel.
Performance = mesurer le niveau et les capacités.
Progression = suivre la construction long terme.
```

---

## 2. Route

```text
/performance
```

---

## 3. Sous-onglets obligatoires

| Ordre | Onglet visible | Hash | Statut attendu | Page PDF mockup |
|---:|---|---|---|---:|
| 1 | Vue d'ensemble | `#overview` | complet | 12 |
| 2 | VDOT & profil | `#vdot` | complet ou état données insuffisantes | 13 |
| 3 | Allures de référence | `#allures` | complet | 14 |
| 4 | FC de performance | `#fc-performance` | complet ou état vide | 15 |
| 5 | Records | `#records` | complet | 16 |

Ces 5 sous-onglets remplacent définitivement l’ancienne proposition qui contenait **Puissance**.

---

## 4. Règles fortes non négociables

- L’onglet **Records** est obligatoire.
- L’onglet **Puissance** est interdit.
- Aucune carte, aucun graphique, aucun sous-onglet et aucun texte utilisateur ne doit porter sur la puissance.
- Ne pas afficher une prédiction certaine.
- Ne pas afficher un chrono comme vérité absolue.
- Ne pas mélanger route et trail sans avertissement.
- Ne pas inventer de VDOT ou d’allure si les données sont insuffisantes.
- Ne pas modifier les utilitaires de calcul sans justification explicitement documentée.
- Ne pas déplacer des graphiques de Progression dans Performance.
- Ne pas déplacer des graphiques de récupération d’Analyse dans Performance.

Éléments explicitement interdits :

```text
Puissance
Puissance critique
Puissance moyenne
Zones de puissance
Endurance fondamentale basée sur puissance
Graphiques violets de puissance
Conseils liés à la puissance
```

---

## 5. Références livrables

Le PDF de présentation corrigé doit remplacer les pages 12 à 16 par les mockups Performance V5 strict :

```text
runsee_mockups_support_presentation_final_PERFORMANCE_CORRIGE.pdf
```

Les pages concernées sont :

```text
12 - Performance / Vue d’ensemble
13 - Performance / VDOT & profil
14 - Performance / Allures de référence
15 - Performance / FC de performance
16 - Performance / Records
```

---

## 6. Structure visuelle commune Performance

Toutes les pages Performance doivent conserver :

```text
Sidebar RunNSee Alpine Light
Header Performance
Sous-titre court et non technique
Topbar météo / période
Image montagne Alpine Light discrète
Sous-onglets horizontaux
Cartes blanches arrondies
Texte bleu nuit
Accent bleu RunNSee
Badges de confiance discrets
Conseil du jour en bas de page
```

Contraintes d’interface :

- aucune surcharge visuelle ;
- pas de dark mode ;
- pas de blocs sombres ;
- pas de scroll horizontal ;
- sous-onglets scrollables sur mobile ;
- cards compactes ;
- graphiques lisibles ;
- cohérence stricte avec les autres vues Alpine Light.

---

## 7. Page 12 — Performance / Vue d’ensemble

### 7.1 Objectif

Donner une synthèse rapide du niveau sportif actuel.

Question utilisateur :

```text
Quel est mon niveau actuel et quels signaux l’expliquent ?
```

### 7.2 Contenu obligatoire

Cartes hautes :

```text
Allure ajustée
VDOT estimé
Économie de course
Endurance fondamentale
```

Blocs centraux :

```text
Zones de fréquence cardiaque - aperçu léger
Distribution des allures - aperçu léger
Meilleures performances
Tendances de performance
À retenir / confiance de l’estimation
```

### 7.3 Graphiques autorisés

| Graphique | Statut | Remarque |
|---|---|---|
| Mini trend Allure ajustée | obligatoire | signal de niveau, pas analyse complète |
| Mini trend VDOT estimé | obligatoire | estimation prudente |
| Mini trend Économie de course | obligatoire | si calcul disponible, sinon état vide |
| Mini trend Endurance fondamentale | obligatoire | résumer sans détailler les intensités |
| Donut zones FC | autorisé en aperçu | ne doit pas refaire Analyse > Intensités |
| Distribution des allures | autorisé en aperçu | ne doit pas refaire l’onglet Allures |
| Tendances de performance | obligatoire | VDOT ou score performance, pas volume |
| Résumé du mois | interdit | relève de Progression |

### 7.4 États vides

Si les données sont insuffisantes :

```text
Données insuffisantes pour estimer ce signal.
```

Ne jamais inventer une valeur.

### 7.5 Garde-fous

- Ne pas afficher Cumul annuel.
- Ne pas afficher volume hebdomadaire + moyenne glissante.
- Ne pas afficher sommeil / VFC / Énergie.
- Ne pas afficher de puissance.

---

## 8. Page 13 — Performance / VDOT & profil

### 8.1 Objectif

Expliquer le niveau estimé et ses limites.

Question utilisateur :

```text
Quelle est mon estimation de niveau et sur quels signaux repose-t-elle ?
```

### 8.2 Contenu obligatoire

```text
VDOT estimé
Évolution sur 90 jours
Profil de performance indicatif
Décomposition indicatrice du profil
Indicateurs clés estimés
Confiance de l’estimation
Limites de lecture
À retenir
```

### 8.3 Graphiques autorisés

| Graphique | Statut | Remarque |
|---|---|---|
| Courbe VDOT estimé | obligatoire | période 90 jours par défaut |
| Radar profil performance | obligatoire | indicatif, pas mesure laboratoire |
| Barres décomposition profil | obligatoire | endurance / seuil / vitesse / VO2max / endurance musculaire |
| Gauge confiance | obligatoire | doit expliquer pourquoi |

### 8.4 Wording scientifique obligatoire

Utiliser :

```text
VDOT estimé
Profil indicatif
Confiance de l’estimation
Limites de lecture
```

Éviter :

```text
VO2max réelle
profil physiologique exact
prédiction certaine
```

### 8.5 États vides

Si pas assez de données : afficher une page propre :

```text
Estimation indisponible
Nous avons besoin de plus d’activités récentes avec allure et fréquence cardiaque pour estimer ton profil.
```

---

## 9. Page 14 — Performance / Allures de référence

### 9.1 Objectif

Fournir des repères d’allures exploitables, calculés à partir du niveau estimé et du profil récent.

Question utilisateur :

```text
Quelles allures puis-je utiliser pour mes entraînements ?
```

### 9.2 Contenu obligatoire

```text
Allure facile
Endurance
Marathon
Seuil
10 km
5 km
1 km
Comparaison des allures de référence
Évolution de l’allure seuil
Équivalences prudentes
Zones d’allure
Comment utiliser les allures
```

### 9.3 Graphiques autorisés

| Graphique | Statut | Remarque |
|---|---|---|
| Cartes allures | obligatoire | 7 cartes compactes |
| Barres comparaison allures | obligatoire | plus clair qu’un graphique complexe |
| Évolution allure seuil | obligatoire | tendance courte, prudente |
| Table équivalences | obligatoire | avec avertissement |
| Table zones d’allure | obligatoire | usage entraînement |

### 9.4 Garde-fous

- Les allures sont des repères, pas une obligation.
- Les allures doivent pouvoir être adaptées au terrain, à la fatigue et aux conditions.
- Ne pas afficher de prédiction chrono comme certitude.
- Ne pas mélanger route/trail sans avertissement.

### 9.5 Texte d’avertissement obligatoire

```text
Ces allures sont des repères. Elles peuvent varier selon le profil, le dénivelé, la fatigue et les conditions.
```

---

## 10. Page 15 — Performance / FC de performance

### 10.1 Objectif

Analyser la capacité à gérer l’effort cardiaque sur les efforts clés.

Question utilisateur :

```text
Comment mon cœur réagit-il dans les efforts structurants ?
```

### 10.2 Contenu obligatoire

```text
FC seuil estimée
FC max estimée
Dérive cardiaque
FC repos - discret uniquement
FC dans les efforts clés
Évolution FC seuil
Dérive cardiaque en condition stable
Lecture de l’effort
Répartition du temps par intensité cardiaque - synthèse légère
```

### 10.3 Graphiques autorisés

| Graphique | Statut | Remarque |
|---|---|---|
| Mini trend FC seuil | obligatoire | estimation prudente |
| Mini trend FC max | obligatoire | estimation prudente |
| Mini trend dérive cardiaque | obligatoire | signal clé performance |
| FC dans efforts clés | obligatoire | table + barres |
| Évolution FC seuil | obligatoire | tendance lissée |
| Dérive cardiaque stable | obligatoire | exemple sortie stable |
| Donut intensité cardiaque | autorisé | synthèse légère, pas doublon Analyse |

### 10.4 Doublons à éviter

Ne pas refaire Analyse > Sommeil & récupération :

```text
VFC
Sommeil
Énergie
Stress
Récupération complète
```

Ne pas refaire Analyse > Intensités :

```text
Distribution complète des zones sur toute la période
Temps en zones détaillé par semaine
```

### 10.5 Positionnement exact

```text
Analyse > Intensités = comment le temps d’entraînement est distribué.
Performance > FC de performance = comment le cœur réagit dans les efforts clés.
```

---

## 11. Page 16 — Performance / Records

### 11.1 Objectif

Suivre les meilleurs temps, meilleurs segments et la progression des records.

Question utilisateur :

```text
Quels records ai-je battus et comment évoluent mes références ?
```

### 11.2 Contenu obligatoire

```text
Meilleurs temps
Meilleurs segments
Progression des records
Historique des records
Séances associées
Filtres route / trail
Résumé des records
Confiance source
```

### 11.3 Graphiques autorisés

| Graphique | Statut | Remarque |
|---|---|---|
| Table meilleurs temps | obligatoire | route/trail distingués |
| Table meilleurs segments | obligatoire | segments trail possibles |
| Table progression records | obligatoire | écart + tendance |
| Historique des records | obligatoire | traçabilité |
| Séances associées | obligatoire | lien vers activité |
| Donut records par distance | optionnel | seulement si utile |

### 11.4 Règles données

- Exclure les activités `isMerged`.
- Exclure les randonnées des records route.
- Distinguer route et trail.
- Indiquer la source si disponible.
- Indiquer la confiance si calculée.
- Ne pas mélanger segment trail et record route.

---

## 12. Placeholders autorisés

Certains éléments peuvent être intégrés en placeholder si la donnée n’existe pas encore.

Créer ou mettre à jour :

```text
docs/ux/PLACEHOLDERS_ALPINE_LIGHT.md
```

| Élément | Page | Placeholder autorisé | Développement futur |
|---|---|---|---|
| Économie de course | Vue d’ensemble / VDOT | oui | calcul robuste à confirmer |
| Profil radar VDOT | VDOT & profil | oui si données insuffisantes | modèle de profil à stabiliser |
| FC seuil estimée | FC de performance | oui | estimation à valider scientifiquement |
| FC max estimée | FC de performance | oui | source Garmin ou profil utilisateur |
| Records segments trail | Records | oui | si segments non disponibles |
| Confiance source record | Records | oui | si score de confiance non branché |

Tout placeholder doit être visible comme tel côté documentation, mais l’UI ne doit pas afficher “placeholder”.

UI recommandée :

```text
Données insuffisantes
Disponible après quelques activités supplémentaires
```

---

## 13. Composants recommandés

```text
frontend/src/components/performance/PerformanceOverviewTab.jsx
frontend/src/components/performance/PerformanceVdotTab.jsx
frontend/src/components/performance/PerformanceReferencePacesTab.jsx
frontend/src/components/performance/PerformanceHeartRateTab.jsx
frontend/src/components/performance/PerformanceRecordsTab.jsx
frontend/src/components/performance/PerformanceConfidenceNote.jsx
frontend/src/components/performance/PerformanceEmptyState.jsx
frontend/src/components/performance/PerformanceMetricCard.jsx
frontend/src/components/performance/PerformanceMiniTrend.jsx
frontend/src/components/performance/PerformanceDataQualityBadge.jsx
```

Réutiliser si existants :

```text
MetricGauge
RangeBar
MicroBars
TrendChip
BandPositioner
InfoTooltip
GlossaryLink
AnalysisConfidenceBadge
```

---

## 14. Tests et recette spécifiques Performance

### 14.1 Tests unitaires / composants

Créer ou compléter :

```text
PerformancePage.test.jsx
PerformanceOverviewTab.test.jsx
PerformanceVdotTab.test.jsx
PerformanceReferencePacesTab.test.jsx
PerformanceHeartRateTab.test.jsx
PerformanceRecordsTab.test.jsx
```

### 14.2 Tests métier

Vérifier :

```text
5 onglets présents
Records présent
Puissance absente
aucun chrono certain
aucune donnée inventée
route/trail distingués ou avertissement
états vides propres
randonnées exclues des records route
activités merged exclues
```

### 14.3 Tests visuels manuels

Vérifier desktop et mobile :

```text
Vue d’ensemble
VDOT & profil
Allures de référence
FC de performance
Records
```

Aucun overflow horizontal.

---

## 15. Quality Gate

À la fin du lot :

```bash
cd frontend
npm test -- --run
npm run build
```

Même si le backend n’est pas modifié :

```bash
cd backend
npm run prisma:generate
npx prisma validate
npm run prisma:pg:validate
npm run db:compare-schemas
npm test
node --check src/app.js
node --check src/server.js
```

Git :

```bash
git status --short
git diff --stat
git diff --check
```

Mettre à jour :

```text
docs/quality/RUNSEE_TEST_LOG.md
docs/quality/RUNSEE_VALIDATION_MATRIX.md
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
.ai/codebase_map.md
SUIVI_CHANTIER_ALPINE_LIGHT.md
docs/ux/PLACEHOLDERS_ALPINE_LIGHT.md
```

---

## 16. Checklist GO

- [ ] 5 onglets présents.
- [ ] Records présent.
- [ ] Puissance absente partout.
- [ ] Aucun chrono certain.
- [ ] Aucune donnée inventée.
- [ ] Route/trail distingués ou avertissement.
- [ ] États vides propres.
- [ ] VDOT affiché comme estimation.
- [ ] Profil affiché comme indicatif.
- [ ] FC Performance ne duplique pas Analyse.
- [ ] Vue d’ensemble ne duplique pas tous les sous-onglets.
- [ ] Records exclut les activités merged.
- [ ] Records exclut les randonnées des records route.
- [ ] Tests/build exécutés.
- [ ] Quality gate rempli.
- [ ] PDF pages 12 à 16 corrigées.
- [ ] Plan Performance V5 strict aligné avec le PDF corrigé.

---

## 17. Message attendu de Claude / CODEX

```text
Lot Performance V5 strict

Pages / onglets livrés :
- Vue d’ensemble : ...
- VDOT & profil : ...
- Allures de référence : ...
- FC de performance : ...
- Records : ...

Éléments supprimés :
- Puissance : oui/non

Graphiques :
- ajoutés : ...
- supprimés : ...
- placeholders documentés : ...

Anti-doublon :
- Analyse : ...
- Progression : ...

Tests :
- frontend : ...
- backend : ...
- build : ...

Documentation :
- RUNSEE_TEST_LOG.md : ...
- RUNSEE_VALIDATION_MATRIX.md : ...
- PLACEHOLDERS_ALPINE_LIGHT.md : ...
- SUIVI_CHANTIER_ALPINE_LIGHT.md : ...

Décision :
- GO / NO-GO : ...
- risques résiduels : ...
```
