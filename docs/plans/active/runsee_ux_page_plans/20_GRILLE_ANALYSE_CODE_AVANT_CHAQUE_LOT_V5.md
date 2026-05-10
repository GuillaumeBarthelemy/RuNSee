# RunNSee — Grille d'analyse code avant chaque lot V5

## 1. Objectif

Forcer Claude à comprendre l'existant avant de modifier.

## 2. Analyse obligatoire

Avant chaque lot, Claude doit répondre :

```md
## Analyse code préalable

### Fichiers lus
| Fichier | Rôle | Réutilisation |
|---|---|---|

### Composants existants
| Composant | Peut être réutilisé | Condition |
|---|---|---|

### Données disponibles
| Donnée | Source | Fiabilité | Usage prévu |
|---|---|---|---|

### Calculs métier impliqués
| Calcul | Fichier | Modification prévue | Risque |
|---|---|---|---|

### Risques techniques
| Risque | Impact | Mitigation |
|---|---|---|
```

## 3. Règles

- Une modification UI ne doit pas modifier un calcul.
- Une modification de calcul doit être isolée.
- Une optimisation ne doit pas changer le résultat.
- Un refactoring doit avoir une preuve de non-régression.
- Une suppression de composant doit être justifiée.
- Une nouvelle dépendance doit être évitée sauf nécessité.

## 4. Points data à contrôler

Pour tout indicateur :

- source ;
- filtre période ;
- unité ;
- traitement des NULL ;
- agrégation ;
- doublons ;
- double comptage Garmin/Strava ;
- division par zéro ;
- valeur absente vs valeur zéro ;
- libellé métier.

## 5. Décision

Si Claude n'arrive pas à identifier la source d'une donnée, il doit :

- ne pas inventer ;
- afficher un état vide ;
- documenter le besoin futur ;
- demander validation si c'est bloquant.
