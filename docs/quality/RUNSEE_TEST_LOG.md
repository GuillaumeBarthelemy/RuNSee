# RunNSee - Journal de recette

Ce journal trace les recettes reellement executees. Il evite de rouvrir les memes controles a chaque plan.

## 2026-05-09 - Backfill Garmin, fenetres 1 et 2

### Contexte

- Branche : `main`
- Commit de validation documentaire : `c33608d`
- Plan utilise : `docs/plans/old/runsee_plan_suite_backfill_garmin.md`
- Responsable : CODEX

### Tests techniques

| Test | Resultat | Preuve |
|---|---|---|
| `git diff --check` | OK | execute avant commit `c33608d` |
| Backend Prisma validate SQLite | OK | `npx prisma validate` |
| Backend Prisma validate PostgreSQL | OK | `npm run prisma:pg:validate` |
| Backend schemas alignes | OK | `npm run db:compare-schemas` |
| Backend tests | OK | `18/18` |
| Frontend tests | OK | `148/148` |
| Frontend build | OK | Vite build OK |
| CI/CD VM | OK | GitHub Actions verte, deploiement VM OK |

### Recette metier

| Domaine | Test | Resultat | Commentaire |
|---|---|---|---|
| Backfill Garmin | Fenetre 1 reelle | OK | 2025-11-10 -> 2026-05-08, 186 activites lues, 144 matchees, 2 Garmin-only reparees, 39 rejetees |
| Backfill Garmin | Pause / reprise | OK | `paused` puis `running` |
| Backfill Garmin | Fenetre 2 via scheduler | OK | 2025-05-14 -> 2025-11-09, 163 activites lues, 112 matchees, 0 Garmin-only, 51 rejetees |
| Doublons provider | Dry-run apres fenetre 2 | OK | `duplicateCount=0` |
| Logs backfill | Compteurs persistants | OK | 2 logs, `duplicateCountAfterWindow=0` sur les deux fenetres |
| UI | Validation visuelle apres fenetre 2 | A completer | Activites / Aujourd'hui / Analytics a verifier en session authentifiee |

### Archive de review

- Archive generee : oui
- Nom du fichier : `runsee-source-review.zip`
- Commande utilisee : `deployment/scripts/Export-RunSeeSourceArchive.ps1`
- Basee sur commit : `HEAD` au moment de generation
- Basee sur tag : non
- Contenu controle : oui, par le script
- Artefacts interdits detectes : non

### Anomalies detectees

| Anomalie | Gravite | Decision |
|---|---|---|
| Validation visuelle UI post-fenetre 2 non faite | P1 | Garder ouverte dans `.ai/open_tasks.md` |

### Decision

```text
GO technique backfill fenetres 1 et 2.
GO poursuite automatique uniquement apres validation visuelle UI.
```

### Suite

- Verifier visuellement Activites, Aujourd'hui et Analytics apres fenetre 2.
- Laisser la poursuite automatique jusqu'a `GARMIN_BACKFILL_MIN_DATE` uniquement si la validation visuelle reste OK.
