# RunNSee — Clôture chantier et baseline V5

## 1. Objectif

Finaliser proprement le chantier UX pour éviter une dette invisible.

## 2. Repo clean

Contrôler :

```bash
git status
git diff --stat
```

Documenter :

```md
## Résumé final
- Pages livrées :
- Pages partiellement livrées :
- Placeholders :
- Backlog futur :
- Risques :
- Tests :
- Build :
```

## 3. Alignement `.ai`

Mettre à jour :

```text
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
```

`current_context.md` doit contenir :

- état réel du chantier ;
- dernière page validée ;
- page suivante éventuelle ;
- décisions UX validées ;
- décisions métier restant à trancher.

`open_tasks.md` doit contenir uniquement les tâches restantes réelles.

`regression_risks.md` doit contenir :

- risques calculs ;
- risques Garmin ;
- risques responsive ;
- risques déploiement local ;
- risques données.

## 4. Backlog placeholders

Mettre à jour :

```text
docs/backlog/BACKLOG_FONCTIONNALITES_FUTURES.md
```

Format :

```md
| Élément | Page | Type | Pourquoi placeholder | Priorité | Critère futur |
|---|---|---|---|---|---|
```

## 5. Journal qualité

Mettre à jour :

```text
docs/quality/RUNSEE_TEST_LOG.md
docs/quality/RUNSEE_VALIDATION_MATRIX.md
```

## 6. Baseline

Si tout est validé :

```bash
git add .
git commit -m "Finalize RunNSee Alpine Light UX refactor"
git tag ux-alpine-light-v1
```

Si tu ne veux pas taguer :

```bash
git commit -m "Finalize RunNSee Alpine Light UX refactor"
```

## 7. Critères de clôture

Chantier clôturable si :

- Accueil gelé ;
- Activités recalée ;
- Analyse conforme ;
- Performance conforme ;
- Progression conforme ;
- Réglages conforme ;
- Glossaire conforme ;
- recette transverse OK ;
- déploiement local OK ;
- placeholders documentés ;
- baseline possible.
