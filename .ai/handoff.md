# Handoff

## Etat courant

- Le contexte court terme est maintenu dans `.ai/current_context.md`.
- Les taches ouvertes sont suivies dans `.ai/open_tasks.md`.
- Les risques de regression sont suivis dans `.ai/regression_risks.md`.
- La cartographie technique est suivie dans `.ai/codebase_map.md`.

## Regle de reprise

Avant tout nouveau chantier, relire :

1. `docs/README.md`
2. `docs/quality/RUNSEE_QUALITY_GATE.md`
3. `.ai/current_context.md`
4. `.ai/open_tasks.md`
5. `.ai/regression_risks.md`

Tout plan termine doit etre archive sous `docs/plans/old/` et toute validation significative doit alimenter `docs/quality/RUNSEE_TEST_LOG.md`.
