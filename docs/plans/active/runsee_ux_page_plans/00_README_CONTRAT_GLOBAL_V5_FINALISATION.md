# RunNSee — Contrat global V5 finalisation UX / dev / analyse / déploiement

## 1. Objectif

Ce plan durcit le pilotage de la refonte UX RunNSee afin que Claude livre des développements plus fiables, plus proches du PDF de mockups et moins dépendants de recalages manuels après chaque lot.

Le chantier ne doit plus être traité comme une simple évolution esthétique. Il doit être traité comme une intégration fidèle d'un cahier des charges visuel, avec contrôle de non-régression, analyse préalable du code et recette obligatoire.

## 2. Sources de vérité

Ordre de priorité obligatoire :

1. PDF mockups : source de vérité visuelle.
2. Fichiers V5 de ce dossier : source de vérité opérationnelle.
3. Code existant : source de vérité métier et technique.
4. Données réellement disponibles : source de vérité d'affichage.
5. Placeholders : autorisés uniquement si documentés et non bloquants.

## 3. État de référence

- Accueil : visuel validé. Ne plus modifier sauf bug bloquant ou demande explicite.
- Activités : lot initial joué, mini-lot de recalage obligatoire avant Analyse.
- Analyse : à développer selon plan V5 strict.
- Performance : à développer selon plan V5 strict.
- Progression : à développer selon plan V5 strict.
- Réglages : à finaliser selon plan V5 strict.
- Glossaire : à finaliser selon plan V5 strict.
- Déploiement local : à sécuriser avant clôture.

## 4. Règle anti-improvisation

Claude ne doit pas démarrer un lot par du code.

Pour chaque lot, Claude doit d'abord produire :

```md
| Zone PDF | Description cible | Composant existant | Composant à créer/modifier | Données nécessaires | Risque |
|---|---|---|---|---|---|
```

Puis seulement ensuite développer.

## 5. Définition d'un lot terminé

Un lot est terminé uniquement si Claude fournit :

1. le mapping PDF -> composants livrés ;
2. les fichiers modifiés ;
3. les écarts restants vs PDF ;
4. les placeholders ajoutés ou conservés ;
5. les tests exécutés ;
6. le résultat du build ;
7. la vérification responsive ;
8. une décision GO / NO GO vers le lot suivant.

## 6. Interdictions

- Ne pas modifier visuellement Accueil.
- Ne pas démarrer Analyse avant le recalage Activités.
- Ne pas livrer une sous-page obligatoire en placeholder.
- Ne pas empiler les anciens composants si la structure PDF est différente.
- Ne pas introduire de calcul métier sans preuve de non-régression.
- Ne pas afficher `NaN`, `undefined`, `null`, `— km`, `— bpm`, `— m`.
- Ne pas laisser de bouton actif sans action réelle.
- Ne pas masquer un écart UX dans une future étape.
- Ne pas toucher au backend sauf nécessité démontrée.
- Ne pas supprimer ou affaiblir les tests existants pour faire passer le build.
- Ne pas inventer de données pour coller au mockup.

## 7. Typologie des changements

Chaque changement doit être qualifié dans le bilan du lot :

| Type | Définition | Autorisé sans validation ? |
|---|---|---|
| Correction UX | Alignement au PDF sans changement métier | Oui |
| Correction bug | Correction d'un affichage ou crash | Oui |
| Optimisation | Simplification sans changement de résultat | Oui, avec justification |
| Refactoring | Réorganisation interne sans changement visible | Oui, avec preuve de non-régression |
| Changement fonctionnel | Comportement nouveau ou calcul nouveau | Non, sauf demande explicite |
| Placeholder | Affichage temporaire documenté | Oui si non bloquant |
| Backlog futur | Fonction optionnelle non livrée | Oui si documenté |

## 8. Critère GO final chantier

GO final uniquement si :

- tous les lots restants ont un quality gate rempli ;
- toutes les routes principales ouvrent sans erreur ;
- Accueil reste visuellement stable ;
- Activités est recalée ;
- Analyse, Performance, Progression, Réglages et Glossaire sont conformes au PDF ;
- les placeholders sont inventoriés ;
- les tests et le build sont exécutés ;
- la recette transverse est documentée ;
- le déploiement local est validé ;
- le repo est propre ;
- `.ai/*.md` est aligné ;
- une baseline ou un commit propre est possible.
