# ADR-0003 - Quality Gate permanent RunNSee

## Statut

Accepte

## Contexte

Les derniers chantiers RunNSee ont repete les memes recettes techniques et metier. Cette repetition augmente le risque d'oubli, de doublon documentaire et de reprise confuse par les agents IA.

## Decision

- `docs/quality/RUNSEE_QUALITY_GATE.md` devient le referentiel permanent des controles.
- `docs/quality/RUNSEE_TEST_LOG.md` trace les recettes executees.
- `docs/quality/RUNSEE_VALIDATION_MATRIX.md` porte l'etat de validation par domaine.
- `docs/quality/RUNSEE_RELEASE_CHECKLIST.md` est obligatoire avant baseline ou tag.
- `.ai` reste reserve au contexte court terme et pointe vers `/docs`.

## Consequences

- Les futurs plans ne doivent plus recopier toute la recette permanente.
- Chaque chantier doit mettre a jour le journal de recette et la matrice.
- Les archives de review doivent etre generees depuis Git et referencees dans le journal.

## Risques

- Documentation a maintenir avec discipline.
- Si `.ai/open_tasks.md` diverge de la matrice, la matrice et le test log font foi pour la recette durable.

## Date

2026-05-09
