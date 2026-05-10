# RunNSee — Orchestration chantier V5 finalisation

## 1. Objectif

Piloter les lots restants sans recalage UX manuel systématique.

La règle est simple : un lot ne passe au suivant que si son rendu est suffisamment fidèle au PDF et si la non-régression est documentée.

## 2. Séquence obligatoire

| Ordre | Lot | Fichier à suivre | Sortie attendue |
|---:|---|---|---|
| 1 | Recalage Activités | `14_RECALAGE_LOT_03_ACTIVITES_AVANT_LOT_04.md` | Activités proche PDF, filtres compacts, cartes propres |
| 2 | Analyse | `04_PAGE_ANALYSE_V5_STRICT.md` | 5 sous-onglets complets |
| 3 | Performance | `05_PAGE_PERFORMANCE_V5_STRICT.md` | 5 sous-onglets dont Records |
| 4 | Progression | `06_PAGE_PROGRESSION_V5_STRICT.md` | 4 sous-onglets non-placeholder |
| 5 | Réglages | `07_PAGE_REGLAGES_V5_STRICT.md` | 5 onglets propres et sécurisés |
| 6 | Glossaire | `08_PAGE_GLOSSAIRE_V5_STRICT.md` | Page dédiée stable |
| 7 | Recette transverse | `17_RECETTE_TRANSVERSE_V5.md` | cohérence globale validée |
| 8 | Déploiement local | `18_DEPLOIEMENT_LOCAL_ET_VALIDATION_V5.md` | démarrage local validé |
| 9 | Clôture / baseline | `19_CLOTURE_CHANTIER_ET_BASELINE_V5.md` | repo propre + documentation alignée |

## 3. Règle de passage

Un lot suivant ne démarre pas tant que le lot courant n'a pas produit :

- bilan GO / NO GO ;
- mapping PDF -> code ;
- liste des fichiers modifiés ;
- résultats tests ;
- résultat build ;
- écarts vs PDF ;
- placeholders / backlog ;
- risques de régression ;
- décision claire.

## 4. Gestion des écarts

| Type d'écart | Décision |
|---|---|
| Écart structurel vs PDF | Correction dans le lot courant |
| Écart wording / accent | Correction immédiate |
| Écart donnée absente | État vide ou placeholder documenté |
| Écart métier non tranché | Ne pas changer le calcul, documenter |
| Écart responsive | Correction avant GO |
| Écart mineur cosmétique | Backlog possible uniquement si accepté explicitement |

## 5. Livrables documentaires à maintenir

Après chaque lot, Claude doit mettre à jour ou créer :

```text
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
docs/quality/RUNSEE_TEST_LOG.md
docs/quality/RUNSEE_VALIDATION_MATRIX.md
docs/backlog/BACKLOG_FONCTIONNALITES_FUTURES.md
docs/changelog/RUNSEE_UX_CHANGELOG.md
```

## 6. Règle sur les composants existants

Les composants existants peuvent être réutilisés uniquement s'ils servent le mockup.

Interdit : empiler des composants existants pour aller vite si la structure visuelle ne correspond pas au PDF.

## 7. Règle sur les données

La donnée absente donne lieu à :

- état vide propre ;
- explication courte ;
- lien d'action si disponible ;
- entrée backlog si développement futur.

Elle ne donne jamais lieu à une simulation silencieuse.
