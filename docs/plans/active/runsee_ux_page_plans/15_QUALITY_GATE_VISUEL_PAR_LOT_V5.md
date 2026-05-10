# RunNSee — Quality gate visuel V5 par lot

## 1. Objectif

Empêcher qu'une page soit déclarée terminée alors qu'elle ne suit pas le PDF.

## 2. Phase obligatoire avant code

Claude doit produire ce tableau avant toute modification :

```md
| Zone PDF | Description cible | Composant existant | Composant à créer/modifier | Données nécessaires | Risque |
|---|---|---|---|---|---|
```

## 3. Contrôle visuel obligatoire après code

| Axe | Contrôle | Bloquant |
|---|---|---|
| Header | Titre, sous-titre, actions alignés au mockup | Oui |
| KPI | Nombre, ordre, libellés, densité | Oui |
| Filtres | Compacts, non envahissants | Oui |
| Onglets | Libellés, ordre, hash stable | Oui |
| Contenu | Même structure que PDF | Oui |
| Rail droit | Présent sur desktop si prévu | Oui |
| Cartes | Hiérarchie et densité cohérentes | Oui |
| Graphiques | Lisibles, non trompeurs | Oui |
| Wording | FR correct, accents, pas de technique brute | Oui |
| Données absentes | État vide propre | Oui |
| Placeholders | Documentés | Oui |
| Responsive | 375 / 768 / desktop large | Oui |
| Build | `npm run build` OK ou exception documentée | Oui |
| Tests | `npm test -- --run` OK ou exception documentée | Oui |

## 4. Capture / preuve visuelle attendue

Claude doit décrire la recette responsive :

```md
### Recette visuelle
- Desktop large :
- Laptop :
- Tablette :
- Mobile 375 px :
- Écarts constatés :
```

S'il peut produire des captures, il doit les ajouter au dossier :

```text
docs/quality/screenshots/<lot>/
```

## 5. Format obligatoire de bilan

```md
# Bilan lot <nom>

## PDF cible
- Pages :
- Sous-écrans :

## Mapping livré
| Zone PDF | Composant livré | Statut | Commentaire |
|---|---|---|---|

## Fichiers modifiés
| Fichier | Type de changement | Risque |
|---|---|---|

## Écarts restants vs PDF
| Écart | Gravité | Décision |
|---|---|---|

## Placeholders / backlog
| Élément | Type | Raison | Fichier backlog |
|---|---|---|---|

## Non-régression
- Calculs métier modifiés : Oui / Non
- Backend modifié : Oui / Non
- Routes modifiées : Oui / Non
- Tests :
- Build :

## Décision
GO / NO GO vers le lot suivant.
```

## 6. Règles de NO GO automatique

NO GO si :

- une sous-page obligatoire est vide ;
- le layout ressemble plus à l'ancien code qu'au PDF ;
- la page est table-first alors que le PDF est cards-first ;
- les filtres sont trop volumineux ;
- une métrique absente est remplacée par une fausse donnée ;
- `NaN`, `undefined`, `null`, `— km`, `— bpm`, `— m` apparaît ;
- un bouton actif ne fait rien ;
- le rail droit prévu est absent en desktop ;
- le build échoue à cause du code du lot ;
- Claude ne documente pas les écarts.
