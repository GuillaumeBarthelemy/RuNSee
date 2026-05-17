# Codebase Map

## Vue generale

Monorepo `C:\Services\RuNSee` :

- `backend/` : Node.js + Express + Prisma, ESM, JS pur.
- `frontend/` : React + Vite + React Router, JS/JSX pur.
- DB dev : SQLite `backend/dev.db` local, ignore Git.
- DB prod cible : PostgreSQL via `backend/prisma-postgresql/schema.prisma`.

## Documentation projet

- `docs/README.md` : point d'entree documentaire et conventions de classement.
- `docs/architecture/` : documents d'architecture vivants, dont `MULTI_SOURCE_AUDIT.md` et `MULTI_SOURCE_ARCHITECTURE.md`.
- `docs/quality/` : quality gate, test log, matrice de validation et checklist release.
- `docs/decisions/` : ADR RunNSee.
- `docs/plans/active/` : plans en cours.
- `docs/plans/old/` : plans termines et archives.
- `docs/releases/` : baselines, tags et notes de release.
- `docs/operations/` : runbooks et procedures operationnelles.
- `.ai/README.md` : cadrage du contexte agent court terme.

## Backend critique

- `src/app.js` : montage routes Express.
- `src/routes/provider.routes.js` : routes Garmin non officiel.
- `src/controllers/provider.controller.js` : controllers providers.
- `GET /providers/status` : statut public filtre Strava/Garmin pour layout global.
- `POST /sync/all` : sync globale sequentielle via job `global_incremental`, Strava incremental + Garmin recovery recent + Garmin activites recentes bornees.
- `src/services/providers/garminProvider.service.js` : connexion Garmin, MFA, purge, metriques sync.
- `src/services/providers/garminRecoveryBackfill.service.js` : recuperation recovery quotidienne.
- `src/services/providers/garminActivityEnrichment.service.js` : enrichissement activites Garmin -> Strava, incluant le mode global borne `recent_missing`.
- `src/services/providers/garminHistoricalBackfill.service.js` : orchestration du backfill historique Garmin activites par fenetres 180 j, pause/reprise et scheduler ; expose aussi des helpers purs pour tester l'eligibilite des fenetres dues.
- `ProviderBackfillWindowLog` : journal persistant par fenetre Garmin, utilise pour les compteurs Admin et les diagnostics d'erreur/doublon.
- `src/services/providers/providerActivityDuplicateDetection.service.js` : detection reutilisable des doublons actifs Strava/Garmin basee sur le matching provider.
- `src/services/providers/garminconnectBridge.service.js` : subprocess Python.
- `scripts/providers/garminconnect_bridge.py` : operations `login`, `fetch_recovery_days`, `fetch_activities`.
- `src/services/providers/garminActivityEnrichment.service.test.js` : tests purs matching Garmin/Strava et normalisation Garmin.
- `repositories/activity.repository.js` : acces Activity, inclut maintenant `providerEnrichments` sur detail user.

## Frontend critique

- `pages/PerformancePage.jsx` : orchestrateur Performance V5 en cours ; onglet `Vue d'ensemble` livré, filtres compacts, activités canoniques sans `isMerged`.
- `components/performance/PerformanceOverviewTab.jsx` : rendu Alpine Light de la synthèse Performance.
- `components/performance/PerformanceMetricCard.jsx`, `PerformanceMiniTrend.jsx`, `PerformanceEmptyState.jsx` : primitives Performance V5.
- `utils/performanceOverviewModel.js` : modèle pur de la Vue d'ensemble Performance (allure ajustée, VDOT estimé, économie de course, endurance fondamentale, zones FC légères, distribution d'allures, tendances, confiance).
- `utils/performanceOverviewModel.test.js` : tests anti-doublon `isMerged` et garde-fous économie de course.
- `pages/ActivityDetailPage.jsx` : charge detail activite, snapshots Garmin, action enrichment Garmin ciblee.
- `components/ActivityDetailCard.jsx` : compose la fiche activite.
- `components/ActivityDetailTabs.jsx` : onglets Carte/Splits/Intra/RPE/Garmin.
- `components/ActivityTrailCard.jsx` : lecture trail conditionnelle sur le detail activite.
- `components/TrailSpecificityCard.jsx` : synthese trail dans Analytics.
- `components/GarminEnrichmentPanel.jsx` : recovery snapshot + metriques Garmin de seance.
- `components/GarminActivityBackfillCard.jsx` : carte Admin pour lancer, suivre, mettre en pause et reprendre le backfill historique Garmin activites.
- `components/CurrentAccountPanel.jsx` : zone compte sidebar, statuts Strava/Garmin sans doublon et bouton de sync globale.
- `components/DashboardDecisionSummaryCard.jsx` : Lecture du jour, verdict/action/vigilance/signaux cles avec contexte trail integre.
- `components/AnalysisConfidenceBadge.jsx` : badge compact de qualite/confiance d'analyse, reutilise dans Aujourd'hui, Analytics, Performance et Trail.
- `components/TodayHeader.jsx` : header compact Aujourd'hui, filtre sport local avec chip actif et reset.
- `components/TodaySevenDaySummary.jsx` : synthese compacte 7 jours (recuperation, charge, volume, trail) sans graphe lourd.
- `components/TodayUsefulActivities.jsx` : selection de 3 activites utiles a relire, compatible identite multi-source.
- `hooks/useProviderStatuses.js` : appel consolide des statuts Strava/Garmin.
- `utils/trailProfile.js` : calculs trail purs (terrain, D+/D-, temps pente, charge descente).
- `utils/activityEnrichment.js` : mapping stable des metriques Garmin par activite.
- `utils/analysisConfidence.js` : moteur pur de score qualitatif de confiance des analyses ; ne modifie pas les KPI, qualifie les limites de donnees.
- `utils/analysisConfidence.test.js` : tests Vitest purs du moteur de confiance.
- `services/externalProvider.service.js` : appels API providers.

## Objectifs course

- `UserRaceObjective` porte maintenant des champs trail optionnels : D+, D-, terrain, duree cible, montee/descente longue, priorite.
- Migration a appliquer : `20260507123000_add_trail_race_objective_fields` (SQLite et PostgreSQL).

## Scripts DB

- `scripts/db/tableDefinitions.js` : liste ordonnee des 15 modeles.
- `scripts/db/export-sqlite-dump.js` : dump JSON SQLite.
- `scripts/db/import-postgresql-dump.js` : import PostgreSQL avec dry-run et garde-fous.
- `scripts/db/compare-prisma-schemas.js` : detection de drift entre modeles Prisma SQLite et PostgreSQL.
- `scripts/db/report-database-snapshot.js` : snapshot counts + integrite Garmin.
- `scripts/db/detect-provider-activity-duplicates.js` : detection dry-run des doublons Strava/Garmin par utilisateur.
- `scripts/db/repair-provider-activity-duplicates.js` : soft-merge explicite Garmin -> Strava, sans suppression physique.
- `docs/plans/old/runsee_review_finale.md` : plan de controle final post-correctif Garmin/Strava et criteres de baseline stable.
- `deployment/scripts/Export-RunSeeSourceArchive.ps1` : archive source propre via `git archive`.
- `deployment/postgresql/scripts/validate-green-stack.ps1` : validation GREEN publique ou authentifiee selon cookie fourni.

## Modeles provider importants

- `ExternalProviderConnection` : etat de connexion provider + session chiffree.
- `ExternalProviderRawData` : brut provider deduplique.
- `ExternalDailyRecoverySnapshot` : recovery quotidien normalise.
- `ActivityProviderEnrichment` : enrichissement d'une activite Strava par provider externe.
- `ActivityProviderLink` : trace de rapprochement provider vers activite canonique, y compris matchs ambigus sans merge.
- `ProviderBackfillCursor` : curseur de backfill historique provider/resource.
- `ProviderBackfillWindowLog` : historique auditable des fenetres de backfill, avec compteurs, statut, erreurs et resume JSON redige.
- `Activity.sourceProvider/sourceActivityId` : identite canonique multi-source, Strava restant prioritaire quand un match Garmin fiable existe.
- `Activity.isMerged/mergedIntoActivityId/mergedAt` : soft-merge non destructif pour masquer un doublon provider repare.
- `Activity.totalElevationLoss` : D- canonique quand une source le fournit.

## Multi-sources activites

- `src/services/providers/garminActivityNormalizer.service.js` : normalisation Garmin activity vers candidate canonique.
- `src/services/providers/activityProviderMatching.service.js` : scoring exact/probable/ambiguous/not_found/rejected ; compare les dates UTC en priorite et reserve `exact` aux matches avec timestamp, distance et duree strictement coherents.
- `garminActivityEnrichment.service.js` : enrichit Strava quand le match est fiable et peut creer une activite Garmin-only quand aucun match fiable n'existe.
- `/sync/all` : retourne un mode provider-aware (`strava_primary_garmin_enrichment_with_fallback`, `strava_only`, `garmin_primary`, `no_provider`).
- `frontend/src/utils/activityLinks.js` : construction d'identifiants/liens publics multi-source pour les composants UI.

## Page Analyse Alpine Light V5 (Lot 04, refondu 2026-05-16/17)

### Onglets et composants

- `pages/AnalyticsPage.jsx` : orchestrateur, monte les 5 onglets, calcule `analyticsScopeActivities`, `trainingLoadModel`, `chargesTrainingLoadModel` (1 an glissant dedie a Charges), `weeklySummary`, `intensityModel`, `recoveryVm`, `recoverySnapshots`.
- `components/analytics/AnalyticsOverviewTab.jsx` : Vue d'ensemble (PDF p.7).
- `components/analytics/AnalyticsChargesTab.jsx` : Charges (PDF p.8).
- `components/analytics/AnalyticsTrendsTab.jsx` : Tendances (PDF p.9).
- `components/analytics/AnalyticsIntensitiesTab.jsx` : Intensites (PDF p.10).
- `components/analytics/AnalyticsRecoveryTab.jsx` : Sommeil & recuperation (PDF p.11).

### Sub-composants partages Alpine Light V5

- `components/analytics/OverviewIndicatorCard.jsx` : KPI card uniforme (label + valeur + hint + range bar + delta).
- `components/analytics/OverviewRangeBar.jsx` : SVG gradient + curseur HTML, 3 gradients (`warm`, `cool`, `polar`). Direction physiologique : LOW good = warm, HIGH good = cool, OPTIMAL middle = polar.
- `components/analytics/OverviewChargeFatigueRow.jsx` : ligne Charge/Fatigue Vue d'ensemble + carte Etat actuel.
- `components/analytics/OverviewPaceAdjustedCard.jsx` : carte Allure ajustee (Minetti 2002).
- `components/analytics/OverviewDecouplingCard.jsx` : carte Derive cardiaque (Allen & Coggan 2010).
- `components/analytics/OverviewEpocCard.jsx` : carte Charge d'entrainement Garmin (Firstbeat Training Load).
- `components/analytics/OverviewIntensityDonut.jsx`, `OverviewTakeawayBullets.jsx`.
- `components/analytics/TrendsRegularityHeatmap.jsx` : heatmap calendrier SVG, responsive via ResizeObserver, tooltip HTML enrichi, marqueur "aujourd'hui", palette WCAG verte.
- `components/visuals/alpine/AlpineSelect.jsx` : dropdown stylise reutilisable (chevron + a11y native).

### Helpers metier (utils/)

- `utils/analyticsFocus.js` : `buildPeriodPaceAdjustedSummary`, `buildPeriodDecouplingSummary`, `buildPeriodEpocSummary` (consomme `activityTrainingLoad`), `buildOverviewTakeaways`, `buildFourWeeksBackComparison` (avec ctlRef, tsbRef), `formatRecoveryTime`. Tests : `analyticsFocus.test.js`.
- `utils/analyticsTrends.js` : `buildMonthlyTrendsMatrix`, `buildPeriodComparison`, `buildRegularityStats` (active days, longest streak), `buildHeatmapMatrix` (avec per-day count/distance/duration), `buildRolling30Comparison`.
- `utils/analyticsIntensities.js` : `ZONE_COLORS`, `ZONE_LABELS`, `buildIntensityKpi` (filtre par range), `buildIntensityWeeklySeries`, `buildIntensityRouteVsTrail` (returns null si l'un des deux types manque), `buildIntensityRolling30Comparison`, `shareZ1Z2/Z3Z5/Z4Z5`, `activeZonesCount`, `classifyEndurance/Moderate/Variety`, `buildFooterTakeaway`. Convention "Allure soutenue" = Z4+Z5 (above LT2, Seiler/Coggan/Daniels/Skiba).
- `utils/analyticsRecovery.js` : `buildRecoveryRolling30` (accepte un `readinessOverride` issu du composite `recoveryVm.readiness.score`), `buildRecoveryDailySeries`, classifiers (`classifySleep`, `classifyHrv`, `classifyRestingHr`, `classifyStress`, `classifyReadiness`), `buildRecoveryRecommendation` (4 branches Halson 2014 / Plews 2013 / Buchheit 2014 / Le Meur 2013). Helper `snapshotDate(s)` accepte les deux shapes `s.date` (API) et `s.snapshotDate` (raw DB).

### Sources scientifiques referencees dans les commentaires JSDoc

- Sommeil : NSF 2015, AASM 2015.
- Charges/CTL/ATL/TSB : Banister 1991, Allen & Coggan 2010, Mujika 2017, Friel 2009, Gabbett 2016, Foster 2001, Skiba 2007.
- Intensites zones FC : Seiler 2010, Stoggl & Sperlich 2014, Treff 2019, Daniels 2014.
- Volume/Frequence/Denivelle : Esteve-Lanao 2007, Jones 2006, Haugen 2022, Millet 2011, OMS 2020, Tudor-Locke 2011.
- HRV/Recuperation : Plews & Laursen 2013, Buchheit 2014, Le Meur 2013, Halson 2014.
- Decouplage cardiaque : Allen & Coggan 2010 (Pa:Hr).
- Allure ajustee : Minetti 2002 (GAP).
- EPOC/Training Load : Borsheim & Bahr 2003 (EPOC originel), Firstbeat 2014 (Training Load successeur).

## Garmin bridge (Python) — endpoint DETAIL

- `backend/scripts/providers/garminconnect_bridge.py` : `api.get_activities_by_date` (LIST) + `api.get_activity(id)` (DETAIL) pour merge `summaryDTO` avec `activityTrainingLoad`, `trainingEffect`, `beginPotentialStamina`, etc. Pacing 1s entre appels DETAIL pour eviter rate-limit. Stop propre sur 429.
- `backend/src/services/providers/garminActivityEnrichment.service.js` : `MAX_LOOKBACK_DAYS=180` (Garmin hard cap). Mode `recent_missing` capable de couvrir jusqu'a 180 j en un appel apres relevement du cap.
- Champs Firstbeat exposes par le normalizer : `activityTrainingLoad`, `trainingEffect`, `beginPotentialStamina`, `endPotentialStamina`, `differenceBodyBattery`, `moderateIntensityMinutes`, `vigorousIntensityMinutes` (+ legacy epoc/recoveryTime/lactate gardes si la montre les expose).

## Scripts maintenance ops (backend/scripts/maintenance/)

- `backfill-cardiac-decoupling.js` : batch backfill du champ `cardiacDecouplingPercent` sur Activity (Allen & Coggan 2010).
- `trigger-garmin-enrichment.js` : declenche l'enrichissement Garmin pour tous les users connectes (`--days=180 --force`).
- `inspect-garmin-enrichments.js` : compte les enrichments, expose un sample (epoc, recoveryTime, AET).
- `renormalize-garmin-recovery.js` : renormalise les snapshots recovery existants.
- `diagnose-overview-data.js`, `diagnose-enrichments-content.js`, `diagnose-raw-garmin-keys.js`, `diagnose-recovery-snapshots.js`, `check-training-load.js`, `check-tl-coverage.js`, `probe-bridge-detail.js`, `inspect-garmin-sleep-payload.js` : scripts one-shot diagnostiques, utilisables via `docker exec runsee-backend node scripts/maintenance/<script>.js`.

## Contraintes de conception

- Strava reste source principale des activites.
- Garmin non officiel reste un enrichissement temporaire.
- Les dashboards ne doivent pas consommer directement le payload Garmin brut.
- Les imports DB reels doivent etre explicites et precedes d'un backup.
- Page Analyse : ne pas reintroduire de calcul metier dans les composants Tab — passer par les utils dedies (`analyticsFocus`, `analyticsTrends`, `analyticsIntensities`, `analyticsRecovery`).
- Tous les KPI Analyse utilisent la comparaison **rolling 30 j vs 30 j precedents** (eviter le biais "mois courant partiel").
