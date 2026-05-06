# RunNSee â€” Plan de fiabilisation Frontend / Backend / Science / UX

> **Objectif du document**
> Fournir Ã  CODEX / Claude Code Pro un plan de travail complet pour fiabiliser RunNSee aprÃ¨s rÃ©alisation des corrections prioritaires prÃ©cÃ©dentes.
> Le but nâ€™est **pas** de refondre lâ€™application, ni de changer le positionnement produit, mais de sÃ©curiser ce qui existe : logique scientifique, cohÃ©rence des donnÃ©es, robustesse backend, lisibilitÃ© frontend, vulgarisation et non-rÃ©gression.

---

## 0. HypothÃ¨se de dÃ©part

Partir du principe que les 4 prioritÃ©s prÃ©cÃ©dentes sont dÃ©jÃ  rÃ©alisÃ©es :

1. Packaging / secrets / SQLite / dÃ©marrage propre sÃ©curisÃ©s.
2. Migration SQLite â†’ PostgreSQL corrigÃ©e et mieux couverte.
3. Phase K Garmin activitÃ© cÃ¢blÃ©e de bout en bout.
4. `activityEnrichment.js` corrigÃ© sur les cas limites Garmin.

Ne pas recommencer ces sujets depuis zÃ©ro.
Le travail demandÃ© ici consiste Ã  **auditer, fiabiliser et homogÃ©nÃ©iser lâ€™existant post-corrections**.

---

## 1. RÃ¨gles gÃ©nÃ©rales pour CODEX / Claude Code Pro

### 1.1. MÃ©thode obligatoire

Pour chaque lot :

1. Lire les fichiers concernÃ©s.
2. Identifier la logique existante.
3. Distinguer :
   - correction de bug ;
   - fiabilisation ;
   - optimisation ;
   - changement fonctionnel.
4. PrÃ©server la logique mÃ©tier existante sauf incohÃ©rence dÃ©montrÃ©e.
5. Ajouter ou adapter les tests pertinents.
6. VÃ©rifier lâ€™absence de rÃ©gression frontend/backend.
7. Mettre Ã  jour les fichiers `.ai/*.md`.
8. CrÃ©er un commit Git clair.
9. Pousser sur GitHub pour dÃ©clencher la CI/CD.

### 1.2. Contraintes fortes

- Ne pas refaire une refonte UX.
- Ne pas renommer massivement les composants.
- Ne pas modifier les formules scientifiques sans justification explicite.
- Ne pas masquer les donnÃ©es partielles.
- Ne pas afficher un score comme fiable si les donnÃ©es sources sont insuffisantes.
- Ne pas mÃ©langer score Garmin brut et score maison RunNSee.
- Ne pas introduire de dÃ©pendance lourde sans nÃ©cessitÃ©.
- Ne pas casser SQLite/PostgreSQL.
- Ne pas casser lâ€™usage local Windows.
- Ne pas casser lâ€™exposition via Cloudflare Tunnel.
- Ne pas supprimer dâ€™ancien composant sans vÃ©rifier quâ€™il nâ€™est plus importÃ©.
- Ne pas faire de changement visuel global non demandÃ©.

---

## 2. Livrables attendus

Ã€ la fin du chantier :

1. Application frontend stable.
2. Backend robuste sur les routes critiques.
3. Indicateurs scientifiques auditÃ©s et documentÃ©s.
4. Vocabulaire utilisateur homogÃ¨ne.
5. Ã‰tats vides / donnÃ©es partielles mieux gÃ©rÃ©s.
6. Tests ciblÃ©s ajoutÃ©s.
7. Documentation `.ai/*.md` mise Ã  jour.
8. Commit(s) Git propres.
9. Push GitHub effectuÃ©.
10. CI/CD dÃ©clenchÃ©e et rÃ©sultat documentÃ©.

---

## 3. Fichiers `.ai/*.md` Ã  maintenir

Mettre Ã  jour systÃ©matiquement :

```text
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
.ai/codebase_map.md
```

### 3.1. `current_context.md`

Doit contenir :

- Ã©tat rÃ©el post-fiabilisation ;
- dÃ©cisions validÃ©es ;
- fonctionnalitÃ©s actives ;
- limitations connues ;
- statut Garmin ;
- statut PostgreSQL ;
- statut tests ;
- dernier commit.

### 3.2. `open_tasks.md`

Doit contenir :

- tÃ¢ches terminÃ©es avec cases cochÃ©es ;
- tÃ¢ches restantes ;
- bugs encore ouverts ;
- validations utilisateur attendues ;
- backlog non prioritaire.

### 3.3. `regression_risks.md`

Doit contenir :

- zones Ã  risque Ã©levÃ© / moyen / faible ;
- garde-fous ;
- recette manuelle ;
- tests automatisÃ©s ajoutÃ©s.

### 3.4. `codebase_map.md`

Doit rester alignÃ© avec le code :

- routes backend rÃ©ellement montÃ©es ;
- services backend existants ;
- pages frontend existantes ;
- composants critiques ;
- modÃ¨les Prisma ;
- scripts deployment ;
- commandes utiles.

---

## 4. Vue dâ€™ensemble des incohÃ©rences potentielles Ã  rechercher

### 4.1. IncohÃ©rences scientifiques

Ã€ auditer :

- score Aptitude RunNSee ;
- charge dâ€™entraÃ®nement ;
- CTL / ATL / TSB ;
- ACWR si prÃ©sent ;
- TRIMP si prÃ©sent ;
- GAP / allure ajustÃ©e ;
- dÃ©rive cardiaque ;
- EPOC / dette dâ€™oxygÃ¨ne ;
- VDOT / prÃ©diction chrono ;
- zones de frÃ©quence cardiaque ;
- prioritÃ© entre HR, allure, RPE et donnÃ©es Garmin ;
- VO2max Garmin vs estimation RunNSee ;
- Training Effect Garmin vs interprÃ©tation maison.

Risque principal : afficher des indicateurs comme sâ€™ils Ã©taient mÃ©dicalement ou scientifiquement absolus alors quâ€™ils sont des approximations sportives.

### 4.2. IncohÃ©rences de vulgarisation

Ã€ auditer :

- labels visibles ;
- tooltips ;
- glossaire ;
- wording des cartes ;
- messages dâ€™alerte ;
- messages â€œcoachâ€ ;
- phrases de verdict ;
- distinction entre observation et recommandation.

Risque principal : transformer un indicateur incertain en conseil direct trop prescriptif.

### 4.3. IncohÃ©rences frontend

Ã€ auditer :

- duplication dâ€™indicateurs entre dashboard, analytics, performance, activitÃ© ;
- formats de dates ;
- timezone ;
- unitÃ©s ;
- Ã©tats de chargement ;
- erreurs API ;
- empty states ;
- composants non utilisÃ©s ;
- props optionnelles ;
- imports morts ;
- donnÃ©es `null`, `0`, `undefined`.

Risque principal : page blanche ou affichage faussement rassurant.

### 4.4. IncohÃ©rences backend

Ã€ auditer :

- routes rÃ©ellement montÃ©es ;
- contrÃ´leurs non utilisÃ©s ;
- services morts ;
- erreurs non catchÃ©es ;
- rÃ©ponse API non normalisÃ©e ;
- idempotence sync ;
- transactions Prisma ;
- compatibilitÃ© SQLite/PostgreSQL ;
- logs insuffisants ;
- statuts provider bloquÃ©s.

Risque principal : donnÃ©es incohÃ©rentes sans erreur visible en interface.

---

# LOT 1 â€” Audit contrÃ´lÃ© post-corrections

## Objectif

Ã‰tablir un Ã©tat fiable de lâ€™application aprÃ¨s corrections prioritaires, sans modifier encore le comportement fonctionnel.

## Actions

### 1.1. Inventaire backend

Analyser :

```text
backend/src/app.js
backend/src/routes/
backend/src/controllers/
backend/src/services/
backend/prisma/schema.prisma
backend/prisma-postgresql/schema.prisma
backend/scripts/
```

VÃ©rifier :

- routes montÃ©es vs routes existantes ;
- endpoints utilisÃ©s par le frontend ;
- services morts ;
- contrÃ´leurs morts ;
- imports cassÃ©s ;
- cohÃ©rence des modÃ¨les Prisma ;
- cohÃ©rence SQLite/PostgreSQL.

### 1.2. Inventaire frontend

Analyser :

```text
frontend/src/pages/
frontend/src/components/
frontend/src/hooks/
frontend/src/services/
frontend/src/utils/
frontend/src/context/
frontend/src/layouts/
```

VÃ©rifier :

- pages rÃ©ellement routÃ©es ;
- composants utilisÃ©s ;
- composants morts ;
- hooks critiques ;
- services API ;
- utils scientifiques ;
- doublons ;
- formats incohÃ©rents.

### 1.3. Inventaire deployment

Analyser :

```text
deployment/
```

VÃ©rifier :

- scripts Windows ;
- scripts PostgreSQL ;
- scripts Cloudflare ;
- scripts Linux si prÃ©sents ;
- dÃ©pendance Ã  `.env` ;
- ordre de dÃ©marrage ;
- logs ;
- healthcheck.

## Tests / commandes

ExÃ©cuter au minimum :

```bash
cd backend
npm ci
npm run prisma:generate
npm run prisma:migrate
node --check src/app.js
node --check src/server.js

cd ../frontend
npm ci
npm test
npm run build
```

Si des commandes nâ€™existent pas, documenter prÃ©cisÃ©ment lâ€™Ã©cart dans `.ai/open_tasks.md`.

## Livrables

- Rapport court dans `.ai/current_context.md`.
- Liste des incohÃ©rences confirmÃ©es dans `.ai/open_tasks.md`.
- Liste des risques mis Ã  jour dans `.ai/regression_risks.md`.

## Commit

```bash
git add .ai/
git commit -m "docs(ai): refresh post-correction audit baseline"
git push
```

---

# LOT 2 â€” Fiabilisation scientifique des indicateurs

## Objectif

Sâ€™assurer que les indicateurs affichÃ©s sont cohÃ©rents, documentÃ©s, non trompeurs et rÃ©sistants aux donnÃ©es partielles.

## PÃ©rimÃ¨tre probable

```text
frontend/src/utils/recoveryViewModel.js
frontend/src/utils/loadDynamics.js
frontend/src/utils/trainingIntelligence.js
frontend/src/utils/gradeAdjustedPace.js
frontend/src/utils/cardiacDecoupling.js
frontend/src/utils/epocLevel.js
frontend/src/utils/activityEnrichment.js
frontend/src/utils/raceObjectivePlanner.js
frontend/src/utils/performanceNarratives.js
frontend/src/data/glossary.js
frontend/src/data/trainingMvpCopy.js
```

## 2.1. Aptitude RunNSee

### Ã€ vÃ©rifier

- La formule est-elle clairement maison ?
- Les pondÃ©rations sont-elles lisibles ?
- Les donnÃ©es manquantes baissent-elles la confiance plutÃ´t que de produire un score arbitraire ?
- Le score est-il bornÃ© ?
- Le score distingue-t-il `0` rÃ©el et donnÃ©e absente ?
- Le tooltip explique-t-il que ce nâ€™est pas le Training Readiness Garmin ?

### Attendu

- Afficher â€œAptitude RunNSeeâ€ comme score maison.
- Ne jamais afficher comme â€œvÃ©ritÃ© physiologiqueâ€.
- Ajouter un niveau de confiance :
  - Ã©levÃ©e ;
  - moyenne ;
  - faible ;
  - insuffisante.
- En cas de donnÃ©es insuffisantes, afficher un Ã©tat explicite.

### Non-rÃ©gression

- Ne pas remplacer par Training Readiness Garmin.
- Ne pas changer le positionnement coach.
- Ne pas supprimer les mÃ©triques sources.

---

## 2.2. Charge, Fitness, Fatigue, FraÃ®cheur

### Ã€ vÃ©rifier

- Les constantes CTL/ATL sont-elles documentÃ©es ?
- Les fenÃªtres temporelles sont-elles cohÃ©rentes ?
- La fraÃ®cheur nâ€™est-elle pas interprÃ©tÃ©e comme â€œbon/mauvaisâ€ trop brutalement ?
- Les premiÃ¨res semaines dâ€™historique sont-elles correctement signalÃ©es comme moins fiables ?
- Les activitÃ©s sans HR ou sans RPE sont-elles exclues proprement ou imputÃ©es explicitement ?

### Attendu

- Documenter les hypothÃ¨ses.
- Ajouter un Ã©tat â€œhistorique insuffisantâ€ si nÃ©cessaire.
- Harmoniser les tooltips :
  - charge rÃ©cente ;
  - forme de fond ;
  - fatigue court terme ;
  - fraÃ®cheur.

### Risque

Ne pas modifier la formule si elle est dÃ©jÃ  cohÃ©rente, sauf bug dÃ©montrÃ©.

---

## 2.3. GAP / Allure ajustÃ©e

### Ã€ vÃ©rifier

- La formule Minetti est-elle correctement bornÃ©e ?
- Les pentes extrÃªmes sont-elles plafonnÃ©es ?
- Les activitÃ©s trop courtes ou GPS bruitÃ©es sont-elles exclues ?
- Le terme â€œAllure ajustÃ©eâ€ est-il utilisÃ© partout cÃ´tÃ© UI ?
- Le glossaire indique-t-il que câ€™est une approximation ?

### Attendu

- Ne pas surinterprÃ©ter en trail technique.
- Mentionner que lâ€™allure ajustÃ©e ne corrige pas :
  - terrain ;
  - boue ;
  - technicitÃ© ;
  - vent ;
  - pauses ;
  - altitude rÃ©elle.

---

## 2.4. DÃ©rive cardiaque

### Ã€ vÃ©rifier

- Calcul uniquement sur activitÃ©s suffisamment longues.
- Exclusion des sÃ©ances fractionnÃ©es si la mÃ©thode nâ€™est pas adaptÃ©e.
- Gestion des pauses.
- PondÃ©ration distance/temps cohÃ©rente.
- InterprÃ©tation modÃ©rÃ©e.

### Attendu

Vulgarisation correcte :

> â€œLa dÃ©rive cardiaque compare lâ€™Ã©volution du rapport allure / frÃ©quence cardiaque entre le dÃ©but et la fin de la sÃ©ance. Une dÃ©rive Ã©levÃ©e peut signaler fatigue, chaleur, dÃ©shydratation ou intensitÃ© mal maÃ®trisÃ©e.â€

Ne pas conclure automatiquement â€œmauvaise enduranceâ€.

---

## 2.5. EPOC / Dette dâ€™oxygÃ¨ne

### Ã€ vÃ©rifier

- Source des donnÃ©es : Garmin brute ou estimation maison ?
- Si Garmin brute : lâ€™afficher comme mÃ©trique Garmin.
- Si estimation maison : lâ€™indiquer clairement.
- Les niveaux qualitatifs sont-ils cohÃ©rents ?
- Ne pas afficher de prÃ©cision excessive.

### Attendu

- PrÃ©fÃ©rer des niveaux :
  - lÃ©ger ;
  - modÃ©rÃ© ;
  - Ã©levÃ© ;
  - trÃ¨s Ã©levÃ©.
- Ã‰viter les valeurs trop pseudo-prÃ©cises.
- Tooltip court + entrÃ©e glossaire plus complÃ¨te.

---

## 2.6. VO2max / VDOT / prÃ©diction chrono

### Ã€ vÃ©rifier

- Ne pas mÃ©langer VO2max Garmin et VDOT estimÃ©.
- Ne pas afficher des prÃ©dictions comme garanties.
- Expliquer les conditions :
  - course rÃ©cente ;
  - parcours plat ;
  - effort maximal ;
  - mÃ©tÃ©o ;
  - fatigue ;
  - qualitÃ© GPS/FC.

### Attendu

- Ajouter un libellÃ© de confiance.
- Afficher â€œestimationâ€ plutÃ´t que â€œprÃ©diction certaineâ€.
- En cas de donnÃ©es faibles : â€œdonnÃ©es insuffisantesâ€.

---

## Tests Ã  ajouter

CrÃ©er ou complÃ©ter des tests Vitest :

```text
recoveryViewModel.test.js
loadDynamics.test.js
cardiacDecoupling.test.js
epocLevel.test.js
gradeAdjustedPace.test.js
activityEnrichment.test.js
performanceNarratives.test.js
raceObjectivePlanner.test.js
```

Cas obligatoires :

- valeurs `null`;
- valeurs `0`;
- valeurs nÃ©gatives attendues ;
- activitÃ© courte ;
- activitÃ© sans FC ;
- activitÃ© sans dÃ©nivelÃ© ;
- activitÃ© trail ;
- historique insuffisant ;
- Garmin prÃ©sent mais partiel ;
- Garmin absent.

## Commit

```bash
git add frontend/src .ai/
git commit -m "feat(science): harden training metrics interpretation"
git push
```

---

# LOT 3 â€” Harmonisation vulgarisation, glossaire et tooltips

## Objectif

Rendre lâ€™interface claire, fiable et cohÃ©rente, sans surcharger lâ€™utilisateur.

## PÃ©rimÃ¨tre

```text
frontend/src/data/glossary.js
frontend/src/data/trainingMvpCopy.js
frontend/src/components/ui/InfoTooltip.jsx
frontend/src/components/ui/GlossaryLink.jsx
frontend/src/components/dashboard/
frontend/src/components/activity/
frontend/src/components/analytics/
frontend/src/components/performance/
frontend/src/pages/GlossairePage.jsx
```

## 3.1. VÃ©rifier le vocabulaire canonique

Termes Ã  utiliser partout :

| Concept | Terme UI |
|---|---|
| HRV | VFC |
| Body Battery | Ã‰nergie |
| GAP | Allure ajustÃ©e |
| Cardiac decoupling | DÃ©rive cardiaque |
| EPOC | Dette dâ€™oxygÃ¨ne |
| Readiness maison | Aptitude RunNSee |
| Training load | Charge |
| Fitness | Forme de fond |
| Fatigue | Fatigue |
| Freshness / TSB | FraÃ®cheur |
| Resting HR | FC repos |
| Heart rate | FrÃ©quence cardiaque |
| Average pace | Allure moyenne |

## 3.2. RÃ¨gles de vulgarisation

Chaque tooltip doit :

- Ãªtre court ;
- ne pas dÃ©passer environ 80 caractÃ¨res si mode compact ;
- ne pas contenir de jargon non expliquÃ© ;
- ne pas faire de promesse mÃ©dicale ;
- renvoyer au glossaire si nÃ©cessaire.

Chaque entrÃ©e glossaire doit :

- expliquer lâ€™indicateur ;
- indiquer la source ou la nature de lâ€™estimation ;
- prÃ©ciser les limites ;
- dire quand ne pas lâ€™interprÃ©ter.

## 3.3. Ton coach

Le tutoiement est conservÃ©, mais :

- pas de conseil alarmiste ;
- pas de verdict mÃ©dical ;
- pas de prescription dure ;
- prÃ©fÃ©rer â€œpeut indiquerâ€ Ã  â€œindiqueâ€ ;
- prÃ©fÃ©rer â€œÃ  surveillerâ€ Ã  â€œproblÃ¨meâ€.

## 3.4. Messages types Ã  harmoniser

### DonnÃ©es insuffisantes

Utiliser des messages cohÃ©rents :

```text
DonnÃ©es insuffisantes pour interprÃ©ter cet indicateur.
```

```text
Lâ€™historique est encore trop court pour fiabiliser cette tendance.
```

```text
Cette sÃ©ance ne contient pas assez de donnÃ©es cardio exploitables.
```

### Garmin absent

```text
Aucune donnÃ©e Garmin exploitable pour cette sÃ©ance.
```

### Garmin partiel

```text
DonnÃ©es Garmin partielles : lâ€™interprÃ©tation reste indicative.
```

### Score maison

```text
Score RunNSee calculÃ© Ã  partir de tes donnÃ©es disponibles.
```

## Tests

- test `glossary.test.js` ;
- test de prÃ©sence des clÃ©s principales ;
- test dâ€™absence de termes interdits ou obsolÃ¨tes si dÃ©jÃ  remplacÃ©s :
  - HRV visible ;
  - Body Battery visible hors contexte Garmin brut ;
  - Training Readiness comme score RunNSee ;
  - â€œdiagnosticâ€.

## Commit

```bash
git add frontend/src .ai/
git commit -m "feat(ux): harmonize glossary and coaching copy"
git push
```

---

# LOT 4 â€” Fiabilisation frontend data flow et Ã©tats dâ€™interface

## Objectif

RÃ©duire les pages blanches, les incohÃ©rences dâ€™affichage, les erreurs silencieuses et les mauvais Ã©tats en cas de donnÃ©es partielles.

## PÃ©rimÃ¨tre

```text
frontend/src/pages/DashboardPage.jsx
frontend/src/pages/ActivityDetailPage.jsx
frontend/src/pages/ActivitiesPage.jsx
frontend/src/pages/AnalyticsPage.jsx
frontend/src/pages/PerformancePage.jsx
frontend/src/pages/AdminPage.jsx
frontend/src/hooks/
frontend/src/services/
frontend/src/components/
```

## 4.1. Activity Detail

### Ã€ vÃ©rifier

- Lâ€™activitÃ© sâ€™affiche si Garmin est absent.
- Lâ€™activitÃ© sâ€™affiche si enrichissement Garmin partiel.
- `GarminEnrichmentPanel` ne plante pas si `activityEnrichment` est `null`.
- `ActivityIntensityCard` ne plante pas si :
  - pas de FC ;
  - pas de splits ;
  - pas de dÃ©nivelÃ© ;
  - pas de moving time.
- Les anciennes mÃ©triques Strava restent visibles.

### Attendu

- Ã‰tat loading clair.
- Ã‰tat erreur clair.
- Ã‰tat vide clair.
- Aucun composant ne doit supposer que Garmin est prÃ©sent.

---

## 4.2. Dashboard

### Ã€ vÃ©rifier

- `TodayReadinessCard` gÃ¨re :
  - Garmin absent ;
  - Garmin partiel ;
  - pas dâ€™activitÃ© rÃ©cente ;
  - historique court ;
  - valeurs nulles.
- `DashboardDecisionSummaryCard` ne donne pas de verdict trop prescriptif.
- MicroBars ne cassent pas avec tableau vide.
- Les KPI hebdomadaires restent prÃ©sents :
  - distance ;
  - durÃ©e ;
  - dÃ©nivelÃ© ;
  - nombre de sÃ©ances ;
  - charge.

### Attendu

- Lâ€™affichage doit rester stable mÃªme avec peu de donnÃ©es.
- Les composants doivent distinguer â€œ0 rÃ©elâ€ et â€œdonnÃ©e absenteâ€.

---

## 4.3. Admin / RÃ©glages

### Ã€ vÃ©rifier

- Les 5 onglets restent accessibles.
- Le hash URL fonctionne.
- Les connexions Strava/Garmin affichent un statut cohÃ©rent.
- Les erreurs provider sont lisibles.
- Les actions de sync affichent :
  - en cours ;
  - terminÃ© ;
  - erreur ;
  - aucun job.

### Attendu

- Pas de page KO Ã  lâ€™ouverture.
- Pas de statut bloquÃ© en erreur aprÃ¨s reconnexion rÃ©ussie.

---

## 4.4. Analytics / Performance

### Ã€ vÃ©rifier

- Comparaison de pÃ©riodes conservÃ©e.
- Les filtres ne provoquent pas de perte de donnÃ©es inattendue.
- Les agrÃ©gations hebdo respectent le premier jour de semaine paramÃ©trÃ©.
- Les graphiques ne cassent pas sur pÃ©riode vide.
- Les indicateurs non calculables affichent une explication.

### Attendu

- Les pages restent utiles mÃªme si certaines mÃ©triques sont absentes.
- Aucune moyenne ne doit inclure des `0` artificiels.

---

## 4.5. Dates, timezone et unitÃ©s

### Ã€ vÃ©rifier partout

- Date activitÃ© Strava.
- Date Garmin.
- Date locale utilisateur.
- Date UTC base.
- DÃ©but de semaine paramÃ©trÃ©.
- Comparaisons par pÃ©riode.
- AgrÃ©gation mensuelle / annuelle.

### Attendu

- Ne pas mÃ©langer date locale et UTC sans conversion explicite.
- Les snapshots quotidiens Garmin doivent Ãªtre cohÃ©rents avec la date locale sportive.
- Les activitÃ©s proches de minuit doivent Ãªtre testÃ©es.

## Tests

Ajouter des tests utilitaires si possible :

```text
dateRange.test.js
activityAggregation.test.js
activityEnrichment.test.js
recoveryViewModel.test.js
```

Cas obligatoires :

- activitÃ© Ã  23h50 ;
- activitÃ© Ã  00h10 ;
- changement de mois ;
- changement dâ€™annÃ©e ;
- dÃ©but de semaine lundi ;
- pÃ©riode vide ;
- pÃ©riode avec une seule activitÃ©.

## Commit

```bash
git add frontend/src .ai/
git commit -m "fix(frontend): harden data states and activity views"
git push
```

---

# LOT 5 â€” Fiabilisation backend API, providers et erreurs

## Objectif

Sâ€™assurer que le backend expose des routes cohÃ©rentes, idempotentes, robustes et observables.

## PÃ©rimÃ¨tre

```text
backend/src/app.js
backend/src/routes/
backend/src/controllers/
backend/src/services/
backend/src/middleware/
backend/src/repositories/
backend/prisma/schema.prisma
backend/prisma-postgresql/schema.prisma
```

## 5.1. Routes rÃ©ellement montÃ©es

### Ã€ vÃ©rifier

Comparer :

```text
backend/src/routes/*.routes.js
```

avec :

```text
backend/src/app.js
```

Toute route existante mais non montÃ©e doit Ãªtre :

- soit montÃ©e ;
- soit supprimÃ©e ;
- soit documentÃ©e comme inactive.

Point particulier Ã  vÃ©rifier :

```text
assistant.routes.js
```

Si le frontend utilise lâ€™assistant, la route doit Ãªtre montÃ©e.
Si lâ€™assistant nâ€™est pas actif, le documenter dans `.ai/codebase_map.md`.

---

## 5.2. Format standard dâ€™erreur API

### Ã€ vÃ©rifier

Toutes les erreurs API doivent retourner une structure stable :

```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Message lisible",
    "details": {}
  }
}
```

### Attendu

- Pas de stacktrace cÃ´tÃ© client.
- Pas dâ€™erreur brute Prisma.
- Pas de secret dans les logs.
- Pas de message Garmin sensible.

---

## 5.3. Garmin provider

### Ã€ vÃ©rifier

- Connexion.
- DÃ©connexion.
- Reconnexion.
- Statut.
- Recovery snapshots.
- Activity enrichment.
- Erreurs bridge Python.
- Timeout.
- JSON invalide.
- Credentials expirÃ©s.
- 2FA / MFA si cas possible.

### Attendu

- Un Ã©chec dâ€™enrichissement activitÃ© ne casse pas recovery.
- Un Ã©chec recovery ne casse pas le statut provider.
- Les statuts sont remis correctement.
- Les erreurs sont traÃ§ables mais non exposÃ©es brutalement.

---

## 5.4. Sync jobs

### Ã€ vÃ©rifier

- `/sync/jobs/current` retourne toujours 200 avec `{ job: null }` si aucun job.
- Auto-purge jobs orphelins.
- Pas de double sync simultanÃ©e non contrÃ´lÃ©e.
- Statut cohÃ©rent :
  - pending ;
  - running ;
  - success ;
  - error ;
  - cancelled si prÃ©vu.

### Attendu

- Lâ€™UI admin ne doit jamais planter Ã  cause dâ€™un job absent.

---

## 5.5. Prisma et transactions

### Ã€ vÃ©rifier

- Upsert provider raw data.
- Upsert snapshots.
- Upsert enrichment activitÃ©.
- ClÃ©s uniques.
- Index.
- FKs.
- CompatibilitÃ© SQLite/PostgreSQL.

### Attendu

- Les enrichissements Garmin doivent Ãªtre idempotents.
- Une relance sur mÃªme pÃ©riode ne doit pas dupliquer.
- Une erreur partielle ne doit pas laisser un Ã©tat incohÃ©rent.

---

## 5.6. Healthcheck

Ajouter ou vÃ©rifier un endpoint :

```text
GET /health
```

Il doit indiquer :

- backend alive ;
- database reachable ;
- version app si disponible ;
- environnement ;
- timestamp.

Ne pas exposer de secret.

## Tests

Ajouter si possible tests backend minimalistes :

```text
backend/src/**/*.test.js
```

Sinon crÃ©er scripts de smoke test :

```text
backend/scripts/smoke/
```

Cas Ã  couvrir :

- healthcheck ;
- auth/me non connectÃ© ;
- sync current ;
- providers status ;
- activity detail ;
- endpoint Garmin enrich avec Garmin absent ;
- endpoint Garmin enrich avec provider non connectÃ©.

## Commit

```bash
git add backend/src backend/prisma backend/prisma-postgresql .ai/
git commit -m "fix(backend): harden api providers and error handling"
git push
```

---

# LOT 6 â€” Fiabilisation donnÃ©es et cohÃ©rence SQLite/PostgreSQL

## Objectif

Sâ€™assurer que les donnÃ©es restent cohÃ©rentes entre environnement local SQLite et cible PostgreSQL.

## PÃ©rimÃ¨tre

```text
backend/prisma/schema.prisma
backend/prisma-postgresql/schema.prisma
backend/scripts/db/
deployment/postgresql/
```

## 6.1. Comparaison schÃ©mas

### Ã€ vÃ©rifier

- mÃªmes modÃ¨les fonctionnels ;
- mÃªmes relations ;
- mÃªmes contraintes uniques ;
- mÃªmes index ;
- types date cohÃ©rents ;
- types JSON cohÃ©rents ;
- types decimal/float cohÃ©rents ;
- cascades explicites si nÃ©cessaires.

### Attendu

CrÃ©er ou amÃ©liorer un script de comparaison qui signale :

- modÃ¨le manquant ;
- champ manquant ;
- type divergent ;
- index manquant ;
- unique manquant.

---

## 6.2. Import SQLite â†’ PostgreSQL

### Ã€ vÃ©rifier

Toutes les tables fonctionnelles doivent Ãªtre couvertes :

```text
AppUser
UserSession
UserStravaApp
StravaConnection
Athlete
Activity
ExternalProviderConnection
ExternalProviderRawData
ExternalDailyRecoverySnapshot
ActivityProviderEnrichment
UserTrainingAnalyticsSettings
UserRaceObjective
UserAiAssistantConfig
SyncJob
SyncCursor
```

DÃ©cider explicitement si `UserSession` doit Ãªtre migrÃ©e ou non.
Si non migrÃ©e, documenter que les utilisateurs devront se reconnecter.

### Attendu

- Import idempotent ou au minimum re-jouable aprÃ¨s nettoyage.
- Logs de volumes.
- Comparaison avant/aprÃ¨s.
- ContrÃ´le des counts.
- ContrÃ´le des clÃ©s Ã©trangÃ¨res.

---

## 6.3. DonnÃ©es sensibles

### Ã€ vÃ©rifier

- Ne jamais commiter `.env`.
- Ne jamais commiter `.db`.
- Ne jamais commiter tokens.
- Ne jamais commiter logs contenant tokens.
- `.gitignore` complet.
- `.env.example` Ã  jour.

### Attendu

Ajouter une vÃ©rification simple avant commit si possible :

```bash
git status
git diff --cached --name-only
```

Bloquer mentalement tout commit contenant :

```text
.env
.env.local
*.db
*.sqlite
*.log
node_modules
dist
```

## Commit

```bash
git add backend/scripts deployment/postgresql .gitignore .env.example .ai/
git commit -m "chore(data): strengthen sqlite postgres consistency checks"
git push
```

---

# LOT 7 â€” Fiabilisation interface et cohÃ©rence visuelle

## Objectif

Rendre lâ€™interface plus robuste et homogÃ¨ne sans changement de design majeur.

## PÃ©rimÃ¨tre

```text
frontend/src/styles/
frontend/src/components/ui/
frontend/src/components/dashboard/
frontend/src/components/activity/
frontend/src/components/analytics/
frontend/src/components/performance/
frontend/src/layouts/
```

## 7.1. Tones

### Ã€ vÃ©rifier

Les 5 tons doivent Ãªtre utilisÃ©s de faÃ§on cohÃ©rente :

```text
trÃ¨s bon
bon
neutre
vigilance
alerte
```

### Attendu

- MÃªme couleur pour mÃªme niveau de risque.
- Pas de rouge pour simple absence de donnÃ©e.
- Pas de vert pour donnÃ©e indisponible.
- `neutre` pour information non interprÃ©table.
- `vigilance` pour signal Ã  surveiller.
- `alerte` uniquement si signal fort ou incohÃ©rence.

---

## 7.2. Gauges, RangeBars, MicroBars

### Ã€ vÃ©rifier

- CohÃ©rence des bornes.
- Gestion `null`.
- Gestion tableau vide.
- AccessibilitÃ©.
- LisibilitÃ© mobile.
- Labels visibles.
- Pas de surcharge.

### Attendu

- Un composant visuel ne doit jamais masquer la valeur source.
- Si la valeur est absente, afficher explicitement lâ€™absence.

---

## 7.3. Mobile-first

### Ã€ vÃ©rifier

- Dashboard mobile.
- Activity Detail mobile.
- Admin tabs mobile.
- Glossaire mobile.
- Graphiques en largeur rÃ©duite.
- Tooltips accessibles tactile.

### Attendu

- Aucun dÃ©bordement horizontal non voulu.
- Les tabs restent scrollables.
- Les cartes restent lisibles.

---

## 7.4. AccessibilitÃ© minimale

### Ã€ vÃ©rifier

- `aria-label` pour boutons icÃ´nes.
- `aria-controls` tabs.
- `aria-selected`.
- Focus visible.
- Contrastes suffisants.
- Textes alternatifs si nÃ©cessaire.

## Commit

```bash
git add frontend/src .ai/
git commit -m "fix(ui): improve visual consistency and resilient states"
git push
```

---

# LOT 8 â€” Recette complÃ¨te de non-rÃ©gression

## Objectif

Valider que la fiabilisation nâ€™a pas cassÃ© les fonctions principales.

## 8.1. Recette backend

Ã€ tester manuellement ou par script :

```text
GET /health
POST /auth/login
GET /auth/me
POST /auth/logout
GET /activities
GET /activities/:id
GET /sync/jobs/current
POST /sync/...
GET /providers/garmin/status
GET /providers/garmin/recovery/snapshots
POST /providers/garmin/activities/enrich
GET /settings/training-analytics
GET /settings/race-objectives
```

Adapter les routes exactes Ã  lâ€™existant.

## 8.2. Recette frontend

Pages Ã  ouvrir :

```text
/login
/dashboard
/activities
/activities/:id
/analytics
/performance
/admin#compte
/admin#connexions
/admin#entrainement
/admin#donnees
/admin#a-propos
/glossaire
/visuals-preview
```

## 8.3. ScÃ©narios mÃ©tier

### ScÃ©nario 1 â€” Utilisateur Strava seul

- pas de Garmin connectÃ© ;
- dashboard fonctionne ;
- activitÃ© fonctionne ;
- pas dâ€™erreur Garmin bloquante.

### ScÃ©nario 2 â€” Garmin connectÃ© avec recovery

- VFC visible ;
- Ã‰nergie visible ;
- FC repos visible ;
- sommeil visible si disponible ;
- score Aptitude RunNSee cohÃ©rent.

### ScÃ©nario 3 â€” Garmin connectÃ© avec enrichissement activitÃ©

- activitÃ© Strava matchÃ©e ;
- mÃ©triques Garmin visibles ;
- match confidence ou statut traÃ§able ;
- activitÃ© non matchÃ©e gÃ©rÃ©e proprement.

### ScÃ©nario 4 â€” DonnÃ©es partielles

- Garmin partiel ;
- activitÃ© sans FC ;
- activitÃ© sans splits ;
- pÃ©riode vide ;
- historique court.

### ScÃ©nario 5 â€” PostgreSQL dev

- stack PG dÃ©marre ;
- migration OK ;
- import OK ;
- backend dÃ©marre sur PG ;
- frontend fonctionne sur PG.

---

# LOT 9 â€” Documentation finale `.ai` et commit de clÃ´ture

## Objectif

Laisser le repository dans un Ã©tat comprÃ©hensible pour la prochaine session CODEX / Claude.

## Mise Ã  jour obligatoire

### `.ai/current_context.md`

Inclure :

- date ;
- commit final ;
- Ã©tat frontend ;
- Ã©tat backend ;
- Ã©tat Garmin ;
- Ã©tat PostgreSQL ;
- limites connues ;
- tests exÃ©cutÃ©s.

### `.ai/open_tasks.md`

Inclure :

- cases terminÃ©es ;
- tÃ¢ches restantes ;
- bugs connus ;
- backlog ;
- validations utilisateur.

### `.ai/regression_risks.md`

Inclure :

- risques rÃ©siduels ;
- criticitÃ© ;
- garde-fous ;
- fichiers sensibles.

### `.ai/codebase_map.md`

Inclure :

- routes rÃ©ellement montÃ©es ;
- services actifs ;
- composants critiques ;
- scripts utiles ;
- commandes de test.

## Commit final

```bash
git add .ai/
git commit -m "docs(ai): close frontend backend science ux hardening plan"
git push
```

---

# 10. DÃ©finition de terminÃ©

Le chantier est terminÃ© uniquement si :

- `npm ci` backend OK ;
- `npm ci` frontend OK ;
- migrations OK ;
- frontend tests OK ;
- frontend build OK ;
- backend dÃ©marre ;
- frontend dÃ©marre ;
- dashboard OK ;
- activity detail OK ;
- admin OK ;
- Garmin absent OK ;
- Garmin connectÃ© OK si compte disponible ;
- PostgreSQL dev OK si environnement disponible ;
- `.ai/*.md` Ã  jour ;
- commits poussÃ©s sur GitHub ;
- CI/CD dÃ©clenchÃ©e ;
- rÃ©sultat CI/CD documentÃ©.

---

# 11. Points Ã  ne pas faire

Ne pas faire :

- refonte graphique complÃ¨te ;
- changement de stack ;
- passage TypeScript ;
- remplacement Prisma ;
- remplacement React Router ;
- remplacement Recharts ;
- remplacement Leaflet ;
- refonte du modÃ¨le Garmin ;
- ajout dâ€™un nouveau score sans justification ;
- suppression dâ€™indicateurs existants ;
- simplification scientifique abusive ;
- affichage mÃ©dicalisant ;
- commit de secrets ;
- commit de base locale ;
- commit de `node_modules`.

---

# 12. Prompt synthÃ©tique Ã  donner Ã  CODEX / Claude Code Pro

```text
Tu travailles sur RunNSee. Les corrections prioritaires prÃ©cÃ©dentes sont supposÃ©es rÃ©alisÃ©es :
1. packaging/secrets/SQLite/dÃ©marrage propre ;
2. migration SQLite â†’ PostgreSQL corrigÃ©e ;
3. Phase K Garmin activitÃ© cÃ¢blÃ©e ;
4. activityEnrichment durci.

Ta mission nâ€™est pas de refondre lâ€™application mais de fiabiliser lâ€™existant frontend/backend/science/UX.

Applique strictement le plan contenu dans ce document :
- audit contrÃ´lÃ© ;
- fiabilisation scientifique ;
- harmonisation glossaire/tooltips ;
- robustesse frontend ;
- robustesse backend ;
- cohÃ©rence SQLite/PostgreSQL ;
- cohÃ©rence visuelle ;
- recette complÃ¨te ;
- mise Ã  jour `.ai/*.md` ;
- commits Git par lot ;
- push GitHub pour dÃ©clencher la CI/CD.

Ã€ chaque modification :
- prÃ©serve la logique mÃ©tier existante sauf bug dÃ©montrÃ© ;
- distingue correction, fiabilisation et changement fonctionnel ;
- ajoute les tests nÃ©cessaires ;
- vÃ©rifie les risques de rÃ©gression ;
- ne commit jamais `.env`, `.db`, logs, `node_modules`, `dist` ;
- documente les limites restantes.

Ne produis pas une refonte large. Fiabilise.
```

---

# 13. Ordre recommandÃ© des commits

```text
1. docs(ai): refresh post-correction audit baseline
2. feat(science): harden training metrics interpretation
3. feat(ux): harmonize glossary and coaching copy
4. fix(frontend): harden data states and activity views
5. fix(backend): harden api providers and error handling
6. chore(data): strengthen sqlite postgres consistency checks
7. fix(ui): improve visual consistency and resilient states
8. docs(ai): close frontend backend science ux hardening plan
```

---

# 14. Remarques finales

Le fil directeur est la fiabilitÃ©.

RunNSee doit rester :

- comprÃ©hensible ;
- prudent scientifiquement ;
- robuste avec donnÃ©es partielles ;
- utile en usage rÃ©el ;
- stable localement ;
- prÃªt pour PostgreSQL ;
- cohÃ©rent avec Garmin sans devenir dÃ©pendant de Garmin ;
- maintenable par itÃ©rations.

La bonne stratÃ©gie nâ€™est pas dâ€™ajouter plus dâ€™indicateurs, mais de rendre les indicateurs existants plus fiables, mieux expliquÃ©s et moins susceptibles dâ€™induire lâ€™utilisateur en erreur.
