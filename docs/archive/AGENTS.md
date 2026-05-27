# AGENTS.md — Point d'entree CODEX / Claude / autre agent IA

Bienvenue dans le monorepo **RuNSee** (Node 22 + Express 5 + Prisma 7 + React 19 + Vite 8).

Ce fichier est le **point d'entree obligatoire** pour tout agent IA travaillant sur le repo. Lis-le entierement avant la moindre modification.

---

## 1. Pile a lire AVANT toute reprise (ordre strict)

| # | Fichier | Pourquoi |
|---|---|---|
| 1 | **`.ai/dev_rules.md`** | Regles de developpement consolidees (10 sections) — UX, science, archi, git, qualite |
| 2 | `.ai/current_context.md` | Etat courant du projet, dernier chantier livre |
| 3 | `.ai/handoff.md` | Passage de relais du dernier chantier |
| 4 | `.ai/open_tasks.md` | Taches ouvertes (actives, non bloquantes, dette technique) |
| 5 | `.ai/regression_risks.md` | Zones de risque actives par feature |
| 6 | `.ai/codebase_map.md` | Cartographie du code (frontend/backend/scripts) |
| 7 | `docs/README.md` | Index documentaire global (architecture, plans, releases) |
| 8 | `docs/quality/RUNSEE_QUALITY_GATE.md` | Quality gate permanent |

**Ne jamais court-circuiter cette lecture.** Toute modification sans avoir lu ces 8 documents introduit un risque de regression et de perte de coherence.

---

## 2. Regles non negociables (extrait critique de `dev_rules.md`)

### 2.1 Quality gate avant tout commit

```bash
# Frontend
cd frontend
npm test -- --run          # Doit etre 211/211 vert
npm run lint -- --max-warnings 0   # Doit etre 0 warning
npm run build              # Doit reussir

# Backend (si touche)
cd backend
npm test                   # Doit etre 31/31 vert
```

Aucun commit ne doit casser cette baseline.

### 2.2 Discipline contextuelle (cost & context)

- **Pas de scan complet du repo** sauf demande explicite de l'utilisateur.
- Proposer la **liste minimale de fichiers** a lire avant d'ouvrir.
- Privilegier **reads cibles + grep** plutot que reads larges.
- Limiter les sorties de commande a **150 lignes**.
- Pour les logs et tests verbeux, n'extraire que les echecs et les stack traces utiles.

### 2.3 Discipline de livraison

- **Distinguer** explicitement : correction / optimisation / changement fonctionnel.
- **Preserver la logique metier** sauf demande explicite contraire.
- **Avant edit** : expliquer le changement prevu et le risque de regression.
- **Apres edit** : run la validation la plus restreinte qui couvre le diff (pas tout le repo systematiquement).

### 2.4 Double validation post-DEV (process acte 2026-05-16)

Si refonte UX ou nouvelle feature :

1. Quality gate (tests + lint + build).
2. Commit + push + watch deploy CI/CD.
3. **Auto-comparaison capture prod vs mockup** :
   - Tableau d'ecarts avec severite (rouge / orange / cosmetique).
   - Liste des elements conserves intentionnellement differents du mockup (avec justification).
   - Correctif cible si ecart majeur, livre dans la foulee.
4. **Ne pas demander validation utilisateur** sans avoir fait l'auto-revue.

### 2.5 Regles UX/UI Alpine Light

- **Ne jamais etirer une image / SVG** : `preserveAspectRatio="meet"` par defaut.
- **Sparklines** : `max-width` contrainte (~220 px).
- **Cards KPI principales** : value >= 24 px, icone pill >= 40 px, SVG interne >= 20 px.
- **Graphiques temporels** : 8-12 points pour une carte 2/3 colonne.
- **Range bar gradients** par direction physiologique :
  - LOW value good : `warm` (vert -> rouge) — ex. FC repos, Stress.
  - HIGH value good : `cool` (rouge -> vert) — ex. HRV, Sommeil.
  - OPTIMAL middle : `polar` — ex. TSB.
- **Icone rail** : direction doit refleter le signal (fleche montante = hausse, descendante = baisse, jamais inverse).

### 2.6 Conventions metier scientifique

- **Toujours citer la source en JSDoc** pour tout seuil / classification.
- **Rolling 30 j vs 30 j precedents** pour TOUS les deltas KPI (jamais "mois courant vs mois precedent" car mois courant est partiel et biaise tout).
- **Vocabulaire V5** (libelles utilisateur) :
  - VFC (pas HRV cote utilisateur final, OK en technique)
  - Energie (pas Body Battery)
  - UA (pas pts)
  - Allure ajustee (pas GAP)
  - Derive cardiaque (pas Decoupling)
  - Charge d'entrainement Garmin (pas EPOC sur les cards recentes)
  - Cumul annuel (pas YTD)
- **Definitions de zones FC** (modele 5 zones, Seiler/Treff) :
  - Z1 Recuperation (< 65 % FCmax)
  - Z2 Endurance (65-75 %)
  - Z3 Tempo (76-87 %)
  - Z4 Seuil (88-95 %)
  - Z5 VO2max (> 95 %)
- **"Allure soutenue"** = Z4 + Z5 seulement (au-dessus de LT2).

### 2.7 Architecture (Lot 04 reference)

- Composants Tab dans `frontend/src/components/analytics/` orchestrent uniquement.
- Calculs metier dans `frontend/src/utils/analytics*.js` (4 modules : `Focus`, `Trends`, `Intensities`, `Recovery`).
- Sources scientifiques en JSDoc obligatoire.
- Reutiliser les composants existants : `OverviewIndicatorCard`, `OverviewRangeBar`, `AlpineSelect`, `TrendsRegularityHeatmap`.

### 2.8 Git

- Format commit : `<type>(scope): <summary>` puis body detaille.
- Types : `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.
- Footer obligatoire Claude :
  ```
  Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
  ```
- Push direct sur `main` autorise pendant le chantier Alpine Light (pas de PR formel).
- CI/CD GitHub Actions `deploy-vm.yml` deploie automatiquement.

---

## 3. Environnement prod

- **SSH alias** : `runsee-vm` (host 82.165.109.160).
- **Repo VM** : `/srv/runsee/repo`.
- **Containers Docker** : `runsee-backend`, `runsee-frontend`, `runsee-postgres-prod`, `runsee-cloudflared`.
- **Workflow deploy** : `.github/workflows/deploy-vm.yml`.
- **Scripts ops one-shot** : `docker exec runsee-backend node scripts/maintenance/<script>.js`.

## 4. Stack technique

### Frontend (`frontend/`)
- React 19 + Vite 8 + React Router.
- JS/JSX pur (pas de TS).
- Tests : Vitest (config dans `frontend/vitest.config.js`).
- Lint : ESLint 10 (`frontend/.eslintrc` ou flat config).
- Charts : `recharts`.
- HTTP : `axios` (`frontend/src/services/`).

### Backend (`backend/`)
- Node 22 + Express 5 + Prisma 7 (ESM, JS pur).
- Tests : Node `--test` runner natif.
- Schemas Prisma duaux :
  - `backend/prisma/schema.prisma` (SQLite dev).
  - `backend/prisma-postgresql/schema.prisma` (Postgres prod).
- **Toute migration doit etre appliquee sur les deux schemas** + verifier alignement via `npm run db:compare-schemas`.
- Garmin bridge Python : `backend/scripts/providers/garminconnect_bridge.py` (subprocess depuis Node).

### DB prod
- PostgreSQL via container `runsee-postgres-prod`.
- Variable `DATABASE_URL` injectee au container backend.

---

## 5. Etat courant (2026-05-17)

- Branche : `main`, alignee prod.
- Dernier chantier livre : **Lot 04 Alpine Light V5** (refonte complete Page Analyse, 5 onglets).
- Tests : 211/211 (frontend) + 31/31 (backend) verts.
- Lint : 0 warning.
- Deploy : CI/CD verte sur le dernier push.
- Validation visuelle : OK utilisateur final.

### Lot 04 V5 — composants livres

- 5 onglets de la Page Analyse : Vue d'ensemble, Charges, Tendances, Intensites, Sommeil & recuperation.
- 4 nouveaux helpers utils : `analyticsFocus.js`, `analyticsTrends.js`, `analyticsIntensities.js`, `analyticsRecovery.js`.
- Bridge Garmin Python corrige : `api.get_activity(id).summaryDTO` pour exposer `activityTrainingLoad` (pivot EPOC).
- 20+ sources scientifiques referencees en JSDoc.

### Lot 04 V5 — bugs fixes notables

- Snapshot recovery : helper accepte `s.date` (API serializer) OU `s.snapshotDate` (raw Prisma).
- Bridge Garmin DETAIL endpoint pour Firstbeat fields.
- Rolling 30 j vs 30 j precedents (eviter biais mois partiel).
- Heatmap responsive (ResizeObserver, cellSize dynamique, cellules toujours carrees).
- Direction gradient range bar alignee sur direction physiologique.

## 6. TODO globales reportees (non bloquant)

- Tooltips pedagogiques (i) sur l'ensemble de RunNSee — passe globale unique apres stabilisation.
- CTAs Analyse "Voir l'analyse complete" / "En savoir plus" / "Voir tous les conseils" — branchage destinations a definir.

---

## 7. Liens transverses

- `SUIVI_CHANTIER_ALPINE_LIGHT.md` (racine) : suivi exhaustif du chantier Alpine Light.
- `docs/plans/old/` : plans termines archives.
- `docs/plans/active/` : plans en cours (si chantier nouveau).
- `docs/decisions/` : ADR (Architecture Decision Records).
- `docs/releases/` : baselines, tags, notes de release.
- `docs/operations/` : runbooks et procedures ops.

---

## 8. Si tu commences un nouveau chantier

1. Relire les 8 documents de la section 1 dans l'ordre.
2. Documenter ton plan AVANT codage.
3. Pour toute refonte UX : analyse rigoureuse du mockup + verification scientifique des seuils + decisions a valider en bloc.
4. Coder en respectant les regles de la section 2.
5. Quality gate + double validation post-deploy.
6. Mettre a jour `.ai/current_context.md`, `.ai/open_tasks.md`, `.ai/codebase_map.md` (et `.ai/regression_risks.md` si nouvelle zone de risque introduite).
7. Si plan termine : archiver sous `docs/plans/old/`.
8. Si validation significative : alimenter `docs/quality/RUNSEE_TEST_LOG.md`.

---

**Maintenu par** : Claude (Lot 04 Alpine Light V5, 2026-05-17).
**A actualiser** : a chaque chantier majeur livre, par l'agent qui en est responsable.
