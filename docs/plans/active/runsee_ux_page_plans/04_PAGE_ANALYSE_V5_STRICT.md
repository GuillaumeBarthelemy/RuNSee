# RunNSee — Lot Analyse V5 strict

## 1. Objectif

Construire la page Analyse comme une page d'interprétation de l'entraînement, fidèle au PDF de mockups.

Elle ne doit pas être un empilement des anciens composants analytiques.

## 2. Préconditions

- Recalage Activités terminé.
- Accueil gelé visuellement.
- Quality gate V5 lu.
- PDF pages Analyse lu.
- Analyse code préalable réalisée selon `20_GRILLE_ANALYSE_CODE_AVANT_CHAQUE_LOT_V5.md`.

## 3. Route

```text
/analytics
```

## 4. Sous-onglets obligatoires

| Onglet visible | Hash | Statut attendu |
|---|---|---|
| Vue d'ensemble | `#overview` | complet |
| Charges | `#charges` | complet |
| Tendances | `#tendances` | complet |
| Intensités | `#intensites` | complet |
| Sommeil & récupération | `#recuperation` | complet ou état vide Garmin propre |

Aucun onglet ne doit être un simple placeholder.

## 5. Structure obligatoire

```text
Header Analyse
  titre + sous-titre
  aucune action décorative

Filtre période compact
  même logique que la page Activités recalée
  pas de gros panneau vertical

Sous-onglets
  ligne compacte
  hash stable dans l'URL

Contenu principal
  cartes KPI
  graphiques
  lecture / à retenir
  états vides propres
```

## 6. Règles métier

- Ne pas modifier les calculs `CTL`, `ATL`, `TSB`, charge, zones ou récupération sans justification.
- Ne pas afficher `/100` sauf score réellement borné.
- Ne pas confondre valeur absente et valeur nulle.
- Ne pas double-compter Garmin / Strava.
- Ne pas inventer de données de sommeil, VFC ou énergie.

## 7. Vocabulaire utilisateur

| Technique | Libellé principal visible |
|---|---|
| CTL | Condition |
| ATL | Fatigue |
| TSB | Forme |
| HRV | VFC |
| Body Battery | Énergie |
| YTD | Cumul annuel |

Les termes techniques peuvent rester en tooltip ou glossaire, pas en titre principal.

## 8. Données absentes

Si Garmin, sommeil ou VFC est absent :

- afficher une carte vide propre ;
- expliquer la donnée attendue ;
- proposer un lien Réglages si une connexion existe ;
- ne pas simuler les métriques.

## 9. Composants recommandés

Créer ou adapter :

```text
frontend/src/components/analytics/AnalyticsOverviewTab.jsx
frontend/src/components/analytics/AnalyticsChargesTab.jsx
frontend/src/components/analytics/AnalyticsTrendsTab.jsx
frontend/src/components/analytics/AnalyticsIntensitiesTab.jsx
frontend/src/components/analytics/AnalyticsRecoveryTab.jsx
frontend/src/components/analytics/AnalyticsTakeawayCard.jsx
frontend/src/components/analytics/AnalyticsCompactFilters.jsx
```

`AnalyticsPage.jsx` doit orchestrer, pas contenir toute la présentation.

## 10. Checklist GO

- [ ] 5 onglets présents.
- [ ] Filtres compacts.
- [ ] Aucun ancien empilement non conforme.
- [ ] Aucune donnée fictive.
- [ ] Aucun libellé technique principal.
- [ ] Aucun `NaN` / `undefined` / `null`.
- [ ] État vide récupération propre.
- [ ] Responsive vérifié.
- [ ] Tests et build exécutés.
- [ ] Quality gate rempli.
