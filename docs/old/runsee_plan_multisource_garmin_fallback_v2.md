# RunNSee — Plan indépendant : architecture multi-sources Strava/Garmin avec fallback FULL Garmin

## 0. Objectif du plan

Ce document est destiné à CODEX / Claude Code Pro.

Il doit être traité comme un **chantier indépendant** du plan correctif post Trail / Providers / Sync.

Objectif : faire évoluer RunNSee pour supporter une alimentation complète du modèle de données avec deux sources possibles :

1. **Strava** ;
2. **Garmin**.

La logique cible validée est :

| Connexions disponibles | Comportement attendu |
|---|---|
| Strava + Garmin connectés | Strava reste la source principale quand il existe un match fiable ; Garmin complète/enrichit ; si une activité Garmin n’existe pas côté Strava, une activité Garmin-only est créée automatiquement |
| Strava seul | RunNSee fonctionne avec les données Strava ; les blocs Garmin sont désactivés avec une alerte claire |
| Garmin seul | RunNSee alimente le modèle d’activités à partir de Garmin uniquement |
| Aucun provider | Application exploitable uniquement avec état vide / onboarding |

Ce plan définit aussi une stratégie fiable d’intégration de l’historique Garmin complet, avec backfill progressif par tranches bornées de 180 jours.

---

## 1. Décisions produit validées

Les décisions suivantes sont fermes et doivent être appliquées par CODEX / Claude Code Pro.

| Question | Décision validée |
|---|---|
| Créer automatiquement des Garmin-only si Strava est connecté mais ne contient pas l’activité ? | **Oui. Si Strava et Garmin sont connectés, fallback activité Garmin activé par défaut.** |
| Importer les randonnées Garmin ou uniquement les activités run-like ? | **Oui, importer aussi les randonnées Garmin.** |
| Horizon pour la sync globale Garmin activités | **30 jours.** |
| Backfill 180 jours : manuel ou automatique ? | **Démarrage manuel, puis poursuite automatique jusqu’à complétion de l’historique.** |
| Écran d’écarts Strava/Garmin en Admin ? | **Non.** |
| Rejet manuel d’un match Garmin/Strava ambigu ? | **Non. Les matchs ambigus sont ignorés automatiquement et journalisés.** |

---

## 2. Principes directeurs

### 2.1 Ne pas casser le modèle actuel

Le modèle actuel a été construit autour des activités Strava.

Ne pas supprimer brutalement les champs Strava existants.

Ne pas renommer massivement les champs existants si cela casse le frontend.

La bonne approche est progressive :

```text
Modèle actuel Activity
+ sourceProvider
+ sourceActivityId
+ sourcePriority
+ external links / enrichments
+ normalisation multi-sources
```

### 2.2 Strava reste la source préférée si un match fiable existe

Si Strava et Garmin sont connectés et qu’un match fiable existe :

```text
Activity canonique = Strava
Garmin = enrichment
```

Raisons :

- Strava est déjà le socle historique du modèle ;
- l’application actuelle est optimisée pour Strava ;
- les imports, pages et analyses utilisent déjà Strava ;
- Garmin peut compléter avec métriques physiologiques, recovery, training effect, etc.

### 2.3 Fallback Garmin activité activé par défaut

Si Strava et Garmin sont connectés mais qu’une activité Garmin n’a aucun match Strava fiable :

```text
Activity canonique = Garmin
```

Ce fallback est activé par défaut.

Objectif :

- éviter les trous d’historique ;
- récupérer les activités Garmin non envoyées à Strava ;
- garder RunNSee exploitable même si Strava est incomplet ;
- préparer un usage Garmin-only.

### 2.4 Garmin devient source canonique si Strava absent

Si Strava n’est pas connecté mais Garmin l’est :

```text
Activity canonique = Garmin
```

Dans ce cas, les activités doivent être visibles dans :

- Dashboard ;
- Activités ;
- Détail activité ;
- Analytics ;
- Objectifs ;
- Lecture trail si données suffisantes.

Le frontend ne doit pas supposer que toute activité possède un `stravaActivityId`.

### 2.5 Ne pas confondre activité canonique et enrichissement

Il faut distinguer :

```text
Activity = activité canonique visible dans l’application
ActivityProviderEnrichment = données complémentaires d’un provider
ExternalProviderRawData = raw data provider
```

Cas :

| Cas | Activity | Enrichment |
|---|---|---|
| Strava seul | Strava | aucun Garmin |
| Strava + Garmin matché | Strava | Garmin activity enrichment |
| Garmin seul | Garmin | Garmin raw/detail complémentaire si disponible |
| Strava + Garmin sans match Strava | Garmin-only | raw Garmin conservé |

### 2.6 Idempotence obligatoire

Toute synchronisation Garmin historique doit être relançable sans doublons.

Clé fonctionnelle recommandée :

```text
appUserId + sourceProvider + sourceActivityId
```

ou équivalent.

Ne jamais dédupliquer uniquement sur date + distance.

Le matching date/distance sert à rapprocher Strava/Garmin, pas à garantir une identité unique.

---

# PARTIE A — Analyse des scénarios cibles

---

## 3. Scénario 1 — Strava + Garmin connectés

### 3.1 Comportement attendu

- Importer les activités Strava comme aujourd’hui.
- Importer les données Garmin activity récentes ou historiques.
- Matcher Garmin ↔ Strava.
- Compléter les activités Strava avec Garmin via `ActivityProviderEnrichment`.
- Ne pas créer de doublon Garmin si l’activité Strava correspondante existe.
- Créer automatiquement une activité Garmin-only si aucune activité Strava fiable ne correspond.

### 3.2 Règle de priorité

```text
Si match fiable Strava/Garmin :
  Activity canonique = Strava
  Garmin = enrichment

Si Garmin activity sans match Strava :
  Activity canonique = Garmin
  sourceProvider = "garmin"
  sourceActivityId = garmin.activityId
```

### 3.3 Règles de création Garmin-only

Créer une activité Garmin-only si :

- l’activité Garmin est dans un type autorisé ;
- aucun match Strava fiable n’existe ;
- aucun doublon Garmin-only n’existe déjà ;
- l’activité est dans le périmètre de sync ou backfill ;
- l’activité contient au minimum une date, une durée et un type exploitable.

Ne pas créer Garmin-only si :

- match ambigu ;
- activité trop incomplète ;
- activité déjà importée ;
- type explicitement exclu.

### 3.4 Match ambigu

Aucun rejet manuel n’est demandé.

Comportement attendu :

```text
match ambiguous -> ne pas merger, ne pas créer automatiquement de doublon, journaliser le cas
```

Le cas ambigu doit être comptabilisé dans le résumé de sync.

Pas d’écran Admin dédié demandé.

---

## 4. Scénario 2 — Strava seul

### 4.1 Comportement attendu

- Application fonctionne comme aujourd’hui.
- Activités alimentées depuis Strava.
- Garmin recovery, Garmin activité, Training Effect Garmin, Body Battery, VFC Garmin sont absents.
- L’UI affiche une alerte douce, non bloquante.

### 4.2 UX attendue

Dans la zone provider :

```text
Strava connecté · Garmin non connecté
```

Dans les blocs Garmin :

```text
Garmin non connecté : les métriques de récupération et d’enrichissement Garmin sont désactivées.
```

Ne pas afficher d’erreur agressive.

### 4.3 Ne pas dégrader l’expérience route

Toutes les analyses basées sur Strava doivent rester disponibles :

- volume ;
- charge calculée si FC disponible ;
- allure ;
- GAP si altitude ;
- activités ;
- objectifs ;
- analytics.

---

## 5. Scénario 3 — Garmin seul

### 5.1 Comportement attendu

- Importer les activités Garmin dans `Activity`.
- Marquer clairement leur source :

```text
sourceProvider = "garmin"
sourceActivityId = garmin.activityId
```

- Alimenter les champs communs :
  - date ;
  - nom ;
  - type ;
  - distance ;
  - durée ;
  - dénivelé ;
  - FC moyenne / max si disponibles ;
  - calories ;
  - pace ;
  - streams si disponibles ;
  - rawJson ;
  - source metadata.

### 5.2 UI attendue

Dans la zone provider :

```text
Garmin connecté · Strava non connecté
```

Dans l’application :

```text
Source activité : Garmin
```

Dans les endroits où Strava est explicitement utilisé :

```text
Strava non connecté : certaines métriques Strava ne sont pas disponibles, mais les activités Garmin alimentent RunNSee.
```

### 5.3 Non-régression frontend

Le frontend ne doit pas planter si :

```text
activity.stravaActivityId = null
activity.sourceProvider = "garmin"
```

ou si l’identifiant externe est Garmin.

Toutes les URLs internes doivent utiliser une clé interne stable :

```text
Activity.id
```

et non `stravaActivityId` comme identifiant obligatoire.

---

## 6. Scénario 4 — Aucun provider connecté

### 6.1 Comportement attendu

- Afficher un onboarding propre.
- Ne pas afficher de dashboard vide anxiogène.
- Proposer connexion Strava et Garmin.

### 6.2 UI attendue

```text
Connecte Strava ou Garmin pour commencer à alimenter RunNSee.
```

---

# PARTIE B — Évolution du modèle de données

---

## 7. Objectif modèle

Permettre à `Activity` de représenter une activité canonique, quelle que soit sa source principale.

Actuellement, le modèle est probablement fortement orienté Strava.

Il faut le faire évoluer vers :

```text
Activity = activité canonique multi-source
```

---

## 8. Champs recommandés dans `Activity`

Ajouter ou vérifier les champs suivants :

```text
sourceProvider              // "strava" | "garmin" | "manual" éventuel futur
sourceActivityId            // identifiant provider primaire
sourcePriority              // "primary" | "fallback" | "manual"
canonicalSource             // si besoin, alias plus explicite
sourceCreatedAt             // date de création côté provider si disponible
sourceUpdatedAt             // date de mise à jour côté provider si disponible
sourceSyncedAt              // date d’intégration RunNSee
sourceUrl                   // URL Strava si disponible, null pour Garmin
hasExternalEnrichment       // bool ou calcul dérivé
```

Si certains champs existent déjà, ne pas les dupliquer.

### 8.1 Contrainte unique

Ajouter une contrainte unique :

```text
@@unique([appUserId, sourceProvider, sourceActivityId])
```

ou équivalent.

### 8.2 Champ `stravaActivityId`

Si `stravaActivityId` existe déjà :

- le conserver pour compatibilité ;
- le rendre nullable si nécessaire ;
- ne plus l’utiliser comme identifiant universel ;
- ajouter `sourceActivityId` pour les nouveaux usages multi-sources.

### 8.3 Identifiant interne

Toutes les routes internes devraient idéalement utiliser :

```text
Activity.id
```

ou une clé interne stable.

Si ce n’est pas encore le cas, préparer une migration progressive.

---

## 9. Table de correspondance provider

Créer une table dédiée :

```text
ActivityProviderLink
```

Champs proposés :

```text
id
appUserId
activityId
provider              // strava | garmin
providerActivityId
matchStatus           // exact | probable | ambiguous | manual | rejected | not_found
matchConfidence
matchedAt
rawDataId             // lien optionnel vers ExternalProviderRawData
createdAt
updatedAt
```

### 9.1 Pourquoi cette table est nécessaire

Elle permet :

- d’associer une activité Strava à une activité Garmin ;
- de garder la trace du matching ;
- de gérer plusieurs providers ;
- d’éviter de surcharger `ActivityProviderEnrichment` avec une logique d’identité ;
- de distinguer le lien provider du contenu enrichi.

### 9.2 Règle pour matchs ambigus

Si un match Garmin/Strava est ambigu :

- créer éventuellement une ligne `ActivityProviderLink` avec `matchStatus = "ambiguous"` si cela aide à l’audit technique ;
- ne pas associer à une activité canonique ;
- ne pas créer d’écran Admin ;
- ne pas demander d’arbitrage manuel ;
- comptabiliser dans le résumé de sync.

---

## 10. `ExternalProviderRawData`

Continuer à stocker les payloads bruts dans :

```text
ExternalProviderRawData
```

Avec typage clair :

```text
dataType = "activity_summary"
dataType = "activity_detail"
dataType = "activity_stream"
dataType = "recovery"
```

Clé unique recommandée :

```text
appUserId + sourceProvider + dataType + providerResourceId
```

Si la table existe déjà avec une contrainte différente, l’analyser avant modification.

---

# PARTIE C — Normalisation des activités Garmin

---

## 11. Objectif

Créer une couche de normalisation Garmin vers le modèle canonique `Activity`.

Ne pas injecter directement le raw Garmin dans le frontend.

---

## 12. Créer un normaliseur Garmin

Créer un service ou utilitaire backend :

```text
backend/src/services/providers/garminActivityNormalizer.service.js
```

ou équivalent.

Responsabilité :

```text
Garmin raw activity -> normalized canonical activity candidate
```

### 12.1 Champs à normaliser

| Canonique | Garmin candidat |
|---|---|
| sourceProvider | `"garmin"` |
| sourceActivityId | `activityId` |
| name | `activityName`, type + date si absent |
| type | `activityType`, `activityTypeDTO.typeKey` |
| startDate | `startTimeGMT` ou `startTimeLocal` avec prudence timezone |
| startDateLocal | `startTimeLocal` |
| distance | `distance` |
| movingTime | `duration` ou `movingDuration` |
| elapsedTime | `elapsedDuration` |
| totalElevationGain | `elevationGain` |
| totalElevationLoss | `elevationLoss` |
| averageHeartRate | `averageHR` |
| maxHeartRate | `maxHR` |
| calories | `calories` |
| averageSpeed | `averageSpeed` |
| maxSpeed | `maxSpeed` |
| averageCadence | `averageRunCadence` |
| rawJson | payload filtré/sanitisé |
| sourceSyncedAt | now |

### 12.2 Timezone

Attention critique :

- `startTimeLocal` peut être local sans offset.
- `startTimeGMT` est souvent plus fiable pour l’instant absolu.
- Le frontend peut avoir besoin de la date locale.

Stocker idéalement :

```text
startDateUtc
startDateLocal
timezone / offset si disponible
```

Si le modèle actuel n’a qu’une seule date, documenter la convention.

---

## 13. Types d’activités Garmin à inclure

Décision validée : **importer les activités run-like et les randonnées Garmin**.

Types initiaux :

```text
running
trail_running
treadmill_running
track_running
hiking
walking_hiking si équivalent Garmin
```

### 13.1 Règle recommandée

| Type Garmin | Action |
|---|---|
| running | inclure |
| trail_running | inclure |
| treadmill_running | inclure avec flag indoor |
| track_running | inclure |
| hiking | inclure |
| walking_hiking ou équivalent | inclure si Garmin le classe comme randonnée |
| walking simple | exclure par défaut sauf si classé randonnée |
| cycling | exclure |
| swimming | exclure |
| strength_training | exclure |
| generic / uncategorized | exclure sauf mapping fiable |

### 13.2 Wording UI

Si une randonnée Garmin est importée :

```text
Source : Garmin · Randonnée
```

Ne pas la mélanger avec les records route running.

Les analytics doivent pouvoir distinguer :

```text
course à pied
trail
randonnée
```

---

# PARTIE D — Matching Strava / Garmin

---

## 14. Objectif

Quand Strava et Garmin sont connectés, éviter les doublons.

Il faut rapprocher les activités Strava et Garmin.

---

## 15. Matching multi-critères

Utiliser un score basé sur :

| Critère | Poids indicatif |
|---|---:|
| écart de start time | 50 % |
| écart distance | 25 % |
| écart durée | 15 % |
| type compatible | 10 % |

### 15.1 Statuts

```text
exact
probable
ambiguous
not_found
rejected
```

Le statut `manual` n’est pas requis à ce stade, car aucun arbitrage manuel n’est demandé.

### 15.2 Règles indicatives

| Situation | Statut |
|---|---|
| même start time ± 2 min + distance proche | exact |
| start time ± 10 min + distance/durée proches | probable |
| plusieurs candidats proches | ambiguous |
| aucun candidat | not_found |
| type incompatible | rejected |

### 15.3 Ne jamais merger un match ambigu

Si match ambigu :

- ne pas enrichir automatiquement ;
- ne pas créer automatiquement de Garmin-only si le risque de doublon est élevé ;
- stocker le raw Garmin ;
- comptabiliser dans le résumé technique de sync ;
- ne pas créer d’écran Admin ;
- ne pas demander d’arbitrage utilisateur.

---

## 16. Cas Strava + Garmin avec Garmin-only

Si une activité Garmin n’a pas de match Strava :

Créer une activité Garmin-only automatiquement si :

- l’activité est de type autorisé ;
- pas de match Strava fiable ;
- pas de match ambigu ;
- pas de doublon Garmin existant ;
- la période est incluse dans le backfill/sync.

### 16.1 Point produit validé

Le fallback activité Garmin est actif par défaut si Strava et Garmin sont connectés.

Cela permet de combler les trous Strava :

- activité non synchronisée Strava ;
- Strava indisponible ;
- activité privée absente ;
- erreur d’import ;
- historique Garmin plus complet que Strava.

---

# PARTIE E — Synchronisation selon connexions

---

## 17. Orchestrateur multi-sources

Créer un orchestrateur backend :

```text
multiSourceActivitySync.service.js
```

ou équivalent.

Responsabilité :

```text
Synchroniser les activités selon les providers connectés et les règles de priorité.
```

---

## 18. Cas Strava + Garmin

Flux :

```text
1. Sync Strava incremental
2. Fetch Garmin activities sur période bornée
3. Stocker raw Garmin
4. Matcher Garmin ↔ Strava
5. Enrichir Strava si match fiable
6. Créer Garmin-only si aucun match fiable et aucun match ambigu
7. Retourner résumé
```

---

## 19. Cas Strava seul

Flux :

```text
1. Sync Strava incremental
2. Désactiver enrichment Garmin
3. Retourner statut Garmin absent
```

Message UI :

```text
Garmin non connecté : récupération et métriques Garmin indisponibles.
```

---

## 20. Cas Garmin seul

Flux :

```text
1. Fetch Garmin activities sur période bornée
2. Stocker raw Garmin
3. Normaliser candidates
4. Upsert Activity sourceProvider=garmin
5. Calculer analytics compatibles
6. Retourner résumé
```

### 20.1 Champs manquants possibles

Garmin peut ne pas fournir tous les champs Strava.

Le frontend doit gérer :

- sourceUrl null ;
- stravaActivityId null ;
- kudos/commentaires absents ;
- segments Strava absents ;
- relative effort Strava absent ;
- certaines streams absentes.

---

## 21. Cas aucun provider

Flux :

```text
1. Pas de sync
2. Retourner onboarding
```

---

# PARTIE F — Historique Garmin complet

---

## 22. Objectif

Importer progressivement tout l’historique Garmin existant sans :

- saturer Garmin Connect ;
- bloquer l’application ;
- créer de doublons ;
- exploser les temps de traitement ;
- dépasser les limites non officielles de `garminconnect`.

---

## 23. Stratégie validée : backfill manuel puis automatique par tranches de 180 jours

### 23.1 Principe

Le backfill Garmin historique est :

1. **lancé manuellement par l’utilisateur** depuis l’interface Admin / Données ou Connexions ;
2. puis **poursuivi automatiquement** par tranches successives jusqu’à complétion de l’historique.

Chaque exécution traite une fenêtre bornée :

```text
180 jours
```

Exemple :

```text
Fenêtre 1 : aujourd’hui - 180 j -> aujourd’hui
Fenêtre 2 : aujourd’hui - 360 j -> aujourd’hui - 181 j
Fenêtre 3 : aujourd’hui - 540 j -> aujourd’hui - 361 j
...
```

### 23.2 Fréquence validée

Proposition validée :

```text
1 tranche de 180 jours par heure maximum
```

Cela limite les appels et permet un rattrapage progressif.

### 23.3 Paramètres configurables

Rendre les valeurs configurables :

```text
GARMIN_BACKFILL_WINDOW_DAYS=180
GARMIN_BACKFILL_MIN_INTERVAL_MINUTES=60
GARMIN_BACKFILL_MAX_WINDOWS_PER_RUN=1
GARMIN_ACTIVITY_SYNC_RECENT_DAYS=30
```

### 23.4 Démarrage manuel

Ajouter une action UI :

```text
Lancer l’import historique Garmin
```

Message de confirmation :

```text
L’import historique Garmin va démarrer par les activités les plus récentes, puis continuer automatiquement par tranches de 180 jours jusqu’à complétion.
```

---

## 24. État de backfill

Créer un curseur de backfill.

Option 1 : utiliser `SyncCursor`.

Option 2 : créer une table dédiée :

```text
ProviderBackfillCursor
```

Champs proposés :

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

### 24.1 Recommandation

Créer une table dédiée `ProviderBackfillCursor`.

Raison :

- ne pas polluer les curseurs Strava ;
- distinguer incremental sync et backfill historique ;
- faciliter pause/reprise ;
- suivre la complétion.

---

## 25. Algorithme de backfill Garmin

Pseudo-flux :

```text
startGarminActivitiesBackfill(appUserId):
  vérifier Garmin connecté
  vérifier pas de job backfill actif
  initialiser curseur si absent
  créer job backfill

executeGarminBackfillWindow(job):
  lire curseur
  déterminer fenêtre [startDate, endDate]
  appeler Garmin fetch_activities
  stocker raw data
  normaliser candidates
  si Strava connecté :
    matcher et enrichir Strava
    créer Garmin-only si aucun match fiable et aucun match ambigu
  sinon :
    créer Activity Garmin-only
  mettre à jour curseur
  si historique non terminé :
    programmer prochaine fenêtre après GARMIN_BACKFILL_MIN_INTERVAL_MINUTES
  sinon :
    marquer completed
```

---

## 26. Sens de parcours historique

Décision recommandée :

```text
du plus récent vers le plus ancien
```

Pourquoi :

- les données récentes sont plus utiles ;
- elles alimentent vite Dashboard / Analytics ;
- si le backfill s’arrête, l’utilisateur a déjà les données importantes.

---

## 27. Pause / reprise

Prévoir :

- pause backfill ;
- reprise ;
- reset contrôlé si nécessaire ;
- statut visible dans Admin / Données.

Ne pas relancer tout l’historique si le curseur existe.

### 27.1 Automatisation après lancement manuel

Après le lancement manuel initial, le système doit poursuivre automatiquement jusqu’à complétion.

Mécanisme possible :

- scheduler interne ;
- job périodique ;
- vérification au démarrage backend ;
- cron applicatif si disponible.

Garde-fous :

- ne pas lancer deux fenêtres en parallèle ;
- respecter `GARMIN_BACKFILL_MIN_INTERVAL_MINUTES`;
- arrêter si Garmin est déconnecté ;
- passer en `error` ou `paused` après erreurs répétées.

---

## 28. UI backfill Garmin

Dans Admin / Données ou Connexions :

```text
Historique Garmin activités
Statut : en cours
Dernière fenêtre traitée : 01/01/2026 → 30/06/2026
Activités importées : 86
Prochaine tranche : dans environ 1 h
[Pause] [Reprendre]
```

### 28.1 Ne pas afficher dans Aujourd’hui

Le backfill est un sujet technique/admin.

Ne pas le mettre dans l’onglet Aujourd’hui.

---

# PARTIE G — Adaptations frontend multi-sources

---

## 29. Frontend : ne plus supposer Strava partout

Rechercher les usages de :

```text
stravaActivityId
stravaId
externalId
sourceUrl
```

Vérifier que :

- les routes internes peuvent ouvrir une activité Garmin-only ;
- les boutons/lien Strava sont masqués si sourceUrl absent ;
- les labels indiquent la source ;
- les métriques absentes ne provoquent pas d’erreur.

---

## 30. Badge source activité

Dans liste et détail activité, afficher discrètement :

```text
Source : Strava
```

ou :

```text
Source : Garmin
```

ou :

```text
Source : Strava + Garmin
```

Règle :

| Cas | Badge |
|---|---|
| Activity sourceProvider=strava, enrichment Garmin présent | Strava + Garmin |
| Activity sourceProvider=strava, pas enrichment | Strava |
| Activity sourceProvider=garmin | Garmin |
| Activity sourceProvider=garmin, type randonnée | Garmin · Randonnée |

---

## 31. États Garmin / Strava désactivés

Si Strava seul :

```text
Garmin non connecté : les métriques récupération, VFC, Body Battery et enrichissements Garmin sont indisponibles.
```

Si Garmin seul :

```text
Strava non connecté : certaines métriques Strava ne sont pas disponibles, mais les activités Garmin alimentent RunNSee.
```

Si Strava + Garmin :

```text
Strava est utilisé en priorité lorsque les activités correspondent ; Garmin complète et comble les activités absentes.
```

---

# PARTIE H — Sync globale adaptée au fallback

---

## 32. Évolution de `/sync/all`

Le endpoint global doit devenir provider-aware.

### 32.1 Si Strava + Garmin

```text
sync strava incremental
sync garmin recovery
sync garmin activities recent 30 jours
match/enrich
create garmin-only if no reliable Strava match
```

### 32.2 Si Strava seul

```text
sync strava incremental
skip garmin recovery
skip garmin activities
```

### 32.3 Si Garmin seul

```text
skip strava
sync garmin recovery
sync garmin activities recent 30 jours
upsert activities garmin-only
```

### 32.4 Si aucun

```text
return no_provider_connected
```

---

## 33. Réponse `/sync/all`

Structure recommandée :

```json
{
  "status": "running",
  "mode": "strava_primary_garmin_enrichment_with_fallback",
  "job": {
    "id": "...",
    "type": "global_incremental"
  },
  "providers": {
    "strava": {
      "connected": true,
      "requested": true,
      "role": "primary_when_matched",
      "status": "queued"
    },
    "garmin": {
      "connected": true,
      "requested": true,
      "role": "enrichment_and_fallback",
      "status": "queued",
      "recentDays": 30
    }
  }
}
```

Modes possibles :

```text
strava_primary_garmin_enrichment_with_fallback
strava_only
garmin_primary
no_provider
```

---

# PARTIE I — Risques de régression

---

## 34. Risques principaux

| Risque | Niveau | Garde-fou |
|---|---:|---|
| Doublons activité Strava/Garmin | Élevé | contrainte unique + matching prudent |
| Création Garmin-only à tort | Élevé | ne pas créer si match ambigu |
| Frontend dépendant de stravaActivityId | Élevé | audit complet des usages |
| Import Garmin historique trop massif | Élevé | fenêtres 180 j + fréquence 1/h |
| API garminconnect instable | Élevé | retry, timeout, statut erreur clair |
| Timezone Garmin | Moyen/Élevé | stocker UTC + local si possible |
| Randonnées mélangées aux records running | Moyen | typage activité et filtres analytics |
| Données Garmin incomplètes | Moyen | états partiels |
| Backfill interrompu | Moyen | curseur persistant |
| Analytics route perturbées | Moyen | tests source Strava-only |
| Trail/GAP altitude bruitée | Moyen | dataQuality altitude |
| Secrets logs Garmin | Élevé | payload filtré, pas de session logs |

---

# PARTIE J — Plan de développement recommandé

---

## Lot 1 — Audit multi-sources

### Objectif

Identifier tous les endroits où RunNSee suppose implicitement Strava.

### À faire

- rechercher `stravaActivityId`, `stravaId`, `sourceUrl`;
- identifier routes frontend ;
- identifier routes backend ;
- identifier contraintes DB ;
- identifier composants avec lien Strava obligatoire.

### Livrable

Document court :

```text
docs/MULTI_SOURCE_AUDIT.md
```

---

## Lot 2 — Modèle de données multi-sources

### Objectif

Préparer Activity à supporter Garmin comme source canonique et comme fallback automatique.

### À faire

- ajouter champs source si absents ;
- ajouter contrainte unique ;
- créer `ActivityProviderLink`;
- créer `ProviderBackfillCursor`;
- migrer données Strava existantes :
  - `sourceProvider="strava"`
  - `sourceActivityId=stravaActivityId`

### Tests

- migration SQLite ;
- migration PostgreSQL ;
- comparaison schémas ;
- import existant non cassé.

---

## Lot 3 — Normaliseur Garmin Activity

### Objectif

Transformer Garmin raw activity en candidate Activity.

### À faire

- créer normaliseur ;
- mapper champs ;
- gérer timezone ;
- filtrer types :
  - running ;
  - trail_running ;
  - treadmill_running ;
  - track_running ;
  - hiking ;
- tests unitaires.

---

## Lot 4 — Matching Strava/Garmin

### Objectif

Éviter les doublons.

### À faire

- créer scorer de matching ;
- statuts exact/probable/ambiguous/not_found/rejected ;
- intégrer `ActivityProviderLink`;
- si not_found : créer Garmin-only ;
- si ambiguous : ne pas créer, journaliser ;
- tests unitaires.

---

## Lot 5 — Sync Garmin-only récente

### Objectif

Supporter le cas Garmin seul sur période récente et le fallback Garmin avec Strava connecté.

### À faire

- si Garmin connecté et Strava absent :
  - fetch Garmin activities 30 jours ;
  - normaliser ;
  - upsert Activity sourceProvider=garmin.
- si Garmin connecté et Strava connecté :
  - match Strava/Garmin ;
  - enrichir Strava si match fiable ;
  - créer Garmin-only si aucun match fiable.

### Tests

- Garmin seul ;
- Strava absent ;
- Strava + Garmin avec match ;
- Strava + Garmin sans match ;
- match ambigu ;
- activité déjà importée ;
- activité randonnée ;
- activité type non supporté.

---

## Lot 6 — Sync globale provider-aware

### Objectif

Adapter `/sync/all` aux 4 modes :

- Strava + Garmin ;
- Strava seul ;
- Garmin seul ;
- aucun.

### Règle validée

Sync Garmin activités sur :

```text
30 jours
```

### Tests

- chaque mode ;
- erreurs partielles ;
- statut UI.

---

## Lot 7 — Backfill Garmin historique

### Objectif

Importer l’historique Garmin par tranches.

### À faire

- créer curseur `ProviderBackfillCursor`;
- créer job backfill ;
- fenêtre 180 jours ;
- fréquence 1/h ;
- lancement manuel initial ;
- poursuite automatique jusqu’à complétion ;
- pause/reprise ;
- résumé admin.

### Tests

- première fenêtre ;
- reprise après erreur ;
- idempotence ;
- arrêt quand historique terminé ;
- non-lancement en parallèle ;
- reprise après redémarrage backend.

---

## Lot 8 — Frontend multi-sources

### Objectif

Afficher les activités Garmin-only sans crash.

### À faire

- badge source ;
- masquer liens Strava absents ;
- adapter Activity Detail ;
- adapter Activities list ;
- adapter Analytics ;
- adapter Dashboard ;
- états provider ;
- distinguer randonnée vs course dans les filtres.

### Tests

- Strava activity ;
- Strava + Garmin enrichment ;
- Garmin-only activity ;
- Garmin randonnée ;
- Strava absent.

---

## Lot 9 — Documentation `.ai` et docs projet

Mettre à jour :

```text
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
.ai/codebase_map.md
docs/MULTI_SOURCE_ARCHITECTURE.md
```

---

# PARTIE K — Critères d’acceptation

---

## 35. Critères fonctionnels

- Strava + Garmin : Strava canonique si match fiable, Garmin enrichit.
- Strava + Garmin : Garmin-only créé automatiquement si absence de match fiable.
- Strava seul : application fonctionne, Garmin désactivé proprement.
- Garmin seul : activités Garmin visibles et analysables.
- Randonnées Garmin importées.
- Aucun provider : onboarding clair.
- Pas de doublons Strava/Garmin.
- Pas de création Garmin-only si match ambigu.
- Backfill Garmin manuel au démarrage puis automatique jusqu’à complétion.
- Backfill par fenêtre de 180 jours.
- Sync globale Garmin activités sur 30 jours.
- Sync globale adaptée au mode provider.
- Activités Garmin-only sans crash frontend.

---

## 36. Critères techniques

- migrations SQLite et PostgreSQL OK ;
- schémas alignés ;
- contraintes uniques présentes ;
- `ActivityProviderLink` créé et utilisé ;
- `ProviderBackfillCursor` créé et utilisé ;
- tests backend matching/normalisation ;
- tests frontend activités multi-sources ;
- logs sans secrets ;
- jobs idempotents ;
- backfill borné.

---

## 37. Tests à exécuter

Backend :

```bash
cd backend
npm ci
npm run prisma:generate
npx prisma validate
npm run prisma:pg:validate
npm run db:compare-schemas
npm test
```

Frontend :

```bash
cd frontend
npm ci
npm test -- --run
npm run build
```

Recette manuelle :

```text
1. Strava seul
2. Garmin seul
3. Strava + Garmin avec match fiable
4. Strava + Garmin sans match -> Garmin-only
5. Strava + Garmin match ambigu -> pas de création automatique
6. Aucun provider
7. Backfill Garmin 180 j
8. Relance backfill automatique après 1 h
9. Pause/reprise backfill
10. Activité Garmin-only running
11. Activité Garmin-only randonnée
12. Activité Strava enrichie Garmin
13. Timezone activité Garmin
```

---

# PARTIE L — Décisions produit finales

---

## 38. Décisions produit à appliquer

| Sujet | Décision |
|---|---|
| Fallback Garmin si Strava connecté mais activité absente | Oui, automatique |
| Import randonnées Garmin | Oui |
| Sync globale Garmin activités | 30 jours |
| Backfill Garmin historique | Lancement manuel, puis automatique jusqu’à complétion |
| Taille fenêtre backfill | 180 jours |
| Fréquence backfill | 1 fenêtre par heure maximum |
| Écran écarts Strava/Garmin | Non |
| Rejet manuel match ambigu | Non |
| Match ambigu | Ignorer, journaliser, ne pas créer de doublon |

---

## 39. Définition de terminé

Ce chantier est terminé uniquement si :

- le modèle supporte explicitement les sources Strava et Garmin ;
- Garmin seul peut alimenter `Activity`;
- Strava + Garmin ne crée pas de doublons ;
- Strava + Garmin crée automatiquement Garmin-only si Strava ne contient pas l’activité ;
- les randonnées Garmin sont importées et distinguées ;
- le backfill historique Garmin est borné, idempotent, reprenable et poursuit automatiquement après lancement manuel ;
- `/sync/all` respecte les modes provider ;
- le frontend ne dépend plus obligatoirement de `stravaActivityId`;
- les tests couvrent les principaux scénarios ;
- les fichiers `.ai/*.md` sont mis à jour ;
- les risques résiduels sont documentés.

---

## 40. Message final attendu de CODEX / Claude Pro

À la fin, fournir :

```text
Lots réalisés :
- Audit multi-sources : ...
- Modèle de données : ...
- Normaliseur Garmin : ...
- Matching : ...
- Sync Garmin-only : ...
- Sync globale : ...
- Backfill historique : ...
- Frontend multi-sources : ...

Tests exécutés :
- backend : ...
- frontend : ...
- migrations : ...

Décisions appliquées :
- Garmin-only avec Strava connecté : oui
- activités incluses : running, trail_running, treadmill_running, track_running, hiking
- fenêtre sync globale : 30 jours
- fenêtre backfill : 180 jours
- fréquence backfill : 1/h
- backfill : manuel puis automatique
- écran écarts : non
- rejet manuel ambigu : non

Risques résiduels :
- ...
```
