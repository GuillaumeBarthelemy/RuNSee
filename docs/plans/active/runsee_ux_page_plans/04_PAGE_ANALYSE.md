# RunNSee — Plan page Analyse

Référence PDF : pages 7 à 11  
Route : `/analytics`  
Fichier principal : `frontend/src/pages/AnalyticsPage.jsx`  
Priorité : P1 — restructuration obligatoire en sous-onglets.

---

## 1. Compréhension du besoin

La page Analyse doit expliquer l'état d'entraînement actuel sur une période courte / moyenne :

- charge ;
- fatigue ;
- tendances récentes ;
- intensités ;
- sommeil et récupération.

Elle ne doit pas absorber la page Progression ni la page Performance.

---

## 2. État actuel connu

`AnalyticsPage.jsx` empile plusieurs sections dans une même page.  
Cela fonctionne, mais ne correspond pas au PDF.

Composants existants potentiellement réutilisables :

- `TrainingSummaryKpiGrid.jsx`
- `TrainingStateGaugeGrid.jsx`
- `RollingLoadChart.jsx`
- `RecoveryVsLoadChart.jsx`
- `DynamicsGrid.jsx`
- `WeeklyVolumeChart.jsx`
- `MonthlyVolumeChart.jsx`
- `PerformanceTrendChart.jsx`
- `PeriodComparisonSection.jsx`
- `ZoneLoadDistributionCard.jsx`
- `AnalysisConfidenceBadge.jsx`

---

## 3. Sous-onglets obligatoires

Utiliser `SubTabs` avec hash URL.

| Onglet UI | Hash recommandé | Page PDF | Rôle |
|---|---|---:|---|
| Vue d'ensemble | `#overview` | 7 | Synthèse courte |
| Charges | `#charges` | 8 | Charge / fatigue / condition |
| Tendances | `#tendances` | 9 | Tendances période sélectionnée |
| Intensités | `#intensites` | 10 | Zones et intensité |
| Sommeil & récupération | `#recuperation` | 11 | Garmin / récupération |

---

## 4. Fichiers à lire avant modification

- `frontend/src/pages/AnalyticsPage.jsx`
- `frontend/src/components/AnalyticsFiltersBar.jsx`
- `frontend/src/components/TrainingSummaryKpiGrid.jsx`
- `frontend/src/components/TrainingStateGaugeGrid.jsx`
- `frontend/src/components/RollingLoadChart.jsx`
- `frontend/src/components/RecoveryVsLoadChart.jsx`
- `frontend/src/components/DynamicsGrid.jsx`
- `frontend/src/components/WeeklyVolumeChart.jsx`
- `frontend/src/components/MonthlyVolumeChart.jsx`
- `frontend/src/components/PeriodComparisonSection.jsx`
- `frontend/src/components/ZoneLoadDistributionCard.jsx`
- `frontend/src/components/AnalysisConfidenceBadge.jsx`
- `frontend/src/components/visuals/alpine/SubTabs.jsx`
- `frontend/src/utils/activityInsights.js`
- `frontend/src/utils/loadDynamics.js`
- `frontend/src/utils/periodComparison.js`
- `frontend/src/utils/todayVolumeSummary.js`
- `frontend/src/utils/recoveryViewModel.js`
- `frontend/src/styles.css`

---

## 5. Composants à créer

Créer ou compléter :

```text
frontend/src/components/analytics/
```

Composants :

- `AnalyticsOverviewTab.jsx`
- `AnalyticsChargesTab.jsx`
- `AnalyticsTrendsTab.jsx`
- `AnalyticsIntensitiesTab.jsx`
- `AnalyticsRecoveryTab.jsx`
- `AnalyticsKeyTakeaways.jsx`
- `AnalyticsMetricCard.jsx` si une primitive manque réellement

Règle : `AnalyticsPage.jsx` garde les filtres et les données calculées communes. Les tabs reçoivent des props. Ne pas recalculer tout dans chaque onglet.

---

## 6. Onglet Vue d'ensemble — page PDF 7

### Structure attendue

1. header `Analyse` ;
2. filtres période ;
3. sous-onglets ;
4. résumé d'état ;
5. KPI principaux ;
6. bloc `À retenir` ;
7. mini synthèse charge / intensité / récupération.

### Contenu attendu

- Charge actuelle ;
- Fatigue ;
- Condition ;
- Volume période ;
- Intensité dominante ;
- Récupération si disponible.

### Interdits

- records ;
- prédictions chrono ;
- cumul annuel complet ;
- tableau d'activités.

---

## 7. Onglet Charges — page PDF 8

### Structure attendue

- KPI charge ;
- KPI fatigue ;
- KPI condition ;
- KPI équilibre charge/fatigue ;
- graphique charge/fatigue ;
- explication courte ;
- seuils / lecture du niveau.

### Règles métier

- Ne pas modifier `buildTrainingLoadStateModel` ou équivalent.
- ATL/CTL/TSB peuvent rester en tooltip ou entre parenthèses, mais pas en libellé principal.
- Aucun nouveau calcul de charge sans preuve d'équivalence.

---

## 8. Onglet Tendances — page PDF 9

### Structure attendue

- volume récent ;
- fréquence hebdomadaire ;
- dénivelé récent ;
- comparaison courte période ;
- graphique tendance courte / moyenne période.

### Règle anti-doublon

Ce qui est annuel ou long terme doit aller dans Progression.

À garder ici :

- 4 dernières semaines ;
- période sélectionnée ;
- comparaison bloc courant vs bloc précédent.

À déplacer vers Progression :

- cumul depuis janvier ;
- N-1 ;
- tendance annuelle ;
- régularité longue période.

---

## 9. Onglet Intensités — page PDF 10

### Structure attendue

- répartition intensités ;
- temps en zones ;
- séances de qualité ;
- lecture pédagogique ;
- légende claire.

Réutiliser `ZoneLoadDistributionCard` si possible.

### Règles

- ne pas recalculer les zones si paramètres existants ;
- ne pas afficher une zone comme 0 si donnée absente ;
- afficher un état vide si FC non disponible.

---

## 10. Onglet Sommeil & récupération — page PDF 11

### Structure attendue

- sommeil moyen ;
- VFC ;
- FC repos ;
- Énergie ;
- stress si disponible ;
- récupération ;
- qualité/confiance données ;
- conseil prudent.

### Règles

- Garmin absent : état vide propre.
- Pas de diagnostic médical.
- Ne pas confondre récupération du jour et performance.

---

## 11. Risques / points de vigilance

| Risque | Contrôle |
|---|---|
| Recalculs dupliqués dans chaque tab | centraliser dans `AnalyticsPage.jsx` |
| Analyse absorbe Progression | appliquer règle anti-doublon |
| Hash URL cassé | tester chaque hash |
| Filtres réinitialisés au changement d'onglet | conserver état |
| Libellés techniques bruts | appliquer vocabulaire canonique |
| Page blanche si data absente | états vides dans chaque tab |

---

## 12. Vérification de non-régression

Commandes :

```bash
cd frontend
npm test -- --run
npm run build
```

Recherches :

```bash
rg "YTD|HRV|Body Battery|GAP|Decoupling|EPOC|ATL|CTL|TSB" frontend/src/pages frontend/src/components frontend/src/content
```

Contrôles manuels :

- `/analytics#overview`
- `/analytics#charges`
- `/analytics#tendances`
- `/analytics#intensites`
- `/analytics#recuperation`
- changement de période ;
- mobile ;
- absence de données Garmin ;
- absence de FC.

---

## 13. Critères d'acceptation

- Analyse est structurée en 5 sous-onglets.
- Chaque sous-onglet correspond à une page PDF 7 à 11.
- Les filtres restent fonctionnels.
- Aucun doublon majeur avec Progression.
- Aucun record ou prédiction chrono n'est dans Analyse.
- Les données absentes sont gérées proprement.
- Build frontend OK.
