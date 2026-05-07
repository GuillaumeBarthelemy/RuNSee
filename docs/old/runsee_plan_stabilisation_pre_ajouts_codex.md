# RunNSee â€” Plan de stabilisation avant nouveaux ajouts

## 0. Objectif du mandat

Ce plan doit Ãªtre exÃ©cutÃ© par CODEX / Claude Code Pro sur le dÃ©pÃ´t RunNSee.

L'objectif n'est pas d'ajouter de nouvelles fonctionnalitÃ©s.

L'objectif est de **fiabiliser l'application avant toute nouvelle Ã©volution**, en corrigeant les anomalies rÃ©siduelles dÃ©tectÃ©es aprÃ¨s les deux plans prÃ©cÃ©dents :

1. sÃ©curisation packaging / secrets / SQLite / dÃ©marrage propre ;
2. migration SQLite â†’ PostgreSQL complÃ¨te et contrÃ´lable ;
3. finalisation Phase K Garmin activitÃ© de bout en bout ;
4. fiabilisation frontend / backend / science / UX.

Le prÃ©sent plan part donc de l'hypothÃ¨se suivante :

> Les corrections prioritaires des deux plans prÃ©cÃ©dents ont Ã©tÃ© rÃ©alisÃ©es.
> La Phase K Garmin est dÃ©sormais cÃ¢blÃ©e frontend + backend.
> Les schÃ©mas SQLite/PostgreSQL sont censÃ©s Ãªtre alignÃ©s.
> L'application doit maintenant Ãªtre stabilisÃ©e avant d'ajouter de nouvelles fonctionnalitÃ©s.

---

## 1. RÃ¨gles impÃ©ratives pour l'agent de dÃ©veloppement

### 1.1 Ne pas transformer ce chantier en refonte

Ne pas refaire l'UX, ne pas ajouter de nouvelles pages, ne pas rÃ©Ã©crire massivement les services.

Le pÃ©rimÃ¨tre attendu est :

- correction ;
- fiabilisation ;
- clarification scientifique ;
- durcissement des validations ;
- amÃ©lioration de la maintenabilitÃ© ;
- ajout de tests ciblÃ©s.

Tout changement fonctionnel non explicitement demandÃ© doit Ãªtre Ã©vitÃ©.

### 1.2 PrÃ©server la logique mÃ©tier existante

Avant toute modification :

- identifier la logique actuelle ;
- comprendre le flux de donnÃ©es ;
- vÃ©rifier les impacts frontend, backend et base ;
- Ã©viter toute rÃ©gression sur Strava, Garmin recovery, Garmin activitÃ©, dashboard et dÃ©tail activitÃ©.

### 1.3 SÃ©parer clairement les types de modifications

Pour chaque changement, classer le type :

- **Correction** : bug avÃ©rÃ© ou incohÃ©rence.
- **Fiabilisation** : garde-fou, test, validation, logs, import, packaging.
- **Clarification scientifique / UX** : libellÃ©, tooltip, vocabulaire, Ã©tat vide.
- **Changement fonctionnel** : Ã  Ã©viter sauf si indispensable et documentÃ©.

### 1.4 Mettre Ã  jour les fichiers `.ai/*.md`

AprÃ¨s chaque lot significatif, mettre Ã  jour les fichiers de suivi projet :

- `.ai/current_context.md`
- `.ai/open_tasks.md`
- `.ai/regression_risks.md`
- `.ai/codebase_map.md`

Les mises Ã  jour doivent reflÃ©ter uniquement l'Ã©tat rÃ©el du code.

Ne pas marquer une tÃ¢che comme terminÃ©e si elle n'est pas testÃ©e.

### 1.5 Commits Git obligatoires

Faire des commits atomiques par lot.

Exemples de commits attendus :

```text
chore(repo): normalize line endings and source archive rules
fix(deployment): make green validation auth-aware
fix(garmin): preserve activity recovery time fields
fix(garmin): decouple activity enrichment from recovery sync timestamp
fix(science): clarify garmin activity metric semantics
fix(frontend): improve garmin activity empty and ambiguous states
fix(db): harden sqlite to postgres import preflight
test(garmin): add backend activity enrichment matching tests
docs(ai): update project handoff and regression risks
```

Ã€ la fin du chantier :

```bash
git status --short
git log --oneline -n 10
git push
```

Le push GitHub doit dÃ©clencher la chaÃ®ne CI/CD.

---

## 2. Ã‰tat attendu avant dÃ©marrage

Avant de modifier le code, rÃ©aliser un Ã©tat des lieux.

### 2.1 Commandes de contrÃ´le initiales

Ã€ exÃ©cuter et documenter dans le retour final :

```bash
git status --short
git diff --stat
git diff --check
```

Backend :

```bash
cd backend
npm ci
npm run prisma:generate
npx prisma validate
npm run prisma:pg:validate
npm run db:compare-schemas
node --check src/app.js
node --check src/server.js
```

Frontend :

```bash
cd frontend
npm ci
npm test -- --run
npm run build
```

Si certaines commandes ne fonctionnent pas, ne pas masquer l'erreur.
Documenter l'erreur, analyser la cause, puis corriger si c'est dans le pÃ©rimÃ¨tre de stabilisation.

---

# LOT 0 â€” Stabiliser Git, fins de ligne et packaging

## Objectif

Rendre les diffs lisibles, Ã©viter les faux changements liÃ©s aux fins de ligne, et empÃªcher toute fuite de secrets ou artefacts runtime dans les archives.

## Constat Ã  vÃ©rifier

Des fichiers peuvent apparaÃ®tre modifiÃ©s uniquement Ã  cause des fins de ligne CRLF/LF.

Les archives projet ne doivent jamais contenir :

```text
node_modules/
dist/
generated/
runtime/
.tmp/
*.log
*.pid
*.db
.env
.env.*.local
*.zip
```

## Travaux attendus

### 0.1 Ajouter ou corriger `.gitattributes`

CrÃ©er ou complÃ©ter le fichier racine `.gitattributes`.

RÃ¨gle recommandÃ©e :

```gitattributes
* text=auto eol=lf

*.ps1 text eol=crlf
*.cmd text eol=crlf
*.bat text eol=crlf
*.vbs text eol=crlf
```

Objectif :

- LF par dÃ©faut pour le code ;
- CRLF conservÃ© pour les scripts Windows.

### 0.2 Normaliser les fins de ligne

ExÃ©cuter :

```bash
git add --renormalize .
git status --short
git diff --stat
git diff --check
```

VÃ©rifier que les diffs restants correspondent Ã  de vrais changements.

### 0.3 VÃ©rifier `.gitignore`

VÃ©rifier que les fichiers suivants sont bien exclus :

```text
.env
.env.*
!.env.example
*.local
*.log
*.pid
*.db
node_modules/
dist/
generated/
runtime/
.tmp/
*.zip
```

Attention : les fichiers `.env.example` doivent rester versionnÃ©s.

### 0.4 CrÃ©er un script d'export propre

CrÃ©er un script, par exemple :

```text
deployment/scripts/Export-RunSeeSourceArchive.ps1
```

ou Ã©quivalent selon les conventions existantes.

Le script doit produire une archive source propre, sans :

```text
node_modules/
dist/
generated/
runtime/
.tmp/
*.log
*.pid
*.db
.env
.env.*.local
*.zip
```

MÃ©thode recommandÃ©e si dÃ©pÃ´t Git propre :

```bash
git archive --format=zip --output runsee-source.zip HEAD
```

Si PowerShell est utilisÃ©, le script doit explicitement exclure les artefacts sensibles.

## CritÃ¨res d'acceptation

- `git diff --check` ne retourne aucune erreur.
- Les diffs ne sont plus polluÃ©s par des changements de fins de ligne.
- Aucune archive source propre ne contient de secret, DB locale, logs, `node_modules` ou `dist`.
- Commit dÃ©diÃ© :

```text
chore(repo): normalize line endings and source archive rules
```

---

# LOT 1 â€” Corriger la validation GREEN / CI locale

## Objectif

Rendre la validation GREEN fiable et compatible avec les routes protÃ©gÃ©es par authentification.

## ProblÃ¨me Ã  corriger

Le script de validation GREEN peut appeler des routes protÃ©gÃ©es telles que :

```text
/athlete/me
/sync/summary
```

sans fournir de cookie ou token de session.

Cela provoque des erreurs `401 Unauthorized`, ou pousse Ã  contourner l'authentification, ce qui est interdit.

## Travaux attendus

### 1.1 SÃ©parer les checks publics et authentifiÃ©s

Le script doit toujours pouvoir valider les checks publics :

```text
/health
/db/health
frontend disponible
assets statiques disponibles
```

Les routes protÃ©gÃ©es ne doivent Ãªtre testÃ©es que si une session est explicitement fournie.

### 1.2 Ajouter un paramÃ¨tre optionnel de session

Exemple PowerShell :

```powershell
-SessionCookie "runsee_session=..."
```

ou :

```powershell
-CookieHeader "runsee_session=..."
```

Le script doit transmettre ce cookie uniquement aux routes authentifiÃ©es.

### 1.3 Ne jamais dÃ©sactiver l'authentification

Ne pas modifier `requireAuth` pour faire passer les tests.

Ne pas exposer publiquement des routes mÃ©tier protÃ©gÃ©es.

### 1.4 Sortie claire

Le script doit afficher une sortie claire :

```json
{
  "publicChecks": "OK",
  "authenticatedChecks": "SKIPPED",
  "database": "postgresql",
  "frontendMode": "preview"
}
```

ou :

```json
{
  "publicChecks": "OK",
  "authenticatedChecks": "OK",
  "database": "postgresql",
  "frontendMode": "preview"
}
```

## CritÃ¨res d'acceptation

- Validation GREEN possible sans utilisateur connectÃ©.
- Validation GREEN complÃ¨te possible avec cookie de session.
- Les routes protÃ©gÃ©es restent protÃ©gÃ©es.
- Commit dÃ©diÃ© :

```text
fix(deployment): make green validation auth-aware
```

---

# LOT 2 â€” Corriger le bridge Garmin activitÃ©

## Objectif

Aligner le bridge Python Garmin, le backend Node et le frontend pour que les mÃ©triques attendues soient rÃ©ellement disponibles.

## ProblÃ¨me Ã  corriger

Le code frontend/backend prÃ©voit des mÃ©triques telles que `recoveryTime`, mais le bridge Python peut ne pas conserver toutes les clÃ©s candidates dans `kept_keys`.

RÃ©sultat : le frontend est prÃªt Ã  afficher une donnÃ©e qui n'arrive jamais.

## Travaux attendus

### 2.1 Inspecter le bridge Python

Fichier attendu :

```text
backend/scripts/providers/garminconnect_bridge.py
```

VÃ©rifier l'opÃ©ration :

```text
fetch_activities
```

VÃ©rifier les clÃ©s conservÃ©es dans `kept_keys`.

### 2.2 Ajouter les clÃ©s candidates de temps de rÃ©cupÃ©ration

Ajouter les clÃ©s candidates connues ou plausibles :

```text
recoveryTime
recoveryTimeInHours
recoveryTimeMinutes
recoveryTimeSeconds
```

Ne pas supposer l'unitÃ© sans preuve.

### 2.3 Normaliser cÃ´tÃ© backend

Dans le backend Node, normaliser proprement le temps de rÃ©cupÃ©ration selon l'unitÃ© disponible.

RÃ¨gle :

- si l'unitÃ© est confirmÃ©e : l'utiliser ;
- si plusieurs champs existent : dÃ©finir une prioritÃ© explicite ;
- si l'unitÃ© est inconnue : conserver brut mais ne pas afficher comme certitude physiologique.

### 2.4 Ajouter un diagnostic non sensible

La rÃ©ponse du bridge ou du service backend peut inclure un diagnostic agrÃ©gÃ© non sensible, par exemple :

```json
{
  "fieldCoverage": {
    "recoveryTime": 12,
    "performanceCondition": 8,
    "epoc": 10
  }
}
```

Ne jamais logger :

- identifiants Garmin ;
- session Garmin ;
- token ;
- cookies ;
- payload complet si donnÃ©es personnelles.

### 2.5 Corriger les commentaires obsolÃ¨tes

VÃ©rifier les commentaires qui mentionnent des fichiers inexistants, par exemple :

```text
activityEnrichment.types.js
```

S'ils sont obsolÃ¨tes, les corriger ou les supprimer.

## CritÃ¨res d'acceptation

- `recoveryTime` remonte si prÃ©sent dans les donnÃ©es Garmin.
- Le bridge ne loggue aucune donnÃ©e sensible.
- Les erreurs bridge restent propres : timeout, JSON invalide, exit code non zÃ©ro.
- Pas de rÃ©gression sur `fetch_recovery_days`.
- Commit dÃ©diÃ© :

```text
fix(garmin): preserve activity recovery time fields
```

---

# LOT 3 â€” DÃ©coupler les timestamps de synchronisation Garmin

## Objectif

Ã‰viter qu'une synchronisation activitÃ© Garmin perturbe la synchronisation recovery Garmin.

## ProblÃ¨me Ã  corriger

Si `ExternalProviderConnection.lastSyncAt` est utilisÃ© Ã  la fois pour :

- Garmin recovery ;
- Garmin activity enrichment ;

alors une complÃ©tion d'activitÃ© peut faire croire au scheduler que la recovery sync vient d'Ãªtre faite.

Risque :

- rÃ©cupÃ©ration quotidienne Garmin non lancÃ©e ;
- sommeil / VFC / Body Battery non actualisÃ©s ;
- dashboard moins fiable.

## Travaux attendus

### 3.1 VÃ©rifier les usages de `lastSyncAt`

Rechercher tous les usages :

```bash
grep -R "lastSyncAt" backend/src backend/prisma backend/prisma-postgresql
```

Identifier :

- scheduler recovery ;
- service provider ;
- enrichment activitÃ© ;
- affichage statut provider.

### 3.2 Option minimale recommandÃ©e

Ne plus mettre Ã  jour `ExternalProviderConnection.lastSyncAt` dans le service d'enrichissement activitÃ© Garmin.

Documenter :

```text
lastSyncAt reste rÃ©servÃ© Ã  la synchronisation recovery tant que le modÃ¨le ne possÃ¨de pas de timestamps sÃ©parÃ©s.
```

### 3.3 Option plus lourde Ã  Ã©viter sauf besoin confirmÃ©

Ne pas ajouter immÃ©diatement de migration Prisma si ce n'est pas indispensable.

Une migration avec :

```text
lastRecoverySyncAt
lastActivityEnrichmentAt
```

serait plus propre, mais elle est plus risquÃ©e avant stabilisation complÃ¨te.

Ã€ ce stade, privilÃ©gier la correction minimale.

## CritÃ¨res d'acceptation

- Une complÃ©tion Garmin activitÃ© ne dÃ©cale pas la sync recovery.
- Le statut de connexion Garmin reste cohÃ©rent.
- Le dashboard recovery n'est pas affectÃ©.
- Commit dÃ©diÃ© :

```text
fix(garmin): decouple activity enrichment from recovery sync timestamp
```

---

# LOT 4 â€” Corriger la cohÃ©rence scientifique des mÃ©triques Garmin

## Objectif

Ã‰viter les affichages scientifiquement ambigus ou trop affirmatifs.

RunNSee doit distinguer clairement :

- donnÃ©es brutes Garmin ;
- estimations Garmin ;
- indicateurs maison RunNSee ;
- vulgarisation destinÃ©e Ã  l'utilisateur.

## 4.1 Training Effect Ã  0

### ProblÃ¨me

Si le commentaire indique :

```text
0.0 - 0.9 : Aucun effet
```

mais que le code considÃ¨re `0` comme absent, il y a incohÃ©rence.

### DÃ©cision attendue

Analyser les payloads rÃ©els disponibles.

Deux options :

#### Option A â€” `0` est une vraie valeur Garmin

Alors :

- afficher `0.0 / 5`;
- qualifier `Aucun effet`;
- adapter les tests.

#### Option B â€” `0` est un placeholder d'absence

Alors :

- ne pas afficher `0`;
- corriger le commentaire ;
- ajouter un test expliquant cette rÃ¨gle.

### Recommandation

Choisir l'option A sauf preuve contraire dans les payloads rÃ©els.

## 4.2 `recoveryHeartRate`

### ProblÃ¨me

Ne pas afficher automatiquement :

```text
-42 bpm
```

si le sens rÃ©el du champ Garmin n'est pas confirmÃ©.

Le champ peut Ãªtre :

- une baisse de FC ;
- une FC absolue aprÃ¨s rÃ©cupÃ©ration ;
- une mÃ©trique propriÃ©taire ;
- un champ absent ou variable.

### Correction attendue

Inspecter un payload rÃ©el.

Adapter le libellÃ© :

| Cas confirmÃ© | LibellÃ© |
|---|---|
| DiffÃ©rence de FC | `Baisse FC rÃ©cupÃ©ration` |
| FC absolue | `FC aprÃ¨s rÃ©cupÃ©ration` |
| Incertain | `RÃ©cupÃ©ration cardiaque Garmin` |

Tant que le sens n'est pas confirmÃ©, supprimer le prÃ©fixe `-`.

## 4.3 VO2max

Remplacer les libellÃ©s du type :

```text
VO2max sÃ©ance
```

par :

```text
VO2max estimÃ©e Garmin
```

ou :

```text
Estimation VO2max Garmin
```

Motif : Garmin fournit une estimation, pas une mesure directe de VO2max de sÃ©ance.

## 4.4 EPOC

Distinguer :

```text
EPOC Garmin brut
```

dans l'onglet Garmin.

Et :

```text
Dette d'oxygÃ¨ne
```

dans la lecture vulgarisÃ©e RunNSee.

Ne pas mÃ©langer les deux sans explication.

## 4.5 Aptitude Garmin vs Aptitude RunNSee

Ne pas confondre :

```text
Aptitude Garmin
```

avec :

```text
Aptitude RunNSee
```

L'Aptitude RunNSee est un score maison transparent.

L'Aptitude Garmin est une donnÃ©e propriÃ©taire informative.

## 4.6 Body Battery / Ã‰nergie

Ã‰viter les commentaires trop catÃ©goriques comme :

```text
bodyBatteryMax = vrai indicateur de l'Ã©nergie disponible
```

PrÃ©fÃ©rer :

```text
bodyBatteryMax est utilisÃ© comme proxy stable de l'Ã©nergie disponible sur la journÃ©e, car bodyBatteryMorning peut Ãªtre absent ou bruitÃ© selon l'heure d'Ã©chantillonnage.
```

## CritÃ¨res d'acceptation

- Aucun libellÃ© ne prÃ©sente une estimation comme une mesure directe.
- Garmin brut et score RunNSee sont clairement sÃ©parÃ©s.
- Les tests couvrent `0`, `null`, valeurs nÃ©gatives utiles et valeurs absentes.
- Commit dÃ©diÃ© :

```text
fix(science): clarify garmin activity metric semantics
```

---

# LOT 5 â€” Fiabiliser l'onglet Garmin du dÃ©tail activitÃ©

## Objectif

Rendre l'onglet Garmin comprÃ©hensible, mÃªme sans donnÃ©es ou en cas de matching impossible.

## ProblÃ¨me Ã  corriger

Une condition du type :

```js
garminSnapshot !== undefined
```

n'est pas une rÃ¨gle mÃ©tier suffisante.

Elle peut afficher l'onglet Garmin alors qu'il n'y a :

- ni snapshot ;
- ni enrichissement ;
- ni connexion Garmin ;
- ni action utile.

## Travaux attendus

### 5.1 DÃ©finir une rÃ¨gle d'affichage claire

Afficher l'onglet Garmin si au moins une condition est vraie :

- Garmin est connectÃ© ;
- un snapshot Garmin recovery existe ;
- un enrichissement activitÃ© Garmin existe ;
- une action de complÃ©tion Garmin est disponible.

Ne pas afficher l'onglet uniquement parce qu'une prop vaut `null` au lieu de `undefined`.

### 5.2 Ajouter des Ã©tats vides explicites

PrÃ©voir les Ã©tats :

```text
Garmin non connectÃ©
Garmin connectÃ© mais aucune donnÃ©e de rÃ©cupÃ©ration disponible
Garmin connectÃ© mais activitÃ© non enrichie
Aucune activitÃ© Garmin correspondante trouvÃ©e
Correspondance ambiguÃ« : enrichissement non appliquÃ©
Erreur Garmin temporaire
```

### 5.3 Afficher la confiance de matching avec prudence

Si le backend expose un statut :

```text
matched_exact
matched_tolerated
ambiguous
not_found
error
```

l'afficher simplement.

Exemples :

```text
Correspondance Garmin fiable
Correspondance Garmin probable
Correspondance ambiguÃ« â€” aucune donnÃ©e appliquÃ©e
Aucune sÃ©ance Garmin correspondante trouvÃ©e
```

Ne pas afficher des mÃ©triques issues d'un match ambigu.

### 5.4 Ne pas promettre une complÃ©tion garantie

Le bouton d'action ne doit pas laisser penser que l'enrichissement rÃ©ussira toujours.

LibellÃ© possible :

```text
Rechercher les mÃ©triques Garmin de cette sÃ©ance
```

plutÃ´t que :

```text
ComplÃ©ter cette sÃ©ance
```

## CritÃ¨res d'acceptation

- L'utilisateur comprend pourquoi il voit ou non des donnÃ©es Garmin.
- Un match ambigu n'affiche aucune mÃ©trique comme si elles Ã©taient fiables.
- Les erreurs Garmin sont visibles mais non anxiogÃ¨nes.
- Commit dÃ©diÃ© :

```text
fix(frontend): improve garmin activity empty and ambiguous states
```

---

# LOT 6 â€” Durcir l'import SQLite â†’ PostgreSQL

## Objectif

Ã‰viter les imports dangereux ou ambigus sur une base PostgreSQL non vide.

## ProblÃ¨me Ã  corriger

Une option du type :

```text
--allow-append
```

peut donner l'impression que l'import fonctionne comme un merge incrÃ©mental.

Si le script utilise des `INSERT` simples, ce n'est pas un vrai append idempotent.

## Travaux attendus

### 6.1 Ajouter un preflight des counts PostgreSQL

Avant import, calculer les counts des tables cibles cÃ´tÃ© PostgreSQL.

Produire un rapport :

```text
Table                         Dump     PostgreSQL before     Action
Activity                      890      0                     INSERT
ExternalProviderRawData       10       0                     INSERT
ExternalDailyRecoverySnapshot 12       0                     INSERT
```

### 6.2 Refuser les imports ambigus

RÃ¨gles recommandÃ©es :

- `--truncate` : autorisÃ©, refresh complet contrÃ´lÃ©.
- `--allow-append` : autorisÃ© uniquement si toutes les tables cibles sont vides.
- sans option : refuser si une table cible contient dÃ©jÃ  des donnÃ©es.

Message clair :

```text
Import refused: target PostgreSQL database is not empty. Use --truncate for a controlled refresh. Incremental merge is not supported.
```

### 6.3 Documenter la limite

Ajouter dans la documentation deployment PostgreSQL :

```text
L'import SQLite â†’ PostgreSQL est un import complet, pas une synchronisation incrÃ©mentale.
```

## CritÃ¨res d'acceptation

- Import impossible par accident sur base non vide.
- Dry-run clair.
- Transaction rollback conservÃ©e.
- Commit dÃ©diÃ© :

```text
fix(db): harden sqlite to postgres import preflight
```

---

# LOT 7 â€” Ajouter une couverture de tests backend ciblÃ©e

## Objectif

RÃ©duire les risques de rÃ©gression backend sans crÃ©er une usine Ã  gaz.

## PÃ©rimÃ¨tre minimal

Ajouter des tests backend sur les fonctions pures ou facilement isolables.

PrioritÃ© aux zones Garmin activitÃ© :

1. matching exact Garmin â†” Strava ;
2. matching tolÃ©rÃ© ;
3. refus match ambigu ;
4. refus distance trop diffÃ©rente ;
5. refus durÃ©e trop diffÃ©rente ;
6. conservation `performanceCondition < 0` ;
7. rÃ¨gle mÃ©tier `Training Effect = 0` ;
8. normalisation `recoveryTime`.

## Contraintes

- Pas besoin de vrai compte Garmin.
- Pas besoin de vraie DB pour les fonctions pures.
- Si une DB est nÃ©cessaire, utiliser une stratÃ©gie isolÃ©e et documentÃ©e.
- Ne pas rendre les tests dÃ©pendants de donnÃ©es personnelles.

## CritÃ¨res d'acceptation

- Tests backend exÃ©cutables localement.
- Les tests Ã©chouent en cas de rÃ©gression sur matching ou normalisation Garmin.
- Ajouter la commande au `package.json` si nÃ©cessaire.
- Commit dÃ©diÃ© :

```text
test(garmin): add backend activity enrichment matching tests
```

---

# LOT 8 â€” Revue de vulgarisation et cohÃ©rence UI

## Objectif

AmÃ©liorer la clartÃ© perÃ§ue sans refaire l'interface.

## Fichiers Ã  relire en prioritÃ©

```text
frontend/src/components/GarminEnrichmentPanel.jsx
frontend/src/components/ActivityIntensityCard.jsx
frontend/src/components/TodayReadinessCard.jsx
frontend/src/components/DashboardDecisionSummaryCard.jsx
frontend/src/pages/GlossairePage.jsx
frontend/src/utils/recoveryViewModel.js
frontend/src/utils/activityEnrichment.js
frontend/src/utils/epocLevel.js
frontend/src/utils/cardiacDecoupling.js
frontend/src/utils/gradeAdjustedPace.js
```

Adapter les chemins si les fichiers ont Ã©tÃ© dÃ©placÃ©s.

## Travaux attendus

### 8.1 Corriger les accents et libellÃ©s visibles

Harmoniser :

```text
sÃ©ance
aÃ©robie
anaÃ©robie
rÃ©cupÃ©ration
dÃ©rive cardiaque
dette d'oxygÃ¨ne
Aptitude RunNSee
Aptitude Garmin
VO2max estimÃ©e Garmin
EPOC Garmin brut
```

### 8.2 Ã‰viter les formulations trop prescriptives

RunNSee peut conseiller, mais doit rester prudent.

Distinguer :

- observation ;
- estimation ;
- conseil ;
- incertitude.

Exemple :

```text
Forme correcte, marge prÃ©sente
```

est prÃ©fÃ©rable Ã  :

```text
Tu peux envoyer fort aujourd'hui
```

sauf si les signaux sont trÃ¨s fiables.

### 8.3 CohÃ©rence des tooltips

Les tooltips mobiles doivent rester courts.

RÃ¨gle :

```text
tooltip compact <= 80 caractÃ¨res
```

Les explications longues doivent aller dans le glossaire.

### 8.4 Ã‰tats partiels

Pour chaque mÃ©trique scientifique, prÃ©voir un Ã©tat :

- donnÃ©e disponible ;
- donnÃ©e absente ;
- donnÃ©e insuffisante ;
- estimation fragile ;
- calcul non applicable.

## CritÃ¨res d'acceptation

- Les libellÃ©s visibles sont cohÃ©rents avec le glossaire.
- Les mÃ©triques propriÃ©taires Garmin ne sont pas prÃ©sentÃ©es comme des vÃ©ritÃ©s absolues.
- Les Ã©tats vides sont comprÃ©hensibles.
- Commit dÃ©diÃ© :

```text
fix(ui): harmonize scientific wording and empty states
```

---

# LOT 9 â€” Recette complÃ¨te de non-rÃ©gression

## Objectif

Valider que la stabilisation n'a rien cassÃ©.

## 9.1 Recette backend

ExÃ©cuter :

```bash
cd backend
npm ci
npm run prisma:generate
npx prisma validate
npm run prisma:pg:validate
npm run db:compare-schemas
npm test
node --check src/app.js
node --check src/server.js
```

Adapter `npm test` si le script n'existe pas encore.

VÃ©rifier manuellement ou via script :

```text
GET /health
GET /db/health
GET /auth/me avec session
GET /providers/garmin/status avec session
POST /providers/garmin/activities/enrich avec session
GET /activities/:id avec session
```

Ne pas exposer les routes protÃ©gÃ©es sans session.

## 9.2 Recette frontend

ExÃ©cuter :

```bash
cd frontend
npm ci
npm test -- --run
npm run build
```

VÃ©rifier visuellement :

```text
Login
Dashboard
Activities
Activity Detail sans Garmin
Activity Detail avec Garmin snapshot
Activity Detail avec enrichissement activitÃ© Garmin
Activity Detail avec match Garmin ambigu
Admin #connexions
Admin #donnees
Admin #entrainement
Glossaire
Visuals Preview si conservÃ©e
```

## 9.3 Recette PostgreSQL

ExÃ©cuter sur base de test :

```text
dry-run import
import avec --truncate
comparaison counts SQLite/PostgreSQL
validation green stack
```

VÃ©rifier que l'import est refusÃ© proprement sur base non vide sans option explicite.

## 9.4 Recette Git

Avant push :

```bash
git status --short
git diff --stat
git diff --check
```

VÃ©rifier :

- pas de `.env` ;
- pas de `.db` ;
- pas de `node_modules` ;
- pas de `dist` ;
- pas de logs ;
- pas de faux diffs CRLF/LF.

---

# LOT 10 â€” Mise Ã  jour `.ai/*.md`

## Objectif

Mettre Ã  jour la mÃ©moire projet utilisÃ©e par les agents IA.

## Fichiers Ã  mettre Ã  jour

```text
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
.ai/codebase_map.md
```

## Contenu attendu

### `.ai/current_context.md`

Ajouter :

- stabilisation post Phase K ;
- corrections Garmin bridge ;
- correction validation GREEN ;
- rÃ¨gle Git/packaging ;
- Ã©tat rÃ©el des tests.

### `.ai/open_tasks.md`

Marquer comme terminÃ© uniquement ce qui est rÃ©ellement validÃ©.

Ajouter les tÃ¢ches restantes si besoin :

- tests backend complÃ©mentaires ;
- vraie validation sur compte Garmin rÃ©el ;
- Ã©ventuelle migration future pour timestamps sÃ©parÃ©s Garmin.

### `.ai/regression_risks.md`

Mettre Ã  jour :

- risque bridge Garmin ;
- risque matching activitÃ© ;
- risque PostgreSQL import ;
- risque libellÃ©s scientifiques ;
- risque validation GREEN.

### `.ai/codebase_map.md`

Mettre Ã  jour si des fichiers ont Ã©tÃ© ajoutÃ©s ou dÃ©placÃ©s :

- service Garmin activitÃ© ;
- tests backend ;
- script export propre ;
- script validation GREEN ;
- rÃ¨gles Git.

## CritÃ¨res d'acceptation

- Les fichiers `.ai/*.md` reflÃ¨tent l'Ã©tat rÃ©el du dÃ©pÃ´t.
- Aucun fichier `.ai` ne dÃ©clare terminÃ© un lot non testÃ©.
- Commit dÃ©diÃ© possible :

```text
docs(ai): update stabilization handoff and regression risks
```

---

# LOT 11 â€” Commit final et push GitHub

## Objectif

Finaliser proprement le chantier et dÃ©clencher la CI/CD.

## Commandes finales

```bash
git status --short
git log --oneline -n 10
git push
```

Si le dÃ©pÃ´t utilise une branche dÃ©diÃ©e :

```bash
git checkout -b stabilization/pre-new-features
git push -u origin stabilization/pre-new-features
```

## Message de synthÃ¨se attendu

Dans le retour final, produire une synthÃ¨se :

```text
Lots rÃ©alisÃ©s :
- Lot 0 : OK / partiel / non rÃ©alisÃ©
- Lot 1 : OK / partiel / non rÃ©alisÃ©
...

Tests exÃ©cutÃ©s :
- backend : ...
- frontend : ...
- postgres : ...
- green stack : ...

Risques rÃ©siduels :
- ...
```

---

# 12. Points de vigilance absolus

## Ne pas masquer les erreurs

Si un test Ã©choue, ne pas le supprimer.

Analyser :

- erreur rÃ©elle ;
- test obsolÃ¨te ;
- dÃ©pendance environnementale ;
- rÃ©gression fonctionnelle.

## Ne pas Ã©largir le pÃ©rimÃ¨tre

Ne pas ajouter :

- nouveaux dashboards ;
- nouveaux algorithmes ;
- nouveaux connecteurs ;
- nouvelles mÃ©triques ;
- nouveau design system.

## Ne pas casser Strava

Strava reste le socle principal des activitÃ©s.

Garmin enrichit, mais ne remplace pas Strava.

## Ne pas confondre science et vulgarisation

Les mÃ©triques doivent Ãªtre comprÃ©hensibles sans Ãªtre scientifiquement fausses.

Principe :

```text
Mieux vaut une formulation prudente qu'une certitude trompeuse.
```

## Ne pas confondre Garmin et RunNSee

Toujours distinguer :

```text
DonnÃ©e Garmin brute
Estimation Garmin
Calcul RunNSee
Vulgarisation RunNSee
```

---

# 13. DÃ©finition de terminÃ©

Ce chantier est terminÃ© uniquement si :

- les diffs Git sont propres ;
- les scripts de validation sont fiables ;
- le bridge Garmin alimente rÃ©ellement les champs attendus ;
- les synchronisations Garmin recovery et activitÃ© ne se perturbent pas ;
- les libellÃ©s scientifiques sont prudents et cohÃ©rents ;
- les Ã©tats Garmin du dÃ©tail activitÃ© sont comprÃ©hensibles ;
- l'import PostgreSQL refuse les cas dangereux ;
- les tests backend/frontend passent ou les limites sont documentÃ©es ;
- les fichiers `.ai/*.md` sont mis Ã  jour ;
- les commits sont rÃ©alisÃ©s par lot ;
- le push GitHub a Ã©tÃ© effectuÃ© pour dÃ©clencher la CI/CD.
