# RunNSee — Plan page Activités

Référence PDF : page 6  
Route : `/activities`  
Fichier principal : `frontend/src/pages/ActivitiesPage.jsx`  
Priorité : P1 — écart visuel fort avec le mockup.

---

## 1. Compréhension du besoin

La page Activités doit permettre de consulter rapidement les sorties, comprendre les sources de données et accéder au détail d'une activité.

La cible n'est plus une page table-first.  
Le rendu principal doit être une **liste de cartes d'activités**, plus lisible et mobile-first.

---

## 2. État actuel connu

État fonctionnel mais non conforme :

- `ActivitiesPage.jsx` utilise surtout `AnalyticsFiltersBar` + `ActivitiesTable` ;
- pagination existante ;
- données Strava/Garmin visibles dans certaines lignes ;
- `ActivitiesTable.jsx` peut rester en fallback mais ne doit plus être le rendu principal si on vise le mockup.

---

## 3. Cible visuelle et fonctionnelle

### 3.1 Structure attendue

Ordre de page :

1. header `Activités` ;
2. sous-texte : période, nombre de sorties ;
3. KPI période ;
4. barre de filtres compacte ;
5. layout principal 2 colonnes desktop :
   - colonne gauche : liste de cartes groupées par date ;
   - colonne droite : synthèse semaine / sources / répartition ;
6. mobile : colonne unique, right rail sous la liste ou pliable.

### 3.2 KPI période obligatoires

| KPI | Source | Règle |
|---|---|---|
| Distance | activités filtrées | km avec 1 décimale si utile |
| Durée | activités filtrées | format h/min |
| Dénivelé | activités filtrées | `D+` |
| Séances | activités filtrées | nombre entier |
| Charge | si disponible | sinon masquer, ne pas mettre 0 |
| FC moyenne | si disponible | sinon état neutre |

### 3.3 Filtres attendus

Conserver les filtres existants si utiles, ajouter si absent :

- période ;
- sport ;
- source : `Toutes`, `Strava`, `Garmin`, `Strava + Garmin` ;
- intensité : `Toutes`, `Facile`, `Modérée`, `Intense` ;
- recherche texte si existante ou simple.

Ne pas créer un nouveau backend pour filtrer si les données sont déjà chargées côté frontend.

### 3.4 Carte activité attendue

Chaque carte doit afficher :

- date / heure ;
- nom activité ;
- sport ;
- source via `SourceBadge` ;
- distance ;
- durée ;
- D+ ;
- FC moyenne si disponible ;
- intensité ;
- bouton ou lien détail.

État fusionné :

- si activité Strava enrichie Garmin : badge `Strava + Garmin` ;
- si Garmin-only : badge `Garmin` ;
- si Strava-only : badge `Strava`.

Le lien détail doit utiliser l'identifiant public fiable. Interdit : `/activities/undefined`.

---

## 4. Fichiers à lire avant modification

- `frontend/src/pages/ActivitiesPage.jsx`
- `frontend/src/components/ActivitiesTable.jsx`
- `frontend/src/components/AnalyticsFiltersBar.jsx`
- `frontend/src/utils/activityAggregations.js`
- `frontend/src/utils/activityLinks.js`
- `frontend/src/utils/activityEnrichment.js`
- `frontend/src/utils/trainingMetrics.js`
- `frontend/src/components/visuals/alpine/SourceBadge.jsx`
- `frontend/src/components/visuals/alpine/RightRailCard.jsx`
- `frontend/src/components/visuals/alpine/EmptyState.jsx`
- `frontend/src/styles.css`

---

## 5. Composants à créer

Créer un dossier dédié :

```text
frontend/src/components/activities/
```

Composants recommandés :

- `ActivityPeriodKpis.jsx`
- `ActivityCardsView.jsx`
- `ActivityDateGroup.jsx`
- `ActivityListCard.jsx`
- `ActivityRightRail.jsx`
- `ActivitySourceFilter.jsx` si nécessaire
- `ActivityIntensityBadge.jsx` si aucun badge existant réutilisable

Règle : composants de présentation uniquement. Les calculs lourds restent dans utils existants ou dans des view models locaux.

---

## 6. Développement attendu

### 6.1 Remplacer le rendu principal

`ActivitiesTable` devient :

- soit fallback via bouton `Vue tableau` ;
- soit composant secondaire bas de page ;
- soit supprimé de la route si validation explicite.

Recommandation : conserver en fallback pour ne pas perdre la lecture tabulaire.

### 6.2 Groupement par date

Créer un regroupement :

```js
[
  {
    label: 'Aujourd’hui',
    date: '2026-05-10',
    activities: [...]
  },
  {
    label: 'Cette semaine',
    activities: [...]
  }
]
```

Si le groupement exact est trop lourd, au minimum afficher un séparateur date lisible.

### 6.3 Right rail

La colonne droite doit contenir :

- résumé semaine en cours ;
- répartition par sport ;
- répartition source ;
- dernière sortie utile ou meilleure sortie récente ;
- éventuel état de synchro discret.

Ne pas dupliquer toute la page Analyse.

### 6.4 États vides

Si aucune activité :

- afficher `EmptyState` ;
- proposer de synchroniser Strava si logique existante ;
- ne pas afficher une table vide massive.

---

## 7. Risques / points de vigilance

| Risque | Contrôle |
|---|---|
| Perte de lignes par filtre source | comparer nombre avant/après filtre |
| Activités Garmin-only masquées | tester provider Garmin |
| Liens détail cassés | vérifier `getActivityPublicId` |
| Pagination incohérente avec groupement | paginer avant groupement ou documenter le choix |
| Table ancienne encore dominante | contrôler visuel page 6 |
| Mobile trop dense | tester 375 px |

---

## 8. Vérification de non-régression

Commandes :

```bash
cd frontend
npm test -- --run
npm run build
```

Recherches :

```bash
rg "activities/undefined|getActivityPublicId|isMerged|provider|source" frontend/src/pages frontend/src/components frontend/src/utils
```

Contrôles manuels :

- `/activities` avec plusieurs sports ;
- filtre Strava ;
- filtre Garmin ;
- filtre Strava + Garmin ;
- filtre intensité ;
- pagination ;
- ouverture détail activité ;
- mobile 375 px.

---

## 9. Critères d'acceptation

- La page n'est plus table-first.
- Les KPI période sont visibles.
- Les cartes activités correspondent au mockup page 6.
- La source Strava/Garmin est claire.
- Le fallback tableau est optionnel et secondaire.
- Aucun lien détail cassé.
- Aucune activité réelle n'est perdue à cause du nouveau rendu.
- Le build frontend est OK.

---

## 10. Note de reprise : Activités n'a pas encore été jouée

L'état actuel table-first de `/activities` est normal à ce stade du chantier.
Claude ne doit pas le traiter comme une régression des lots précédents.

Le lot `Activités` doit maintenant partir de cet état connu :

```text
ActivitiesPage.jsx
  AppShell
  AnalyticsFiltersBar
  ActivitiesTable
```

Objectif du lot : remplacer le rendu principal par le modèle PDF page 6, sans supprimer immédiatement `ActivitiesTable.jsx`.
La table peut rester disponible comme fallback technique ou mode secondaire jusqu'à validation complète.

### 10.1 Détails visuels PDF page 6 à respecter

Structure exacte attendue :

1. titre `Activités` ;
2. sous-texte `Toutes vos sorties et entraînements.` ;
3. bandeau KPI avec 5 indicateurs :
   - `Sorties` ;
   - `Distance totale` ;
   - `Dénivelé +` ;
   - `Temps total` ;
   - `FC moyenne` ;
4. barre de filtres :
   - sports ;
   - sources ;
   - intensités ;
   - période ;
   - tri à droite ;
5. liste groupée par date : `Aujourd'hui`, `Hier`, puis dates ;
6. carte activité horizontale avec : icône sport, titre, sous-type, badges, distance, durée, D+, FC moyenne, mini-graphe, source et heure ;
7. rail droit avec :
   - `Vue hebdomadaire` ;
   - `Répartition des sports` ;
   - `Meilleure sortie`.

### 10.2 Règles de données pour les cartes

- Si la distance est absente : afficher `—`, pas `0 km`.
- Si le D+ est absent : afficher `—`, pas `0 m`, sauf si l'activité contient explicitement 0.
- Si la FC est absente : afficher `—`, pas une estimation.
- Le mini-graphe ne doit être affiché que si une série exploitable existe ; sinon afficher un trait neutre ou masquer la zone.
- Le badge source doit refléter la donnée réelle : `Strava`, `Garmin`, ou `Strava + Garmin`.

### 10.3 Right rail

La `Vue hebdomadaire` doit utiliser la semaine courante selon le paramètre premier jour de semaine existant.
La `Répartition des sports` doit être calculée sur le filtre courant.
La `Meilleure sortie` doit être sélectionnée par une règle explicite et stable, par exemple distance ou charge, sans inventer de score.

Si une règle de meilleure sortie n'est pas fiable, afficher `Données insuffisantes` plutôt qu'une sortie arbitraire.
