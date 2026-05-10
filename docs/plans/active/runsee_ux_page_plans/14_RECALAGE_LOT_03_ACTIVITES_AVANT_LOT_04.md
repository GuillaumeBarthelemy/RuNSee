# RunNSee — Recalage lot 03 Activités avant lot 04 Analyse

## 1. Objectif

Recaler la page Activités maintenant que le lot initial a été joué, avant de démarrer Analyse.

Ce lot n'est pas un échec du développement Activités : il sert à garantir la fidélité au PDF et à éviter d'empiler les lots suivants sur une base UX approximative.

## 2. Source de vérité

- PDF mockup page Activités.
- Capture actuelle de la page Activités.
- Code existant de la page Activités.
- Plans V5 du dossier actif.

## 3. Points à corriger en priorité

1. Réduire la hauteur et la masse visuelle du bloc filtres.
2. Ajouter ou rendre réellement accessibles les filtres Source et Intensité si prévus par le mockup.
3. Corriger tous les libellés sans accents.
4. Corriger les rendus de type `— km`, `— bpm`, `— m` : afficher `—` seul si valeur absente.
5. Recaler les KPI période pour se rapprocher du mockup.
6. Recaler les cartes activité : source, heure, badges, métriques et hiérarchie.
7. Vérifier le rail droit desktop.
8. Vérifier le responsive mobile.

## 4. Interdictions

- Ne pas modifier Accueil.
- Ne pas démarrer Analyse.
- Ne pas changer les calculs métier.
- Ne pas inventer de données.
- Ne pas supprimer la vue tableau si elle sert de fallback, mais elle ne doit pas dominer la page.

## 5. Critères GO

- Filtres compacts.
- Cartes activité proches du PDF.
- Rail droit lisible sur desktop.
- Wording FR corrigé.
- Aucun affichage invalide d'unité.
- Tests/build exécutés.
- Quality gate V5 rempli.
