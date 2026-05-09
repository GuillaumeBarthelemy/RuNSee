# RunNSee - Documentation projet

Ce dossier contient la documentation durable de RunNSee. Les fichiers courts de contexte agent restent dans `.ai/`.

## Structure

| Dossier | Role |
|---|---|
| `architecture/` | Architecture durable, modele de donnees, providers et choix techniques structurants |
| `quality/` | Quality Gate, journal de recette, matrice de validation et checklist de release |
| `plans/active/` | Plans en cours uniquement |
| `plans/old/` | Plans termines, specs historiques et documents d'archive |
| `decisions/` | ADR et decisions structurantes |
| `releases/` | Baselines, tags et journal de releases |
| `operations/` | Runbooks locaux, deploiement et depannage |

## Regles

- Un plan termine doit etre historise dans `docs/plans/old/`.
- Une decision durable doit etre transformee en ADR dans `docs/decisions/`.
- Une recette doit etre tracee dans `docs/quality/RUNSEE_TEST_LOG.md`.
- Un tag ou une baseline doit etre trace dans `docs/releases/BASELINES.md`.
- Une archive de review doit etre generee depuis Git, jamais depuis un zip du dossier local.
