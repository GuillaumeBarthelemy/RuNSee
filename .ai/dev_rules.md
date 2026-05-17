# Dev Rules — RunNSee Alpine Light

Recapitulatif consolide de toutes les regles de developpement actees au cours du Lot 04 Alpine Light V5 (2026-05). A lire avant tout chantier UX/UI ou metier sur l'application.

## 1. Workflow general

### 1.1 Avant tout DEV

1. **Lire les 5 documents de contexte court terme** dans l'ordre :
   - `docs/README.md`
   - `docs/quality/RUNSEE_QUALITY_GATE.md`
   - `.ai/current_context.md`
   - `.ai/open_tasks.md`
   - `.ai/regression_risks.md`
2. **Lecture ciblee uniquement** — pas de scan complet du repo. Proposer la liste minimale de fichiers a lire avant d'ouvrir.
3. **Distinguer** explicitement : correction / optimisation / changement fonctionnel.
4. **Preserver la logique metier** sauf demande explicite contraire.

### 1.2 Pendant le DEV

- **Ne pas reintroduire** de calcul metier dans les composants visuels — passer par `utils/`.
- **Commenter** les seuils scientifiques avec sources (JSDoc).
- **Une seule responsabilite** par fichier nouveau (utils helper, sub-component, etc.).
- **Reutiliser** les composants existants (`OverviewIndicatorCard`, `OverviewRangeBar`, `AlpineSelect`, etc.) avant d'en creer un nouveau.

### 1.3 Apres le DEV (process double validation acte 2026-05-16)

1. **Quality gate complet** :
   - `npm test -- --run` (211/211 tests Vitest verts attendus)
   - `npm run lint -- --max-warnings 0`
   - `npm run build`
   - Tests backend si touche : `npm test` (31/31 verts attendus)
2. **Commit + push + watch deploy**.
3. **Auto-comparaison visuelle prod vs mockup** (si refonte UX) :
   - Tableau d'ecarts avec severite (🔴 haut / 🟡 moyen / ⚪ cosmetique)
   - Liste des elements conserves intentionnellement differents du mockup (avec justification)
   - Correctif cible si ecart 🔴 detecte, livre dans la foulee
4. **Ne pas demander validation utilisateur** sans avoir fait cette auto-revue.

## 2. Discipline contextuelle (CLAUDE.md global)

### 2.1 Cost & context

- Pas de scan complet du repo sauf demande explicite.
- Sorties de commande limitees a 150 lignes.
- Ne pas coller de logs longs dans la conversation.
- Pour logs/tests verbeux, extraire uniquement les echecs et stack traces pertinentes.
- Utiliser des subagents pour exploration verbose / docs / tests.

### 2.2 Model usage

- Sonnet par defaut.
- Haiku ou subagent leger pour exploration simple.
- Opus uniquement pour architecture, debugging complexe, securite sensible, ou regression-risk analysis. Repasser sur Sonnet ensuite.

### 2.3 Delivery discipline

- Avant edit : expliquer le changement prevu et le risque de regression.
- Apres edit : run la validation la plus restreinte qui couvre le diff (pas tout le repo systematiquement).

## 3. Regles UX / UI Alpine Light

### 3.1 Optimisation de l'espace (regle "ne jamais etirer")

- **Images / SVG** : `preserveAspectRatio="meet"` par defaut, jamais `none` sauf justification.
- **Sparklines** : `max-width` contrainte (~220 px) + alignement droite pour eviter l'etalement horizontal.
- **Cards KPI principales** : value >= 24 px, icone pill >= 40 px, SVG interne >= 20 px.
- **Cards KPI secondaires** : value >= 18 px, icone pill >= 24 px.
- **Distribuer** les espaces verticaux (`justify-content: space-between` quand la card a un layout vertical lache).
- **Padding** consistant : 14-16 px sur les cards, 10-12 px sur les sub-cards.

### 3.2 Graphiques temporels

- **Granularite** : 8-12 points pour une carte 2/3 colonne. Moins = barres trop larges, plus = labels illisibles.
- **Recharts** :
  - `isAnimationActive={false}` par defaut pour rendu predictible.
  - `connectNulls` pour ne pas couper les lignes sur points manquants.
  - `dot={{ r, fill, strokeWidth: 0 }}` avec fill explicite (eviter l'effet "halo blanc disconnect").
  - `activeDot` avec halo blanc 2 px pour interaction hover.
  - `<LabelList position="top">` pour afficher les valeurs au-dessus des barres/points quand le mockup le montre.
- **Stacked bar** : ordre Z1 -> Z5 (du plus calme au plus intense).
- **Highlight semaine courante** : `<ReferenceArea>` avec stroke dashed navy.

### 3.3 Range bars + gradients

**Regle critique** : le gradient se choisit selon la **direction physiologique**, pas l'esthetique.

| Cas | Gradient | Exemple |
|---|---|---|
| LOW value = bon | `warm` (vert -> rouge) | FC repos, Stress |
| HIGH value = bon | `cool` (rouge -> vert) | HRV, Etat de recuperation, Sommeil pragmatique 5-9h, CTL |
| OPTIMAL au centre | `polar` (rouge -> vert -> rouge) | TSB autour de 0 |

Verifier en plaçant la valeur "type good" sur la barre : le curseur doit visuellement tomber dans le vert.

### 3.4 Couleurs metier conventionnees

| Concept | Couleur | Hex |
|---|---|---|
| Primary / sommeil | Bleu | `#3B82F6` / `#1268f3` |
| Endurance / recuperation positive | Vert | `#16A34A` / `#15803d` |
| Stress / allure soutenue / volume warm | Ambre / orange | `#F59E0B` / `#ea580c` |
| Seuil / FC eleve / danger | Rouge | `#EF4444` / `#dc2626` |
| Tempo / FC repos (orange chaud) | Orange | `#F97316` |
| VO2max | Gris fonce | `#475569` |

Pour les zones FC : Z1 bleu, Z2 vert, Z3 orange, Z4 rouge, Z5 gris fonce.

### 3.5 Pastilles d'icone (rail "A retenir")

- Pastille ronde 26-30 px de diametre.
- Couleur de fond pastel claire derivee de la couleur principale (`#dcfce7` pour vert, `#fef3c7` pour ambre, etc.).
- Icone svg 14 px hereditant `currentColor` (la couleur saturee).
- Direction de l'icone doit refleter le sens du signal :
  - Hausse positive : `IconTrendUp` (fleche montante)
  - Baisse / vigilance : `IconTrendDown` ou `IconAlert`
  - Stable : icone neutre
- Ne jamais mettre une icone "fleche montante" pour un libelle "en baisse".

### 3.6 Selecteurs

- Pour selecteurs avec options multiples (periode 7/14/28 j, 6 mois / 12 mois, etc.) : utiliser `AlpineSelect` (dropdown stylise avec chevron, a11y native).
- Pour toggles binaires (on/off) : pill toggle.
- Pas de mix des deux sur le meme onglet — choisir l'un OU l'autre selon le mockup.

## 4. Conventions metier scientifique

### 4.1 Toujours citer les sources

Tout seuil / classification doit avoir sa source en JSDoc :

```js
/**
 * Classification Endurance (Seiler 2010 + Stoggl & Sperlich 2014).
 * Elite endurance = 75-85 % LIT. Amateur structure >= 70 %.
 */
export function classifyEndurance(z1z2Share) { ... }
```

### 4.2 Sources de reference autorisees

- **Charges / Banister** : Banister 1991, Allen & Coggan 2010, Mujika 2017, Friel 2009.
- **ACWR / Risque blessure** : Gabbett 2016 (`Br J Sports Med` 50(5)).
- **Polarized / Zones** : Seiler 2010, Stoggl & Sperlich 2014, Treff 2019.
- **Allure / Pace** : Daniels 2014, Skiba 2007, Minetti 2002 (GAP).
- **Volume / Frequence** : Esteve-Lanao 2007, Jones 2006, Haugen 2022, Foster 2001.
- **Trail / Denivele** : Millet 2011 (`Sports Med` 41(7)), Saugy 2013.
- **Regularite** : Tudor-Locke 2011, OMS 2020.
- **Sommeil** : NSF 2015 (National Sleep Foundation), AASM 2015.
- **HRV / Recuperation** : Plews & Laursen 2013 (`Sports Medicine`), Buchheit 2014 (`Front Physiol`), Halson 2014 (`Sports Med`), Le Meur 2013.
- **EPOC / Training Load** : Borsheim & Bahr 2003, Firstbeat 2014 (white paper).
- **Decouplage cardiaque** : Allen & Coggan 2010 (`Training and Racing with a Power Meter`).

### 4.3 Conventions de fenetre temporelle

- **Toujours utiliser rolling 30 j vs 30 j precedents** pour les deltas KPI (eviter le biais "mois courant partiel vs mois precedent complet").
- Pour les comparaisons hebdomadaires : 4 semaines avant (`buildFourWeeksBackComparison`).
- Pour les charts temporels :
  - Historique court : 6-12 semaines / mois.
  - Historique long : 1 an glissant (modele dedie type `chargesTrainingLoadModel`).

### 4.4 Definitions cles a respecter

- **"Allure soutenue"** = Z4 + Z5 seulement (au-dessus de LT2). Pas Z3+Z4+Z5.
- **"Stimulus moderate"** = Z3 + Z4 + Z5 (MIT + HIT combine).
- **"Foncier" / "Endurance"** = Z1 + Z2 (LIT, en-dessous de LT1).
- **"Seances de qualite"** = activites avec FC moyenne >= 88 % FCmax OU FC max >= 95 % FCmax (entree Z4 ou Z5).
- **"Regularite %"** = jours actifs / jours periode * 100 (Tudor-Locke 2011).
- **"Streak"** = nb max de jours consecutifs avec >= 1 activite (metrique motivationnelle).

### 4.5 Vocabulaire V5 (libelles utilisateur)

| Interdit | A utiliser |
|---|---|
| HRV | VFC (variabilite frequence cardiaque) ou HRV si terme technique |
| Body Battery | Energie |
| pts (training points) | UA (unites arbitraires) |
| GAP (grade adjusted pace) | Allure ajustee |
| Decoupling | Derive cardiaque |
| EPOC (pour la card recente) | Charge d'entrainement Garmin (Firstbeat Training Load) |
| YTD (year to date) | Cumul annuel |

## 5. Architecture frontend (Lot 04 reference)

### 5.1 Separation responsabilites

- **`pages/`** : orchestre les hooks, calcule les view-models via `useMemo`, monte les onglets.
- **`components/analytics/`** : composants Tab (orchestrateurs) + sub-composants visuels.
- **`utils/analytics*.js`** : helpers metier purs (aucune dep React, JSDoc + tests).
- **`services/`** : appels API axios.

### 5.2 Helpers metier nommes par onglet

- `utils/analyticsFocus.js` : Vue d'ensemble (Focus Performance & Efficience).
- `utils/analyticsTrends.js` : Tendances.
- `utils/analyticsIntensities.js` : Intensites.
- `utils/analyticsRecovery.js` : Sommeil & recuperation.
- `utils/analyticsCharges.js` (si extension future) : Charges.

### 5.3 Pattern reutilisable rolling 30 j

```js
export function buildXxxRolling30(snapshots, endDate) {
  const startCurrent  = endDate - 29 days;
  const endPrevious   = startCurrent - 1;
  const startPrevious = endPrevious - 29 days;
  return { current, previous, deltaAbs, deltaPct };
}
```

### 5.4 Pattern reutilisable classification

```js
export function classifyXxx(value) {
  if (!Number.isFinite(value)) return { tone: 3, hint: "—" };
  if (value < seuil1) return { tone: 4, hint: "Faible" };
  ...
  return { tone: 1, hint: "Excellent" };
}
```

Tones standardises : 1 = positif fort (vert), 2 = positif (lime), 3 = neutre (gris), 4 = vigilance (ambre), 5 = alerte (rouge).

## 6. Architecture backend

### 6.1 Routes / controllers / services / repositories

- Routes : `backend/src/routes/`.
- Controllers minces : `backend/src/controllers/`.
- Services metier : `backend/src/services/`.
- Repositories Prisma : `backend/src/repositories/`.

### 6.2 Schemas Prisma dual

- `backend/prisma/schema.prisma` (SQLite dev).
- `backend/prisma-postgresql/schema.prisma` (Postgres prod cible).
- **Toute migration doit etre appliquee sur les deux schemas**.
- Verifier alignement via `npm run db:compare-schemas`.

### 6.3 Garmin bridge Python

- `backend/scripts/providers/garminconnect_bridge.py` : LIST + DETAIL endpoints.
- Champs Firstbeat exposes uniquement via le DETAIL endpoint (`api.get_activity(id).summaryDTO`).
- Pacing 1s entre appels DETAIL pour eviter rate-limit.
- Stop propre sur HTTP 429 (`detailRateLimited: true` dans la response).
- Limite haute 200 activites par run (garde-fou).

### 6.4 Scripts maintenance

- Dossier : `backend/scripts/maintenance/`.
- Convention : un script = une operation idempotente.
- Documenter l'usage en tete de fichier (JSDoc).
- Pour invoquer en prod : `docker exec runsee-backend node scripts/maintenance/<script>.js`.

## 7. Tests

### 7.1 Frontend (Vitest)

- 211/211 tests verts attendus.
- Tester les helpers metier (`utils/analytics*.test.js`) avant les composants.
- Tester les classifications par cas limites (bornes inferieures / superieures / valeurs intermediaires).

### 7.2 Backend

- 31/31 tests verts attendus.
- Tests purs sans mocks DB pour le moment.
- Cas critique : matching Garmin/Strava (`activityProviderMatching.service.test.js`).

### 7.3 Lint

- ESLint `--max-warnings 0` sur tout le repo.
- Pas de variables inutilisees (sauf prefix `_` ou MAJUSCULES).
- Tests `react-hooks/exhaustive-deps` actifs.

### 7.4 Build

- Vite build OK (~400-900 ms).
- Bundle `charts-*.js` ~380 KB (recharts est lourd, c'est attendu).

## 8. Git workflow

### 8.1 Commits

- Un commit = un changement coherent.
- Message format : `<type>(scope): <summary>` puis body detaille.
- Types : `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.
- Scope : `analytics`, `garmin-bridge`, `recovery`, etc.
- Body : pourquoi (motivation), quoi (changement), comment teste, sources si scientifique.
- Footer obligatoire : `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` sur les commits Claude.

### 8.2 Push & deploy

- Push direct sur `main` autorise pendant le chantier Alpine Light (pas de PR formel).
- GitHub Actions `deploy-vm.yml` deploie automatiquement sur la VM (`runsee-vm` : 82.165.109.160).
- Workflow : validate (lint + build) puis deploy SSH + docker.
- Validation visuelle finale par l'utilisateur apres deploy.

### 8.3 Operations urgentes prod

- SSH alias : `runsee-vm`.
- Repo sur la VM : `/srv/runsee/repo`.
- Containers : `runsee-backend`, `runsee-frontend`, `runsee-postgres-prod`.
- Patch en place via `docker cp` + `docker exec` pour scripts maintenance one-shot (eviter de redeployer pour un script de diagnostic).

## 9. TODO globales reportees

- **Tooltips pedagogiques (i)** sur l'ensemble de RunNSee — passe globale unique apres stabilisation.
- **CTAs analyse** ("Voir l'analyse complete" / "En savoir plus" / "Voir tous les conseils") — branchage sur destinations concretes a definir.

## 10. Quality gate avant de marquer une page "livre"

- [ ] Tests frontend verts (`npm test -- --run`).
- [ ] Tests backend verts (`npm test`).
- [ ] ESLint zero warning (`npm run lint -- --max-warnings 0`).
- [ ] Build Vite OK (`npm run build`).
- [ ] Commit + push.
- [ ] Watch deploy CI/CD jusqu'au Public health checks OK.
- [ ] Auto-comparaison capture prod vs mockup (tableau d'ecarts).
- [ ] Correctif cible si ecart majeur identifie.
- [ ] Validation visuelle utilisateur.
- [ ] Mise a jour `.ai/current_context.md` + `.ai/open_tasks.md` si chantier termine.

---

**Auteur** : Claude (Lot 04 Alpine Light V5, 2026-05-16/17).
**A revoir** : a chaque chantier majeur, completer ce document avec les regles nouvellement actees.
