# Open Tasks

## En cours / prioritaire (séance 2026-05-05)

### Phase E — Audit UX (✅ documents produits)
- [x] `docs/UX_AUDIT.md` — inventaire 72 composants
- [x] `docs/GLOSSAIRE.md` — 26 entrées canoniques avec refs scientifiques
- [x] `docs/UX_CHARTE.md` — palette + typo + composants visuels + breakpoints

### Phase J — Vocabulaire et glossaire (en cours)
- [ ] Mode `compact` pour `InfoTooltip` (≤ 80 caractères)
- [ ] Composant `GlossaryLink` (lien vers entrée glossaire)
- [ ] Page `/glossaire` avec liste alphabétique + ancres
- [ ] Renommage copy `analyticsCopy.js` (HRV→VFC, GAP→Allure ajustée, etc.)
- [ ] Renommage copy `trainingMvpCopy.js` (Body Battery→Énergie, etc.)
- [ ] Suppression `GlossaryModal` (remplacé par page)
- [ ] Tests Vitest sur les helpers de mapping
- [ ] Capture mobile + desktop avant commit

## À faire après Phase J

### Phase G — Composants visuels
- [ ] CSS variables `--tone-1` à `--tone-5`
- [ ] `MetricGauge` (demi-cercle 0-100)
- [ ] `RangeBar` (barre horizontale + zones)
- [ ] `MicroBars` (remplaçant sparkline)
- [ ] `TrendChip` (delta avec flèche)
- [ ] `BandPositioner` (extraction depuis DynamicsGrid)
- [ ] Page démo `/admin/visuals-preview` (DEV uniquement)

### Phase F — Refonte Dashboard
- [ ] Création `TodayReadinessCard` (fusion 3 doublons)
- [ ] Refonte `DashboardDecisionSummaryCard` (verdict descriptif + jauge)
- [ ] Migration `TodayFormCards` (RangeBar)
- [ ] Migration `TodayVolumeStrip` (MicroBars)
- [ ] Suppression `RecoverySnapshotCard`, `TodayRecoveryCard`
- [ ] Évaluation suppression `TodaySnapshotToday`

### Phase H — GAP + Decoupling + EPOC
- [ ] Audit code GAP existant
- [ ] Implémentation Minetti complet
- [ ] Tests Vitest sur 10 séances réelles (écart < 2 % vs Strava)
- [ ] Implémentation Dérive cardiaque (Pa:Hr ratio)
- [ ] Implémentation Dette d'oxygène (depuis raw Garmin EPOC, vulgarisation)
- [ ] Intégration dans `ActivityDetailCard`

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
