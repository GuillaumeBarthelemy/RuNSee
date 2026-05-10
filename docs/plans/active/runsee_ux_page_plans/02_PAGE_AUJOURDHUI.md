# RunNSee — Plan page Aujourd'hui / Dashboard

Référence PDF : page 5  
Route : `/`  
Fichier principal : `frontend/src/pages/DashboardPage.jsx`  
Priorité : P1 — page déjà avancée, à finaliser précisément.

---

## 1. Compréhension du besoin

La page Aujourd'hui doit être une **vue de décision rapide**.  
L'utilisateur doit comprendre en moins de 10 secondes :

- son état du jour ;
- sa charge actuelle ;
- sa fatigue ;
- son volume récent ;
- son niveau de récupération ;
- si une sortie est pertinente aujourd'hui.

Ce n'est pas une page historique ni une page de performance.

---

## 2. État actuel connu

`DashboardPage.jsx` est déjà partiellement aligné Alpine Light.

Éléments déjà présents ou proches :

- KPI compacts ;
- `TodayReadingCard` ;
- `KpiChartCard` ;
- `RecoveryKpiCard` ;
- `SuggestedWorkoutCard` ;
- `CoachAdviceBar` ;
- données issues de `useDashboardState`, `activityInsights`, `recoveryViewModel`, `availabilityScore`.

Écart critique connu : `SuggestedWorkoutCard` contient ou a contenu des valeurs codées en dur (`12.4 km`, `1:02`, `620 m`). Cela doit être supprimé ou neutralisé.

---

## 3. Cible visuelle et fonctionnelle

### 3.1 Structure attendue

Ordre recommandé de haut en bas :

1. header page : titre `Aujourd'hui`, date, lecture courte ;
2. bandeau ou carte de lecture du jour ;
3. grille de 6 KPI compacts ;
4. zone principale en cartes : charge, volume, récupération, disponibilité ;
5. ligne récupération Garmin : VFC, Sommeil, FC repos, Énergie si disponible ;
6. carte suggestion / conseil ;
7. barre coach finale.

### 3.2 KPI obligatoires

| KPI | Libellé UI | Source attendue | Règle |
|---|---|---|---|
| Charge | Charge | utilitaires existants | Ne pas recalculer différemment |
| Fatigue | Fatigue | ATL ou modèle existant | Libellé utilisateur, ATL en tooltip si besoin |
| Volume | Volume | période récente | Distance ou temps selon existant |
| Dénivelé | Dénivelé | activités récentes | afficher `D+` si format compact |
| Récupération | Récupération | Garmin / view model | état vide si absent |
| Disponibilité | Disponibilité | `availabilityScore` | estimation prudente |

### 3.3 Ton rédactionnel

- Court.
- Coach, mais pas médical.
- Pas culpabilisant.
- Ne pas promettre une performance.
- Ne pas dire "tu dois" si la donnée est incertaine.

Exemples acceptables :

- `Charge maîtrisée, récupération correcte.`
- `Bonne fenêtre pour une sortie facile.`
- `Données Garmin insuffisantes pour conclure sur la récupération.`

Exemples interdits :

- `Tu es prêt pour une grosse séance.` sans justification.
- `Sommeil mauvais` si la donnée est absente.
- `12.4 km / 620 m D+` si non calculé.

---

## 4. Fichiers à lire avant modification

- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/hooks/useDashboardState.js`
- `frontend/src/utils/activityInsights.js`
- `frontend/src/utils/availabilityScore.js`
- `frontend/src/utils/recoveryViewModel.js`
- `frontend/src/utils/performanceNarratives.js`
- `frontend/src/components/visuals/alpine/TodayReadingCard.jsx`
- `frontend/src/components/visuals/alpine/SuggestedWorkoutCard.jsx`
- `frontend/src/components/visuals/alpine/KpiCardCompact.jsx`
- `frontend/src/components/visuals/alpine/KpiChartCard.jsx`
- `frontend/src/components/visuals/alpine/RecoveryKpiCard.jsx`
- `frontend/src/components/visuals/alpine/CoachAdviceBar.jsx`
- `frontend/src/styles.css`

---

## 5. Fichiers probablement à modifier

- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/components/visuals/alpine/SuggestedWorkoutCard.jsx`
- `frontend/src/components/AppNavigation.jsx` uniquement pour vérifier que le libellé sidebar reste conforme au PDF : `Accueil`
- `frontend/src/styles.css`

Optionnel, seulement si nécessaire :

- `frontend/src/utils/dashboardSuggestedWorkout.js` à créer pour un view model frontend prudent.

---

## 6. Développement attendu

### 6.1 Corriger la séance suggérée

Créer une logique de présentation prudente :

- si récupération faible ou fatigue élevée : proposer `Repos`, `Mobilité`, ou `Footing très facile` ;
- si état neutre : proposer `Footing facile` sans distance précise ;
- si état favorable et volume récent cohérent : proposer une plage, pas une valeur exacte ;
- si données insuffisantes : afficher `Suggestion à affiner`.

Règle importante : la carte peut afficher une **orientation**, mais pas une prescription chiffrée inventée.

Exemple de modèle attendu :

```js
{
  title: 'Sortie facile recommandée',
  subtitle: 'Charge maîtrisée, récupération correcte',
  effort: 'Facile',
  durationRange: '35 à 50 min',
  elevation: 'Terrain souple si possible',
  confidence: 'modérée',
  isPlaceholder: false
}
```

Si aucune règle fiable :

```js
{
  title: 'Suggestion à affiner',
  subtitle: 'Données insuffisantes pour proposer une séance fiable',
  isPlaceholder: true
}
```

### 6.2 Navigation

Vérifier le libellé de la sidebar :

- cible PDF validée : `Accueil` ;
- titre de page : `Aujourd'hui` ;
- ne pas confondre libellé de navigation et titre de page.

### 6.3 UI responsive

- Desktop : KPI en grille horizontale compacte.
- Mobile : 2 colonnes max ou 1 colonne selon lisibilité.
- Aucun débordement horizontal.

---

## 7. Risques / points de vigilance

| Risque | Contrôle |
|---|---|
| Affichage de données fictives | rechercher valeurs hardcodées dans Dashboard et SuggestedWorkout |
| Récupération absente interprétée comme 0 | vérifier null/undefined avant affichage |
| Doublon Analyse / Aujourd'hui | limiter les historiques lourds |
| Page trop haute mobile | compacter KPI et cartes |
| Ton trop affirmatif | wording prudent |

---

## 8. Vérification de non-régression

Commandes :

```bash
cd frontend
npm test -- --run
npm run build
```

Contrôles manuels :

- ouvrir `/` ;
- vérifier la page avec données Strava seules ;
- vérifier la page avec données Garmin ;
- vérifier absence de Garmin ;
- vérifier mobile 375 px ;
- rechercher les valeurs hardcodées :

```bash
rg "12.4|1:02|620 m|SuggestedWorkout|YTD|HRV|Body Battery" frontend/src
```

---

## 9. Critères d'acceptation

- La page ressemble structurellement au mockup PDF page 5.
- Les 6 KPI principaux sont visibles.
- La lecture du jour est claire et prudente.
- Aucune séance fictive n'est présentée comme réelle.
- Le vocabulaire canonique est respecté.
- La page fonctionne sans donnée Garmin.
- La page fonctionne sur mobile.
- Le build frontend est OK.

---

## 10. Recalage obligatoire après exécution des premiers lots

Cette section complète le plan initial à partir de l'état de code constaté après les premiers lots.
Elle ne remet pas en cause le fait que `Activités` n'ait pas encore été jouée.

### 10.1 Navigation : respecter le PDF

Le PDF page 5 affiche la navigation principale avec le libellé `Accueil` dans la sidebar, tandis que le titre de page est `Aujourd'hui 👋`.

Décision :

- conserver `Accueil` dans `AppNavigation.jsx` ;
- conserver `Aujourd'hui` comme titre de page dans `DashboardPage.jsx` / `AppShell.jsx` ;
- ne pas renommer la navigation en `Aujourd'hui` sauf validation explicite ultérieure.

### 10.2 Topbar : météo et actions non câblées

Le mockup affiche une zone météo et trois actions à droite. Le code peut conserver cette structure, mais il ne doit pas afficher de fausses données.

Règles :

- météo réelle absente : ne jamais afficher `12°C`, `Ciel dégagé`, `Vent 8 km/h` en dur ;
- si le slot météo est visible pour fidélité visuelle, afficher un état neutre du type `Météo à venir`, sans température ni vent fictifs ;
- boutons `Calendrier`, `Notifications`, `Compte` : soit ils sont câblés, soit ils sont désactivés / marqués `À venir` ;
- un bouton visible avec hover/cursor actif mais sans action réelle est refusé.

### 10.3 KPI Charge / Fatigue : sécuriser la sémantique métier

Point de vigilance majeur : le code actuel peut être tenté d'afficher `CTL` comme `Charge` et `ATL` comme `Fatigue` avec une unité `/100`.
Ce n'est acceptable que si la valeur affichée est réellement normalisée sur une échelle 0-100.

Règles strictes :

| Cas | Affichage autorisé |
|---|---|
| Valeur normalisée 0-100 documentée | `Charge (7 j) 68 /100` |
| Charge brute sur 7 jours non bornée | `Charge (7 j) 68` sans `/100`, avec tooltip explicatif |
| CTL / condition chronique | libellé `Condition`, pas `Charge (7 j)` |
| ATL non bornée | `Fatigue (ATL) 58` sans `/100`, ou score normalisé explicitement nommé |

Claude doit donc vérifier la source exacte avant affichage :

- `summary.load` = charge cumulée de la période ;
- `summary.ctl` = condition chronique ;
- `summary.atl` = fatigue aiguë ;
- `summary.tsb` = équilibre charge-fatigue.

Interdiction : renommer une métrique pour coller visuellement au mockup si le sens métier change.

### 10.4 Graphiques page 5 : cohérence libellé / série

La carte `Charge d'entraînement` ne doit pas tracer `ctl` si le libellé laisse entendre une charge 7 jours.

Deux options acceptables :

1. tracer la charge journalière / 7 jours et garder le libellé `Charge d'entraînement` ;
2. tracer `ctl` et renommer clairement en `Condition`, avec mention discrète `CTL` en tooltip.

La même règle s'applique à `Fatigue (ATL)` : si la série est `atl`, le libellé peut rester `Fatigue`, avec `ATL` en secondaire/tooltip.

### 10.5 Rangée récupération basse : revenir au mockup page 5

Le PDF page 5 affiche en bas :

1. `Récupération` ;
2. `Sommeil` ;
3. `Fréquence cardiaque au repos` ;
4. `Disponibilité` ;
5. `Sortie suggérée`.

La `VFC` est une donnée utile, mais elle ne doit pas remplacer visuellement `Récupération` si l'objectif est la fidélité PDF.

Décision pour Claude :

- rétablir une carte `Récupération` dans la rangée basse ;
- rétablir une carte `Disponibilité` dans la rangée basse ;
- intégrer la VFC comme détail, tooltip, hint ou donnée secondaire si possible ;
- ne pas créer une sixième carte si cela casse la grille du mockup ;
- si la VFC doit rester visible comme carte dédiée, documenter l'écart dans `09_PLACEHOLDERS_ET_BACKLOG.md` et demander validation.

### 10.6 Sortie suggérée : CTA et fausse précision

La carte `Sortie suggérée` est acceptée uniquement si elle reste prudente.

Règles :

- pas de distance exacte inventée ;
- pas de dénivelé exact inventé ;
- plage de durée acceptée si issue d'une règle claire ;
- le CTA ne doit pas promettre un détail inexistant.

Si aucun écran de détail de séance suggérée n'existe :

- remplacer `Voir le détail` par `Voir l'analyse` ou `Comprendre la suggestion` ;
- pointer vers `/analytics` ou désactiver le CTA avec état `À venir` ;
- documenter ce choix dans les placeholders si l'écart au PDF est visible.

### 10.7 Critère GO avant Activités

Claude peut passer au lot `Activités` uniquement si :

- sidebar = `Accueil`, page title = `Aujourd'hui` ;
- aucun bouton topbar actif sans action ;
- aucun affichage `/100` n'est appliqué à une métrique non normalisée ;
- la rangée basse suit le mockup ou l'écart est documenté ;
- la sortie suggérée ne contient aucune valeur fictive ;
- `npm test -- --run` et `npm run build` sont relancés.
