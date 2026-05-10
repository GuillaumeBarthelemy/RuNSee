# RunNSee — Plan page Performance

Référence PDF : pages 12 à 16  
Route : `/performance`  
Fichier principal : `frontend/src/pages/PerformancePage.jsx`  
Priorité : P1 — restructuration obligatoire, Records à ajouter.

---

## 1. Compréhension du besoin

La page Performance doit répondre à la question : **quel est mon niveau et de quoi suis-je capable ?**

Elle porte :

- VDOT ;
- profil de coureur ;
- allures de référence ;
- FC de performance ;
- records.

Elle ne doit pas afficher une rubrique Puissance ni mélanger excessivement récupération et analyse d'entraînement.

---

## 2. État actuel connu

`PerformancePage.jsx` est une page unique.  
Elle contient ou réutilise :

- `VdotProfileCard.jsx`
- `BestEffortsPanel.jsx`
- `PerformancePhysioCard.jsx`
- `PersonalPatternsCard.jsx`
- `RaceObjectiveCallToAction.jsx`
- `RaceCountdownCard.jsx`
- utilitaires `runningPerformance.js`, `raceObjectivePlanner.js`, `performanceNarratives.js`.

Écart majeur : le PDF contient une page **Records** dédiée. Elle doit devenir un sous-onglet officiel.

---

## 3. Sous-onglets obligatoires

Utiliser `SubTabs` avec hash URL.

| Onglet UI | Hash recommandé | Page PDF | Rôle |
|---|---|---:|---|
| Vue d'ensemble | `#overview` | 12 | Synthèse niveau |
| VDOT & profil | `#vdot` | 13 | Niveau et profil |
| Allures de référence | `#allures` | 14 | Repères d'entraînement/course |
| FC de performance | `#fc-performance` | 15 | FC, seuil, zones |
| Records | `#records` | 16 | Meilleurs efforts |

---

## 4. Fichiers à lire avant modification

- `frontend/src/pages/PerformancePage.jsx`
- `frontend/src/components/VdotProfileCard.jsx`
- `frontend/src/components/BestEffortsPanel.jsx`
- `frontend/src/components/PerformancePhysioCard.jsx`
- `frontend/src/components/PersonalPatternsCard.jsx`
- `frontend/src/components/RaceObjectiveCallToAction.jsx`
- `frontend/src/components/RaceCountdownCard.jsx`
- `frontend/src/components/visuals/alpine/SubTabs.jsx`
- `frontend/src/utils/runningPerformance.js`
- `frontend/src/utils/raceObjectivePlanner.js`
- `frontend/src/utils/performanceNarratives.js`
- `frontend/src/utils/gradeAdjustedPace.js`
- `frontend/src/utils/cardiacDecoupling.js`
- `frontend/src/utils/heartRatePreferences.js`
- `frontend/src/styles.css`

---

## 5. Composants à créer

Créer ou compléter :

```text
frontend/src/components/performance/
```

Composants :

- `PerformanceOverviewTab.jsx`
- `PerformanceVdotTab.jsx`
- `PerformanceReferencePacesTab.jsx`
- `PerformanceHeartRateTab.jsx`
- `PerformanceRecordsTab.jsx`
- `PerformanceConfidenceNote.jsx`

Règle : ne pas recréer les calculs. Les tabs orchestrent les composants existants.

---

## 6. Onglet Vue d'ensemble — page PDF 12

### Structure attendue

- résumé niveau actuel ;
- VDOT ou estimation principale ;
- 2 à 4 KPI de niveau ;
- meilleure tendance ;
- point de vigilance ;
- lien vers Records ou Allures.

### Wording

Utiliser :

- `estimation` ;
- `repère` ;
- `niveau observé` ;
- `confiance faible/modérée/élevée`.

Éviter :

- `prédiction certaine` ;
- `tu vaux exactement` ;
- extrapolation non justifiée.

---

## 7. Onglet VDOT & profil — page PDF 13

### Structure attendue

- VDOT actuel ;
- évolution récente ;
- profil : endurance, seuil, vitesse, VO2max, endurance musculaire ;
- explication courte ;
- confiance et limites.

### Règles métier

- Ne pas recalculer VDOT différemment.
- Ne pas inclure randonnées/trails atypiques si la logique existante les exclut déjà.
- Afficher état vide si données insuffisantes.

---

## 8. Onglet Allures de référence — page PDF 14

### Structure attendue

Table ou cartes :

| Zone | Exemple libellé |
|---|---|
| Endurance fondamentale | `Endurance fondamentale` |
| Endurance active | `Endurance active` |
| Seuil | `Seuil` |
| 10 km | `Allure 10 km` |
| 5 km | `Allure 5 km` |
| 1 km / VMA | `Repère court` |

Chaque valeur doit être issue d'un utilitaire existant ou explicitement masquée.

### Règles

- Afficher les allures comme repères, pas comme consigne absolue.
- Ne pas inventer une allure si VDOT absent.
- Gérer min/km correctement.

---

## 9. Onglet FC de performance — page PDF 15

### Structure attendue

- FC max paramétrée ou estimée ;
- FC seuil si disponible ;
- zones FC ;
- temps en zones sur séances performantes si disponible ;
- dérive cardiaque si disponible ;
- note de prudence.

### Règles

- `Dérive cardiaque` comme libellé principal.
- Pas de diagnostic médical.
- Ne pas afficher des zones si FC max absente ou invalide.

---

## 10. Onglet Records — page PDF 16

### Structure attendue

- records par distance ;
- meilleurs efforts récents ;
- records historiques ;
- séances marquantes ;
- source et confiance ;
- note : GPS, dénivelé, parcours, conditions.

### Composant principal

Réutiliser `BestEffortsPanel.jsx` dans `PerformanceRecordsTab.jsx`.

### Règles métier

- Ne pas inclure activités non pertinentes dans records route si la logique existante les exclut.
- Ne pas compter deux fois une activité fusionnée.
- Ne pas afficher une activité Garmin-only comme record route si l'identification distance/temps n'est pas fiable.

---

## 11. Interdictions spécifiques

- Aucune section `Puissance`.
- Ne pas utiliser `power`, `watts`, `W` en libellé Performance.
- Ne pas transformer Performance en page récupération.
- Ne pas supprimer les objectifs course existants s'ils sont utiles, mais les placer en secondaire.

---

## 12. Risques / points de vigilance

| Risque | Contrôle |
|---|---|
| Records calculés sur mauvais périmètre | vérifier filtres sport/source |
| Prédictions trop affirmatives | wording prudent |
| Sous-onglet Records oublié | test hash `#records` |
| Puissance résiduelle | `rg "Puissance|power|watts" frontend/src` |
| VDOT affiché sans confiance | ajouter note confiance |
| Allures inventées | masquer si données insuffisantes |

---

## 13. Vérification de non-régression

Commandes :

```bash
cd frontend
npm test -- --run
npm run build
```

Recherches :

```bash
rg "Puissance|power|watts|W\b|VDOT|BestEfforts|records|allures|Dérive|Decoupling" frontend/src/pages frontend/src/components frontend/src/utils
```

Contrôles manuels :

- `/performance#overview`
- `/performance#vdot`
- `/performance#allures`
- `/performance#fc-performance`
- `/performance#records`
- données insuffisantes ;
- mobile 375 px ;
- ouverture depuis sidebar.

---

## 14. Critères d'acceptation

- Performance contient 5 sous-onglets.
- Records existe comme onglet dédié.
- Aucune puissance affichée.
- Les allures sont prudentes et sourcées par les utilitaires existants.
- Les données absentes ne produisent pas de fausse valeur.
- Build frontend OK.
