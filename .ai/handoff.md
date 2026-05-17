# Handoff — Passage de relais Claude -> CODEX (2026-05-17)

## Dernier chantier livre

**Lot 04 Alpine Light V5 — Page Analyse refondue (5 onglets)** : Vue d'ensemble, Charges, Tendances, Intensites, Sommeil & recuperation. Tous les seuils valides scientifiquement, tous les KPI alignes mockup PDF V5, deploye en prod et valide visuellement par l'utilisateur final.

Voir details complets : `.ai/current_context.md` section "Lot 04 Alpine Light V5 — Page Analyse refonte complete".

## Documents a relire OBLIGATOIREMENT avant toute reprise

Dans cet ordre :

1. **`.ai/dev_rules.md`** — **NOUVEAU**, regles consolidees UX/UI/science/archi/git/qualite (lecture obligatoire).
2. `.ai/current_context.md` — etat courant et chantier vient de livrer.
3. `.ai/open_tasks.md` — taches restantes.
4. `.ai/regression_risks.md` — zones de risque actives.
5. `.ai/codebase_map.md` — cartographie du code.
6. `docs/README.md` — point d'entree documentaire.
7. `docs/quality/RUNSEE_QUALITY_GATE.md` — quality gate permanent.

## Etat courant du repo (2026-05-17)

- Branche : `main`, en avance sur prod (deja deploye).
- Dernier commit : `fix(analytics): Sommeil — align range-bar gradients with physiological direction` (suite Lot 04).
- Tests : **211/211** Vitest verts, **31/31** backend verts.
- Lint : **0 warning** sur tout le repo.
- Build Vite OK.
- CI/CD GitHub Actions : verte sur le dernier push.
- VM prod : `runsee-vm` (82.165.109.160), containers Docker healthy.

## Cles de l'environnement prod

- SSH alias : `runsee-vm`.
- Repo VM : `/srv/runsee/repo`.
- Containers : `runsee-backend`, `runsee-frontend`, `runsee-postgres-prod`, `runsee-cloudflared`.
- Workflow deploy : `.github/workflows/deploy-vm.yml` (push `main` -> validate -> deploy).
- Scripts ops one-shot : `docker exec runsee-backend node scripts/maintenance/<script>.js`.

## Process de travail consolide acte avec l'utilisateur (2026-05-16)

### Avant DEV
- Analyse rigoureuse du mockup (inventaire visuel + verifications scientifiques + decisions a valider en bloc).
- Lecture ciblee uniquement (pas de scan complet).

### Pendant DEV
- Calcul metier dans `utils/`, jamais dans les composants.
- Source scientifique citee en JSDoc.

### Apres DEV (double validation)
1. Quality gate (tests + lint + build).
2. Commit + push + watch deploy.
3. **Auto-comparaison capture prod vs mockup** avec tableau d'ecarts.
4. Correctif cible si ecart majeur.
5. Validation visuelle utilisateur.

Tout est detaille dans `.ai/dev_rules.md`.

## TODO globales reportees (non bloquant)

- Tooltips pedagogiques (i) globaux RunNSee — passe unique apres stabilisation.
- CTAs Analyse "Voir l'analyse complete" / "En savoir plus" / "Voir tous les conseils" — placeholders a brancher.

## Regle de reprise pour CODEX

1. Relire la pile de documents listee plus haut.
2. Ne pas reintroduire le mockup PDF dans le scope — il est livre.
3. Si nouveau chantier UX : reutiliser les helpers `analyticsFocus/Trends/Intensities/Recovery` et les composants `OverviewIndicatorCard`, `OverviewRangeBar`, `AlpineSelect`, `TrendsRegularityHeatmap`.
4. Tout plan termine doit etre archive sous `docs/plans/old/` et toute validation significative doit alimenter `docs/quality/RUNSEE_TEST_LOG.md`.
