# Current Context

## Objectif actif

**Refonte UX/UI complète RuNSee** (phases E → K), articulée autour :
- Intégration homogène Garmin (pas de blocs dédiés)
- Lisibilité visuelle (jauges, tones, barres au lieu de sparklines)
- Mobile-first
- Vocabulaire FR canonique unique (VFC, Allure ajustée, Dérive cardiaque, etc.)

## Décisions validées (séance 2026-05-05)

- **Sync Garmin Option B** : enrichissement activités Strava avec métriques Garmin (Training Effect, VO2max, Performance Condition, Recovery Time) — Phase K
- **Tutoiement style coach** maintenu
- **5 niveaux de tone** : très bon / bon / neutre / vigilance / alerte
- **Sparklines remplacées** par MicroBars (barres horizontales)
- **Verdict descriptif** ("Forme correcte, marge présente"), pas prescriptif
- **Jauge Aptitude RuNSee** maison (recalcul transparent, pas affichage direct Training Readiness Garmin)
- **GAP** : réplique Strava via formule Minetti (2002)
- **Decoupling cardiaque** ajouté (vulgarisé "Dérive cardiaque")
- **EPOC** ajouté (vulgarisé "Dette d'oxygène", niveau qualitatif)
- **Settings** : 5 onglets (Compte / Connexions / Entraînement / Données / À propos)
- **Glossaire** : page dédiée + tooltips compacts ≤ 80 caractères pour mobile
- **Termes français** : VFC, Énergie, Allure ajustée, Dérive cardiaque, Dette d'oxygène, Aptitude

## Roadmap (linéaire validée)

| Phase | Statut | Objet | Effort |
|---|---|---|---|
| **E** — Audit UX | ✅ Commit `1334de7` | Docs `UX_AUDIT.md`, `GLOSSAIRE.md`, `UX_CHARTE.md` | 7-8 h |
| **J** — Vocabulaire + glossaire | ✅ Commit `30b8d10` | Page `/glossaire` + GlossaryLink + InfoTooltip compact + renommages VFC/Énergie | 5 h |
| **G** — Composants visuels | ✅ Commit `7002737` | MetricGauge, RangeBar, MicroBars, TrendChip, BandPositioner + tonePicker + VisualsPreviewPage | 13 h |
| **F** — Refonte Dashboard | ✅ Commit `8485fd4` | TodayReadinessCard fusion (3 doublons → 1), verdict descriptif, MicroBars sur charge | 12 h |
| **H** — GAP + Decoupling + EPOC | ✅ Commit en cours | Tests Vitest GAP, Decoupling Pa:Hr, EPOC vulgarisé, ActivityIntensityCard | 12 h |
| **I** — Refonte Réglages 5 onglets | À faire | TabbedSettings, sous-pages | 12 h |
| **K** — Extension Garmin activités | À faire | Bridge Python étendu, jointure Strava×Garmin | 10 h |

## Fichiers de référence Phase E

- `docs/UX_AUDIT.md` — inventaire 72 composants + décisions par phase + suppressions/fusions
- `docs/GLOSSAIRE.md` — 26 entrées canoniques avec références scientifiques
- `docs/UX_CHARTE.md` — palette tones, typographie, breakpoints, composants visuels

## Erreurs résolues récemment

- Bug "Sommeil 0 / FC repos 0" — extracteurs sans predicate → corrigé Phase A (predicate > 0)
- Bug mapping `RAW_RESOURCE_ID_TO_SOURCE_KEY` — révert (commit 666c98c) — l'ancien mapping était correct
- Bug `averageOptional` incluait les 0 → corrigé (commit 2cbd168)
- Sync `/sync/jobs/current` 404 → 200 `{ job: null }` (commit 89799a0)
- Auto-purge sync jobs orphelins > 30 min (commit d241f76)

## Validations restantes

- [ ] Re-déclencher renormalize Garmin après commits 9bff7e5, 666c98c (mapping correct + predicate body battery)
- [ ] Confirmer que FC repos et Body Battery se remplissent correctement après renormalize

## Risques de régression principaux Phases F-K

→ Voir `regression_risks.md` (mis à jour avec phases F-K).

Synthèse :
- `DashboardDecisionSummaryCard` (refonte F2) : **Moyen**
- `TodayFormCards` (migration F3) : **Moyen**
- `DynamicsGrid` (migration G) : **Moyen**
- `GarminExperimentalCard` (migration I3) : **Moyen**
- `ActivitySplitsCard`, `ActivityHeaderKpis`, `ActivityPerformanceStrip` (Phase H) : **Moyen**
- `InfoTooltip` (Phase J) : **Moyen** (utilisé partout)

Stratégie globale : snapshots tests Vitest avant migration, captures avant/après, anciens composants supprimés en dernier.
