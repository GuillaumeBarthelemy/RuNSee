# RunNSee - Journal de recette

Ce journal trace les recettes reellement executees. Il evite de rouvrir les memes controles a chaque plan.

## 2026-05-09 - Score de confiance des analyses (validation visuelle GO + correctif charge recente)

### Contexte

- Branche : `main`
- Commits :
  - audit cloture : `4cc1f58 docs(quality): cloture chantier score de confiance des analyses`
  - correctif charge : a venir
- Validation visuelle authentifiee desktop + mobile : OK utilisateur sur les 6 zones (Aujourd'hui, Analytics, Performance, VDOT, Objectif, TrailSpec, Detail Trail).
- Anomalie remontee par utilisateur lors de la recette : "Charge recente 96.9 pts" parait basse vs bareme glossaire (< 200 pts = bloc leger).

### Investigation

- Source : `frontend/src/components/TodayFormCards.jsx` lignes 93-96 (avant correctif).
- Cause : la valeur affichee melangeait charge du jour (`todayLoad`) et statut sur cumul 7 j.
  - `loadValue = todayLoad > 0 ? todayLoad : sevenDayLoad` -> valeur = charge d'une seule journee si sortie detectee.
  - `loadStatus = getLoadStatus(sevenDayLoad)` -> status calcule sur cumul 7 j.
  - Le copy "Charge des derniers jours" et le bareme glossaire (< 200/200-400/...) parlent de cumul 7 j.
- Consequence : 96.9 pts affichees (charge du jour seul) avec status "Bloc leger" calcule sur 7 j -> incoherence visuelle.

### Correctif applique

- Valeur principale toujours egale au cumul 7 j (`sevenDayLoad`) pour rester coherente avec le bareme glossaire.
- Charge du jour J mentionnee separement dans le detail si elle est non nulle :
  `"Cumul des 7 derniers jours, dont X.X pts aujourd'hui."`
- Aucune modification du moteur de calcul de charge (ni `loadModel`, ni `trendLoadModel`, ni `load7dTone`).
- Status reste `cumul 7 j - <label barème>` pour rappeler l'unite.

### Tests techniques (Quality Gate post correctif)

| Test | Resultat | Preuve |
|---|---|---|
| `npm test -- --run` frontend | OK | 156/156 (11 fichiers) |
| `npm run build` frontend | OK | Vite build OK 488 ms |
| ESLint `TodayFormCards.jsx` | OK | `--max-warnings 0` |

### Decision

```text
GO definitif chantier `Score de confiance / qualite des analyses`.
GO bonus correctif minimal "Charge recente" pour aligner valeur et bareme glossaire.
Tag `runsee-stable-analysis-confidence` a poser a la cloture finale apres push CI/CD.
```

### Suite

- Push commit correctif charge.
- Re-generer archive review (apres correctif charge).
- Poser tag `runsee-stable-analysis-confidence`.
- Surveiller CI/CD VM.

## 2026-05-09 - Score de confiance des analyses (cloture chantier)

### Contexte

- Branche : `main`
- Commit chantier : `ab3947f feat(analytics): add analysis confidence signals`
- Plan utilise : `docs/plans/active/runsee_handoff_claude_score_confiance.md` (handoff Claude Code Pro), a archiver sous `docs/plans/old/`
- Responsable : Claude Code Pro
- Audit cible : composant `AnalysisConfidenceBadge`, moteur `analysisConfidence.js`, integrations Aujourd'hui / Analytics / Performance / Trail / VdotProfileCard / RaceCountdownCard.

### Audit UX statique

| Element | Resultat | Commentaire |
|---|---|---|
| Composant badge : props, ARIA, tooltip | OK | `compact` mode + tooltip via `InfoTooltip` avec `aria-label` ; 4 tones (positive/warning/negative/neutral) |
| Wording moteur : 4 niveaux | OK | "Confiance elevee/moyenne/faible/Donnees insuffisantes", sans promesse pseudo-scientifique |
| Wording prudent | OK | `low` -> "Lecture prudente", `insufficient` -> "Pas assez de donnees" |
| CSS responsive `< 760px` | OK | Badge passe pleine largeur en mode normal, `fit-content` en compact, `trail-card-actions` bascule a gauche |
| `min-width: 0` sur main | OK | Wrapping correct sur petits ecrans, `white-space: nowrap` en compact pour eviter overflow |
| Anomalie wording VDOT | Corrigee | `vdot-summary` libelle "Confiance" renomme en "Fiabilite VDOT" pour distinguer la confiance d'analyse globale (badge) de la fiabilite metier de l'estimation VDOT |
| Doublon visuel | OK apres correction | Plus de label "Confiance" en double dans la meme carte |

### Tests techniques (Quality Gate)

| Test | Resultat | Preuve |
|---|---|---|
| `npm test -- --run` frontend | OK | 156/156 (11 fichiers) |
| `npm run build` frontend | OK | Vite build OK en 682 ms |
| ESLint fichiers touches | OK | `--max-warnings 0` sur 11 fichiers cibles |
| Backend `npm run prisma:generate` | OK | Prisma Client genere |
| Backend `npx prisma validate` SQLite | OK | Schema valide |
| Backend `npm run prisma:pg:validate` | OK | Schema PostgreSQL valide |
| Backend `npm run db:compare-schemas` | OK | 18 modeles alignes |
| Backend `npm test` | OK | 21/21 |
| `node --check src/app.js` / `src/server.js` | OK | Syntax OK |
| `git status --short` | OK | Workspace propre (handoff doc untracked, archive prevue) |

### Recette metier

| Domaine | Test | Resultat | Commentaire |
|---|---|---|---|
| Aujourd'hui | Badge confiance decisionnelle | OK technique + audit | Injection compact dans `DashboardDecisionSummaryCard` via prop `confidence`, sans changer les calculs |
| Analytics | Qualite periode analysee | OK technique + audit | Badge non-compact entre filters et stack analytics, summary visible |
| Performance | Potentiel route | OK technique + audit | Badge non-compact en haut de page + badge compact dans `VdotProfileCard` |
| Performance | Objectif course | OK technique + audit | Badge compact dans `RaceCountdownCard` quand objectif actif |
| Trail Specificity | Lecture analytics trail | OK technique | Badge compact dans `TrailSpecificityCard` |
| Detail activite trail | Donnees trail disponibles | OK technique | Badge compact dans `ActivityTrailCard`, tous les etats (sans data, sans contexte trail, avec contexte) |
| Fallbacks | Donnees manquantes | OK | Niveau `insufficient` teste si objectif absent et si recovery absent |
| Wording scientifique | Prudence | OK | Pas de "diagnostic", pas de "preuve", pas de "garantie" ; vocabulaire "lecture", "appuis", "limites" |

### Anomalies detectees et traitees

| Anomalie | Gravite | Decision |
|---|---|---|
| `VdotProfileCard` : label "Confiance" du `vdot-summary` metier en doublon visuel avec le `AnalysisConfidenceBadge` | Mineure | Corrigee : renomme en "Fiabilite VDOT" pour clarifier les deux confiances differentes (analyse globale vs fiabilite estimation VDOT) |

### Validation visuelle authentifiee

A realiser cote utilisateur sur desktop/mobile sur les 6 pages cibles :

```text
Aujourd'hui                     - badge dans Lecture du jour
Analytics                       - badge global apres filtres
Performance                     - badge global + badges VDOT et objectif
Performance / VDOT              - badge compact + label "Fiabilite VDOT" (renomme)
Performance / Course objectif   - badge compact si objectif actif
Trail (Analytics)               - badge dans TrailSpecificityCard
Detail activite Trail           - badge dans ActivityTrailCard
Mobile / ecran etroit           - pas d'overflow horizontal
```

Controles attendus :

```text
badge visible mais non intrusif
pas de surcharge UX
pas de decalage d'interface
tooltip lisible
libelles comprehensibles
aucun bloc trop haut
aucun overflow horizontal
aucune regression des calculs existants
```

### Decision

```text
GO technique cloture chantier `Score de confiance / qualite des analyses`.
Validation visuelle authentifiee restant a realiser cote utilisateur sur desktop/mobile.
Tag `runsee-stable-analysis-confidence` recommande apres confirmation visuelle utilisateur.
```

### Archive de review

- Generee : a la cloture
- Nom : `runsee-source-review-analysis-confidence-final.zip`
- Commande : `git archive --format=zip --output runsee-source-review-analysis-confidence-final.zip HEAD`
- Basee sur : `HEAD` apres correction A1 et MAJ documentaires.
- Artefacts interdits detectes : non.

### Suite

- Validation visuelle authentifiee desktop + mobile par l'utilisateur.
- Si OK : tag `runsee-stable-analysis-confidence` puis push.
- Tache de dette ouverte (hors scope) : analyser pourquoi la "Charge recente" affichee (96.9 pts) parait basse vs le bareme glossaire (< 200 pts = bloc leger). A traiter dans un chantier ulterieur.

## 2026-05-09 - Score de confiance des analyses (chantier initial CODEX)

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
