# RunNSee — Orchestration du chantier Claude par lots

Objectif : empêcher Claude de coder trop large et garantir une progression contrôlée, page par page, sans régression.

---

## 1. Principe de pilotage

Claude doit suivre une logique de **lots courts validables**.

Il ne doit pas mélanger :

- refonte visuelle ;
- refonte métier ;
- nettoyage technique ;
- correction backend ;
- ajout de fonctionnalité future.

Chaque lot doit être autonome, testable et documenté.

---

## 2. Ordre d'exécution recommandé

| Lot | Périmètre | Fichier de consigne | Objectif |
|---:|---|---|---|
| 0 | Inventaire avant code | ce fichier | Confirmer état réel et fichiers à modifier |
| 1 | Design system | `12_DESIGN_SYSTEM_ALPINE_LIGHT.md` | Stabiliser les primitives communes |
| 2 | Aujourd'hui | `02_PAGE_AUJOURDHUI.md` | Finaliser la page déjà avancée |
| 2.5 | Recalage post-Aujourd'hui | `13_REPRISE_POST_LOTS_0_2_AUJOURDHUI.md` | Corriger les derniers écarts page 5 avant de passer à Activités |
| 3 | Activités | `03_PAGE_ACTIVITES.md` | Remplacer la table-first par cartes + right rail |
| 4 | Analyse | `04_PAGE_ANALYSE.md` | Créer les 5 sous-onglets PDF |
| 5 | Performance | `05_PAGE_PERFORMANCE.md` | Créer les 5 sous-onglets, dont Records |
| 6 | Progression | `06_PAGE_PROGRESSION.md` | Remplacer le placeholder par la page complète |
| 7 | Réglages | `07_PAGE_REGLAGES.md` | Harmoniser les 5 onglets existants |
| 8 | Glossaire | `08_PAGE_GLOSSAIRE.md` | Polir la page dédiée |
| 9 | Placeholders/backlog | `09_PLACEHOLDERS_ET_BACKLOG.md` | Inventorier ce qui n'est pas réellement câblé |
| 10 | Recette finale | `10_RECETTE_NON_REGRESSION.md` | Sécuriser build, tests, mobile, docs |


---

## 2.1 Point de reprise validé

Les lots déjà joués ne doivent pas conduire Claude à réauditer tout le chantier sans fin.
À la reprise actuelle :

- `Activités` n'a pas encore été refondue : c'est normal ;
- le prochain vrai lot fonctionnel reste `Lot 3 — Activités` ;
- avant ce lot, Claude doit exécuter uniquement le mini-lot `2.5` pour stabiliser les écarts résiduels de `Aujourd'hui` et du layout global ;
- Claude ne doit pas modifier `Analyse`, `Performance`, `Progression`, `Réglages` ou `Glossaire` pendant le mini-lot 2.5.

Sortie attendue du mini-lot 2.5 : liste des corrections page 5, tests frontend, puis GO/NO GO explicite pour démarrer `03_PAGE_ACTIVITES.md`.

---

## 3. Lot 0 — Inventaire avant code

Avant de coder, Claude doit exécuter une revue rapide :

```bash
rg "YTD|HRV|Body Battery|GAP|Decoupling|EPOC|Puissance" frontend/src
rg "SuggestedWorkout|12.4|620 m|1:02|placeholder|TODO|FIXME" frontend/src
rg "ProgressionPage|AnalyticsPage|PerformancePage|ActivitiesPage" frontend/src
rg "GlossaryModal|AppTopbar|AdminSectionHeader|TodayRecoveryCard|RecoverySnapshotCard" frontend/src
```

Il doit répondre avec :

- fichiers concernés ;
- éléments réellement présents ;
- éléments absents ;
- composants à créer ;
- risques de régression ;
- proposition de séquence de modifications.

Il ne doit pas faire de modification dans ce lot.

---

## 4. Règle d'arrêt immédiat

Claude doit s'arrêter et signaler explicitement si :

- le PDF des mockups n'est pas accessible ;
- un fichier majeur n'existe pas ;
- le build échoue avant modification ;
- les tests échouent avant modification ;
- le code réel contredit fortement le plan ;
- il ne peut pas distinguer donnée réelle et placeholder.

Il ne doit pas compenser par des suppositions.

---

## 5. Format de compte rendu attendu après chaque lot

Claude doit produire un compte rendu court mais vérifiable :

```md
## Lot X — Compte rendu

### Fichiers lus
- ...

### Fichiers modifiés
- ...

### Composants créés
- ...

### Décisions prises
- ...

### Placeholders ajoutés
- Aucun / liste

### Tests exécutés
- `npm test -- --run` : OK / KO
- `npm run build` : OK / KO

### Risques de régression vérifiés
- Navigation : OK / KO
- Mobile : OK / KO
- Données fictives : OK / KO
- Vocabulaire canonique : OK / KO

### Écarts restants vs PDF
- ...
```

---

## 6. Stratégie de commits recommandée

Ne pas tout livrer dans un seul bloc.

Commits recommandés :

1. `docs: align alpine light ux execution plan`
2. `ui: stabilize alpine light primitives`
3. `ui: align today dashboard with alpine mockup`
4. `ui: rebuild activities page as alpine cards`
5. `ui: split analytics page into alpine tabs`
6. `ui: split performance page into alpine tabs`
7. `ui: implement progression page alpine tabs`
8. `ui: align settings and glossary alpine pages`
9. `docs: update placeholders backlog and validation log`
10. `chore: cleanup obsolete alpine legacy components`

Le nettoyage (`chore`) vient en dernier, jamais au début.

---

## 7. Garde-fous anti-régression métier

Claude doit vérifier systématiquement :

- aucun changement de schéma Prisma ;
- aucune migration DB ;
- aucun changement d'endpoint backend non demandé ;
- aucun changement de logique de sync ;
- aucune modification des calculs métier sans justification ;
- aucun double comptage d'activité ;
- aucune activité fusionnée affichée à tort ;
- aucune activité Garmin-only masquée à tort ;
- aucune randonnée utilisée dans les records route si la règle existante l'exclut.

---

## 8. Garde-fous UI

Claude doit vérifier à chaque page :

- desktop large ;
- largeur laptop ;
- mobile 375 px ;
- état chargé ;
- état loading ;
- état vide ;
- état erreur ;
- hash URL si sous-onglet ;
- absence d'overflow horizontal ;
- contraste lisible ;
- texte français propre ;
- tooltips non bloquants.

---

## 9. Définition du Done

Un lot est terminé si :

- la page correspond structurellement au PDF ;
- les composants sont réutilisables et non dupliqués inutilement ;
- les tests passent ;
- le build passe ;
- les placeholders sont documentés ;
- le suivi chantier est mis à jour ;
- les écarts résiduels sont explicitement listés.
