# Bilan mini-lot 14 — Recalage Activités avant Lot 04 Analyse

Date : 2026-05-10
Branche : `main`
Commit à créer : suit ce document

## PDF cible

- **Pages traitées** : page 6 (Activités, vue principale)
- **Sous-écrans traités** : vue cartes principale + barre filtres + rail droit. Vue tableau (fallback) inchangée.

## Mapping livré

| Zone PDF | Composant livré | Statut | Commentaire |
|---|---|---|---|
| Titre + sous-texte "Activités / Toutes vos sorties et entraînements." | `AppShell` (eyebrow/title/subtitle) | ✅ Conforme | Inchangé depuis Lot 03 |
| Bandeau 5 KPIs : Sorties · Distance totale · Dénivelé+ · Temps total · FC moyenne | `ActivityPeriodKpis.jsx` | ✅ Corrigé | Refonte format pour ne plus afficher unité quand valeur "—" |
| Barre filtres compacte : Recherche · Sport · Source · Intensité · Période · Tri | `ActivitiesFilterBar.jsx` (nouveau) | ✅ Livré | Remplace `AnalyticsFiltersBar` partagée (volumineuse). 32px de hauteur en desktop. |
| Liste groupée par date | `ActivityCardsView` + `ActivityDateGroup` | ✅ Conforme | Aucune modification structurelle |
| Carte activité horizontale | `ActivityListCard.jsx` | ✅ Corrigé | Refonte format helpers (value, unit), suppression `<span> km</span>` hardcodé |
| Mini-graphe par carte | — | ⏸ Backlog | Documenté backlog §5 — masqué (plan 03 §10.2 autorise) |
| Rail droit desktop | `ActivityRightRail.jsx` | ✅ Conforme | Aucune modification |
| Toggle Cartes/Tableau | `ActivitiesPage.jsx` | ✅ Conforme | Vue cartes par défaut, tableau en fallback |

## Fichiers modifiés

| Fichier | Type de changement | Risque |
|---|---|---|
| `frontend/src/components/activities/ActivityPeriodKpis.jsx` | **Correction bug UX** (NO GO automatique) | Faible — refonte interne, JSX sortie identique sauf format |
| `frontend/src/components/activities/ActivityListCard.jsx` | **Correction bug UX** + propagation `settings` | Faible — pas de modif logique métier |
| `frontend/src/components/activities/ActivityCardsView.jsx` | **Correction** propagation `settings` | Faible — props additionnelles |
| `frontend/src/components/activities/ActivityDateGroup.jsx` | **Correction** propagation `settings` | Faible |
| `frontend/src/components/activities/ActivitiesFilterBar.jsx` | **Création** + **Correction PDF** | Moyen — nouveau composant |
| `frontend/src/pages/ActivitiesPage.jsx` | **Changement fonctionnel** (filtres Source/Intensité/Tri en mémoire) | Moyen — filtres en aval, pas dans `filterActivities` |
| `frontend/src/utils/activitiesViewModel.js` | **Changement fonctionnel** : `getActivityIntensity` méthode scientifique + `hasIntensityReference` | Moyen — méthode passe de seuils absolus à zones FC personnelles |
| `frontend/src/styles.css` | **Correction PDF** : styles `ActivitiesFilterBar` Alpine compact | Faible — styles isolés `.alpine-activities-filterbar*` |
| `docs/backlog/BACKLOG_FONCTIONNALITES_FUTURES.md` | **Backlog futur** : entrées 5 (mini-graphe carte) et 6 (intensité affinée) | Aucun |
| `docs/plans/active/runsee_ux_page_plans/REVIEW_MINI_LOT_14_RECALAGE_ACTIVITES.md` | **Documentation** | Aucun |

## Fichiers **NON** modifiés (anti-régression)

| Fichier | Raison |
|---|---|
| `frontend/src/components/AnalyticsFiltersBar.jsx` | Partagé avec page Analyse — ne pas toucher |
| `frontend/src/utils/activityAggregations.js` | Calcul métier `filterActivities` — intact |
| `frontend/src/utils/activityLinks.js` | `getActivityPublicId` — intact |
| `frontend/src/hooks/useActivityViewModel.js` | Hook composant — intact |
| `frontend/src/components/ActivitiesTable.jsx` | Fallback tableau — intact |
| `backend/**` | Aucun fichier backend touché |
| `prisma/**` | Aucun schéma touché |

## Écarts restants vs PDF

| Écart | Gravité | Décision |
|---|---|---|
| Mini-graphe par carte activité absent | Faible | Backlog §5 documenté. Plan 03 §10.2 autorise à masquer si série non chargée. |
| Sous-type d'activité (ex. "Course nature", "Trail") sous le titre | Faible | Le `sportType` est déjà affiché ligne 2 de la carte. Pas de sous-type plus fin disponible côté données sans nouveau backend. |

## Placeholders / backlog

| Élément | Type | Raison | Fichier backlog |
|---|---|---|---|
| Mini-graphe par carte activité | Placeholder | Streams Strava non chargés en page liste (perfs) | `BACKLOG_FONCTIONNALITES_FUTURES.md` §5 |
| Classification d'intensité par TIME-IN-ZONE (vs FC moyenne) | Backlog futur | Affinement plus précis nécessite streams FC | `BACKLOG_FONCTIONNALITES_FUTURES.md` §6 |

## Méthode scientifique pour la classification d'intensité

Refonte de `getActivityIntensity` selon hiérarchie :

1. **Méthode 1 — Zones FC personnelles** (priorité)
   - Si `heartRateZone2Max` ET `heartRateZone3Max` configurées dans `trainingAnalyticsSettings`
   - Mapping 5 zones → 3 niveaux selon **Seiler S. (2010)** modèle polarisé :
     - Facile (Z1–Z2) : FC moy ≤ Z2Max
     - Modérée (Z3) : Z2Max < FC ≤ Z3Max
     - Intense (Z4–Z5) : FC > Z3Max

2. **Méthode 2 — % FCmax personnelle** (fallback)
   - Si seul `heartRateMax` configuré
   - Seuils ACSM (2018, 10ᵉ éd.) :
     - Facile : ≤ 70 % FCmax
     - Modérée : 70–85 % FCmax
     - Intense : > 85 % FCmax

3. **Méthode 3 — Aucune référence**
   - Pas de seuil absolu inventé (bannit l'ancien `< 130 / 130-160 / ≥ 160`)
   - Retourne `null` → badge masqué
   - Filtre Intensité affiche un état désactivé pédagogique avec lien vers Réglages > Entraînement

### Sources scientifiques

- **ACSM (2018)**, *Guidelines for Exercise Testing and Prescription*, 10ᵉ éd., Wolters Kluwer, chap. 7
- **Seiler S. (2010)**, "What is best practice for training intensity and duration distribution in endurance athletes?", *Int J Sports Physiol Perform* 5(3):276–291
- **Jamnick NA et al. (2020)**, "An Examination and Critique of Current Methods to Determine Exercise Intensity", *Sports Med* 50(10):1729–1756

## Non-régression

- **Calculs métier modifiés** : Non. `filterActivities`, `useActivityViewModel`, `getActivityPublicId`, `activityAggregations`, calculs Banister/TRIMP : tous intacts. La seule logique modifiée est `getActivityIntensity` qui passe d'une heuristique absolue (`< 130 bpm`) à une méthode scientifique basée sur les zones FC personnelles. **Ce n'est pas un calcul métier au sens strict** (c'était un classement UX) ; le changement est documenté avec sources scientifiques.
- **Backend modifié** : Non
- **Routes modifiées** : Non
- **Tests** : ✅ 168/168 (Vitest)
- **Build** : ✅ succès en ~700ms (Vite)
- **ESLint** : ✅ 0 erreur sur fichiers modifiés
- **Recherches anti-régression** :
  - `rg "— km|— bpm|— m\b|— min"` rendu visible : ✅ aucun
  - `rg "Periode|periode|Recuperation|Bibliotheque|donnees"` rendu visible : ✅ aucun
  - `rg "/activities/undefined"` runtime : ✅ aucun (uniquement commentaires)
  - `rg "AnalyticsFiltersBar"` import dans Activités : ✅ aucun
  - `rg "HRV|Body Battery|YTD"` : ✅ aucun
- **Responsive testé (analyse code)** :
  - Desktop large : barre filtres sur 1 ligne, layout 2 cols (cartes + rail)
  - Tablette : grille KPIs passe en 3 colonnes, layout devient 1 col
  - Mobile 375 : KPIs en 2 cols, filtres en wrap
- **États vides testés (analyse code)** :
  - Liste vide → `EmptyState`
  - Distance/D+/FC absente → `—` sans unité
  - Pas de zones FC configurées → filtre Intensité avec lien vers Réglages
  - Pas de meilleure sortie → "Données insuffisantes"
- **Données absentes testées** :
  - `formatDistance(null)` → `{ value: "—", unit: "" }` — JSX masque l'unité
  - `formatHr(0)` → `{ value: "—", unit: "" }` — idem
  - `getActivityIntensity({avgHr:130}, null)` → `null` (pas de fallback absolu)

## Décision

**GO** vers Lot 04 Analyse.

### Justification GO

- Tous les bugs NO GO automatique (plan 15 §6) sont corrigés :
  - ✅ Plus de `— km`, `— bpm`, `— m` rendu
  - ✅ Plus de `NaN`, `undefined`, `null` visible
  - ✅ Aucun bouton actif sans handler
  - ✅ Layout cards-first conforme PDF (table en fallback explicite)
  - ✅ Filtres compacts (32 px hauteur) au lieu de la barre `AnalyticsFiltersBar` volumineuse
- Méthode d'intensité scientifique documentée (ACSM + Seiler) — plus de seuils bpm absolus inventés
- 0 calcul métier modifié, 0 backend touché, 0 route modifiée
- Quality Gate technique vert (tests + build + ESLint)
- Placeholders documentés dans backlog
- Vocabulaire FR canonique respecté
