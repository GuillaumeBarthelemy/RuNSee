# RunNSee — Plan correctif post-implémentation Trail + Providers + Sync globale

## 0. Objectif du plan correctif

Ce document est destiné à CODEX / Claude Code Pro.

Le plan précédent a été implémenté, mais une revue fonctionnelle et visuelle met en évidence plusieurs corrections nécessaires avant validation finale.

Objectif : **corriger les écarts constatés sans relancer une refonte globale**.

Corrections explicites demandées :

1. supprimer le doublon visuel de statut Strava/Garmin dans la zone compte utilisateur ;
2. améliorer l’UX de la carte `Lecture du jour`, actuellement mal positionnée et peu lisible ;
3. faire en sorte que la synchronisation globale Strava/Garmin récupère aussi les données d’activités Garmin, et pas seulement la récupération Garmin ;
4. intégrer les anomalies complémentaires détectées pendant la revue.

---

## 1. Règles impératives

### 1.1 Ne pas refaire toute l’application

Ne pas refondre l’architecture globale.

Ne pas changer les logiques métier existantes si elles ne sont pas directement concernées.

Ne pas ajouter de nouvelles métriques Trail dans `Aujourd’hui`.

Le but est de corriger :

- l’UX ;
- l’orchestration de synchronisation ;
- la cohérence documentaire ;
- la non-régression.

### 1.2 Préserver les acquis

Préserver :

- connexion Strava ;
- connexion Garmin ;
- sync Strava existante ;
- sync Garmin recovery existante ;
- enrichissement Garmin activité ciblé depuis le détail activité ;
- socle Trail existant ;
- affichage utilisateur connecté ;
- navigation actuelle ;
- fichiers `.ai/*.md`.

### 1.3 Commits atomiques attendus

Exemples de commits attendus :

```text
fix(layout): remove duplicated provider connection status
fix(today): improve daily decision card hierarchy
feat(sync): include bounded garmin activity enrichment in global sync
fix(docs): archive plans under docs/old consistently
chore(repo): clean generated archive artifacts
docs(ai): update corrective plan handoff and regression risks
```

---

# PARTIE A — Corrections UX zone compte / providers

---

## 2. Problème constaté

Dans la zone compte utilisateur affichée au-dessus de la navigation, les informations de connexion sont dupliquées visuellement.

Capture observée :

```text
Compte actif
[Strava connecté]      <-- statut déjà affiché ici

Guillaume Barthélémy
...

[Strava connecté]      <-- doublon
[Garmin connecté]
```

Le résultat est lourd, redondant et donne l’impression que Strava a un statut plus important que Garmin.

---

## 3. Correction attendue

### 3.1 Supprimer le statut Strava historique dans l’entête de la carte compte

Dans `CurrentAccountPanel.jsx`, supprimer ou remplacer le bloc supérieur :

```jsx
<span className={`sidebar-account-status ...`}>
  ...
  {safeAccount.stravaStatusLabel}
</span>
```

Ce bloc ne doit plus afficher uniquement Strava.

### 3.2 Garder une seule source de vérité visuelle

Le statut des providers doit être affiché uniquement dans la ligne dédiée :

```text
Strava connecté
Garmin connecté
```

ou en version compacte mobile :

```text
S● G●
```

### 3.3 Proposition de nouvelle structure visuelle

Version desktop :

```text
Compte actif

[Avatar] Guillaume Barthélémy
         barthelemy.guil...

Sources
● Strava connecté
● Garmin connecté

Dernier rafraîchissement
07 mai 2026, 13:57

[↻] [Se déconnecter]
```

Version mobile / sidebar étroite :

```text
Compte actif
Guillaume B.
S● G●  ↻
```

### 3.4 Wording à corriger

Corriger les accents dans les libellés visibles :

| Actuel | Attendu |
|---|---|
| Strava connecte | Strava connecté |
| Garmin connecte | Garmin connecté |
| en verification | en vérification |
| expire | expiré |
| Dernier rafraichissement | Dernier rafraîchissement |
| Se deconnecter | Se déconnecter |

### 3.5 Accessibilité

Chaque pastille doit avoir un `title` et/ou `aria-label` clair :

```text
Strava connecté
Garmin connecté
Strava non connecté
Garmin en erreur
```

Ne pas se reposer uniquement sur la couleur.

---

## 4. Critères d’acceptation — zone compte

- Un seul affichage de statut Strava.
- Un seul affichage de statut Garmin.
- Strava et Garmin ont le même niveau visuel.
- Le bouton sync reste visible.
- La zone reste compacte.
- Aucun secret provider n’est exposé.
- Mobile lisible.
- Tous les libellés visibles sont accentués.

---

# PARTIE B — Correction UX `Lecture du jour`

---

## 5. Problème constaté

La carte `Lecture du jour` est visuellement trop horizontale et mal hiérarchisée.

Capture observée :

```text
Lecture du jour

[Verdict du jour]
Pic récent détecté...

[Contexte trail]
Spécificité trail récente : 624 m D+ et 519 m D-.

[Forme du moment] [Fatigue récente] [Charge]
Disponible         Faible            En baisse
```

Problèmes :

1. Le bloc `Contexte trail` ressemble à une carte séparée qui coupe la lecture.
2. Le verdict est très large et peu actionnable.
3. Les trois tuiles Forme / Fatigue / Charge paraissent déconnectées du verdict.
4. La notion “ce que je peux faire aujourd’hui” n’est pas assez mise en avant.
5. Le contexte Trail est affiché comme une donnée brute, pas comme une aide à la décision.
6. L’ensemble prend beaucoup de largeur mais ne guide pas assez l’utilisateur.

---

## 6. Objectif UX corrigé

La carte `Lecture du jour` doit répondre rapidement à :

```text
Qu’est-ce que je peux faire aujourd’hui ?
Pourquoi ?
Y a-t-il une vigilance ?
```

Elle doit rester synthétique.

Le Trail doit uniquement **modifier ou contextualiser la recommandation**, pas ajouter un bloc analytique lourd dans `Aujourd’hui`.

---

## 7. Nouvelle structure recommandée

### 7.1 Structure cible

Remplacer la hiérarchie actuelle par 4 zones claires :

```text
Lecture du jour

1. Verdict synthétique
   Forme correcte, marge présente.

2. Ce que tu peux faire aujourd’hui
   Endurance, trail facile ou montée contrôlée.

3. Vigilance éventuelle
   Charge descente récente modérée : évite les descentes rapides.

4. Signaux clés
   VFC stable · Sommeil correct · Charge 7j en baisse · Trail récent 624 m D+
```

### 7.2 Variante visuelle desktop

```text
┌─────────────────────────────────────────────────────────────┐
│ Lecture du jour                                             │
│ Forme, fatigue récente et charge — aide au choix de séance. │
│                                                             │
│ ┌───────────────────────────────┐ ┌───────────────────────┐ │
│ │ Verdict                       │ │ Signaux clés           │ │
│ │ Forme correcte, marge présente│ │ VFC stable             │ │
│ │                               │ │ Sommeil correct        │ │
│ │ Aujourd’hui                   │ │ Charge 7j en baisse    │ │
│ │ Endurance ou trail facile     │ │ Trail : 624 m D+       │ │
│ │                               │ │                       │ │
│ │ Vigilance                     │ │ Confiance : haute      │ │
│ │ Descente rapide à éviter      │ │                       │ │
│ └───────────────────────────────┘ └───────────────────────┘ │
│                                                             │
│ [Forme disponible] [Fatigue faible] [Charge en baisse]      │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Variante mobile

```text
Lecture du jour

Forme correcte, marge présente.
Aujourd’hui : endurance ou trail facile.
Vigilance : descente rapide à éviter.

VFC stable · Sommeil correct · Charge en baisse
```

---

## 8. Implémentation attendue

### 8.1 Modifier `DashboardDecisionSummaryCard.jsx`

À faire :

1. transformer le bloc verdict en bloc décisionnel ;
2. intégrer le contexte Trail à l’intérieur de la décision ;
3. supprimer le bloc Trail séparé sous forme de bande pleine largeur ;
4. ajouter une notion explicite `Aujourd’hui` ou `Séance cohérente`;
5. conserver les 3 pills Forme / Fatigue / Charge, mais en second niveau ;
6. limiter les chips de signaux à 4 ou 5 maximum.

### 8.2 Adapter le modèle si nécessaire

Si le modèle actuel ne fournit pas encore de texte actionnable, ajouter une couche de présentation frontend.

Ne pas modifier profondément l’algorithme métier si ce n’est pas nécessaire.

Champs de présentation possibles :

```js
{
  headline: "Forme correcte, marge présente.",
  todayAction: "Endurance, trail facile ou montée contrôlée.",
  caution: "Évite les descentes rapides aujourd’hui.",
  evidence: ["VFC stable", "Sommeil correct", "Charge en baisse", "Trail 624 m D+"],
  confidence: "Haute"
}
```

### 8.3 Trail dans Aujourd’hui : règle stricte

Le contexte Trail ne doit apparaître que si :

- objectif Trail actif ;
- ou activité Trail/vallonnée récente ;
- ou charge descente significative ;
- ou la recommandation est réellement modifiée.

Ne pas afficher simplement :

```text
Spécificité trail récente : 624 m D+ et 519 m D-.
```

si cela ne change pas la décision.

Préférer :

```text
Contexte trail : volume récent correct, pas de vigilance majeure.
```

ou :

```text
Vigilance trail : descente récente élevée, évite les descentes rapides.
```

### 8.4 Wording recommandé

| Cas | Message |
|---|---|
| disponible | `Endurance, trail facile ou montée contrôlée.` |
| vigilance descente | `Évite les descentes rapides aujourd’hui.` |
| fatigue générale | `Privilégie une sortie facile ou du repos actif.` |
| charge élevée | `Garde une intensité basse malgré une forme correcte.` |
| données insuffisantes | `Lecture prudente : données incomplètes.` |

---

## 9. Critères d’acceptation — `Lecture du jour`

- La carte est compréhensible en moins de 10 secondes.
- Le premier élément lu est le verdict.
- Le deuxième élément lu est ce que l’utilisateur peut faire aujourd’hui.
- Le contexte Trail ne casse plus la hiérarchie visuelle.
- Pas plus d’une vigilance affichée.
- Les trois tuiles Forme / Fatigue / Charge restent présentes mais secondaires.
- Aucun ajout massif de métriques Trail dans `Aujourd’hui`.
- Version mobile lisible sans scroll horizontal.

---

# PARTIE C — Sync globale Strava + Garmin activité

---

## 10. Problème constaté

Le bouton global de synchronisation lance bien :

- Strava incremental sync ;
- Garmin recovery sync.

Mais il ne permet pas de récupérer les données d’activités Garmin.

Dans le code actuel, `garminActivities` est probablement retourné comme :

```json
{
  "requested": false,
  "status": "skipped",
  "reason": "manual_activity_context_required"
}
```

C’était volontairement prudent dans le plan précédent, mais le besoin évolue :

> Le bouton de synchronisation globale doit aussi récupérer les données d’activités Garmin.

---

## 11. Objectif fonctionnel

Le bouton global doit lancer une synchronisation complète mais bornée :

1. Strava incremental sync ;
2. Garmin recovery recent sync ;
3. Garmin activity enrichment sur une période récente et contrôlée.

---

## 12. Règle impérative : pas d’enrichissement Garmin illimité

Ne pas lancer un backfill illimité Garmin activités.

L’enrichissement Garmin activité doit être borné.

Paramètre recommandé :

```text
GARMIN_ACTIVITY_ENRICHMENT_GLOBAL_DAYS=30
```

Valeur initiale possible :

```text
14 jours
```

ou :

```text
30 jours
```

Recommandation : **30 jours maximum**, configurable par `.env`.

---

## 13. Problème d’orchestration actuel

Attention : si Strava incremental sync est lancée en arrière-plan puis Garmin activity enrichment est lancé immédiatement, les nouvelles activités Strava importées ne seront peut-être pas encore disponibles pour le matching Garmin.

Donc deux stratégies sont possibles.

---

## 14. Option recommandée — Créer un vrai job global séquentiel

### 14.1 Principe

Créer un job `global` ou `global_incremental` dans `SyncJob`.

Le job exécute séquentiellement :

```text
1. Strava incremental sync
2. Garmin recovery recent sync
3. Garmin activity enrichment recent bounded
```

Ainsi, l’enrichissement Garmin activité s’exécute après l’import Strava.

### 14.2 Flux cible

```text
POST /sync/all
  -> crée SyncJob type = global
  -> dispatch job global en arrière-plan
      -> étape 1 : Strava incremental si connecté
      -> étape 2 : Garmin recovery si connecté
      -> étape 3 : Garmin activities sur 30 jours si connecté
  -> /sync/jobs/current suit le job global
```

### 14.3 Avantages

- orchestration fiable ;
- un seul statut de sync visible ;
- pas de race condition entre Strava et Garmin ;
- meilleure expérience utilisateur ;
- extensible.

### 14.4 Inconvénient

- nécessite d’étendre le dispatcher `syncJob.service.js`.

C’est acceptable car le besoin est désormais clair.

---

## 15. Alternative minimale si job global trop risqué

Si la création d’un vrai job global est jugée trop lourde :

1. garder Strava incremental en job arrière-plan ;
2. lancer Garmin recovery immédiatement ;
3. lancer Garmin activity enrichment uniquement sur les activités déjà présentes des 30 derniers jours ;
4. afficher clairement :

```text
Activités Garmin : enrichissement des activités déjà présentes.
```

Limite : les activités nouvellement importées par Strava ne seront enrichies qu’au prochain clic global ou depuis le détail activité.

Cette option est moins bonne.

Recommandation : **implémenter le vrai job global séquentiel**.

---

## 16. Implémentation backend attendue

### 16.1 Ajouter un type de job global

Dans `syncJob.service.js`, gérer :

```text
jobType = "global"
```

ou :

```text
jobType = "global_incremental"
```

Nom recommandé :

```text
global_incremental
```

car le job ne fait pas d’historique complet.

### 16.2 Ajouter dispatcher

Dans `dispatchSyncJob(job)` :

```text
if jobType === "global_incremental":
  executeGlobalIncrementalSyncJob(job.id)
```

### 16.3 Créer `executeGlobalIncrementalSyncJob`

Responsabilités :

1. charger le job et l’utilisateur ;
2. vérifier connexions Strava/Garmin ;
3. mettre à jour le job avec une progression par étape ;
4. exécuter Strava incremental si connecté ;
5. exécuter Garmin recovery recent si connecté ;
6. exécuter Garmin activity enrichment bounded si connecté ;
7. ne pas faire échouer tout le job si un provider échoue ;
8. retourner un résultat par provider ;
9. marquer le job `completed`, `completed_with_warnings` ou `failed`.

### 16.4 Résultat attendu

Structure recommandée dans `SyncJob.message` ou `errorDetails` :

```json
{
  "providers": {
    "strava": {
      "requested": true,
      "status": "completed",
      "activitiesImported": 3
    },
    "garminRecovery": {
      "requested": true,
      "status": "completed",
      "daysProcessed": 7
    },
    "garminActivities": {
      "requested": true,
      "status": "completed",
      "periodDays": 30,
      "matched": 5,
      "ambiguous": 1,
      "notFound": 2
    }
  }
}
```

### 16.5 Statuts partiels

Ne pas considérer comme échec total :

- Garmin non connecté ;
- Strava non connecté ;
- aucune activité Garmin trouvée ;
- activité Garmin ambiguë ;
- aucune activité récente à enrichir.

Cas d’échec total :

- erreur serveur inattendue ;
- DB indisponible ;
- job impossible à créer ;
- erreur critique non récupérable.

### 16.6 Endpoint `/sync/all`

Modifier `/sync/all` pour créer un job global, pas seulement lancer Strava + Garmin recovery de manière décorrélée.

Réponse initiale :

```json
{
  "status": "running",
  "message": "Synchronisation globale lancée.",
  "job": {
    "id": "...",
    "status": "queued",
    "type": "global_incremental"
  },
  "providers": {
    "strava": { "requested": true, "status": "queued" },
    "garminRecovery": { "requested": true, "status": "queued" },
    "garminActivities": { "requested": true, "status": "queued", "periodDays": 30 }
  }
}
```

---

## 17. Intégration avec `garminActivityEnrichment.service.js`

### 17.1 Ajouter un mode d’enrichissement récent

Actuellement l’enrichissement activité semble ciblé par :

```text
stravaActivityId
```

ou période.

Ajouter un mode explicite :

```js
enrichGarminActivitiesForUser(appUserId, {
  mode: "recent_missing",
  days: 30,
  triggerSource: "global_sync"
})
```

### 17.2 Comportement

Le mode `recent_missing` doit :

1. prendre les activités Strava des X derniers jours ;
2. exclure celles déjà enrichies avec succès, sauf option `force`;
3. appeler Garmin `fetch_activities` sur la période bornée ;
4. matcher uniquement les activités fiables ;
5. ignorer les matchs ambigus ;
6. retourner un résumé clair.

### 17.3 Non-régression

Conserver le mode ciblé depuis le détail activité :

```js
enrichGarminActivitiesForUser(appUserId, {
  stravaActivityId
})
```

Ne pas casser l’action existante du détail activité.

---

## 18. Intégration frontend attendue

### 18.1 Bouton global

Après clic sur le bouton sync global :

- afficher `Synchronisation globale en cours`;
- rafraîchir les statuts providers ;
- rafraîchir le dashboard après fin de job ;
- ne pas prétendre que tout est terminé immédiatement si le job est encore en cours.

### 18.2 Texte UX

Modifier tooltip / aria-label :

```text
Synchroniser Strava, Garmin récupération et activités Garmin récentes
```

Version courte :

```text
Synchroniser les sources
```

### 18.3 Résultat partiel

Afficher un message si possible :

```text
Strava synchronisé · Garmin récupération synchronisée · Activités Garmin enrichies : 5
```

ou :

```text
Strava synchronisé · Garmin activité : aucune correspondance récente
```

Ne pas afficher une erreur globale si seul Garmin activité n’a rien trouvé.

---

## 19. Critères d’acceptation — sync globale

- `/sync/all` crée ou lance un vrai flux global.
- Strava incremental fonctionne toujours.
- Garmin recovery fonctionne toujours.
- Garmin activity enrichment est lancé sur période bornée.
- Le bouton global ne lance pas d’enrichissement illimité.
- Les activités Strava nouvellement importées peuvent être enrichies dans le même flux si job global séquentiel retenu.
- Le détail activité conserve son bouton d’enrichissement ciblé.
- Les matchs ambigus ne sont pas appliqués.
- Les erreurs provider sont isolées.
- Aucun secret Garmin n’est loggé.

---

# PARTIE D — Autres anomalies à intégrer au correctif

---

## 20. Historisation documentaire : `docs/_old` vs `docs/old`

### 20.1 Problème

Le plan demandait une historisation dans :

```text
docs/old/
```

Mais l’archive contient :

```text
docs/_old/
```

Cela crée une incohérence documentaire.

### 20.2 Correction attendue

Standardiser le dossier attendu :

```text
docs/old/
```

Déplacer les fichiers de :

```text
docs/_old/
```

vers :

```text
docs/old/
```

sauf si une convention projet existante justifie explicitement `_old`.

### 20.3 Non-régression

- Ne pas supprimer les anciens plans.
- Ne pas écraser de fichiers.
- Utiliser `git mv`.
- Mettre à jour `.ai/current_context.md` si le chemin change.
- Mettre à jour les références éventuelles vers `docs/_old`.

### 20.4 Commit attendu

```text
fix(docs): use docs/old for archived plans
```

---

## 21. Packaging encore trop large

### 21.1 Problème

L’archive transmise contient encore des éléments qui ne devraient pas être dans une archive source propre :

```text
frontend/node_modules/
backend/node_modules/
frontend/dist/
backend/generated/
.env
.env.*.local
*.log
.tmp/
```

Même si ces éléments peuvent être ignorés par Git, ils ne doivent pas être transmis dans l’archive de revue.

### 21.2 Correction attendue

Vérifier ou corriger le script d’export source.

Il doit exclure :

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

### 21.3 Critère d’acceptation

Générer une archive de contrôle propre.

Elle ne doit pas contenir :

- `node_modules`;
- `.env`;
- `.db`;
- logs;
- `dist`;
- `.tmp`;
- fichiers runtime générés.

### 21.4 Commit attendu

```text
chore(repo): harden source archive export exclusions
```

---

## 22. Wording global sans accents

### 22.1 Problème

Plusieurs libellés visibles restent sans accents :

```text
Activites
Reglages
connecte
deconnecter
rafraichissement
perimetre
recuperation
```

### 22.2 Correction attendue

Corriger les libellés visibles utilisateur, notamment :

| Actuel | Attendu |
|---|---|
| Activites | Activités |
| Reglages | Réglages |
| connecté/connecte | connecté |
| deconnecter | déconnecter |
| rafraichissement | rafraîchissement |
| perimetre | périmètre |
| recuperation | récupération |
| seance | séance |
| montee | montée |
| descente | descente |
| activite | activité |

### 22.3 Attention

Ne pas modifier les noms techniques, routes, clés JSON ou variables uniquement pour ajouter des accents.

Correction uniquement sur le wording visible UI.

### 22.4 Commit attendu

```text
fix(ui): restore accents in visible french labels
```

---

# PARTIE E — Tests et recette

---

## 23. Tests backend

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

Ajouter ou adapter des tests pour :

- `/sync/all`;
- job global séquentiel ;
- provider Strava non connecté ;
- provider Garmin non connecté ;
- Garmin recovery OK mais Garmin activity KO ;
- Garmin activity no match ;
- Garmin activity ambiguous ;
- enrichissement récent borné ;
- non-régression enrichissement ciblé détail activité.

---

## 24. Tests frontend

Exécuter :

```bash
cd frontend
npm ci
npm test -- --run
npm run build
```

Ajouter ou adapter des tests si la structure le permet pour :

- `CurrentAccountPanel`;
- `DashboardDecisionSummaryCard`;
- `useProviderStatuses`;
- bouton sync globale ;
- état provider connected/error/pending ;
- affichage Trail conditionnel.

---

## 25. Recette fonctionnelle manuelle

### 25.1 Zone compte

Tester :

- Strava connecté, Garmin connecté ;
- Strava connecté, Garmin non connecté ;
- Strava non connecté, Garmin connecté ;
- provider en erreur ;
- chargement provider ;
- mobile.

Attendu :

- aucun doublon ;
- statut lisible ;
- bouton sync cohérent.

### 25.2 Lecture du jour

Tester :

- aucune donnée Trail ;
- Trail récent faible ;
- Trail récent élevé ;
- fatigue élevée ;
- charge en baisse ;
- récupération faible ;
- mobile.

Attendu :

- lecture rapide ;
- contexte Trail intégré et non intrusif ;
- pas de bande Trail pleine largeur inutile ;
- recommandation prudente.

### 25.3 Sync globale

Tester :

- deux providers connectés ;
- Strava seul ;
- Garmin seul ;
- aucun provider ;
- Garmin erreur ;
- aucune activité Garmin récente ;
- activité Garmin ambiguë ;
- activité Garmin matchée.

Attendu :

- pas de crash ;
- résultat partiel clair ;
- enrichissement Garmin activité récent lancé si Garmin connecté ;
- pas d’enrichissement illimité.

### 25.4 Détail activité

Tester :

- bouton enrichissement Garmin ciblé toujours fonctionnel ;
- activité déjà enrichie ;
- activité sans match Garmin ;
- match ambigu.

---

# PARTIE F — Mise à jour documentation agent

---

## 26. Fichiers `.ai/*.md` à mettre à jour

Mettre à jour :

```text
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
.ai/codebase_map.md
```

### 26.1 `current_context.md`

Mentionner :

- correction doublon provider ;
- nouvelle structure `Lecture du jour`;
- sync globale enrichissant Garmin activités récentes ;
- standard documentaire `docs/old`.

### 26.2 `open_tasks.md`

Marquer terminé uniquement si testé :

- correction zone compte ;
- correction `Lecture du jour`;
- sync globale avec Garmin activités ;
- nettoyage docs old ;
- packaging propre.

### 26.3 `regression_risks.md`

Ajouter / mettre à jour les risques :

- `CurrentAccountPanel` ;
- `/sync/all`;
- `global_incremental` job ;
- `garminActivityEnrichment.service.js`;
- `DashboardDecisionSummaryCard`;
- `trailProfile.js`;
- `docs/old`.

### 26.4 `codebase_map.md`

Mettre à jour si ajout :

- nouveau job global ;
- endpoint modifié ;
- service d’orchestration ;
- composant provider corrigé ;
- nouvelle structure décision du jour.

---

# PARTIE G — Ordre recommandé d’exécution

---

## 27. Ordre des lots

### Lot 1 — Correction doublon provider UI

- `CurrentAccountPanel.jsx`
- CSS associé
- wording accents provider

Commit :

```text
fix(layout): remove duplicated provider connection status
```

### Lot 2 — Correction UX `Lecture du jour`

- `DashboardDecisionSummaryCard.jsx`
- modèle de présentation si nécessaire
- CSS associé
- version mobile

Commit :

```text
fix(today): improve daily decision card hierarchy
```

### Lot 3 — Sync globale Garmin activités

- backend `/sync/all`
- job global séquentiel
- enrichissement Garmin activité récent borné
- frontend bouton sync / statut

Commit :

```text
feat(sync): include bounded garmin activity enrichment in global sync
```

### Lot 4 — Documentation `docs/old`

- déplacer `docs/_old` vers `docs/old`
- mise à jour références

Commit :

```text
fix(docs): use docs/old for archived plans
```

### Lot 5 — Packaging archive propre

- script export source
- exclusions

Commit :

```text
chore(repo): harden source archive export exclusions
```

### Lot 6 — Wording FR visible

- accents UI visibles
- pas de changement technique inutile

Commit :

```text
fix(ui): restore accents in visible french labels
```

### Lot 7 — Tests + `.ai/*.md`

- tests backend/frontend
- mise à jour docs agent

Commit :

```text
docs(ai): update corrective handoff and regression risks
```

---

## 28. Définition de terminé

Le correctif est terminé uniquement si :

- le doublon Strava/Garmin a disparu ;
- Strava et Garmin sont affichés une seule fois, au même niveau ;
- la zone compte reste compacte ;
- la carte `Lecture du jour` est plus lisible ;
- le Trail dans `Aujourd’hui` est intégré, pas affiché comme bloc analytique lourd ;
- le bouton sync globale lance aussi Garmin activités récentes ;
- Garmin activités est borné dans le temps ;
- l’enrichissement ciblé détail activité fonctionne toujours ;
- les matchs Garmin ambigus ne sont pas appliqués ;
- `docs/old` est utilisé conformément à la demande ;
- l’archive source propre ne contient pas d’artefacts ;
- les tests backend/frontend passent ;
- les fichiers `.ai/*.md` sont mis à jour ;
- les commits sont atomiques ;
- le push GitHub déclenche la CI/CD.

---

## 29. Message final attendu de CODEX / Claude Pro

À la fin, produire une synthèse :

```text
Correctifs réalisés :
- Doublon provider : OK / partiel / non réalisé
- Lecture du jour : OK / partiel / non réalisé
- Sync Garmin activités globale : OK / partiel / non réalisé
- docs/old : OK / partiel / non réalisé
- Packaging : OK / partiel / non réalisé
- Wording FR : OK / partiel / non réalisé

Tests exécutés :
- backend : ...
- frontend : ...
- build : ...
- CI/CD : ...

Points de vigilance résiduels :
- ...

Commits :
- ...
```
