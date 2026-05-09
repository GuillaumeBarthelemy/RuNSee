# SUIVI_CHANTIER_ALPINE_LIGHT.md

## 0. Objectif

Suivi exhaustif de l'implementation de la refonte UX/UI Alpine Light de RunNSee.
Ce fichier doit permettre de reprendre le chantier apres coupure par Claude, CODEX ou un humain.

Source de verite :
- Plan : `docs/plans/active/runsee_handoff_claude_alpine_light_complet.zip` -> `01_plan/runsee_plan_developpement_ux_alpine_light.md`
- Mockups : meme zip -> `02_mockups/runsee_mockups_support_presentation_final.pdf`
- Contexte : `.ai/*.md` du depot (priment sur les copies du zip).

---

## 1. Etat global

| Champ | Valeur |
|---|---|
| Chantier | Refonte UX/UI Alpine Light |
| Statut global | En cours - Lot 1 termine, en attente GO Lot 2 |
| Dernier lot traite | Lot 1 - Design system Alpine Light |
| Dernier commit | a creer apres MAJ suivi |
| Derniere archive review | `runsee-source-review-analysis-confidence-final.zip` (chantier precedent) |
| Dernier test frontend | 156/156 (chantier precedent, post correctif Charge) |
| Dernier test backend | 21/21 |
| Dernier build | OK (Vite, chantier precedent) |
| Derniere decision GO/NO-GO | GO chantier precedent (`runsee-stable-analysis-confidence` pose) |

---

## 2. Regles validees a respecter

- Analyse = comprendre l'etat d'entrainement actuel.
- Performance = mesurer le niveau et les capacites.
- Progression = suivre la construction long terme.
- Performance sans section Puissance.
- Progression utilise `Cumul annuel` / `Depuis le debut de l'annee`, jamais `YTD`.
- Reglages conserve : Compte / Connexions / Entrainement / Donnees / A propos.
- Le PDF est la cible visuelle ; le `.md` prime pour les regles metier et la non-regression.

### Vocabulaire UI canonique

| Interdit en UI | Canonique |
|---|---|
| YTD | Cumul annuel / Depuis le debut de l'annee |
| HRV | VFC |
| Body Battery | Energie |
| GAP | Allure ajustee |
| Decoupling | Derive cardiaque |
| EPOC | Dette d'oxygene |
| Training Readiness Garmin | Aptitude RuNSee |
| Load / TRIMP | Charge d'entrainement |
| ATL | Fatigue |
| CTL | Condition |
| TSB | Equilibre charge/fatigue |

### Conflit detecte plan/PDF (plan prime)

- Performance : PDF mentionne 5 sous-onglets (avec "Records") ; le plan en valide 4 (Vue d'ensemble / VDOT & profil / Allures de reference / FC de performance). Decision : suivre le plan, integrer les records dans la "Vue d'ensemble" comme prevu.
- Progression : PDF mentionne Cumul annuel / Volume / Regularite / Comparaisons ; le plan valide Cumul annuel / Evolution depuis le debut de l'annee / Comparaisons / Tendances long terme. Decision : suivre le plan.

---

## 3. Journal detaille des lots

### Lot 0 - Preparation

| Element | Statut / notes |
|---|---|
| Documents lus | Plan complet, PDF mockups (texte extrait), `.ai/current_context.md`, `.ai/open_tasks.md`, `.ai/regression_risks.md`, `.ai/codebase_map.md`, `00_PROMPT`, `00_README`, `00_SUIVI`, `00_CHECKLIST_ANTI_REGRESSION` |
| Composants existants identifies | `MetricGauge`, `RangeBar`, `MicroBars`, `TrendChip`, `BandPositioner`, `InfoTooltip` (mode `compact`), `GlossaryLink`, `AnalysisConfidenceBadge`, `TabbedSettings`, page `/glossaire` |
| Audit vocabulaire interdit | YTD : 10 occurrences UI a corriger (Analytics, PeriodComparison, trainingMvpCopy). Body Battery : 4 occurrences UI a corriger (DynamicsGrid description, garminExperimentalCopy x2, performanceNarratives factor). Aliases conserves en `glossary.js` et `tonePicker` JSDoc OK. |
| Etat Git initial | Workspace propre, branche `main`, derniers commits Phase score confiance + correctif Charge. |
| Risques identifies | Modifs ne doivent pas casser : `useActivityViewModel`, `buildDashboardDecisionSummary`, `buildVdotProfile`, `buildLoadDynamicsProfile`, `recoveryViewModel`, `gradeAdjustedPace`, `loadModel`. Ne pas reintroduire `isMerged=true` dans les listes. Ne pas modifier `AnalyticsPage` filtres globaux ni `useDashboardState`. |
| Decision avant codage | GO Lot 0. STOP avant Lot 1, attendre validation utilisateur. |
| Tests avant modification | 156/156 frontend (post chantier precedent), 21/21 backend, build OK. |

### Lot 1 - Design system Alpine Light (TERMINE)

| Element | Statut / notes |
|---|---|
| Statut | TERMINE - 100% additif, aucune page existante touchee |
| Fichiers modifies | `frontend/src/styles.css` (+~470 lignes : variables Alpine Light + 10 composants), `frontend/src/pages/VisualsPreviewPage.jsx` (extension demo) |
| Fichiers crees | 10 composants sous `frontend/src/components/visuals/alpine/` : `PageHeader`, `SectionHeader`, `KpiCard`, `InsightCard`, `RightRailCard`, `SubTabs`, `MetricRow`, `CoachAdviceBar`, `EmptyState`, `SourceBadge` |
| Variables CSS Alpine Light ajoutees | `--al-bg`, `--al-surface`, `--al-surface-soft`, `--al-border`, `--al-border-soft`, `--al-text`, `--al-text-soft`, `--al-muted`, `--al-primary`, `--al-primary-soft`, `--al-primary-stronger`, `--al-success/-soft`, `--al-warning/-soft`, `--al-alert/-soft`, `--al-info/-soft`, `--al-shadow-card`, `--al-shadow-strong`, `--al-radius-card/-pill/-input`. Aucune var existante modifiee. |
| Composants reutilises | `MetricGauge`, `RangeBar`, `MicroBars`, `TrendChip`, `BandPositioner` (inchanges, integres dans demo), `InfoTooltip` (mode `compact` integre dans `SectionHeader`). |
| Tests realises | Vitest 156/156, ESLint 0 warning, build Vite OK 445 ms, `git diff --check` propre. |
| Resultat | Demo `/visuals-preview` etendue avec 6 nouvelles sections (KpiCard, InsightCard, SubTabs, MetricRow+RightRailCard+SourceBadge, EmptyState, CoachAdviceBar). Cible visuelle : palette claire, bandeau montagne discret, cartes blanches arrondies, accent bleu primaire `#1268f3`. |
| Risques residuels | Aucun (additif). Les pages existantes n'utilisent PAS encore les nouvelles primitives Alpine Light. La migration page par page sera faite dans les Lots 2-9. |
| Commit | `feat(ui): introduce alpine light layout primitives` (a pousser) |

### Lot 2 - Layout global

| Element | Statut / notes |
|---|---|
| Statut | Pas demarre |
| Fichiers prevus | `frontend/src/layouts/AppLayout.jsx`, `AppShell.jsx`, `components/AppNavigation.jsx`, `AppTopbar.jsx`, `AppBrand.jsx`, ajout bandeau montagne discret. |
| Sidebar | A re-styler Alpine Light, conserver routes existantes |
| Topbar | Allegement, meteo legere si dispo |
| Header / bandeau montagne | Bandeau visuel discret en haut de page |
| Responsive | Mobile-first, sidebar transformable |
| Commit prevu | `feat(ui): harmonize alpine light app layout` |

### Lot 3 - Aujourd'hui

| Element | Statut / notes |
|---|---|
| Statut | Pas demarre |
| Fichiers prevus | `frontend/src/pages/DashboardPage.jsx`, `DashboardDecisionSummaryCard.jsx` (re-style), `TodayReadinessCard.jsx` (re-style), `TodayFormCards.jsx`, eventuellement nouvelle "Sortie suggeree" + "Conseil du jour" |
| Commit prevu | `feat(today): apply alpine light dashboard` |

### Lot 4 - Activites

| Element | Statut / notes |
|---|---|
| Statut | Pas demarre |
| Fichiers prevus | `frontend/src/pages/ActivitiesPage.jsx`, `components/ActivitiesTable.jsx`, `ActivityFilters.jsx`, `RecentActivitiesCard.jsx`, ajout colonne droite synthese hebdo |
| Commit prevu | `feat(activities): apply alpine light activity list` |

### Lot 5 - Analyse (Vue ensemble + 4 sous-onglets)

| Element | Statut / notes |
|---|---|
| Statut | Pas demarre |
| Fichiers prevus | `frontend/src/pages/AnalyticsPage.jsx` (refonte structure en sous-onglets), creation 5 panels : `AnalysisOverviewPanel`, `AnalysisChargesPanel`, `AnalysisTrendsPanel`, `AnalysisIntensitiesPanel`, `AnalysisSleepRecoveryPanel`. Suppression UI `YTD` (deplace vers Progression). |
| Commit prevu | `feat(analytics): apply alpine light analysis tabs` |

### Lot 6 - Performance (4 sous-onglets, sans Puissance)

| Element | Statut / notes |
|---|---|
| Statut | Pas demarre |
| Fichiers prevus | `frontend/src/pages/PerformancePage.jsx`, panels : `PerformanceOverviewPanel`, `VdotProfilePanel` (etend VdotProfileCard), `ReferencePacesPanel`, `PerformanceHrPanel`. Verifier absence Puissance. |
| Commit prevu | `feat(performance): apply alpine light performance view` |

### Lot 7 - Progression (4 sous-onglets, Cumul annuel)

| Element | Statut / notes |
|---|---|
| Statut | Pas demarre |
| Fichiers prevus | Nouvelle route `/progression` ou refonte d'un onglet existant. `pages/ProgressionPage.jsx`, panels : `ProgressionAnnualPanel`, `ProgressionEvolutionPanel`, `ProgressionComparisonsPanel`, `ProgressionLongTermPanel`. Reutiliser `MonthlyVolumeChart`, `WeeklyVolumeChart`, `PeriodComparisonSection` (nettoye YTD). Ajouter route App.jsx + AppNavigation. |
| Commit prevu | `feat(progression): apply alpine light long-term progression` |

### Lot 8 - Reglages (5 onglets Alpine Light)

| Element | Statut / notes |
|---|---|
| Statut | Pas demarre - 5 onglets deja en place via `TabbedSettings`, a re-styler |
| Fichiers prevus | `frontend/src/pages/AdminPage.jsx`, `components/TabbedSettings.jsx` re-style, sous-cartes existantes alignees Alpine Light |
| Commit prevu | `feat(settings): apply alpine light settings tabs` |

### Lot 9 - Glossaire

| Element | Statut / notes |
|---|---|
| Statut | Pas demarre - page `/glossaire` deja en place, a re-styler + index alphabetique + 6 categories |
| Fichiers prevus | `frontend/src/pages/GlossairePage.jsx` (re-style + categories validees + index alpha) |
| Commit prevu | `feat(glossary): apply alpine light glossary` |

### Lot 10 - Nettoyage UX

| Element | Statut / notes |
|---|---|
| Statut | Pas demarre |
| Fichiers prevus | A determiner apres recette |
| Commit prevu | `refactor(ui): remove obsolete pre-alpine components` |

---

## 4. Journal des decisions

| Date | Decision | Justification | Impact | Validee par |
|---|---|---|---|---|
| 2026-05-09 | Suivre le plan `.md` plutot que le PDF en cas de conflit (Performance a 4 sous-onglets et non 5, Progression a Cumul annuel/Evolution/Comparaisons/Tendances long terme et non Volume/Regularite) | Regle handoff section En cas de conflit | Coherence avec specifications metier | Plan handoff |
| 2026-05-09 | Lot 0 termine sans modification de code, juste audit + suivi | Methode imposee : checkpoint avant Lot 1 | Permet validation utilisateur avant codage | Methode imposee |
| 2026-05-09 | Variables Alpine Light prefixees `--al-*` pour ne pas modifier les variables existantes consommees par 70+ composants antérieurs | Eviter regression visuelle massive sur les pages non encore migrees vers Alpine Light | Coexistence des deux systemes pendant la transition (Lots 2-9) | GO methode anti-regression |
| 2026-05-09 | Composants Alpine Light isoles sous `src/components/visuals/alpine/` sans modifier les visuels Phase G (`MetricGauge`, etc.) | Additivite stricte, zero impact sur pages existantes tant qu'elles ne consomment pas les nouvelles primitives | Permet rollback simple si necessaire | Methode imposee |

---

## 5. Journal des anomalies

| Date | Anomalie | Page | Gravite | Cause | Correction | Statut |
|---|---|---|---|---|---|---|

---

## 6. Journal des tests

| Date | Commande / recette | Resultat | Notes |
|---|---|---|---|
| 2026-05-09 (Lot 0) | git status --short | OK | Workspace propre |
| 2026-05-09 (Lot 0) | grep YTD frontend/src | 10 occurrences UI | A corriger lots 5/7 |
| 2026-05-09 (Lot 0) | grep "Body Battery" frontend/src | 4 occurrences UI | A corriger lots 1/3/5 |
| 2026-05-09 (Lot 1) | npm test -- --run frontend | 156/156 OK | Aucune regression apres ajout primitives Alpine |
| 2026-05-09 (Lot 1) | npm run build frontend | OK 445 ms | Bundles vendor/charts/maps inchanges, dist OK |
| 2026-05-09 (Lot 1) | npx eslint src/components/visuals/alpine src/pages/VisualsPreviewPage.jsx | 0 warning | Tous les composants Alpine Light propres |
| 2026-05-09 (Lot 1) | git diff --check | OK | Pas de whitespace bloquant |

---

## 7. Recette visuelle

| Vue | Desktop | Mobile | Commentaire |
|---|---|---|---|
| Aujourd'hui | a faire | a faire | |
| Activites | a faire | a faire | |
| Analyse - Vue d'ensemble | a faire | a faire | |
| Analyse - Charges | a faire | a faire | |
| Analyse - Tendances | a faire | a faire | |
| Analyse - Intensites | a faire | a faire | |
| Analyse - Sommeil & recuperation | a faire | a faire | |
| Performance - Vue d'ensemble | a faire | a faire | |
| Performance - VDOT & profil | a faire | a faire | |
| Performance - Allures de reference | a faire | a faire | |
| Performance - FC de performance | a faire | a faire | |
| Progression - Cumul annuel | a faire | a faire | |
| Progression - Evolution depuis le debut de l'annee | a faire | a faire | |
| Progression - Comparaisons | a faire | a faire | |
| Progression - Tendances long terme | a faire | a faire | |
| Reglages - Compte | a faire | a faire | |
| Reglages - Connexions | a faire | a faire | |
| Reglages - Entrainement | a faire | a faire | |
| Reglages - Donnees | a faire | a faire | |
| Reglages - A propos | a faire | a faire | |
| Glossaire | a faire | a faire | |

---

## 8. Recette metier

| Controle | Resultat | Commentaire |
|---|---|---|
| Aucune activite doublonnee visible | a faire | |
| Activites merged exclues | a faire | |
| Garmin-only reel visible | a faire | |
| Randonnees exclues des records route | a faire | |
| Pas de double comptage volume | a faire | |
| Pas de double comptage charge | a faire | |
| Analyse / Performance / Progression non redondants | a faire | |
| Performance sans Puissance | a faire | |
| YTD absent de l'UI | a faire | |
| Reglages 5 onglets conserves | a faire | |

---

## 9. Checklist finale

- [ ] Tests frontend OK
- [ ] Build frontend OK
- [ ] Tests backend OK
- [ ] Prisma SQLite OK
- [ ] Prisma PostgreSQL OK
- [ ] Compare schemas OK
- [ ] Git diff check OK
- [ ] Recette desktop OK
- [ ] Recette mobile OK
- [ ] Recette donnees reelles OK
- [ ] Documentation `docs/quality` mise a jour
- [ ] `.ai/*.md` mis a jour
- [ ] Archive review generee
- [ ] Archive review controlee
- [ ] Repo clean
- [ ] Tag cree si applicable

---

## 10. Etat de reprise rapide

```text
Derniere action realisee : Lot 1 termine - 10 primitives Alpine Light + variables CSS + demo etendue
Dernier fichier modifie : SUIVI_CHANTIER_ALPINE_LIGHT.md (mise a jour Lot 1)
Dernier lot en cours : Lot 1 (termine, en attente commit + GO Lot 2)
Prochaine action exacte : Commit "feat(ui): introduce alpine light layout primitives", push, puis attendre GO utilisateur Lot 2 (Layout global)
Blocage eventuel : Aucun
Tests a relancer apres codage Lot 2 : npm test, npm run build, ESLint sur fichiers touches
Fichiers a relire avant Lot 2 : .tmp/alpine_light/01_plan/...md sections 8 (layout) et 9 (Aujourd'hui), AppLayout.jsx, AppNavigation.jsx, AppTopbar.jsx
Composants Alpine Light prets a etre consommes : PageHeader, SectionHeader, KpiCard, InsightCard, RightRailCard, SubTabs, MetricRow, CoachAdviceBar, EmptyState, SourceBadge
Variables CSS Alpine Light prefixees `--al-*` declarees dans :root de styles.css
URL de validation visuelle : /visuals-preview (apres login) - les nouvelles primitives sont en bas de la page
```
