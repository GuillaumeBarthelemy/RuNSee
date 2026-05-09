# RunNSee - Journal de recette

Ce journal trace les recettes reellement executees. Il evite de rouvrir les memes controles a chaque plan.

## 2026-05-09 - Score de confiance des analyses

### Contexte

- Branche : `main`
- Plan utilise : `docs/plans/active/runsee_chantier_score_confiance_analyses.md`
- Responsable : CODEX

### Tests techniques

| Test | Resultat | Preuve |
|---|---|---|
| `npx vitest run src/utils/analysisConfidence.test.js --run` | OK | 8/8 |
| `npm test -- --run` frontend | OK | 156/156 |
| `npm run build` frontend | OK | Vite build OK |
| ESLint fichiers touches | OK | `--max-warnings 0` |
| Backend Prisma generate/validate | OK | SQLite + PostgreSQL valides |
| `npm run db:compare-schemas` backend | OK | 18 modeles alignes |
| `npm test` backend | OK | 21/21 |
| `node --check src/app.js` / `src/server.js` | OK | Syntax OK |
| `git diff --check` | OK | Aucun whitespace bloquant |

### Recette metier

| Domaine | Test | Resultat | Commentaire |
|---|---|---|---|
| Aujourd'hui | Badge confiance decisionnelle | OK technique | Injection dans la synthese decisionnelle, sans changer les calculs |
| Analytics | Qualite periode analysee | OK technique | Badge compact apres filtres + reutilisation trail |
| Performance | Potentiel route et objectif | OK technique | Badges VDOT/route et objectif course |
| Detail activite trail | Donnees trail disponibles | OK technique | Badge compact dans la carte trail |
| Fallbacks | Donnees manquantes | OK | Niveau `insufficient` teste si objectif absent |

### Decision

```text
GO technique. Une validation visuelle authentifiee reste conseillee sur desktop/mobile avant de considerer le chantier comme baseline UX stable.
```

## 2026-05-09 - Validation UI post-backfill Garmin et Go poursuite

### Contexte

- Branche : `main`
- Plan utilise : `docs/plans/active/runsee_analyse_actualisee_plan_suite.md`
- Responsable : CODEX
- Validation visuelle : realisee et confirmee par l'utilisateur en session authentifiee.

### Tests techniques

| Test | Resultat | Preuve |
|---|---|---|
| Dry-run doublons prod | OK | `scannedActivities=928`, `duplicateCount=0` |
| Dry-run doublons local | OK | `scannedActivities=890`, `duplicateCount=0` |
| Backend tests | OK | `npm test` apres ajout des tests scheduler backfill |
| Frontend tests | OK | `npm test -- --run` |
| Frontend build | OK | `npm run build` |

### Recette metier

| Domaine | Test | Resultat | Commentaire |
|---|---|---|---|
| Activites | Validation visuelle post-fenetre 2 | OK | Recette utilisateur : doublons Garmin/Strava non observes |
| Aujourd'hui | Double comptage volume/charge | OK | Recette utilisateur : pas d'anomalie visible remontee |
| Analytics | Volumes, charges, D+/D- | OK | Recette utilisateur : pas de double comptage visible remonte |
| Performance | Liens et records | OK | Recette utilisateur : pas d'anomalie visible remontee |
| Objectifs | Impact backfill | OK conditionnel | Aucun blocage signale pendant la recette visuelle |
| Backfill scheduler | Selection des fenetres dues | OK | Le scheduler ne laisse plus une fenetre non due bloquer une fenetre eligible dans le meme lot |

### Decision

```text
GO pour laisser la poursuite automatique du backfill Garmin selon le scheduler et les intervalles configures.
Condition de surveillance : conserver le dry-run doublons a 0 et stopper si une anomalie UI ou provider reapparait.
```

### Suite

- Surveiller la prochaine fenetre automatique.
- Relancer un dry-run doublons apres la prochaine fenetre.
- Ne poser un tag stable final que lorsque le backfill historique sera suffisamment avance ou termine selon `GARMIN_BACKFILL_MIN_DATE`.

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
| UI | Validation visuelle apres fenetre 2 | OK | Voir entree `2026-05-09 - Validation UI post-backfill Garmin et Go poursuite` |

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
| Validation visuelle UI post-fenetre 2 non faite | P1 | Cloturee par recette utilisateur du 2026-05-09 |

### Decision

```text
GO technique backfill fenetres 1 et 2.
GO poursuite automatique confirme apres validation visuelle UI et dry-run prod a 0.
```

### Suite

- Surveiller les prochaines fenetres automatiques jusqu'a `GARMIN_BACKFILL_MIN_DATE`.
- Relancer le dry-run doublons apres chaque fenetre importante.
