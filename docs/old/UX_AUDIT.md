# UX_AUDIT — Inventaire des composants UI

> Phase E1 — Cartographie de l'existant avant refonte UX.
> **Aucune modification de code dans ce document.** Toute décision listée ici sera implémentée dans les phases F-K.

---

## Convention de lecture

- **Décision** : action prévue dans les phases F-K
  - 🟢 **Conserver** : composant pertinent, pas de changement
  - 🔵 **Migrer** : conservé mais re-stylé avec composants visuels Phase G
  - 🟡 **Fusionner** : à intégrer dans un autre composant
  - 🔴 **Supprimer** : redondance ou obsolescence
  - 🟣 **Renommer** : terminologie à mettre à jour (Phase J)
- **Risque régression** : Faible (F) / Moyen (M) / Élevé (E)

---

## 1. Page Dashboard "Aujourd'hui"

| Composant | Métriques affichées | Sources | Vocabulaire actuel | Décision Phase F-K | Risque |
|---|---|---|---|---|---|
| `TodayHeader` | date, sport, nb activités, plage temps | — | "Aujourd'hui", "Pilotage du jour" | 🟢 Conserver | F |
| `TodayAlertBanner` | alertes contextuelles (sync ancienne, surcharge, etc.) | calculé `buildTodayAlerts` | "Alerte", "Synchroniser Strava" | 🔵 Migrer (Phase G) — utiliser `RangeBar` ou `TrendChip` selon le type | F |
| `DashboardDecisionSummaryCard` | verdict, score confiance, facteurs (chips), recommandation, signaux Garmin | calculé + Garmin | "Decision du jour", "Signaux Garmin", "Sommeil score moyen X" | 🟡 Refonte F2 — verdict descriptif + jauge readiness + chips, sortir le bloc "Signaux Garmin" en composant unifié | M |
| `TodayFormCards` | CTL, ATL, TSB, sparkline | calculé | "Charge", "Base de fond", "Fatigue", "Fraîcheur" | 🔵 Migrer (Phase F3) — remplacer sparklines par `MicroBars`, valeurs sur barres horizontales | M |
| `RecoverySnapshotCard` | sleep, HRV, FC repos, body battery, readiness, stress (KpiGrid simple) | Garmin | "Recuperation Garmin", "HRV moy.", "Body Battery" | 🔴 **Supprimer F1** — fusion vers `TodayReadinessCard` | F |
| `TodayRecoveryCard` | sleep, HRV, FC repos, body battery (sparklines + tones + delta) | Garmin | "Sommeil", "HRV moy.", "Body Battery" | 🔴 **Supprimer F1** — fusion vers `TodayReadinessCard` | F |
| `TodayVolumeStrip` | volume 7j, nb séances, sparkline | calculé | "Volume", "Charge journalière" | 🔵 Migrer (Phase F4) — sparkline → `MicroBars` | F |
| `TodaySecondaryRow` | régularité 4 sem + variance charge | calculé | "Régularité", "Variation" | 🔵 Migrer (Phase G) — re-style cohérent | F |
| `TodaySnapshotToday` | rapport synthétique période | calculé | "Snapshot du jour" | 🔴 **Évaluer F5** — redondant avec TodayHeader + cards de charge | M |
| `TodayQuickActions` | bouton sync rapide | — | "Synchroniser" | 🟢 Conserver | F |
| `RecentActivitiesCard` | 3 dernières activités décorées | Strava + calculé | "Activités récentes" | 🟢 Conserver | F |

**Total Dashboard** : 11 composants → 2 supprimés (RecoverySnapshotCard, TodayRecoveryCard), 1 évalué (TodaySnapshotToday), 1 refondu (DashboardDecisionSummaryCard), 7 conservés/migrés.

### 🔁 Doublon majeur Dashboard
**Doublon Recovery** :
- `RecoverySnapshotCard` (KpiGrid milieu, supprimable)
- `TodayRecoveryCard` (sparklines haut, supprimable)
- Section "Signaux Garmin" du `DashboardDecisionSummaryCard`
- → **Fusion Phase F1** : composant unique `TodayReadinessCard` placé sous le verdict, intégrant jauge readiness, 4 tuiles (Sommeil, VFC, FC repos, Énergie), valeur + delta + indicateur visuel.

---

## 2. Page Analytics

| Composant | Métriques affichées | Sources | Vocabulaire actuel | Décision Phase F-K | Risque |
|---|---|---|---|---|---|
| `AnalyticsFiltersBar` | filtres période / sport / recherche | — | "Période", "Sport" | 🟢 Conserver | F |
| `RollingLoadChart` | charge journalière + CTL/ATL/TSB | calculé | "Charge, base, fatigue, fraîcheur" | 🟣 Renommer labels (Phase J) | F |
| `DynamicsGrid` | monotonie, polarisation, vitesse critique, charge dynamique | calculé | "Dynamique de charge", "Polarisation" | 🔵 Migrer (Phase G) — utiliser `BandPositioner` standardisé | M |
| `RecoveryVsLoadChart` | charge vs métrique récup choisie (sleep/VFC/HR/BB) | Garmin + calculé | "Charge vs Récupération" | 🟢 Conserver | F |
| `PeriodComparisonSection` | YTD vs précédent | calculé | "YTD", "Comparaison période" | 🟣 Renommer "YTD" → "Année en cours" + tooltip (Phase J) | F |
| `MonthlyVolumeChart` | barres mensuelles | calculé | "Volume mensuel" | 🟢 Conserver | F |
| `WeeklyVolumeChart` | barres hebdo | calculé | "Volume hebdomadaire" | 🟢 Conserver | F |
| `ZoneLoadDistributionCard` | distribution Z1-Z5 | calculé | "Zones FC" | 🟢 Conserver | F |
| `TrainingSummaryKpiGrid` | KPI charge, ratios, etc. | calculé | divers | 🔵 Migrer (Phase G) — `RangeBar` au lieu de KpiGrid | M |
| `PerformanceTrendChart` | tendances allure/distance | calculé | "Tendance" | 🟢 Conserver | F |
| `DistanceDistributionChart` | distribution par distance | calculé | "Distribution" | 🟢 Conserver | F |
| `SportDistributionChart` | répartition par sport | calculé | "Sports" | 🟢 Conserver | F |
| `WeekdayDistributionChart` | répartition par jour | calculé | "Jours" | 🟢 Conserver | F |
| `TrainingStateGaugeGrid` | jauges synthétiques état | calculé | divers | 🔵 Migrer (Phase G) — utiliser `MetricGauge` | M |

**Total Analytics** : 14 composants → 3 migrés visuellement, 1 renommé, 10 conservés.

---

## 3. Page Performance

| Composant | Métriques affichées | Sources | Vocabulaire actuel | Décision Phase F-K | Risque |
|---|---|---|---|---|---|
| `VdotProfileCard` | VDOT estimé + zones d'allure | calculé Daniels | "VDOT", "Zones" | 🟢 Conserver | F |
| `BestEffortsPanel` | meilleurs efforts par distance | Strava | "Meilleurs efforts" | 🟢 Conserver | F |
| `PerformancePhysioCard` | profil physiologique (jauges) | Garmin | "Profil physiologique" | 🟡 Évaluer Phase F — redondant avec `TodayReadinessCard` ? Garder pour vue plus détaillée. | M |
| `PersonalPatternsCard` | 3 insights cross-data | calculé Phase D | "Patterns personnels" | 🟢 Conserver | F |
| `RaceCountdownCard` | compte à rebours course | — | "Course objectif" | 🟢 Conserver | F |
| `RaceObjectiveCallToAction` | proposition objectif | — | "Définir objectif" | 🟢 Conserver | F |
| `RaceObjectivesCard` | liste objectifs | — | "Objectifs" | 🟢 Conserver | F |

**Total Performance** : 7 composants → 1 à évaluer (PerformancePhysioCard), 6 conservés.

### 🔁 Doublon mineur Performance
**`PerformancePhysioCard` vs futur `TodayReadinessCard`** : tous deux affichent VFC, FC repos, sommeil, body battery. La carte Performance est plus détaillée (deltas vs baseline 35 j) ; la carte Dashboard est plus synthétique (jauge readiness). → **Décision Phase F** : conserver les deux, mais PerformancePhysioCard ne doit afficher que les variations historiques détaillées (graphes 56j) que le Dashboard n'a pas.

---

## 4. Page Activity Detail

| Composant | Métriques affichées | Sources | Vocabulaire actuel | Décision Phase F-K | Risque |
|---|---|---|---|---|---|
| `ActivityDetailCard` | enveloppe activité | — | — | 🟢 Conserver | F |
| `ActivityHeaderKpis` | distance, durée, allure, dénivelé | Strava | "Distance", "Durée", "Allure", "Dénivelé" | 🟣 Phase H — ajouter "Allure ajustée" (GAP Minetti) à côté | M |
| `ActivityPerformanceStrip` | charge séance, efficience, intensité | calculé | "Charge", "Efficience", "Intensité" | 🟣 Phase H — ajouter "Dérive cardiaque" et "Dette d'oxygène" | M |
| `ActivityMapCard` | carte trajectoire | Strava | — | 🟢 Conserver | F |
| `ActivitySplitsCard` | splits / kilomètres | Strava | "Splits", "Kilomètres" | 🟣 Phase H — ajouter colonne "Allure ajustée" par split | M |
| `IntraSessionInsightsCard` | insights séance (zones, pacing) | calculé | divers | 🔵 Migrer (Phase G) — re-style barres | M |
| `ActivityRpeCard` | effort perçu | utilisateur | "Effort perçu" | 🟢 Conserver | F |
| `GarminEnrichmentPanel` | snapshot du jour Garmin | Garmin | "Sommeil", "HRV", "FC repos", "Énergie" | 🟣 Renommer "HRV"→"VFC" (Phase J) | F |
| `ActivityRecoveryContextCard` | snapshots avant/après | Garmin | "Avant", "Après" | 🟣 Phase K — enrichir avec metrics Garmin par activité | M |

**Total Activity Detail** : 9 composants → 4 enrichis Phase H/K, 5 conservés.

### 🔁 Doublon Activity Detail
**`GarminEnrichmentPanel` + `ActivityRecoveryContextCard`** : superposés dans l'onglet Garmin, tous deux affichant des données du même jour. → **Phase H/K** : fusion dans un onglet "Garmin" structuré : section "Récupération" (avant/après) + section "Métriques séance" (Training Effect, EPOC, Performance Condition, Recovery Time depuis Phase K).

---

## 5. Page Admin / Réglages

| Composant | Métriques affichées | Sources | Vocabulaire actuel | Décision Phase F-K | Risque |
|---|---|---|---|---|---|
| `AccountOverviewCard` | profil athlète Strava | Strava | "Profil athlète" | 🟢 Conserver — onglet Compte | F |
| `AccountSecurityCard` | sécurité session | — | "Sécurité" | 🟢 Conserver — onglet Compte | F |
| `CurrentAccountPanel` | compte courant | — | — | 🟢 Conserver | F |
| `AthleteCard` | données athlète | — | — | 🟡 Fusionner avec AccountOverviewCard ? | M |
| `UserPreferencesCard` | préférences UI | — | "Préférences" | 🟢 Conserver — onglet Compte | F |
| `HeartRateSettingsCard` | FC max/repos | utilisateur | "FC max", "FC repos" | 🟢 Conserver — onglet Entraînement | F |
| `PhysiologicalProfileCard` | profil physio | utilisateur | "Profil physiologique" | 🟡 Fusionner avec HeartRateSettingsCard ? | M |
| `TrainingAnalyticsSettingsCard` | méthode charge, zones | utilisateur | "Méthode de calcul" | 🟢 Conserver — onglet Entraînement | F |
| `StravaAppSettingsCard` | conn. Strava | — | "Connexion Strava" | 🟢 Conserver — onglet Connexions | F |
| `GarminExperimentalCard` | conn. + métriques + actions Garmin | Garmin | "Garmin", "Sync", "Purge" | 🔵 Migrer (Phase I3) — section purge isolée mais visible ; actions regroupées | M |
| `SyncStatusCard` | statut sync en cours | — | "Synchronisation en cours" | 🟢 Conserver — onglet Connexions | F |
| `SyncSummaryCard` | bilan sync | — | "Résumé" | 🟢 Conserver | F |
| `SyncActions` | actions sync | — | divers | 🟢 Conserver | F |
| `AdminSectionHeader` | titre section admin | — | — | 🔴 Remplacer par tabs (Phase I1) | F |

**Total Admin** : 14 composants → 2 fusions à évaluer, 1 migré, 1 supprimé, 10 conservés (réorganisés en 5 onglets Phase I).

### 🔁 Doublons Admin
**`AthleteCard` + `AccountOverviewCard`** : possible doublon, à clarifier en Phase I.
**`HeartRateSettingsCard` + `PhysiologicalProfileCard`** : possible doublon, à clarifier en Phase I.

---

## 6. Composants transverses (utilitaires UI)

| Composant | Rôle | Décision Phase F-K | Risque |
|---|---|---|---|
| `KpiGrid` | grille KPI générique | 🔵 Co-existe avec composants Phase G | F |
| `InfoTooltip` | tooltip d'aide | 🔵 Phase J — mode `compact` (≤ 80 caractères) + bouton "Voir glossaire" | M |
| `GlossaryModal` | modal glossaire actuel | 🔴 **À remplacer** Phase J — page `/glossaire` dédiée | M |
| `AlertCard`, `AlertPill`, `AlertScoreBadge`, `AlertSeverityIcon`, `AlertFamilyIcon` | système d'alertes | 🟢 Conserver | F |
| `MobileFoldableSection` | accordéon mobile | 🟢 Conserver | F |
| `PageLoadingState`, `AppErrorBoundary` | états techniques | 🟢 Conserver | F |
| `AppNavigation`, `AppTopbar`, `AppBrand` | navigation | 🟢 Conserver | F |
| `ActivityFilters`, `ActivitiesTable` | listing activités | 🟢 Conserver | F |

---

## 7. Synthèse globale

### Compteur final
- **Total composants inventoriés** : **72**
- **Composants principalement métier (cartes / charts)** : **49**
- **Composants utilitaires UI** : **23**

### Décisions par catégorie
| Décision | Nombre |
|---|---|
| 🟢 Conserver tel quel | 41 |
| 🔵 Migrer visuellement (Phase G) | 9 |
| 🟡 Fusionner avec un autre | 4 |
| 🔴 Supprimer (redondance) | 4 |
| 🟣 Renommer / enrichir | 8 |
| À évaluer en cours de phase | 6 |

### Suppressions définitives confirmées Phase F-K
1. `RecoverySnapshotCard` — fusion Phase F1
2. `TodayRecoveryCard` — fusion Phase F1
3. `GlossaryModal` — remplacé par page `/glossaire` Phase J3
4. `AdminSectionHeader` — remplacé par tabs Phase I1
5. (`TodaySnapshotToday` à évaluer en cours Phase F5)

### Composants nouveaux à créer
- `TodayReadinessCard` (Phase F1) — fusion Recovery
- `MetricGauge` (Phase G2) — jauge demi-cercle
- `RangeBar` (Phase G2) — barre + zones
- `MicroBars` (Phase G3) — remplaçant sparklines
- `BandPositioner` standardisé (Phase G4) — extraction depuis DynamicsGrid
- `GlossaryLink` (Phase J2) — lien vers entrée glossaire
- `TabbedSettings` (Phase I1) — navigation 5 onglets
- 5 sous-pages Admin (`AdminAccountTab`, `AdminConnectionsTab`, `AdminTrainingTab`, `AdminDataTab`, `AdminAboutTab`) (Phase I2)

---

## 8. Risques de régression cartographiés

### Élevé
- Aucun composant identifié.

### Moyen
- `DashboardDecisionSummaryCard` (refonte F2) — affecte la décision principale du jour
- `TodayFormCards` (migration F3) — central sur Dashboard
- `DynamicsGrid` (migration G) — source de signaux pour PerformancePage
- `GarminExperimentalCard` (migration I3) — point d'entrée connexion Garmin
- `ActivityHeaderKpis`, `ActivityPerformanceStrip`, `ActivitySplitsCard` (Phase H) — métriques d'activité enrichies (GAP, decoupling, EPOC)
- `InfoTooltip` (Phase J) — utilisé partout

### Faible
- Tous les autres.

### Stratégie d'atténuation
1. **Snapshot tests Vitest** sur les fonctions analytiques avant chaque migration
2. **Captures d'écran** avant/après pour les composants Risque Moyen
3. **Anciens composants supprimés en dernier**, après validation visuelle

---

## 9. Liste des renommages prévus en Phase J

| Code actuel | Phase J | Lieu(x) impacté(s) |
|---|---|---|
| `HRV`, `hrvAvg`, `hrv-` | `VFC` (label) — code reste `hrvAvgMs` | tous composants Recovery |
| `Body Battery` | `Énergie` | RecoverySnapshotCard, TodayRecoveryCard, GarminEnrichmentPanel, PerformancePhysioCard |
| `Training Readiness` | `Aptitude (Garmin)` | DashboardDecisionSummaryCard, jauge à créer |
| `TRIMP`, `Suffer Score`, `Charge cumulée` | `Charge` (uniformément) | RollingLoadChart, KpiGrid, narratives |
| `CTL`, `Chronic Training Load` | `Base de fond` | RollingLoadChart, KpiGrid |
| `ATL`, `Acute Training Load`, `Fatigue` | `Fatigue récente` | RollingLoadChart, KpiGrid |
| `TSB`, `Training Stress Balance` | `Fraîcheur` | RollingLoadChart, KpiGrid |
| `GAP`, `Grade Adjusted Pace` | `Allure ajustée` | ActivityHeaderKpis, ActivitySplitsCard |
| `Decoupling`, `Pa:Hr` | `Dérive cardiaque` | ActivityPerformanceStrip (nouveau) |
| `EPOC` | `Dette d'oxygène` | GarminEnrichmentPanel (étendu Phase K) |
| `Sleep score` | `Score sommeil` | partout |
| `RestingHR`, `Resting HR` | `FC repos` | partout |
| `Stress Avg`, `stressAvg` | `Stress moyen` | partout |
| `Body Battery Morning` | `Énergie matin` | partout |
| `dataQuality` | `Couverture des données` | tooltips uniquement |

---

## 10. Validation utilisateur attendue avant Phase J/G

Avant de démarrer les phases suivantes, l'utilisateur doit valider :

1. **Liste des suppressions** : `RecoverySnapshotCard`, `TodayRecoveryCard`, `GlossaryModal`, `AdminSectionHeader`
2. **Fusions évoquées** : `AthleteCard`+`AccountOverviewCard`, `HeartRateSettingsCard`+`PhysiologicalProfileCard`, `PerformancePhysioCard` (à conserver pour vue détaillée)
3. **Mapping de renommage** Phase J (table section 9)

Sans cette validation, les phases F/G/J restent bloquées.
