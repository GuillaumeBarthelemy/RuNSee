# RunNSee — Chantier Backfill historique Garmin 180 j/h

## 0. Objectif du chantier

Ce document est destiné à CODEX / Claude Code Pro.

Objectif : implémenter un backfill historique Garmin complet, fiable et progressif, afin d’importer l’historique d’activités Garmin existant sans recréer de doublons Strava/Garmin.

Ce chantier démarre après la baseline stable :

```text
Tag stable : runsee-stable-post-garmin-dedup
Commit cible : f703fa5 fix(sync): tighten exact provider matching
```

Cette baseline doit rester le point de rollback.

---

## 1. Règles impératives

### 1.1 Ne pas casser la baseline stable

Avant tout développement :

```bash
git status --short
git diff --stat
git diff --check
```

Le dépôt doit être propre.

Créer une branche dédiée :

```bash
git checkout -b feature/garmin-historical-backfill
```

### 1.2 Réutiliser le matching stabilisé

Le backfill historique Garmin doit impérativement réutiliser le service de matching existant, notamment la logique corrigée :

```text
exact
probable
ambiguous
not_found
rejected
```

Règles non négociables :

```text
exact ou probable  -> lier Garmin à Strava, enrichir, ne pas créer Garmin-only
ambiguous          -> ne pas créer Garmin-only, journaliser
not_found          -> créer Garmin-only si type autorisé
rejected           -> ignorer ou raw-only selon règle existante
```

### 1.3 Pas de doublon visible

Après chaque fenêtre de backfill :

```text
dry-run doublons = 0
```

Le backfill ne doit jamais recréer les doublons corrigés.

### 1.4 Backfill borné

Ne pas importer tout l’historique Garmin en une seule exécution.

Règle validée :

```text
1 fenêtre de 180 jours maximum par heure
```

Paramètres attendus :

```text
GARMIN_BACKFILL_WINDOW_DAYS=180
GARMIN_BACKFILL_MIN_INTERVAL_MINUTES=60
GARMIN_BACKFILL_MAX_WINDOWS_PER_RUN=1
GARMIN_ACTIVITY_SYNC_RECENT_DAYS=30
```

### 1.5 Démarrage manuel, poursuite automatique

Décision produit validée :

```text
Le backfill est lancé manuellement par l’utilisateur.
Après lancement, il se poursuit automatiquement par tranches de 180 jours jusqu’à complétion.
```

### 1.6 Pas d’écran d’écarts Strava/Garmin

Décision validée :

```text
Pas d’écran Admin d’écarts Strava/Garmin.
Pas d’arbitrage manuel des matchs ambigus.
```

Les cas ambigus doivent être journalisés et comptabilisés, pas affichés comme tâche utilisateur.

---

# PARTIE A — Périmètre fonctionnel

---

## 2. Ce que le chantier doit faire

Le chantier doit permettre :

1. de lancer manuellement le backfill historique Garmin ;
2. de traiter l’historique du plus récent vers le plus ancien ;
3. de traiter une fenêtre de 180 jours par exécution ;
4. de reprendre automatiquement la fenêtre suivante après délai minimal ;
5. de s’arrêter à complétion ;
6. de reprendre après redémarrage backend ;
7. de se mettre en erreur contrôlée si Garmin est indisponible ;
8. de ne jamais créer de doublons Strava/Garmin ;
9. de créer des Garmin-only uniquement si aucun match Strava fiable n’existe ;
10. de conserver les raw Garmin ;
11. de conserver les liens provider ;
12. d’exposer un statut lisible en Admin.

---

## 3. Ce que le chantier ne doit pas faire

Ne pas faire :

- nouvelle refonte UX ;
- nouvel algorithme Trail ;
- nouveau score ;
- écran d’arbitrage des doublons ;
- suppression destructive de données Garmin ;
- import illimité en un seul run ;
- backfill automatique sans lancement initial utilisateur ;
- bypass du matching stabilisé ;
- création Garmin-only en cas ambigu.

---

# PARTIE B — Architecture cible

---

## 4. Modèle de données attendu

Le modèle `ProviderBackfillCursor` existe déjà ou doit être finalisé.

Champs attendus :

```text
id
appUserId
provider                 // garmin
resourceType             // activities
status                   // idle | running | paused | completed | error
nextWindowEndDate
oldestFetchedDate
windowDays
lastRunAt
lastSuccessAt
lastErrorCode
lastErrorMessage
totalWindowsProcessed
totalActivitiesImported
createdAt
updatedAt
```

### 4.1 Statuts

| Statut | Signification |
|---|---|
| idle | jamais lancé ou prêt |
| running | backfill actif |
| paused | pause utilisateur |
| completed | historique terminé |
| error | erreur bloquante ou répétée |

### 4.2 Contraintes

Un seul backfill Garmin activities actif par utilisateur.

Contrainte recommandée :

```text
appUserId + provider + resourceType
```

unique.

---

## 5. Services backend attendus

Créer ou compléter les services suivants selon l’existant :

```text
backend/src/services/providers/garminHistoricalBackfill.service.js
backend/src/services/providers/garminActivityBackfillCursor.service.js
backend/src/services/providers/multiSourceActivitySync.service.js
backend/src/services/providers/activityProviderMatching.service.js
```

Adapter les noms aux conventions existantes.

### 5.1 Responsabilités

#### `garminHistoricalBackfill.service.js`

Responsabilités :

- démarrer le backfill ;
- calculer la fenêtre suivante ;
- exécuter une fenêtre ;
- appeler Garmin ;
- stocker raw ;
- normaliser activités ;
- matcher Strava/Garmin ;
- créer Garmin-only si `not_found` ;
- mettre à jour le curseur ;
- programmer la prochaine exécution ;
- gérer pause/reprise/erreur.

#### `garminActivityBackfillCursor.service.js`

Responsabilités :

- créer ou récupérer le curseur ;
- verrouiller le curseur pendant une fenêtre ;
- mettre à jour les dates ;
- gérer statuts ;
- empêcher exécutions concurrentes.

#### `multiSourceActivitySync.service.js`

Responsabilités :

- fournir une méthode réutilisable pour traiter des activités Garmin sur une période ;
- appliquer les règles exact/probable/ambiguous/not_found ;
- éviter doublons ;
- retourner un résumé.

---

# PARTIE C — Algorithme de backfill

---

## 6. Sens de parcours

Le backfill doit traiter l’historique :

```text
du plus récent vers le plus ancien
```

Pourquoi :

- les données récentes alimentent rapidement Dashboard / Analytics ;
- si le backfill s’interrompt, les données les plus utiles sont déjà disponibles ;
- cela limite le risque utilisateur immédiat.

---

## 7. Calcul de fenêtre

### 7.1 Premier lancement

Au lancement initial :

```text
windowEndDate = aujourd’hui
windowStartDate = aujourd’hui - GARMIN_BACKFILL_WINDOW_DAYS
```

Exemple :

```text
Fenêtre 1 : 2025-11-10 -> 2026-05-08
```

### 7.2 Fenêtres suivantes

Si la fenêtre précédente était :

```text
2025-11-10 -> 2026-05-08
```

La suivante est :

```text
2025-05-14 -> 2025-11-09
```

Règle :

```text
nextWindowEndDate = previousWindowStartDate - 1 jour
nextWindowStartDate = nextWindowEndDate - windowDays + 1 jour
```

### 7.3 Fin historique

Le backfill est terminé si :

- Garmin ne retourne plus aucune activité sur plusieurs fenêtres anciennes ;
- ou une date minimale configurée est atteinte ;
- ou Garmin indique absence d’historique ;
- ou l’utilisateur stoppe définitivement.

Paramètre optionnel :

```text
GARMIN_BACKFILL_MIN_DATE=YYYY-MM-DD
```

Si absent, poursuivre jusqu’à fenêtres vides selon règle à définir.

Recommandation :

```text
Marquer completed après 2 fenêtres consécutives vides au-delà de 10 ans d’historique,
ou si GARMIN_BACKFILL_MIN_DATE est atteint.
```

À adapter selon données disponibles.

---

## 8. Pseudo-algorithme

```text
startGarminBackfill(appUserId):
  vérifier requireAuth
  vérifier Garmin connecté
  récupérer ou créer ProviderBackfillCursor
  si status = running:
    retourner already_running
  si status = completed:
    retourner already_completed sauf reset explicite
  initialiser nextWindowEndDate si absent
  passer status = running
  lancer première fenêtre immédiatement

executeGarminBackfillWindow(appUserId):
  récupérer curseur
  vérifier status = running
  vérifier lastRunAt + minInterval <= now
  calculer [windowStartDate, windowEndDate]
  appeler Garmin fetch_activities(windowStartDate, windowEndDate)
  stocker raw Garmin
  normaliser activités
  pour chaque activité Garmin:
    matcher avec activités existantes Strava/Garmin
    si exact/probable:
      créer/mettre à jour ActivityProviderLink
      créer/mettre à jour ActivityProviderEnrichment
    si ambiguous:
      journaliser, ne pas créer Garmin-only
    si not_found:
      créer Garmin-only si type autorisé
    si rejected:
      ignorer ou raw-only
  mettre à jour compteur
  exécuter dry-run doublons si disponible
  si dry-run != 0:
    passer status = error
    arrêter poursuite automatique
  sinon:
    avancer curseur
    planifier prochaine fenêtre après minInterval
```

---

# PARTIE D — Endpoints backend

---

## 9. Endpoints à créer ou compléter

### 9.1 Lancer le backfill

```text
POST /providers/garmin/activities/backfill/start
```

Protégé par :

```text
requireAuth
```

Réponse attendue :

```json
{
  "status": "started",
  "provider": "garmin",
  "resourceType": "activities",
  "windowDays": 180,
  "nextWindow": {
    "startDate": "2025-11-10",
    "endDate": "2026-05-08"
  }
}
```

### 9.2 Statut du backfill

```text
GET /providers/garmin/activities/backfill/status
```

Réponse attendue :

```json
{
  "status": "running",
  "windowDays": 180,
  "lastRunAt": "2026-05-08T10:00:00.000Z",
  "lastSuccessAt": "2026-05-08T10:02:00.000Z",
  "nextRunNotBefore": "2026-05-08T11:00:00.000Z",
  "lastWindow": {
    "startDate": "2025-11-10",
    "endDate": "2026-05-08"
  },
  "nextWindow": {
    "startDate": "2025-05-14",
    "endDate": "2025-11-09"
  },
  "totals": {
    "windowsProcessed": 1,
    "activitiesImported": 25,
    "matched": 20,
    "createdGarminOnly": 4,
    "ambiguous": 1,
    "rejected": 0
  }
}
```

### 9.3 Pause

```text
POST /providers/garmin/activities/backfill/pause
```

Réponse :

```json
{
  "status": "paused"
}
```

### 9.4 Reprendre

```text
POST /providers/garmin/activities/backfill/resume
```

Réponse :

```json
{
  "status": "running"
}
```

### 9.5 Exécuter une fenêtre maintenant

Optionnel, réservé admin/dev :

```text
POST /providers/garmin/activities/backfill/run-window
```

À protéger strictement.

Ne doit pas ignorer `GARMIN_BACKFILL_MIN_INTERVAL_MINUTES` sauf paramètre admin explicite.

---

# PARTIE E — Scheduler / poursuite automatique

---

## 10. Mécanisme de poursuite automatique

Après lancement manuel, le système doit poursuivre automatiquement.

Options possibles :

### Option A — Scheduler applicatif

Au démarrage backend et périodiquement :

```text
chercher les ProviderBackfillCursor running
si nextRunNotBefore <= now
lancer une fenêtre
```

Fréquence de scan :

```text
toutes les 5 à 15 minutes
```

### Option B — Déclenchement opportuniste

À chaque appel status ou sync globale, vérifier si une fenêtre est due.

Moins fiable.

### Recommandation

Utiliser l’Option A si l’application backend reste active.

---

## 11. Concurrence

Empêcher deux fenêtres simultanées.

Garde-fous :

- statut `running_window` optionnel ;
- lock transactionnel ;
- champ `lockedAt` / `lockedBy` si nécessaire ;
- vérification job actif ;
- refus si une fenêtre est déjà en cours.

---

## 12. Gestion des erreurs

### 12.1 Erreurs temporaires Garmin

Exemples :

- timeout ;
- erreur garminconnect ;
- authentification expirée ;
- rate limit ;
- JSON invalide.

Comportement :

```text
ne pas avancer le curseur
enregistrer lastErrorCode / lastErrorMessage
réessayer à la prochaine fenêtre autorisée
après N erreurs consécutives, passer status=error ou paused
```

Paramètre possible :

```text
GARMIN_BACKFILL_MAX_CONSECUTIVE_ERRORS=3
```

### 12.2 Erreur anti-doublon

Si dry-run doublons après fenêtre détecte des doublons :

```text
status = error
arrêt automatique
message clair
aucune fenêtre suivante
```

---

# PARTIE F — Intégration Admin UI

---

## 13. Emplacement UI

Ajouter dans :

```text
Admin / Données
```

ou :

```text
Admin / Connexions / Garmin
```

Ne pas afficher dans `Aujourd’hui`.

---

## 14. Carte UI attendue

```text
Historique Garmin activités

Statut : en cours
Fenêtre : 10/11/2025 -> 08/05/2026
Fenêtres traitées : 1
Activités importées : 25
Matchées Strava : 20
Garmin-only créées : 4
Ambiguës ignorées : 1
Prochaine tranche : dans 58 min

[Lancer l’import historique] [Pause] [Reprendre]
```

### 14.1 États

| Statut | UI |
|---|---|
| idle | bouton lancer visible |
| running | pause visible |
| paused | reprendre visible |
| completed | terminé, bouton relancer masqué ou reset admin |
| error | message erreur + reprendre si possible |

### 14.2 Messages utilisateur

Démarrage :

```text
L’import historique Garmin démarre par les activités les plus récentes, puis continue automatiquement par tranches de 180 jours.
```

Ambigu :

```text
Certaines activités Garmin ambiguës ont été ignorées pour éviter les doublons.
```

Erreur :

```text
Le backfill Garmin est en pause suite à une erreur. Aucune donnée n’a été supprimée.
```

---

# PARTIE G — Règles anti-doublon obligatoires

---

## 15. Matching

Réutiliser impérativement le service existant :

```text
activityProviderMatching.service.js
```

Ne pas recréer une seconde logique de matching dans le backfill.

### 15.1 Rappel règles

| Match | Action |
|---|---|
| exact | lier + enrichir Strava |
| probable | lier + enrichir Strava |
| ambiguous | raw + journalisation, pas de Garmin-only |
| not_found | créer Garmin-only |
| rejected | ignorer ou raw-only |

### 15.2 Exact durci

Le statut `exact` doit tenir compte au minimum :

```text
temps
distance
durée
D+ si disponible
FC moyenne si disponible
```

Ne pas utiliser uniquement l’heure.

---

## 16. Dry-run doublons après fenêtre

Après chaque fenêtre traitée, exécuter ou réutiliser la logique :

```text
detect-provider-activity-duplicates
```

Si doublon détecté :

```text
arrêter le backfill
passer status=error
ne pas poursuivre automatiquement
```

---

# PARTIE H — Tests backend

---

## 17. Tests unitaires

Ajouter des tests pour :

1. calcul première fenêtre ;
2. calcul fenêtre suivante ;
3. stop sur pause ;
4. stop sur completed ;
5. refus si Garmin non connecté ;
6. refus si backfill déjà running ;
7. exact/probable -> pas de Garmin-only ;
8. ambiguous -> pas de Garmin-only ;
9. not_found -> création Garmin-only ;
10. randonnée Garmin importée ;
11. erreur Garmin -> curseur non avancé ;
12. dry-run doublon après fenêtre -> status error ;
13. reprise après erreur ;
14. reprise après redémarrage backend si possible.

---

## 18. Tests d’intégration

Tester :

```text
POST start
GET status
POST pause
POST resume
scheduler window
```

Cas :

- Garmin seul ;
- Strava + Garmin ;
- Strava seul ;
- Garmin déconnecté ;
- erreur bridge Garmin.

---

## 19. Commandes backend

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

# PARTIE I — Tests frontend

---

## 20. Tests UI

Ajouter ou adapter tests pour :

- carte backfill idle ;
- carte backfill running ;
- carte backfill paused ;
- carte backfill completed ;
- carte backfill error ;
- bouton lancer ;
- bouton pause ;
- bouton reprendre ;
- affichage prochaine fenêtre ;
- affichage compteurs matched / Garmin-only / ambiguous.

---

## 21. Commandes frontend

```bash
cd frontend
npm ci
npm test -- --run
npm run build
```

---

# PARTIE J — Recette manuelle

---

## 22. Recette minimale

### 22.1 Avant lancement

Vérifier :

```text
dry-run doublons = 0
Garmin connecté
Strava connecté ou non selon scénario
Backfill status = idle ou paused
```

### 22.2 Lancement

Cliquer :

```text
Lancer l’import historique Garmin
```

Attendu :

```text
status = running
fenêtre récente créée
une seule fenêtre traitée immédiatement
```

### 22.3 Après fenêtre

Vérifier :

```text
compteurs cohérents
dry-run doublons = 0
prochaine fenêtre planifiée dans environ 1 h
```

### 22.4 Pause / reprise

Tester :

```text
pause -> status paused
resume -> status running
pas de fenêtre lancée avant délai minimal
```

### 22.5 Après délai

Vérifier :

```text
fenêtre suivante lancée automatiquement
curseur avancé
pas de doublon
```

---

# PARTIE K — Sécurité et logs

---

## 23. Pas de secrets dans les logs

Interdit :

```text
identifiants Garmin
cookies Garmin
tokens
payload complet sensible
```

Autorisé :

```text
appUserId interne
provider
fenêtre de dates
compteurs
codes erreurs normalisés
```

---

## 24. Route destructive Garmin

Si la route :

```text
DELETE /providers/garmin/data
```

existe, le backfill ne doit jamais l’appeler.

Cette route ne doit pas être utilisée pour résoudre des erreurs de backfill.

---

# PARTIE L — Documentation `.ai`

---

## 25. Fichiers à mettre à jour

```text
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
.ai/codebase_map.md
```

### 25.1 current_context.md

Mentionner :

```text
Backfill Garmin historique en cours d’implémentation.
Baseline de départ : runsee-stable-post-garmin-dedup.
Le backfill réutilise le matching provider stabilisé.
```

### 25.2 open_tasks.md

Ajouter :

```text
Implémenter backfill historique Garmin 180 j/h.
Valider pause/reprise.
Valider dry-run doublons après chaque fenêtre.
Valider scheduler automatique.
```

### 25.3 regression_risks.md

Ajouter :

```text
Backfill Garmin peut recréer des doublons si matching non réutilisé.
Backfill peut saturer Garmin si fenêtres non bornées.
Backfill peut importer des randonnées dans les mauvaises analyses.
Backfill doit rester stoppable et reprenable.
```

### 25.4 codebase_map.md

Ajouter :

```text
ProviderBackfillCursor
garminHistoricalBackfill.service.js
endpoints backfill Garmin
scheduler backfill
UI Admin backfill Garmin
```

---

# PARTIE M — Ordre d’exécution recommandé

---

## 26. Lots

### Lot 1 — Audit existant

- vérifier `ProviderBackfillCursor` ;
- vérifier services Garmin existants ;
- vérifier scheduler existant ;
- vérifier routes provider ;
- vérifier Admin UI.

Commit éventuel documentation :

```text
docs(ai): document garmin backfill implementation scope
```

### Lot 2 — Backend cursor + service

- finaliser cursor ;
- créer service backfill ;
- calcul fenêtres ;
- pause/reprise ;
- erreurs.

Commit :

```text
feat(garmin): add historical activity backfill cursor service
```

### Lot 3 — Traitement fenêtre

- fetch Garmin activities ;
- raw ;
- normalisation ;
- matching ;
- enrichment ;
- Garmin-only ;
- dry-run anti-doublon.

Commit :

```text
feat(garmin): process historical activity backfill windows
```

### Lot 4 — Scheduler automatique

- scan cursors running ;
- respect intervalle ;
- lock ;
- reprise après redémarrage.

Commit :

```text
feat(garmin): schedule historical backfill windows
```

### Lot 5 — Endpoints

- start ;
- status ;
- pause ;
- resume ;
- run-window optionnel.

Commit :

```text
feat(api): expose garmin activity backfill controls
```

### Lot 6 — UI Admin

- carte statut ;
- boutons ;
- compteurs ;
- messages.

Commit :

```text
feat(admin): add garmin historical backfill status card
```

### Lot 7 — Tests

- backend ;
- frontend ;
- build ;
- recette.

Commit :

```text
test(garmin): cover historical activity backfill
```

### Lot 8 — Documentation `.ai`

- current_context ;
- open_tasks ;
- regression_risks ;
- codebase_map.

Commit :

```text
docs(ai): update garmin historical backfill handoff
```

---

# PARTIE N — Critères d’acceptation

---

## 27. Critères fonctionnels

Le chantier est terminé si :

```text
Backfill lancé manuellement
Fenêtre 180 jours traitée
Poursuite automatique toutes les 1 h maximum
Pause fonctionne
Reprise fonctionne
Completed atteint en fin historique
Erreur Garmin gérée sans corruption
Dry-run doublons après fenêtre = 0
Strava + Garmin matché sans doublon
Garmin-only créé uniquement si not_found
Ambiguous ignoré
Randonnées Garmin importées selon règle validée
UI Admin claire
```

---

## 28. Critères techniques

```text
Migrations SQLite/PostgreSQL OK
Prisma validate OK
db:compare-schemas OK
Tests backend OK
Tests frontend OK
Build OK
Pas de secret loggé
Pas de route destructive utilisée
Repo propre
.ai/*.md à jour
```

---

## 29. Message final attendu de CODEX / Claude Pro

```text
Chantier backfill Garmin historique :

Lots réalisés :
- Audit : ...
- Cursor/service : ...
- Traitement fenêtre : ...
- Scheduler : ...
- Endpoints : ...
- UI Admin : ...
- Tests : ...
- Documentation : ...

Backfill :
- fenêtre jours : ...
- intervalle : ...
- lancement manuel : ...
- poursuite automatique : ...
- pause/reprise : ...
- dry-run doublons après fenêtre : ...

Tests :
- backend : ...
- frontend : ...
- build : ...
- db compare : ...

Risques résiduels :
- ...

Conclusion :
- prêt pour usage réel : oui/non
```
