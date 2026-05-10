# RunNSee — Inventaire des placeholders et backlog futur

Objectif : empêcher les placeholders trompeurs.  
Tout élément non réellement câblé doit être inventorié ici ou dans `docs/backlog/BACKLOG_FONCTIONNALITES_FUTURES.md`.

---

## 1. Règle générale

Un placeholder est acceptable uniquement s'il respecte les 3 conditions suivantes :

1. il est explicitement marqué `À venir`, `Données insuffisantes` ou `Non configuré` ;
2. il n'affiche pas de valeur fictive ;
3. il ne bloque pas une fonctionnalité cœur du PDF.

---

## 2. Placeholders acceptables pour MVP

| Zone | Élément | Statut | Règle d'affichage |
|---|---|---|---|
| Topbar | Météo / vent | Futur accepté | Ne pas afficher météo fictive. Masquer ou `À venir`. |
| Topbar | Notifications | Futur accepté | Pas de compteur fictif. Icône possible, tooltip `À venir`. |
| Topbar | Calendrier | Futur accepté | Bouton neutre si non câblé. |
| Réglages | Export avancé | Futur accepté | Carte `À venir`, pas bouton actif. |
| Réglages | Sessions multi-appareils | Futur accepté | `À venir`. |
| Réglages | Intégrations futures | Futur accepté | `À venir`, ne pas simuler connecté. |
| Glossaire | Index alphabétique | Non bloquant | Peut être absent si recherche OK. |
| Aujourd'hui | Suggestion intelligente avancée | Placeholder partiel accepté | Ne pas afficher de séance fictive. |

---

## 3. Placeholders non acceptables

Ces éléments doivent être réellement développés car ils sont visibles dans le PDF :

| Zone | Élément | Décision |
|---|---|---|
| Progression | Page complète | Développement obligatoire |
| Analyse | 5 sous-onglets | Développement obligatoire |
| Performance | 5 sous-onglets | Développement obligatoire |
| Performance | Records | Développement obligatoire |
| Activités | Cartes activité + right rail | Développement obligatoire |
| Réglages | 5 onglets | Développement obligatoire |
| Glossaire | Page dédiée | Développement obligatoire |
| Vocabulaire | Suppression `YTD` UI | Correction obligatoire |

---

## 4. Format d'inventaire à maintenir par Claude

Claude doit alimenter ce tableau pendant le chantier :

| ID | Page | Élément | Type | Motif | Statut | Fichier | Action future |
|---|---|---|---|---|---|---|---|
| PH-001 | Topbar | Météo | Futur | Pas d'API météo | Accepté MVP | `WeatherBadge.jsx` | Créer intégration météo si besoin |
| PH-002 | Aujourd'hui | Suggestion séance | Partiel | Calcul avancé non validé | À sécuriser | `SuggestedWorkoutCard.jsx` | View model prudent |

---

## 5. Mentions UI autorisées

Textes acceptables :

- `À venir`
- `Non configuré`
- `Données insuffisantes`
- `Connectez Garmin pour activer cet indicateur`
- `Indicateur indisponible sur la période sélectionnée`
- `Suggestion à affiner`

Textes interdits :

- `0` quand la donnée est absente ;
- `--` sans explication dans une carte importante ;
- `Connecté` si la connexion n'est pas réelle ;
- météo, score, record ou séance fictive.

---

## 6. Backlog futur recommandé

À créer ou compléter : `docs/backlog/BACKLOG_FONCTIONNALITES_FUTURES.md`

Rubriques :

1. météo / vent ;
2. notifications ;
3. calendrier entraînement ;
4. recommandation séance avancée ;
5. export / sauvegarde ;
6. intégrations futures ;
7. comparaison avancée par parcours ;
8. modèles prédictifs chronos ;
9. enrichissement Garmin officiel ;
10. analyse santé / récupération avancée, sans diagnostic médical.

---

## 7. Contrôles

```bash
rg "placeholder|TODO|FIXME|À venir|Non configuré|Données insuffisantes|Suggestion à affiner" frontend/src docs .ai
rg "12.4|1:02|620 m|sunny|weather|fake|mock" frontend/src
```

Critère d'acceptation : tous les placeholders visibles sont documentés et non trompeurs.

---

## 8. Précisions post-lots 0 à 2

### 8.1 Topbar

Les actions visuelles de topbar sont des placeholders acceptables uniquement si elles ne trompent pas l'utilisateur.

| Élément | Statut attendu | Règle |
|---|---|---|
| Météo | Placeholder accepté | Visible uniquement avec donnée réelle ou libellé neutre `Météo à venir`; aucune température fictive. |
| Calendrier | Futur accepté | Bouton désactivé ou tooltip `À venir`; pas de bouton actif sans action. |
| Notifications | Futur accepté | Pas de compteur fictif; bouton désactivé ou tooltip `À venir`. |
| Compte | À câbler si possible | Préférer lien réel vers `/admin#compte`; sinon bouton désactivé. |

### 8.2 Page Aujourd'hui

| Élément | Décision |
|---|---|
| VFC en carte dédiée | Écart à valider si elle remplace `Récupération` du PDF. |
| CTA `Voir le détail` sur sortie suggérée | Refusé si aucun détail réel n'existe. Utiliser `Voir l'analyse` ou documenter le placeholder. |
| `/100` sur Charge/Fatigue | Refusé si la valeur n'est pas un score borné 0-100. |

### 8.3 Page Activités

L'absence actuelle de cartes activité n'est pas un placeholder : c'est simplement le lot non encore joué.
Après le lot `03_PAGE_ACTIVITES.md`, les cartes activité et le rail droit ne sont plus optionnels.
