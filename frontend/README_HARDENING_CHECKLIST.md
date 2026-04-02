# Recette de vérification frontend RuNSee

Cette recette sert à valider le lot de sécurisation du frontend sans changer les comportements métier existants.

## 1. Démarrage application

- Lancer `npm run dev`.
- Vérifier que Vite démarre sans erreur bloquante.
- Vérifier que l'application s'ouvre sans page blanche.
- Vérifier qu'un backend absent ou lent n'empêche pas le shell React de s'afficher.

## 2. Dashboard

- Ouvrir la page `/`.
- Vérifier que le header, la navigation, les filtres, les KPI, les graphiques et le tableau s'affichent.
- Vérifier que la page reste visible même si certaines données backend sont absentes.
- Vérifier qu'un message d'erreur lisible apparaît si une API échoue.

## 3. Administration

- Ouvrir la page `/admin`.
- Vérifier que le bandeau d'actions s'affiche même si `athlete` vaut `null`.
- Vérifier que `SyncSummaryCard` reste lisible même si `summary` vaut `null`.
- Vérifier que `SyncStatusCard` reste lisible même si `currentJob` vaut `null`.

## 4. Filtres activités

- Tester une recherche texte vide puis une recherche texte réelle.
- Changer le sport affiché.
- Activer puis désactiver le regroupement intelligent.
- Saisir uniquement une date de début, puis uniquement une date de fin, puis les deux.
- Vérifier que le bouton de réinitialisation remet bien les filtres à zéro.
- Vérifier qu'aucun crash ne survient si la liste des sports disponibles est vide.

## 5. Pagination tableau

- Vérifier que le tableau reste affiché si `activities` est vide.
- Changer le nombre de lignes par page.
- Aller à la page suivante, puis précédente.
- Vérifier qu'un retour depuis le détail remet bien en surbrillance la bonne ligne.
- Vérifier qu'aucun crash ne survient si `currentPage`, `pageSize` ou les callbacks ne sont pas fournis.

## 6. Détail activité

- Ouvrir une activité depuis le tableau.
- Vérifier que la fiche s'affiche sans erreur si certains champs sont absents.
- Vérifier qu'un identifiant manquant ou invalide affiche un message clair plutôt qu'une page blanche.
- Vérifier le retour au dashboard avec conservation de l'ancre.

## 7. Carte

- Tester une activité avec polyline.
- Tester une activité sans polyline.
- Tester une activité avec payload enrichi partiel ou invalide.
- Vérifier que la carte n'explose pas si la polyline est absente ou mal formée.

## 8. Splits

- Tester une activité avec `splits_metric`.
- Tester une activité avec uniquement `laps`.
- Tester une activité sans splits ni laps.
- Vérifier que les tableaux restent lisibles et qu'un état vide s'affiche proprement.

## 9. Comparaison de périodes

- Vérifier l'affichage des trois modes: `Année à date`, `Mois complets`, `Années complètes`.
- Changer la métrique, la date de référence et le nombre de périodes.
- Vérifier qu'un état vide s'affiche si aucune activité ne correspond.
- Vérifier l'affichage mobile du récapitulatif sous forme de cartes.

## 10. Graphiques

- Vérifier les composants mensuel, hebdomadaire, charge glissante, jour de semaine, répartition sport et distance.
- Vérifier qu'aucun graphique ne plante avec `[]`, `null` ou `undefined`.
- Ouvrir la console et vérifier l'absence de warning `width(-1)` ou `height(-1)` de Recharts.
- Vérifier que chaque graphique garde une hauteur visible sur desktop et mobile.

## 11. Appels API

- Vérifier que les appels frontend partent bien via la configuration centralisée.
- Vérifier que l'URL utilisée est `VITE_API_BASE_URL` si définie.
- Vérifier qu'en fallback l'API cible `http://localhost:3001`.
- Vérifier qu'aucun appel ne part vers `http://localhost:3000` côté services frontend.

## 12. Cas sans données

- Forcer un backend vide.
- Vérifier le dashboard avec `activities = []`.
- Vérifier la page admin avec `athlete = null`, `summary = null`, `currentJob = null`.
- Vérifier le détail activité sans `rawJson`, sans carte et sans splits.
- Vérifier qu'en cas d'erreur React imprévue, le `ErrorBoundary` affiche un message et un bouton de rechargement au lieu d'une page blanche.

## Vérifications shell recommandées

- `npm run lint`
- `npm run build`
- `npm run dev`
