# Bilan Lot 04 — Page Analyse V5

Date : 2026-05-11
Plan : `04_PAGE_ANALYSE_V5_STRICT.md`

## PDF cible

- **Pages traitées** : pages 7 à 11 (Analyse + 5 sous-onglets)
- **Sous-écrans traités** : `#overview`, `#charges`, `#tendances`, `#intensites`, `#recuperation`

## Mapping livré

| Zone PDF | Composant livré | Statut | Commentaire |
|---|---|---|---|
| Header "Analyse" + sous-titre | `AppShell` | ✅ | Eyebrow + title = "Analyse" (était "Tendance") |
| Filtre période compact | `AnalyticsCompactFilters` (NEW) | ✅ | Cohérent avec ActivitiesFilterBar, presets alignés |
| 5 sous-onglets hash stable | `SubTabs` (réutilisé) + dispatcher dans `AnalyticsPage` | ✅ | `#overview` par défaut |
| Vue d'ensemble — score composite | `AnalyticsTakeawayCard` (NEW) + `AnalyticsOverviewTab` (NEW) | ✅ | Score 0-100 + KpiGrid + Badge confiance |
| Charges — Banister + dynamiques | `AnalyticsChargesTab` (NEW) → `RollingLoadChart` + `DynamicsGrid` | ✅ | Réutilisation directe |
| Tendances — Volume + Efficience + Trail + Comparaison historique | `AnalyticsTrendsTab` (NEW) | ✅ | "YTD" remplacé par "Comparaison historique" / "Cumul annuel" |
| Intensités — Distribution + **Polarization Index** (Treff 2019) | `AnalyticsIntensitiesTab` (NEW) + `polarizationIndex.js` | ✅ | Carte PI nouvelle avec source scientifique citée |
| Sommeil & récupération — **CV-HRV** + insights croisés + Recovery vs Load | `AnalyticsRecoveryTab` (NEW) + `recoveryAdvanced.js` + `buildPersonalPatterns` | ✅ | EmptyState propre si Garmin absent |

## Fichiers créés

| Fichier | Type | Tests |
|---|---|---|
| `frontend/src/utils/analyticsTrainingState.js` | Util — score composite | 8 tests ✓ |
| `frontend/src/utils/recoveryAdvanced.js` | Util — CV-HRV Plews | 7 tests ✓ |
| `frontend/src/utils/polarizationIndex.js` | Util — PI Treff | 9 tests ✓ |
| `frontend/src/components/analytics/AnalyticsCompactFilters.jsx` | UI | — |
| `frontend/src/components/analytics/AnalyticsTakeawayCard.jsx` | UI — synthèse score | — |
| `frontend/src/components/analytics/AnalyticsOverviewTab.jsx` | Tab | — |
| `frontend/src/components/analytics/AnalyticsChargesTab.jsx` | Tab | — |
| `frontend/src/components/analytics/AnalyticsTrendsTab.jsx` | Tab | — |
| `frontend/src/components/analytics/AnalyticsIntensitiesTab.jsx` | Tab | — |
| `frontend/src/components/analytics/AnalyticsRecoveryTab.jsx` | Tab | — |

## Fichiers modifiés

| Fichier | Type de changement | Risque |
|---|---|---|
| `frontend/src/pages/AnalyticsPage.jsx` | **Refactoring** : décomposition en orchestrateur (583 → 380 lignes) | Moyen — diff important mais view models identiques |
| `frontend/src/styles.css` | **Correction PDF** : styles Alpine cartes Lot 04 (~+280 lignes) | Faible — styles isolés |
| `frontend/src/components/PeriodComparisonSection.jsx` | **Correction PDF (wording)** : YTD → "Comparaison historique" + accents | Faible — chaînes utilisateur uniquement |
| `frontend/src/components/DynamicsGrid.jsx` | **Correction PDF (wording)** : 9 chaînes utilisateur sans accent corrigées + "HRV" → "VFC" | Faible |
| `frontend/src/components/WeeklyVolumeChart.jsx` | **Correction PDF (wording)** : "Decoupage" → "Découpage", "Fenetre" → "Fenêtre", "periode tronquee" → "période tronquée" | Faible |
| `frontend/src/components/MonthlyVolumeChart.jsx` | **Correction wording** | Faible |
| `frontend/src/components/ZoneLoadDistributionCard.jsx` | **Correction wording** : "Duree" → "Durée" | Faible |
| `frontend/src/components/TrailSpecificityCard.jsx` | **Correction wording** : "Specificite" → "Spécificité" | Faible |
| `frontend/src/components/TrainingSummaryKpiGrid.jsx` | **Correction wording** : "fraicheur" → "fraîcheur" | Faible |
| `frontend/src/components/PerformanceTrendChart.jsx` | **Correction wording** | Faible |
| `frontend/src/components/RollingLoadChart.jsx` | **Correction wording** | Faible |

## Ajouts scientifiques (changements fonctionnels validés)

| Ajout | Onglet | Source scientifique |
|---|---|---|
| **Score composite d'état d'entraînement (0-100)** | Vue d'ensemble | Coggan & Allen 2010 (TSB) + Gabbett 2016/Williams 2017 (ACWR) + Foster 1998 (monotonie) + Plews & Laursen 2013 (VFC). Sub-scores et pondérations documentés dans `analyticsTrainingState.js`. |
| **Polarization Index** | Intensités | Treff G, Winkert K, Sareban M, Steinacker JM, Sperlich B (2019). *Front Physiol* 10:707. |
| **CV-HRV (coefficient de variation 7j)** | Récupération | Plews DJ, Laursen PB, Stanley J, Kilding AE, Buchheit M (2013). *Sports Med* 43(9):773-781 + Buchheit 2014 *Front Physiol* 5:73. |
| **Exposition `buildPersonalPatterns`** | Récupération | Code existant testé (crossDataAnalytics.test.js), simplement câblé — sommeil↔récupération, charge↔sommeil, monotony↔VFC. |

## Écarts restants vs PDF

| Écart | Gravité | Décision |
|---|---|---|
| Wording sans accent dans d'autres pages (Réglages, Glossaire — pas Lot 04) | Faible | À traiter dans leurs lots respectifs |
| `GarminEnrichmentPanel` peut contenir des chaînes sans accent | Faible | Hors scope Lot 04 (utilisé dans ActivityDetail) |
| Mini-graphes sparkline par KPI sur Vue d'ensemble | Faible | Non requis explicitement par plan §5 (KPI grid suffisant) |

## Placeholders / backlog

| Élément | Type | Raison | Fichier backlog |
|---|---|---|---|
| Sleep regularity index (Phillips 2017) | Backlog futur | Données détaillées cycle veille/sommeil pas garanties dans Garmin recoveryVm actuel | `BACKLOG §7` ajouté |
| TIME-IN-ZONE intensité par activité | Backlog futur | Affinement de l'indicateur d'intensité, nécessite streams FC | Déjà en `BACKLOG §6` (mini-lot 14) |

## Non-régression

| Critère | État |
|---|---|
| Calculs métier modifiés | **Non** (CTL/ATL/TSB/zones/efficience/ACWR/Foster intacts) |
| Backend modifié | **Non** |
| Routes modifiées | **Non** (`/analytics` conservée) |
| AnalyticsFiltersBar | **Non touché** (juste plus importé) |
| Tests | ✅ 192/192 (168 + 24 nouveaux Lot 04) |
| Build | ✅ Vite ~400ms |
| ESLint | ✅ 0 erreur sur fichiers modifiés |
| `— km` / `— bpm` / `— m` rendu | ✅ aucun |
| `NaN` / `undefined` / `null` visible | ✅ aucun |
| `YTD` user-visible | ✅ aucun |
| Vocabulaire FR canonique | ✅ "Analyse" (pas "Tendance" en titre), "VFC" (pas "HRV"), accents partout |
| Responsive (analyse code) | ✅ Onglets scrollables (SubTabs), grid responsive (`auto-fit`), 1 col mobile |
| États vides | ✅ EmptyState onglet Récupération si Garmin absent, "Données insuffisantes" pour PI et CV-HRV |

## Recette visuelle prévue

- Desktop large : 5 onglets sur 1 ligne, contenu pleine largeur, grilles `auto-fit minmax(220px, 1fr)` ou 2 colonnes
- Laptop : idem
- Tablette : onglets scrollables horizontalement, contenu 1-2 cols selon `auto-fit`
- Mobile 375 px : 1 col partout, charts responsive

## Décision

**GO** vers Lot 05 Performance.

### Justification GO

- 5 sous-onglets livrés conformes plan §4.
- 4 ajouts scientifiques implémentés avec sources peer-reviewed citées dans le code ET dans l'UI.
- Aucune sous-page en placeholder — toutes ont du contenu réel.
- Aucun calcul métier modifié → aucune régression possible sur Banister/Foster/Gabbett/zones.
- Vocabulaire canonique strict respecté ("Analyse" / "VFC" / "Comparaison historique" / accents partout dans le périmètre traité).
- Quality Gate technique vert (tests + build + ESLint).
- Tous les NO GO automatique (plan 15 §6) levés.
