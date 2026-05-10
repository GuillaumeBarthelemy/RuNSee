# RunNSee — Plan page Progression

Référence PDF : pages 17 à 20  
Route : `/progression`  
Fichier principal : `frontend/src/pages/ProgressionPage.jsx`  
Priorité : P1 critique — page actuellement placeholder.

---

## 1. Compréhension du besoin

La page Progression doit montrer la construction long terme :

- cumul annuel ;
- volume ;
- régularité ;
- comparaisons.

C'est la page qui donne du recul, contrairement à Analyse qui lit l'état récent.

---

## 2. État actuel connu

`ProgressionPage.jsx` est ou était un placeholder.  
C'est incompatible avec le PDF, qui consacre plusieurs pages à cette partie.

Cette page doit être développée réellement, pas maquillée.

---

## 3. Sous-onglets obligatoires

Utiliser `SubTabs` avec hash URL.

| Onglet UI | Hash recommandé | Page PDF | Rôle |
|---|---|---:|---|
| Cumul annuel | `#cumul-annuel` | 17 | Depuis le 1er janvier |
| Volume | `#volume` | 18 | Distance / temps / D+ long terme |
| Régularité | `#regularite` | 19 | Fréquence et constance |
| Comparaisons | `#comparaisons` | 20 | N-1, blocs, route/trail |

---

## 4. Fichiers à lire avant modification

- `frontend/src/pages/ProgressionPage.jsx`
- `frontend/src/components/WeeklyVolumeChart.jsx`
- `frontend/src/components/MonthlyVolumeChart.jsx`
- `frontend/src/components/PeriodComparisonSection.jsx`
- `frontend/src/components/DistanceDistributionChart.jsx`
- `frontend/src/components/SportDistributionChart.jsx`
- `frontend/src/components/WeekdayDistributionChart.jsx`
- `frontend/src/components/visuals/alpine/SubTabs.jsx`
- `frontend/src/components/visuals/alpine/KpiCard.jsx`
- `frontend/src/components/visuals/alpine/KpiChartCard.jsx`
- `frontend/src/components/visuals/alpine/EmptyState.jsx`
- `frontend/src/utils/activityAggregations.js`
- `frontend/src/utils/periodComparison.js`
- `frontend/src/utils/todayVolumeSummary.js`
- `frontend/src/utils/weekStart.js`
- `frontend/src/content/trainingMvpCopy.js`
- `frontend/src/styles.css`

---

## 5. Composants à créer

Créer :

```text
frontend/src/components/progression/
```

Composants :

- `ProgressionAnnualTab.jsx`
- `ProgressionVolumeTab.jsx`
- `ProgressionRegularityTab.jsx`
- `ProgressionComparisonsTab.jsx`
- `AnnualSummaryKpis.jsx`
- `RegularityCalendarCard.jsx` ou alternative simple
- `ProgressionHighlightsCard.jsx`

Règle : composants de présentation + agrégation frontend à partir des activités déjà chargées. Pas de backend.

---

## 6. Onglet Cumul annuel — page PDF 17

### Structure attendue

- titre `Cumul annuel` ;
- période : depuis le 1er janvier de l'année courante ;
- KPI : distance, durée, D+, nombre de séances, jours actifs ;
- progression vs objectif si objectif disponible ;
- faits marquants ;
- tendance depuis janvier.

### Règles de calcul

- Filtrer les activités depuis le 1er janvier local.
- Exclure les activités masquées/fusionnées selon logique existante.
- Ne pas compter deux fois Strava + Garmin.
- Utiliser `Cumul annuel`, jamais `YTD`.

### État vide

Si aucune activité sur l'année : afficher une carte vide propre.

---

## 7. Onglet Volume — page PDF 18

### Structure attendue

- volume hebdomadaire ;
- moyenne glissante 4 semaines ;
- volume mensuel ;
- temps hebdomadaire ;
- dénivelé hebdomadaire ;
- tendance longue période.

### Réutilisation

Réutiliser si possible :

- `WeeklyVolumeChart.jsx`
- `MonthlyVolumeChart.jsx`

Mais vérifier que leur libellé et leur style sont compatibles Alpine Light.

### Règle anti-doublon

Les graphiques annuels ou long terme doivent être ici, pas dans Analyse.

---

## 8. Onglet Régularité — page PDF 19

### Structure attendue

- fréquence hebdomadaire ;
- calendrier ou grille de régularité ;
- semaines actives ;
- meilleure série ;
- jours actifs ;
- répartition par jour de semaine ;
- lecture coach non culpabilisante.

### Calculs simples acceptables

- nombre de semaines avec au moins 1 activité ;
- nombre moyen d'activités par semaine ;
- plus longue série de semaines actives ;
- jours de semaine les plus fréquents.

### Wording

Acceptable :

- `Régularité solide sur les dernières semaines.`
- `Quelques semaines plus légères, sans rupture majeure.`

À éviter :

- `Manque de discipline` ;
- `Mauvaise régularité`.

---

## 9. Onglet Comparaisons — page PDF 20

### Structure attendue

- année courante vs N-1 ;
- bloc courant vs bloc précédent ;
- route vs trail ;
- distance / durée / D+ ;
- ce qui progresse ;
- à surveiller.

### Réutilisation

`PeriodComparisonSection.jsx` peut être réutilisé ou adapté.  
Si ce composant est actuellement dans Analyse, clarifier la séparation :

- comparaison courte période : Analyse Tendances ;
- comparaison annuelle / N-1 : Progression Comparaisons.

---

## 10. Vocabulaire interdit

Rechercher et remplacer dans ce périmètre :

- `YTD` -> `Cumul annuel` ou `Depuis le début de l'année` ;
- `year to date` -> `depuis le début de l'année` ;
- `Long term trends` -> `Tendances long terme` si libellé utile.

---

## 11. Risques / points de vigilance

| Risque | Contrôle |
|---|---|
| Double comptage Strava/Garmin | vérifier activités fusionnées |
| Duplication avec Analyse | appliquer règle anti-doublon |
| YTD résiduel | `rg "YTD|year to date" frontend/src` |
| Graphiques vides cassés | état vide dans chaque tab |
| Page trop lourde | calculs memoïsés si nécessaire |
| Cumul basé sur mauvaise date | vérifier 1er janvier local |

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
rg "YTD|year to date|cumul|ProgressionPage|PeriodComparisonSection" frontend/src
```

Contrôles manuels :

- `/progression#cumul-annuel`
- `/progression#volume`
- `/progression#regularite`
- `/progression#comparaisons`
- année avec données ;
- période sans données ;
- mobile 375 px.

---

## 13. Critères d'acceptation

- La page Progression n'est plus un placeholder.
- Les 4 sous-onglets existent.
- Le cumul annuel est réel et non fictif.
- Aucun `YTD` visible.
- Les comparaisons longues sont dans Progression.
- Les graphiques gèrent les états vides.
- Build frontend OK.
