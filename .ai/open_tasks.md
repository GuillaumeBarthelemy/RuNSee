# Open Tasks

## En cours / prioritaire (séance 2026-05-05)

### Phase E — Audit UX (✅ documents produits)
- [x] `docs/UX_AUDIT.md` — inventaire 72 composants
- [x] `docs/GLOSSAIRE.md` — 26 entrées canoniques avec refs scientifiques
- [x] `docs/UX_CHARTE.md` — palette + typo + composants visuels + breakpoints

### Phase J — Vocabulaire et glossaire (✅ TERMINÉE)
- [x] Mode `compact` pour `InfoTooltip` (≤ 80 caractères, slice 1 item)
- [x] Composant `GlossaryLink` (lien vers entrée glossaire)
- [x] Page `/glossaire` avec recherche, catégories, ancres URL
- [x] Lien vers /glossaire dans Topbar et Sidebar
- [x] Extension `glossary.js` : 26 entrées (était 14) avec `findGlossaryEntry` helper
- [x] Renommage labels HRV → VFC dans 7 composants
- [x] Renommage labels Body Battery → Énergie dans 7 composants
- [x] Renommage copy `trainingMvpCopy.js` (HRV→VFC, Body Battery→Énergie)
- [x] Suppression `GlossaryModal` (remplacé par page `/glossaire`)
- [x] Suppression event `runsee:open-glossary` (non utilisé)
- [x] Tests Vitest `glossary.test.js` (12 tests, 60 verts au total)
- [x] InfoTooltip navigue vers `/glossaire#key` au lieu d'ouvrir le modal

## À faire après Phase J

### Phase G — Composants visuels (✅ TERMINÉE)
- [x] CSS variables `--tone-1` à `--tone-5` + backgrounds 12% opacity
- [x] `MetricGauge` (demi-cercle SVG 0-100, sm/md, fallback null)
- [x] `RangeBar` (barre horizontale + zones colorées + marqueur)
- [x] `MicroBars` (barres verticales colorées par tone, gestion null)
- [x] `TrendChip` (pill delta avec flèche directionnelle)
- [x] `BandPositioner` (bandes empilées avec curseur)
- [x] Helper `tonePicker.js` avec 9 mappers spécialisés (sleep, vfc, hr, readiness, freshness, load, stress, decoupling, energy)
- [x] Page `/visuals-preview` pour validation visuelle
- [x] Tests Vitest (29 tests tonePicker, 89 verts au total)
- [ ] Migration des composants existants vers ces visuels — fait dans phases F/H

### Phase F — Refonte Dashboard (✅ TERMINÉE)
- [x] **F1** Création `TodayReadinessCard` (fusion 3 doublons : RecoverySnapshotCard, TodayRecoveryCard, section Recovery du DecisionSummary)
- [x] **F1** Calcul Aptitude RuNSee composite (formule transparente) ajouté à `recoveryViewModel`
- [x] **F2** Refonte `DashboardDecisionSummaryCard` : verdict descriptif + chips (max 4) + meta confiance, suppression section Recovery
- [x] **F3** Migration `TodayFormCards` : MicroBars colorés selon `freshnessTone` / `load7dTone`
- [x] **F5** Évaluation `TodaySnapshotToday` : conservé (montre activités du jour, distinct de RecentActivitiesCard)
- [x] Suppression `RecoverySnapshotCard.jsx`, `TodayRecoveryCard.jsx`

### Phase H — GAP + Decoupling + EPOC (✅ TERMINÉE)
- [x] Audit code GAP existant : Minetti 2002 déjà correctement implémenté (`gradeAdjustedPace.js`)
- [x] Tests Vitest GAP : 14 cas (cost, factor, loop, sortie courte/plate/vallonnée/trail)
- [x] Implémentation **Dérive cardiaque** (`cardiacDecoupling.js`) avec pondération distance + tests Vitest 7 cas
- [x] Implémentation **Dette d'oxygène** vulgarisée (`epocLevel.js`) — niveaux qualitatifs Léger/Modéré/Élevé/Très élevé + tests Vitest 11 cas
- [x] Composant `ActivityIntensityCard` regroupant les 3 indicateurs avec RangeBar + GlossaryLink
- [x] Intégration dans `ActivityDetailCard` (entre PerformanceStrip et tabs)
- [x] Tones via `decouplingTone` + tones spéciaux EPOC

### Phase I — Refonte Réglages 5 onglets
- [ ] Composant `TabbedSettings` avec routing par hash
- [ ] Découpage `AdminPage.jsx` en 5 sous-pages
- [ ] Refonte `GarminExperimentalCard` (purge isolée mais visible)
- [ ] Tests mobile (drawer)

### Phase K — Extension Garmin activités (Option B)
- [ ] Bridge Python : `get_activities` + matching timestamp ± 10 min
- [ ] Backend : table `ExternalActivityEnrichment` ou colonnes JSON sur `Activity`
- [ ] Service jointure Strava ↔ Garmin
- [ ] UI : enrichir `GarminEnrichmentPanel` avec Training Effect, VO2max séance, Performance Condition, Recovery Time

## Validations utilisateur attendues

- [ ] Validation Phase E : suppressions confirmées (RecoverySnapshotCard, TodayRecoveryCard, GlossaryModal, AdminSectionHeader)
- [ ] Validation mapping vocabulaire Phase J (table de UX_AUDIT.md section 9)
- [ ] Validation captures Phase G avant intégration Phase F

## Backlog (post-refonte)

- [ ] Tests automatisés services Garmin backend (zéro couverture actuellement)
- [ ] Confirmer FC repos + Body Battery après prochain renormalize
- [ ] Dark mode complet (palette tones préparée mais activation non priorisée)

## Bugs / risques connus

- [ ] Sync activités Garmin (Phase K) — non implémentée actuellement
- [ ] Renormalize Garmin doit être re-déclenché après chaque correctif extracteur
