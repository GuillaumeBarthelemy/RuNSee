# RunNSee - Contexte agent IA

Ce dossier contient uniquement les fichiers de contexte court terme pour CODEX / Claude Code Pro.

## Fichiers actifs

| Fichier | Role |
|---|---|
| `current_context.md` | Etat courant synthetique du projet |
| `open_tasks.md` | Taches ouvertes reellement actives |
| `regression_risks.md` | Risques de regression actifs |
| `codebase_map.md` | Cartographie courte du code |
| `dev_rules.md` | **Regles de developpement consolidees (UX, science, archi, git, qualite)** — a lire en premier |
| `handoff.md` | Passage de relais du dernier chantier, si necessaire |

## References longues

Les documents longs vivent dans `/docs` :

- Qualite : `docs/quality/`
- Architecture : `docs/architecture/`
- Plans : `docs/plans/`
- Decisions : `docs/decisions/`
- Releases : `docs/releases/`
- Operations : `docs/operations/`

## Regles

- Ne pas archiver de longs plans dans `.ai`.
- Ne pas laisser de taches terminees dans `open_tasks.md`.
- Chaque chantier doit alimenter `docs/quality/RUNSEE_TEST_LOG.md`.
- Chaque chantier doit mettre a jour `docs/quality/RUNSEE_VALIDATION_MATRIX.md`.
- Chaque tag ou baseline doit passer par `docs/quality/RUNSEE_RELEASE_CHECKLIST.md`.
