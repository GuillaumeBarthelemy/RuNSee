# RunNSee — Lot Progression V5 strict

## 1. Objectif

Remplacer tout placeholder par une page Progression réelle, centrée sur l'évolution long terme.

La page Progression ne doit pas absorber Analyse ou Performance.

## 2. Route

```text
/progression
```

## 3. Sous-onglets obligatoires

| Onglet visible | Hash | Rôle |
|---|---|---|
| Cumul annuel | `#cumul-annuel` | volume depuis début d'année |
| Volume | `#volume` | distance / durée / D+ |
| Régularité | `#regularite` | fréquence, semaines actives |
| Comparaisons | `#comparaisons` | période vs période |

## 4. Règles métier

- Respecter le premier jour de semaine paramétré.
- Ne pas double-compter Garmin/Strava.
- Ne pas comparer deux périodes de durées différentes sans mention.
- Ne pas afficher `YTD` : utiliser `Cumul annuel`.
- Ne pas inventer d'objectif annuel.
- Ne pas afficher un delta si le dénominateur vaut 0.
- Ne pas confondre absence de donnée et valeur zéro.

## 5. Structure attendue

```text
Header Progression
Sous-titre long terme
Sous-onglets
KPI long terme
Graphiques
Lecture / conclusion
```

## 6. Composants recommandés

```text
frontend/src/components/progression/ProgressionYearToDateTab.jsx
frontend/src/components/progression/ProgressionVolumeTab.jsx
frontend/src/components/progression/ProgressionRegularityTab.jsx
frontend/src/components/progression/ProgressionComparisonTab.jsx
frontend/src/components/progression/ProgressionInsightCard.jsx
```

## 7. Checklist GO

- [ ] Aucun placeholder global.
- [ ] 4 onglets présents.
- [ ] Cumul annuel sans `YTD`.
- [ ] Volume / durée / D+ / séances affichés proprement.
- [ ] Comparaisons fiables.
- [ ] États vides propres.
- [ ] Tests/build exécutés.
- [ ] Quality gate rempli.
