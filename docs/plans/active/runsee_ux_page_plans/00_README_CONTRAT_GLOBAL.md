# RunNSee — Contrat global de refonte UX Alpine Light pour Claude

Date : 2026-05-10  
Source : archive `deployment.zip` fournie dans la conversation  
Référence visuelle : `.tmp/alpine_light/02_mockups/runsee_mockups_support_presentation_final.pdf`, pages 5 à 28  
Objectif : implémenter l'interface du mockup avec une fidélité maximale, sans casser la logique métier existante.

---

## 1. Règle de lecture pour Claude

Claude ne doit pas repartir d'une consigne générique du type "continuer la refonte".  
Il doit travailler **page RunNSee par page RunNSee**, avec le fichier `.md` correspondant, puis exécuter les contrôles de recette associés.

Ordre de lecture obligatoire avant code :

1. `00_README_CONTRAT_GLOBAL.md`
2. `01_ORCHESTRATION_CHANTIER.md`
3. `12_DESIGN_SYSTEM_ALPINE_LIGHT.md`
4. le fichier de page concerné : `02_PAGE_AUJOURDHUI.md`, `03_PAGE_ACTIVITES.md`, etc.
5. `10_RECETTE_NON_REGRESSION.md`
6. `09_PLACEHOLDERS_ET_BACKLOG.md` si la page contient un placeholder

---

## 2. Découpage retenu

Le découpage n'est pas fait par page PDF brute, mais par **page applicative RunNSee**.  
C'est volontaire : une même page applicative peut correspondre à plusieurs pages du PDF via des sous-onglets.

| Fichier | Page RunNSee | Pages PDF cible | Priorité |
|---|---|---:|---:|
| `02_PAGE_AUJOURDHUI.md` | Aujourd'hui / Dashboard | 5 | P1 |
| `03_PAGE_ACTIVITES.md` | Activités | 6 | P1 |
| `04_PAGE_ANALYSE.md` | Analyse | 7 à 11 | P1 |
| `05_PAGE_PERFORMANCE.md` | Performance | 12 à 16 | P1 |
| `06_PAGE_PROGRESSION.md` | Progression | 17 à 20 | P1 critique |
| `07_PAGE_REGLAGES.md` | Réglages / Admin | 21 à 26 | P2 |
| `08_PAGE_GLOSSAIRE.md` | Glossaire | 27 | P2 |
| `10_RECETTE_NON_REGRESSION.md` | Checklist finale | 28 | P0 obligatoire |

---

## 3. Contraintes non négociables

### 3.1 Préserver la logique métier

Ce chantier est une **correction d'alignement UX**, pas une refonte des calculs.

Claude ne doit pas modifier sans justification explicite :

- les calculs de charge, fatigue, condition, équilibre charge/fatigue ;
- TRIMP, VDOT, records, zones FC, allures ;
- la récupération Garmin ;
- le matching Strava/Garmin ;
- Prisma et le modèle de données ;
- les routes backend ;
- l'authentification ;
- la synchronisation Strava ou Garmin.

Si un composant a besoin d'un modèle de présentation, Claude doit créer un **view model frontend** à partir des données existantes, sans changer les calculs de fond.

### 3.2 Interdire les fausses données

Aucun écran ne doit afficher une donnée inventée comme si elle était réelle.

Interdit :

- séance suggérée codée en dur ;
- météo fictive ;
- statut Garmin ou Strava fictif ;
- records ou allures calculés au hasard ;
- valeurs `0` utilisées comme données réelles quand la donnée est absente.

Autorisé :

- placeholder neutre marqué `À venir` ;
- état vide explicite ;
- message "Données insuffisantes" ;
- estimation prudente si elle vient d'un utilitaire existant.

### 3.3 Vocabulaire canonique

Utiliser les libellés suivants dans l'UI :

| Terme technique | Libellé utilisateur canonique |
|---|---|
| HRV | VFC |
| Body Battery | Énergie |
| GAP | Allure ajustée |
| Decoupling | Dérive cardiaque |
| EPOC | Dette d'oxygène |
| Fitness score | Aptitude RuNSee |
| YTD | Cumul annuel / Depuis le début de l'année |
| ATL / CTL / TSB | Fatigue / Condition / Équilibre charge-fatigue |

Les acronymes techniques peuvent apparaître entre parenthèses ou tooltip, mais jamais comme libellé principal.

### 3.4 Séparation fonctionnelle à respecter

| Page | Rôle |
|---|---|
| Aujourd'hui | Décision rapide du jour |
| Activités | Consultation des sorties |
| Analyse | État d'entraînement court / moyen terme |
| Performance | Niveau, capacités, records, allures |
| Progression | Construction long terme, cumul annuel, régularité |
| Réglages | Configuration, connexions, données |
| Glossaire | Définitions et pédagogie |

Règle anti-doublon :

- **Analyse** ne doit pas devenir une page d'historique annuel.
- **Progression** porte les cumuls annuels, comparaisons N-1 et tendances longues.
- **Performance** porte les records, VDOT, allures et FC de performance.
- **Aujourd'hui** porte la lecture du jour, pas les graphiques historiques lourds.

---

## 4. État connu du code à date

Pages principales :

- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/pages/ActivitiesPage.jsx`
- `frontend/src/pages/AnalyticsPage.jsx`
- `frontend/src/pages/PerformancePage.jsx`
- `frontend/src/pages/ProgressionPage.jsx`
- `frontend/src/pages/AdminPage.jsx`
- `frontend/src/pages/GlossairePage.jsx`

Primitives Alpine Light déjà présentes :

- `frontend/src/components/visuals/alpine/KpiCard.jsx`
- `frontend/src/components/visuals/alpine/KpiCardCompact.jsx`
- `frontend/src/components/visuals/alpine/KpiChartCard.jsx`
- `frontend/src/components/visuals/alpine/RecoveryKpiCard.jsx`
- `frontend/src/components/visuals/alpine/RightRailCard.jsx`
- `frontend/src/components/visuals/alpine/SubTabs.jsx`
- `frontend/src/components/visuals/alpine/SourceBadge.jsx`
- `frontend/src/components/visuals/alpine/EmptyState.jsx`
- `frontend/src/components/visuals/alpine/PageHeader.jsx`
- `frontend/src/components/visuals/alpine/SectionHeader.jsx`
- `frontend/src/components/visuals/alpine/CoachAdviceBar.jsx`
- `frontend/src/components/visuals/MicroBars.jsx`
- `frontend/src/components/visuals/RangeBar.jsx`
- `frontend/src/components/visuals/TrendChip.jsx`

Point critique : `ProgressionPage.jsx` est actuellement le plus gros écart car la page est encore placeholder alors que le PDF contient plusieurs écrans complets.


---

## 4.1 État de reprise après exécution des 3 premiers plans

Constat de reprise : les premiers travaux réalisés correspondent au socle global, au layout Alpine Light et à la page `Aujourd'hui`.
La page `Activités` n'ayant pas encore été jouée, son état table-first actuel ne doit pas être interprété comme une régression du chantier.

Avant de lancer le lot `Activités`, Claude doit toutefois traiter un lot court de recalage post-implémentation :

- vérifier que la page `Aujourd'hui` reste fidèle au PDF page 5 ;
- corriger les écarts de vocabulaire et de sémantique KPI ;
- sécuriser les placeholders de topbar ;
- vérifier que les boutons visibles non câblés ne se comportent pas comme des actions actives ;
- documenter les écarts assumés dans `09_PLACEHOLDERS_ET_BACKLOG.md`.

Consigne dédiée : `13_REPRISE_POST_LOTS_0_2_AUJOURDHUI.md`.

---

## 5. Règle de livraison par page

Pour chaque page, Claude doit produire :

1. liste des fichiers lus ;
2. liste des fichiers modifiés ;
3. composants créés ;
4. composants supprimés ou rendus obsolètes ;
5. écarts visuels restants vs PDF ;
6. placeholders ajoutés ;
7. tests exécutés ;
8. risques de régression ;
9. mise à jour du suivi chantier.

Il ne doit pas passer à la page suivante si :

- la page ne compile pas ;
- le build frontend échoue ;
- un lien de navigation est cassé ;
- un onglet affiche une page blanche ;
- des données fictives sont affichées comme réelles ;
- un libellé interdit reste visible dans l'UI.

---

## 6. Critères de succès globaux

Le chantier est terminé uniquement si :

- toutes les routes principales s'ouvrent ;
- toutes les pages PDF 5 à 27 ont une correspondance UI ;
- Analyse contient 5 sous-onglets ;
- Performance contient 5 sous-onglets, dont Records ;
- Progression contient 4 sous-onglets et n'est plus un placeholder ;
- Réglages contient 5 onglets ;
- Glossaire est une page dédiée, pas une modale ;
- aucun `YTD`, `HRV`, `Body Battery`, `GAP`, `Decoupling`, `EPOC` ne reste comme libellé principal ;
- aucun lien `/activities/undefined` ;
- aucun overflow horizontal mobile ;
- les placeholders sont inventoriés ;
- tests et build sont OK ;
- les fichiers `.ai/*.md` et docs qualité sont alignés.
