# RunNSee — Plan suite après review Backfill historique Garmin

## 0. Objectif

Ce document est destiné à CODEX / Claude Code Pro.

Archive analysée : `runsee-source-review.zip`.

Objectif :
- analyser la dernière version du chantier Backfill historique Garmin ;
- vérifier la cohérence avec le plan initial ;
- identifier les risques restants ;
- définir les prochaines étapes avant lancement réel prolongé du backfill ;
- inclure une phase finale de sécurisation post-chantier.

Baseline de départ :

```text
runsee-stable-post-garmin-dedup
```

---

## 1. Verdict de review

La dernière version est nettement plus mature que la précédente.

Les points qui étaient bloquants ou à sécuriser ont globalement été traités :

- les fichiers `.ai/git_status.txt`, `.ai/handoff_status.txt`, `.ai/handoff_uncommitted.patch` ne sont plus présents dans l’archive ;
- `ProviderBackfillWindowLog` est présent dans les schémas SQLite et PostgreSQL ;
- les compteurs détaillés du backfill sont persistés par fenêtre ;
- `run-window force` est encadré par `GARMIN_BACKFILL_ALLOW_FORCE_RUN=false` par défaut ;
- un pré-contrôle doublon existe avant écriture de fenêtre ;
- un contrôle doublon existe après fenêtre ;
- si des doublons apparaissent après fenêtre, un soft-merge non destructif est tenté immédiatement ;
- le curseur passe en erreur si le contrôle résiduel reste non nul ;
- l’UI Admin affiche le statut du backfill historique Garmin ;
- la documentation `.ai` a été enrichie.

Conclusion :
la version est **proche d’une recette réelle contrôlée**, mais je ne lancerais pas encore tout l’historique en continu sans une phase de validation terrain très cadrée.

---

## 2. Points conformes

## 2.1 Backend backfill

Fichier principal :

```text
backend/src/services/providers/garminHistoricalBackfill.service.js
```

Conforme :

- lancement manuel ;
- reprise automatique par scheduler ;
- fenêtre Garmin calculée sur 180 jours par défaut ;
- intervalle minimal configurable ;
- pause/reprise ;
- statut public ;
- journalisation par fenêtre ;
- contrôle anti-doublon avant fenêtre ;
- contrôle anti-doublon après fenêtre ;
- soft-merge automatique des doublons détectés après fenêtre ;
- arrêt en erreur si le contrôle résiduel reste non nul.

## 2.2 Endpoints

Endpoints présents :

```text
GET  /providers/garmin/activities/backfill/status
POST /providers/garmin/activities/backfill/start
POST /providers/garmin/activities/backfill/pause
POST /providers/garmin/activities/backfill/resume
POST /providers/garmin/activities/backfill/run-window
```

Conforme au besoin.

## 2.3 Scheduler

Le scheduler est lancé côté backend via :

```text
startAutoGarminActivityBackfillScheduler()
```

Il scanne les curseurs `running` et respecte :

```text
GARMIN_BACKFILL_SCAN_INTERVAL_MINUTES
GARMIN_BACKFILL_MAX_WINDOWS_PER_RUN
GARMIN_BACKFILL_MIN_INTERVAL_MINUTES
```

## 2.4 Logs persistants

Le modèle `ProviderBackfillWindowLog` permet de conserver :

- fenêtre traitée ;
- statut ;
- compteurs ;
- erreurs ;
- nombre de doublons post-fenêtre ;
- JSON de résultat nettoyé.

C’est une vraie amélioration par rapport à la version précédente.

## 2.5 UI Admin

Le composant :

```text
frontend/src/components/GarminActivityBackfillCard.jsx
```

affiche :

- statut ;
- fenêtres traitées ;
- activités Garmin lues ;
- activités matchées Strava ;
- Garmin-only créées ;
- ambiguës ignorées ;
- dernière tranche ;
- prochaine tranche ;
- prochain lancement ;
- dernier succès ;
- actions start/pause/resume.

C’est conforme au besoin.

---

# PARTIE A — Points de vigilance restants

---

## 3. P0 — Recette réelle non encore validée

## Constat

Le code est prêt pour une recette contrôlée, mais le backfill historique réel n’est pas encore validé sur une vraie fenêtre Garmin.

## Risque

Le comportement réel peut différer du comportement attendu à cause de :

- données Garmin anciennes incomplètes ;
- types d’activités inattendus ;
- timezone ;
- rate limit Garmin ;
- payload Garmin différent selon période ;
- activités très proches dans la même journée ;
- randonnées Garmin.

## Action

Ne pas laisser le scheduler parcourir tout l’historique avant d’avoir validé au minimum :

```text
1 fenêtre immédiate
dry-run doublons après fenêtre = 0
pause
reprise
fenêtre automatique suivante
dry-run doublons après 2e fenêtre = 0
```

---

## 4. P1 — Soft-merge post-fenêtre : accepté mais à surveiller

## Constat

Si un doublon apparaît après écriture, le service tente maintenant un soft-merge automatique puis relance la détection.

C’est mieux que la version précédente.

## Risque

Le doublon peut exister très brièvement entre :

```text
écriture Garmin-only
détection post-fenêtre
soft-merge
```

En pratique, ce risque est faible si la fenêtre est exécutée côté backend sans lecture UI intermédiaire.

## Action recommandée

Pour la première recette réelle :

- surveiller la page Activités après fenêtre ;
- vérifier que les doublons résiduels sont à 0 ;
- vérifier que les logs indiquent si un soft-merge automatique a été appliqué.

Ne pas changer le code tant que la recette réelle ne montre pas d’anomalie.

---

## 5. P1 — Définir explicitement `GARMIN_BACKFILL_MIN_DATE`

## Constat

Si `GARMIN_BACKFILL_MIN_DATE` n’est pas défini, le code peut explorer jusqu’à environ 10 ans.

## Risque

Backfill inutilement long.

## Action

Définir une date de début réaliste en production.

Exemple :

```text
GARMIN_BACKFILL_MIN_DATE=2015-01-01
```

ou une date plus récente selon ton historique Garmin réel.

Critère :
la date doit couvrir l’historique utile, sans explorer inutilement des années vides.

---

## 6. P1 — Migration `ProviderBackfillWindowLog` à confirmer sur l’environnement cible

## Constat

La migration existe :

```text
20260508195000_add_provider_backfill_window_logs
```

dans SQLite et PostgreSQL.

## Action obligatoire

Avant recette réelle en environnement cible :

```bash
cd backend
npm run prisma:generate
npx prisma validate
npm run prisma:pg:validate
npm run db:compare-schemas
```

Puis appliquer la migration sur PostgreSQL cible si nécessaire :

```bash
npm run prisma:pg:migrate:deploy
```

selon ton processus de déploiement.

---

## 7. P1 — Tests backend encore modestes

## Constat

Le test `garminHistoricalBackfill.service.test.js` couvre :

- calcul première fenêtre ;
- calcul fenêtre précédente ;
- refus force si non autorisé.

C’est utile, mais pas suffisant pour couvrir tout le workflow.

## Action recommandée

Ajouter quelques tests backend ciblés avant usage prolongé, au minimum :

```text
start passe idle -> running
run-window refuse si intervalle non dû
run-window refuse force si env false
pause passe running -> paused
resume passe paused -> running
duplicate preflight > 0 met le curseur en error
duplicate post-window résiduel met le curseur en error
```

Si ces tests sont coûteux à mocker, ils peuvent être ajoutés juste après la première recette réelle, mais il faut au moins documenter le risque.

---

## 8. P2 — Lock mono-instance uniquement

## Constat

Le verrou d’exécution repose sur :

```text
runningWindows = new Set()
```

## Analyse

C’est acceptable pour ton contexte actuel :

```text
backend local / VM unique
```

Mais insuffisant si plusieurs instances backend tournent en parallèle.

## Action

Documenter explicitement dans `.ai/regression_risks.md` :

```text
Le backfill historique Garmin est conçu pour une instance backend unique.
En multi-instance, ajouter un lock DB avant usage.
```

---

## 9. P2 — Route purge Garmin toujours destructive

## Constat

La route existe :

```text
DELETE /providers/garmin/data
```

Elle est protégée par authentification + confirmation.

## Action

Ne pas l’utiliser dans ce chantier.

Ajouter ou maintenir dans la documentation :

```text
La purge Garmin est une action admin exceptionnelle.
Elle ne doit pas être utilisée pour corriger le backfill ou les doublons.
```

---

# PARTIE B — Plan de suite recommandé

---

## 10. Lot 1 — Préparation environnement

## Objectif

Préparer une recette réelle contrôlée sans risque de dérive.

## Actions

1. Vérifier que le repo est propre :

```bash
git status --short
git diff --stat
git diff --check
```

2. Vérifier que les migrations sont alignées :

```bash
cd backend
npm run prisma:generate
npx prisma validate
npm run prisma:pg:validate
npm run db:compare-schemas
```

3. Appliquer la migration PostgreSQL cible si nécessaire :

```bash
npm run prisma:pg:migrate:deploy
```

4. Définir les variables d’environnement :

```text
GARMIN_BACKFILL_WINDOW_DAYS=180
GARMIN_BACKFILL_MIN_INTERVAL_MINUTES=60
GARMIN_BACKFILL_MAX_WINDOWS_PER_RUN=1
GARMIN_BACKFILL_SCAN_INTERVAL_MINUTES=10
GARMIN_BACKFILL_ALLOW_FORCE_RUN=false
GARMIN_BACKFILL_MIN_DATE=YYYY-MM-DD
```

5. Redémarrer backend.

## Critères d’acceptation

```text
repo clean
schemas Prisma alignés
migration ProviderBackfillWindowLog appliquée
env backfill défini
backend redémarré
```

---

## 11. Lot 2 — Dry-run initial anti-doublon

## Objectif

S’assurer que la base est saine avant de lancer le backfill.

## Actions

Exécuter :

```bash
cd backend
node scripts/db/detect-provider-activity-duplicates.js
```

## Attendu

```text
duplicateCount = 0
```

## Si KO

Ne pas lancer le backfill.

Corriger d’abord les doublons actifs.

---

## 12. Lot 3 — Lancement manuel d’une première fenêtre

## Objectif

Valider le fonctionnement réel sur une seule fenêtre.

## Actions UI

Dans Admin :

```text
Garmin > Historique Garmin activités > Lancer l’import historique
```

## Actions API possibles

```text
POST /providers/garmin/activities/backfill/start
```

## Contrôles immédiats

Vérifier :

```text
status = running
première fenêtre visible
une seule fenêtre lancée
lastRunAt renseigné
log ProviderBackfillWindowLog créé
```

## Après quelques minutes

Vérifier :

```text
lastSuccessAt renseigné si succès
totalWindowsProcessed = 1
ProviderBackfillWindowLog.status = success ou completed
duplicateCountAfterWindow = 0
```

## Critères d’acceptation

```text
première fenêtre traitée
0 doublon post-fenêtre
compteurs visibles après refresh UI
pas de doublon visible dans Activités
```

---

## 13. Lot 4 — Contrôle post-première fenêtre

## Objectif

Valider que le backfill n’a pas créé de régression métier.

## Actions

1. Relancer dry-run doublons :

```bash
cd backend
node scripts/db/detect-provider-activity-duplicates.js
```

2. Vérifier page Activités :

```text
0 doublon visible
Garmin-only réel visible si créé
Strava + Garmin fusionné si match
```

3. Vérifier page Aujourd’hui :

```text
pas de double comptage
activités utiles cohérentes
charge / volume cohérents
```

4. Vérifier Analytics :

```text
volume non doublonné
D+ / D- cohérents
randonnées Garmin non injectées dans les records route
```

5. Vérifier logs backfill :

```text
matched
createdGarminOnly
ambiguous
rejected
```

## Critères d’acceptation

```text
dry-run = 0
UI sans doublon
Aujourd’hui sans double comptage
Analytics cohérent
compteurs compréhensibles
```

---

## 14. Lot 5 — Pause / reprise

## Objectif

Valider le contrôle utilisateur.

## Actions

1. Cliquer :

```text
Mettre en pause
```

2. Vérifier :

```text
status = paused
aucune fenêtre suivante lancée
```

3. Cliquer :

```text
Reprendre
```

4. Vérifier :

```text
status = running
prochaine fenêtre planifiée
```

## Critères d’acceptation

```text
pause effective
resume effectif
pas de fenêtre lancée pendant pause
```

---

## 15. Lot 6 — Reprise automatique de la deuxième fenêtre

## Objectif

Valider que le scheduler poursuit correctement.

## Actions

Attendre le délai minimal configuré :

```text
GARMIN_BACKFILL_MIN_INTERVAL_MINUTES
```

Puis vérifier :

```text
deuxième fenêtre lancée automatiquement
totalWindowsProcessed = 2
nouveau ProviderBackfillWindowLog créé
duplicateCountAfterWindow = 0
```

## Critères d’acceptation

```text
scheduler fonctionne
intervalle respecté
dry-run doublons = 0 après deuxième fenêtre
```

---

## 16. Lot 7 — Décision Go / No-Go

## Go

Autoriser la poursuite automatique du backfill si :

```text
2 fenêtres consécutives OK
dry-run doublons = 0 après chaque fenêtre
pause/reprise OK
scheduler OK
compteurs OK
aucune régression UI
```

## No-Go

Mettre en pause si :

```text
doublon détecté
statut error
compteurs incohérents
Garmin rate limit
UI Activités doublonnée
Aujourd’hui double-compte
```

---

# PARTIE C — Corrections optionnelles avant usage prolongé

---

## 17. Tests backend workflow

## Objectif

Augmenter la robustesse avant gros volume historique.

## Tests recommandés

Ajouter :

```text
start idle -> running
start refuse si already running
pause running -> paused
resume paused -> running
force refusé si env false
duplicate preflight bloque
duplicate post-window résiduel bloque
scheduler respecte intervalle
```

## Commit attendu

```text
test(garmin): cover historical backfill workflow
```

---

## 18. Documentation mono-instance

## Objectif

Documenter la limite du verrou mémoire.

## Action

Ajouter dans `.ai/regression_risks.md` :

```text
Le backfill historique Garmin repose sur un lock mémoire et est validé pour une instance backend unique. En cas de multi-instance, ajouter un lock DB.
```

---

# PARTIE D — Phase finale — Sécurisation post-chantier

---

## 19. Repo clean

Exécuter :

```bash
git status --short
git diff --stat
git diff --check
```

Attendu :

```text
repo propre
aucun fichier parasite
aucun secret
aucun artefact runtime
```

---

## 20. Alignement `.ai/*.md`

Mettre à jour :

```text
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
.ai/codebase_map.md
```

## Contenu attendu

### current_context.md

Ajouter :

```text
Backfill historique Garmin : recette contrôlée effectuée sur N fenêtre(s).
Dry-run doublons après fenêtre(s) : 0.
Pause/reprise : OK/KO.
Scheduler : OK/KO.
```

### open_tasks.md

Marquer terminé uniquement si validé :

```text
migration ProviderBackfillWindowLog appliquée
première fenêtre backfill réelle validée
pause/reprise validée
scheduler validé
```

Laisser ouvert si non validé :

```text
backfill complet jusqu’à GARMIN_BACKFILL_MIN_DATE
tests backend workflow si non ajoutés
lock DB multi-instance si futur hébergement multi-instance
```

### regression_risks.md

Ajouter ou confirmer :

```text
backfill Garmin
doublons provider
rate limit Garmin
lock mono-instance
route purge Garmin
```

### codebase_map.md

Vérifier que sont bien documentés :

```text
garminHistoricalBackfill.service.js
ProviderBackfillCursor
ProviderBackfillWindowLog
GarminActivityBackfillCard
endpoints backfill
```

---

## 21. Tests backend

Exécuter :

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

---

## 22. Tests frontend

Exécuter :

```bash
cd frontend
npm ci
npm test -- --run
npm run build
```

---

## 23. Recette manuelle finale

Vérifier :

```text
Admin backfill : statut cohérent
Activités : 0 doublon visible
Aujourd’hui : pas de double comptage
Analytics : pas de double comptage
Performance : pas de lien merged/undefined
Garmin-only réel : visible
Randonnées Garmin : pas de pollution records route
```

---

## 24. Garde-fous spécifiques chantier

Vérifier explicitement :

```text
GARMIN_BACKFILL_ALLOW_FORCE_RUN=false
GARMIN_BACKFILL_MAX_WINDOWS_PER_RUN=1
dry-run doublons = 0
duplicateCountAfterWindow = 0
aucun status error non expliqué
aucun usage de DELETE /providers/garmin/data
```

---

## 25. Archive source propre

Générer :

```bash
git archive --format=zip --output runsee-source-post-backfill-review.zip HEAD
```

Vérifier qu’elle ne contient pas :

```text
node_modules/
dist/
.env
*.db
*.log
runtime/
.tmp/
```

---

## 26. Baseline / tag si applicable

Après validation complète de 2 fenêtres réelles :

```bash
git tag runsee-stable-post-garmin-backfill-window-validation
git push origin runsee-stable-post-garmin-backfill-window-validation
```

Ne taguer que si :

```text
tests OK
dry-run doublons OK
recette UI OK
scheduler OK
.ai aligné
repo clean
```

---

# PARTIE E — Message final attendu de CODEX / Claude Code Pro

---

## 27. Format attendu

```text
Backfill historique Garmin — suite review

Préparation :
- repo clean : ...
- migration ProviderBackfillWindowLog : ...
- env backfill : ...
- dry-run initial : ...

Fenêtre 1 :
- fenêtre : ...
- statut : ...
- activités Garmin lues : ...
- matchées Strava : ...
- Garmin-only créées : ...
- ambiguës ignorées : ...
- duplicateCountAfterWindow : ...

Pause / reprise :
- pause : ...
- reprise : ...

Fenêtre 2 automatique :
- lancée automatiquement : ...
- duplicateCountAfterWindow : ...

UI :
- Activités : ...
- Aujourd’hui : ...
- Analytics : ...

Tests :
- backend : ...
- frontend : ...
- build : ...

Sécurisation :
- .ai aligné : ...
- archive source propre : ...
- tag créé : oui/non

Conclusion :
- backfill prêt pour poursuite automatique : oui/non
- risques résiduels : ...
```
