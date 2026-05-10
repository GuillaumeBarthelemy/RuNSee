# RunNSee — Lot Performance V5 strict

## 1. Objectif

Construire une page Performance centrée sur le niveau, les allures, la fréquence cardiaque de performance et les records.

Elle ne doit pas refaire Analyse.

## 2. Route

```text
/performance
```

## 3. Sous-onglets obligatoires

| Onglet visible | Hash | Statut attendu |
|---|---|---|
| Vue d'ensemble | `#overview` | complet |
| VDOT & profil | `#vdot` | complet ou état données insuffisantes |
| Allures de référence | `#allures` | complet |
| FC de performance | `#fc-performance` | complet ou état vide |
| Records | `#records` | complet |

## 4. Règles fortes

- L'onglet Records est obligatoire.
- Ne pas afficher une prédiction certaine.
- Ne pas mélanger route et trail sans avertissement.
- Ne pas inventer de VDOT ou d'allure si les données sont insuffisantes.
- Ne pas modifier les utilitaires de calcul sans justification.
- Ne pas ajouter de page Puissance.
- Ne pas afficher de chrono comme vérité absolue.

## 5. Structure attendue

```text
Header Performance
Sous-onglets
Bandeau niveau / estimation
Cartes principales
Bloc confiance
CTA objectif discret si existant
```

## 6. Libellés recommandés

- `Niveau observé`
- `Estimation`
- `Allures de référence`
- `Records`
- `Confiance`
- `Repère`

Interdits :

- `prédiction certaine`
- `tu vaux exactement`
- termes anglais en titre principal.

## 7. Composants recommandés

```text
frontend/src/components/performance/PerformanceOverviewTab.jsx
frontend/src/components/performance/PerformanceVdotTab.jsx
frontend/src/components/performance/PerformanceReferencePacesTab.jsx
frontend/src/components/performance/PerformanceHeartRateTab.jsx
frontend/src/components/performance/PerformanceRecordsTab.jsx
frontend/src/components/performance/PerformanceConfidenceNote.jsx
```

## 8. Checklist GO

- [ ] 5 onglets présents.
- [ ] Records présent.
- [ ] Aucun chrono certain.
- [ ] Aucune donnée inventée.
- [ ] Route/trail distingués ou avertissement.
- [ ] États vides propres.
- [ ] Tests/build exécutés.
- [ ] Quality gate rempli.
