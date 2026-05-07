# RunNSee — Plan d'évolution Trail raisonné + statut connexions Strava/Garmin + synchronisation globale

## 0. Objectif du plan

Ce document est destiné à CODEX / Claude Code Pro.

Objectif : préparer les prochaines évolutions RunNSee **sans dégrader la fiabilité ni surcharger l’UX actuelle**.

Deux axes sont couverts :

1. **Évolution Trail raisonnée**
   - Ajouter une lecture adaptée au trail.
   - Ne pas transformer l’onglet `Aujourd’hui` en cockpit complexe.
   - Garder une lecture fiable de ce que l’utilisateur est capable de faire aujourd’hui vs son entraînement actuel.
   - Déporter les analyses détaillées vers `Détail activité`, `Analytics` et `Objectifs`.

2. **Statut connexions + synchronisation globale**
   - Afficher sur chaque page, au-dessus de la navigation, le compte utilisateur connecté.
   - Afficher clairement si Strava et Garmin sont connectés ou non.
   - Permettre via le bouton de synchronisation de lancer les synchronisations Strava et Garmin en même temps.
   - Ne pas casser les synchronisations individuelles existantes.

3. **Historisation documentaire**
   - Une fois le chantier terminé, commité, poussé et validé, historiser ce plan dans `docs/old/`.
   - Ne pas historiser le fichier tant que les tests, commits, push GitHub et mise à jour `.ai/*.md` ne sont pas validés.

---

## 1. Règles impératives

### 1.1 Ne pas refaire l’interface complète

Ne pas refondre le layout global.

Ne pas remplacer la navigation existante.

Ne pas transformer l’onglet `Aujourd’hui` en page analytique dense.

Les modifications doivent rester ciblées, testables et réversibles.

### 1.2 Préserver la logique métier existante

Strava reste la source principale des activités.

Garmin enrichit l’analyse avec :

- recovery ;
- sommeil ;
- VFC ;
- Body Battery / Énergie ;
- métriques activité Garmin si disponibles.

Ne pas remplacer les données Strava par Garmin.

Ne pas fusionner arbitrairement les providers.

### 1.3 Distinguer données brutes, estimations et calculs RunNSee

Toujours distinguer :

```text
Donnée Strava brute
Donnée Garmin brute
Estimation Garmin
Calcul RunNSee
Vulgarisation RunNSee
```

### 1.4 Ne pas ajouter de score magique Trail

L’objectif n’est pas de créer un score unique de “niveau trail”.

L’objectif est de créer une **lecture spécifique, prudente et utile**, notamment :

- charge musculaire liée aux descentes ;
- spécificité trail récente ;
- exposition D+ / D- ;
- cohérence avec un objectif trail.

### 1.5 Mettre à jour les fichiers `.ai/*.md`

Après implémentation, mettre à jour :

```text
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
.ai/codebase_map.md
```

Ne déclarer terminé que ce qui est réellement testé.

### 1.6 Commits Git attendus

Faire des commits atomiques.

Exemples :

```text
feat(layout): show provider connection status in user header
feat(sync): add global strava and garmin sync action
feat(trail): add terrain profile computation utilities
feat(today): add minimal trail context to daily readiness
feat(activity): add conditional trail analysis section
feat(analytics): add trail specificity trends
feat(objectives): add trail objective readiness view
docs(ai): update trail and provider sync handoff
docs(old): archive completed trail and provider sync plan
```

---

# PARTIE A — Évolution Trail raisonnée

---

## 2. Principe UX central

L’onglet `Aujourd’hui` doit rester synthétique.

Il doit répondre à une seule question :

```text
Qu’est-ce que je suis capable de faire aujourd’hui, compte tenu de mon état et de mon entraînement récent ?
```

Il ne doit pas afficher toutes les métriques trail.

### 2.1 Hiérarchie UX attendue

| Zone | Rôle |
|---|---|
| `Aujourd’hui` | Décision immédiate, synthétique |
| `Détail activité` | Comprendre une séance trail |
| `Analytics` | Suivre les tendances trail |
| `Objectifs` | Comparer entraînement réel vs objectif trail |
| `Glossaire` | Expliquer les concepts |

### 2.2 Règle d’affichage Trail dans `Aujourd’hui`

Afficher un contexte trail uniquement si au moins une condition est vraie :

- objectif trail actif ;
- activité trail/vallonnée dans les 7 derniers jours ;
- forte charge D+ ou D- récente ;
- forte charge descente dans les 72 dernières heures ;
- recommandation du jour modifiée par le contexte trail.

Sinon, ne rien afficher.

### 2.3 Contenu maximal autorisé dans `Aujourd’hui`

Ne pas ajouter une grosse carte Trail.

Ajouter au maximum :

```text
Contexte trail : ...
Vigilance : ...
```

Exemples :

```text
Contexte trail : charge descente élevée récemment.
```

```text
Vigilance : évite les descentes rapides aujourd’hui.
```

```text
Spécificité trail : correcte par rapport à l’objectif.
```

---

## 3. Concept produit : Capacité du jour

Ne pas transformer `Aptitude RunNSee` en `Aptitude Trail`.

Conserver :

```text
Aptitude RunNSee = état général du jour
```

Ajouter en contexte :

```text
Contexte trail = ajuste la recommandation
```

### 3.1 Axes internes

La capacité du jour peut s’appuyer sur trois axes internes :

| Axe | Question |
|---|---|
| Cardio | Suis-je frais métaboliquement ? |
| Musculaire | Ai-je encaissé les montées/descentes récentes ? |
| Spécificité | Mon entraînement récent est-il aligné avec mon objectif ? |

### 3.2 Affichage recommandé

Dans `Aujourd’hui`, ne pas afficher les trois axes en permanence.

Afficher uniquement une synthèse :

```text
Forme générale bonne, mais charge descente élevée : privilégie une sortie facile.
```

ou :

```text
Forme correcte, spécificité trail en progression.
```

---

## 4. Vigilance musculaire trail

### 4.1 Objectif

Ajouter une information que les métriques route détectent mal :

```text
Fatigue musculaire potentielle liée aux descentes / au terrain.
```

Une sortie trail peut avoir :

- FC moyenne modérée ;
- charge cardio raisonnable ;
- mais forte fatigue musculaire, notamment quadriceps/tendons.

### 4.2 Indicateur interne proposé

Créer une métrique interne :

```text
trailMuscularLoad
```

ou :

```text
downhillLoad
```

Elle peut utiliser :

- D- total ;
- D- / km ;
- pente négative ;
- durée en descente ;
- descente en fin de sortie ;
- répétition sur 72 h / 7 jours.

### 4.3 Affichage dans Aujourd’hui

Ne pas afficher un score brut par défaut.

Afficher un message qualitatif :

```text
Vigilance descente : charge musculaire élevée sur les 72 dernières heures.
```

```text
Pas de vigilance trail particulière.
```

### 4.4 États attendus

| État | Message |
|---|---|
| faible | pas d’alerte affichée |
| modéré | vigilance discrète |
| élevé | message visible dans Aujourd’hui |
| inconnu | ne pas afficher ou indiquer données insuffisantes |

---

## 5. Socle data Trail invisible

### 5.1 Objectif

Créer les calculs utiles sans tout afficher.

### 5.2 Données nécessaires

Utiliser si disponibles :

- stream distance ;
- stream altitude ;
- stream temps ;
- stream FC ;
- stream cadence ;
- stream vitesse ;
- données activité Strava ;
- enrichissements Garmin si utiles.

### 5.3 Calculs à produire

Créer un utilitaire dédié, par exemple :

```text
frontend/src/utils/trailProfile.js
```

ou backend si les streams sont traités côté serveur.

Calculs attendus :

| Indicateur | Description |
|---|---|
| D+ recalculé | Gain positif lissé |
| D- recalculé | Perte négative lissée |
| D+ / km | Densité de montée |
| D- / km | Densité de descente |
| temps montée | durée en pente positive |
| temps descente | durée en pente négative |
| temps plat | durée sur pente faible |
| plus longue montée | segment continu montant |
| plus longue descente | segment continu descendant |
| classification terrain | route / vallonné / trail / montagne |
| qualité altitude | suffisante / fragile / absente |
| charge descente | score qualitatif |
| charge montée | score qualitatif |

### 5.4 Classification terrain indicative

Règles initiales prudentes :

| Type | Critère indicatif |
|---|---|
| Route / plat | D+ < 10 m/km |
| Vallonné | 10–25 m/km |
| Trail roulant | 25–50 m/km |
| Trail montagne | > 50 m/km |
| Vertical-like | très forte densité D+ avec faible distance |

Ces seuils ne doivent pas être présentés comme vérité absolue.

### 5.5 Qualité des données

Si altitude absente ou bruitée :

```text
Analyse trail non disponible : données d’altitude insuffisantes.
```

Ne pas calculer des métriques trompeuses.

---

## 6. Détail activité — Lecture Trail complète mais conditionnelle

### 6.1 Objectif

Afficher l’analyse trail détaillée uniquement là où elle est utile : sur le détail d’une activité.

### 6.2 Condition d’affichage

Afficher la section `Lecture trail` uniquement si :

- activité classée `vallonné`, `trail roulant`, `trail montagne` ou `vertical-like` ;
- données altitude suffisantes ;
- distance/durée suffisantes.

Ne pas afficher sur une sortie route plate.

### 6.3 Contenu proposé

Section :

```text
Lecture trail
```

Sous-blocs :

1. Profil terrain
2. Montée
3. Descente
4. Segments clés
5. Charge musculaire
6. Qualité altitude

### 6.4 Exemples de wording

```text
Profil trail roulant : 32 m D+/km, alternance montée/descente modérée.
```

```text
Charge descente élevée : fatigue musculaire possible malgré une FC modérée.
```

```text
Montée principale : 2,4 km · 310 m D+ · VAM 780 m/h.
```

### 6.5 Règle de prudence

Ne jamais conclure :

```text
Tu as mal descendu.
```

Préférer :

```text
Descente coûteuse : vitesse modérée malgré pente favorable, possible technicité ou fatigue.
```

---

## 7. Analytics — Tendances Trail

### 7.1 Objectif

Mettre les détails trail dans `Analytics`, pas dans `Aujourd’hui`.

### 7.2 Indicateurs hebdomadaires / mensuels

Ajouter progressivement :

- D+ hebdo ;
- D- hebdo ;
- D+ / km ;
- D- / km ;
- temps en montée ;
- temps en descente ;
- charge descente ;
- plus longue montée continue ;
- plus longue descente continue ;
- VAM meilleure montée 5 / 10 / 20 min ;
- ratio route / trail ;
- spécificité objectif si objectif trail actif.

### 7.3 UI

Créer une carte ou section :

```text
Spécificité trail
```

Affichage synthétique :

```text
Cette semaine : 52 km · 1 850 m D+ · charge descente élevée
```

Les graphiques détaillés doivent rester dans Analytics.

---

## 8. Objectifs — Préparation Trail vs objectif

### 8.1 Objectif

Permettre à RunNSee de comparer l’entraînement réel à une course trail cible.

### 8.2 Champs objectif trail

Étendre les objectifs course si nécessaire :

| Champ | Exemple |
|---|---|
| distance | 22 km |
| D+ | 850 m |
| D- | 850 m |
| type terrain | roulant / technique / montagne |
| durée cible estimée | 2h00–2h20 |
| plus longue montée prévue | 400 m D+ |
| plus longue descente prévue | 350 m D- |
| priorité | A / B / C |

### 8.3 Diagnostic attendu

Ne pas afficher un score absolu du type :

```text
Préparation trail : 87 %
```

Préférer :

```text
Spécificité correcte, mais durée d’effort encore courte par rapport à l’objectif.
```

Dimensions :

- volume ;
- D+ ;
- D- ;
- durée sortie longue ;
- montée longue ;
- descente longue ;
- récupération récente.

---

## 9. Glossaire Trail

Ajouter des entrées :

```text
D+
D-
D+ / km
VAM
Charge descente
Charge musculaire trail
Montée continue
Descente continue
Trail roulant
Trail montagne
Dérive cardiaque trail
Allure ajustée en trail
Terrain technique
Marche efficace
Spécificité trail
```

Tooltips courts : maximum 80 caractères.

Explications longues dans le glossaire.

---

# PARTIE B — Statut utilisateur, connexions Strava/Garmin et synchronisation globale

---

## 10. Besoin complémentaire

Sur chaque page, au-dessus de la navigation, le compte utilisateur connecté est déjà affiché.

Il faut ajouter à cet emplacement :

1. le statut de connexion Strava ;
2. le statut de connexion Garmin ;
3. une action de synchronisation globale permettant de lancer :
   - synchronisation Strava ;
   - synchronisation Garmin recovery ;
   - synchronisation Garmin activité si pertinent ou disponible.

Objectif : donner une lecture claire de l’état des connexions et centraliser la synchronisation manuelle.

---

## 11. Contraintes UX

### 11.1 Ne pas surcharger la zone navigation

La zone utilisateur doit rester compacte.

Affichage recommandé :

```text
Guillaume
Strava ● connecté
Garmin ● connecté
[Sync]
```

ou en mobile :

```text
Guillaume
S ●  G ●   [↻]
```

Avec tooltips :

```text
Strava connecté
Garmin connecté
Synchroniser Strava et Garmin
```

### 11.2 États à gérer

Pour chaque provider :

| État | Affichage |
|---|---|
| connecté | pastille verte ou tone bon |
| non connecté | pastille neutre / grise |
| erreur | pastille alerte |
| sync en cours | spinner discret |
| partiel | pastille vigilance |
| inconnu / chargement | skeleton ou état neutre |

Ne pas afficher de message agressif permanent.

### 11.3 Mobile-first

Sur mobile, afficher une version compacte.

Exemple :

```text
G. Barthelemy
S● G● ↻
```

Les détails peuvent apparaître dans une tooltip ou un menu.

---

## 12. Architecture fonctionnelle attendue

### 12.1 Frontend — composant global

Créer ou adapter un composant global, par exemple :

```text
ProviderStatusBar.jsx
```

ou intégrer dans le composant existant qui affiche le compte utilisateur au-dessus de la navigation.

Responsabilités :

- afficher utilisateur connecté ;
- afficher statut Strava ;
- afficher statut Garmin ;
- afficher bouton sync globale ;
- gérer état loading ;
- gérer état erreur ;
- être visible sur toutes les pages authentifiées.

### 12.2 Source des statuts

Utiliser les endpoints existants si disponibles.

Statuts attendus :

#### Strava

Endpoint possible selon existant :

```text
GET /sync/summary
GET /athlete/me
GET /providers/strava/status
```

Si aucun endpoint dédié n’existe, créer un endpoint propre :

```text
GET /providers/status
```

Réponse recommandée :

```json
{
  "providers": {
    "strava": {
      "connected": true,
      "status": "connected",
      "lastSyncAt": "2026-05-06T10:00:00.000Z",
      "lastErrorCode": null,
      "lastErrorAt": null
    },
    "garmin": {
      "connected": true,
      "status": "connected",
      "lastRecoverySyncAt": "2026-05-06T08:00:00.000Z",
      "lastActivityEnrichmentAt": "2026-05-05T18:00:00.000Z",
      "lastErrorCode": null,
      "lastErrorAt": null
    }
  }
}
```

### 12.3 Ne pas multiplier les appels

Éviter que chaque page fasse ses propres appels de statut provider.

Créer un hook global :

```text
useProviderStatuses()
```

ou utiliser le contexte d’auth/layout existant.

Objectifs :

- un seul appel au chargement du layout ;
- refresh après sync ;
- éviter les appels redondants entre pages.

---

## 13. Synchronisation globale Strava + Garmin

### 13.1 Objectif

Le bouton de synchronisation global doit pouvoir lancer les synchronisations Strava et Garmin en même temps, ou de manière orchestrée.

### 13.2 Ne pas casser les boutons existants

Les boutons spécifiques existants dans Admin / Connexions / Données doivent rester fonctionnels.

Le bouton global est un raccourci.

### 13.3 Endpoint recommandé

Créer un endpoint backend :

```text
POST /sync/all
```

ou :

```text
POST /providers/sync/all
```

Préférence : utiliser une route cohérente avec l’existant.

Si `/sync` porte déjà les synchronisations Strava, privilégier :

```text
POST /sync/all
```

### 13.4 Comportement attendu

Le backend doit :

1. vérifier l’utilisateur authentifié ;
2. vérifier les providers connectés ;
3. lancer Strava si connecté ;
4. lancer Garmin recovery si connecté ;
5. lancer Garmin activity enrichment seulement si le périmètre est défini ;
6. retourner un état par provider ;
7. ne pas faire échouer toute la sync si un provider échoue.

### 13.5 Réponse recommandée

```json
{
  "job": {
    "id": "global-sync-...",
    "status": "running"
  },
  "providers": {
    "strava": {
      "requested": true,
      "status": "queued"
    },
    "garminRecovery": {
      "requested": true,
      "status": "queued"
    },
    "garminActivities": {
      "requested": false,
      "status": "skipped",
      "reason": "manual_activity_context_required"
    }
  }
}
```

### 13.6 Garmin activity enrichment : prudence

La synchronisation Garmin activité peut nécessiter une période ou une activité cible.

Ne pas lancer un enrichissement illimité de toutes les activités sans garde-fou.

Options possibles :

#### Option A — Sync globale simple

Le bouton global lance :

- Strava incremental sync ;
- Garmin recovery recent sync.

Garmin activity enrichment reste disponible depuis le détail activité.

#### Option B — Sync globale étendue mais bornée

Le bouton global lance :

- Strava incremental sync ;
- Garmin recovery recent sync ;
- Garmin activity enrichment sur les activités récentes non enrichies, par exemple 14 ou 30 derniers jours.

Recommandation initiale : **Option A**, plus sûre.

Puis Option B après validation.

---

## 14. Gestion des jobs et concurrence

### 14.1 Éviter les sync concurrentes

Avant de lancer `/sync/all`, vérifier :

- job Strava en cours ;
- job Garmin recovery en cours ;
- job global en cours.

Si une sync est déjà active :

```json
{
  "status": "already_running",
  "message": "Une synchronisation est déjà en cours."
}
```

### 14.2 Ne pas bloquer l’UI

Le bouton global doit :

- passer en état loading ;
- afficher un statut synthétique ;
- permettre de consulter le détail dans Admin / Données si besoin.

### 14.3 Polling

Réutiliser si possible :

```text
/sync/jobs/current
```

Si ce endpoint ne couvre que Strava, l’adapter ou créer un suivi global.

Ne pas multiplier les pollings.

---

## 15. UX du bouton global

### 15.1 Desktop

Affichage possible :

```text
Guillaume Barthelemy
Strava connecté · Garmin connecté
[ Synchroniser ]
```

Après clic :

```text
Synchronisation en cours...
Strava : en cours · Garmin : en cours
```

Succès :

```text
Synchronisation terminée
```

Erreur partielle :

```text
Strava synchronisé · Garmin en erreur
```

### 15.2 Mobile

Affichage compact :

```text
GB   S● G●  ↻
```

Au clic :

- spinner sur le bouton ;
- tooltip ou petit panneau de statut.

### 15.3 États visuels

Utiliser les `tones` existants :

| État | Tone |
|---|---|
| connecté | bon |
| non connecté | neutre |
| erreur | alerte |
| sync en cours | vigilance ou neutre animé |
| partiel | vigilance |

Ne pas introduire une nouvelle palette.

---

## 16. Sécurité backend

### 16.1 Routes protégées

Toutes les routes de statut utilisateur/provider et de synchronisation doivent être protégées :

```text
requireAuth
```

Aucune route métier ne doit être publique.

### 16.2 Pas de secrets exposés

Les endpoints de statut ne doivent jamais retourner :

- access token ;
- refresh token ;
- cookie Garmin ;
- session Garmin ;
- secret Strava ;
- clé OpenAI.

### 16.3 Logs

Les logs peuvent contenir :

- provider ;
- userId interne ;
- type de sync ;
- statut ;
- code erreur normalisé.

Les logs ne doivent pas contenir :

- payload Garmin complet ;
- token ;
- session ;
- identifiants.

---

## 17. Non-régression sync Strava / Garmin

### 17.1 Strava

Vérifier :

- sync Strava manuelle existante toujours fonctionnelle ;
- incremental sync conservée ;
- historique non relancé sans demande explicite ;
- `SyncJob` non cassé ;
- `/sync/jobs/current` toujours fonctionnel.

### 17.2 Garmin recovery

Vérifier :

- statut Garmin existant conservé ;
- sync recovery récente fonctionne ;
- `lastSyncAt` ou timestamp dédié non perturbé ;
- erreurs Garmin visibles mais non bloquantes.

### 17.3 Garmin activité

Si le bouton global n’enrichit pas les activités :

- l’indiquer clairement ;
- conserver l’action depuis le détail activité.

Si le bouton global enrichit les activités récentes :

- période bornée ;
- pas de matching ambigu appliqué ;
- pas de sync illimitée.

---

# PARTIE C — Plan de développement recommandé

---

## Lot 1 — Statuts providers dans le layout global

### Objectif

Afficher sur toutes les pages authentifiées :

- utilisateur connecté ;
- statut Strava ;
- statut Garmin.

### Travaux

1. Identifier le composant qui affiche actuellement le compte utilisateur au-dessus de la navigation.
2. Créer ou intégrer `ProviderStatusBar`.
3. Ajouter hook `useProviderStatuses`.
4. Ajouter endpoint backend si nécessaire :

```text
GET /providers/status
```

5. Afficher les états :
   - connecté ;
   - non connecté ;
   - erreur ;
   - chargement.

### Critères d’acceptation

- Statuts visibles sur toutes les pages authentifiées.
- Pas d’appel redondant par page.
- Aucun secret exposé.
- Mobile lisible.

---

## Lot 2 — Bouton de synchronisation globale

### Objectif

Permettre de lancer Strava + Garmin depuis la zone utilisateur.

### Travaux

1. Créer endpoint :

```text
POST /sync/all
```

ou endpoint équivalent cohérent avec le routing existant.

2. Orchestrer :
   - Strava incremental sync si Strava connecté ;
   - Garmin recovery sync si Garmin connecté ;
   - Garmin activity enrichment uniquement si explicitement borné ou sinon `skipped`.

3. Retourner un résultat par provider.
4. Mettre à jour l’UI du bouton global.
5. Rafraîchir les statuts après sync.

### Critères d’acceptation

- Bouton visible mais compact.
- Sync partielle possible.
- Une erreur Garmin ne fait pas échouer Strava.
- Une erreur Strava ne fait pas échouer Garmin.
- Les boutons existants restent fonctionnels.

---

## Lot 3 — Gestion concurrence et job status

### Objectif

Éviter les synchronisations concurrentes et rendre le statut lisible.

### Travaux

1. Vérifier les jobs actifs avant lancement.
2. Retourner `already_running` si nécessaire.
3. Adapter ou réutiliser `/sync/jobs/current`.
4. Ajouter un statut global si pertinent.
5. Éviter le polling excessif.

### Critères d’acceptation

- Double-clic sync sans effet indésirable.
- Pas de doublon de jobs.
- UI cohérente pendant la sync.

---

## Lot 4 — Socle Trail invisible

### Objectif

Créer les calculs trail sans surcharger l’UX.

### Travaux

1. Créer utilitaires de profil terrain.
2. Ajouter tests unitaires.
3. Calculer :
   - D+ / D- ;
   - D+ / km ;
   - D- / km ;
   - temps montée ;
   - temps descente ;
   - plus longue montée ;
   - plus longue descente ;
   - classification terrain ;
   - charge descente ;
   - qualité altitude.

### Critères d’acceptation

- Aucun nouvel affichage massif dans `Aujourd’hui`.
- Calculs testés.
- Activités route non impactées.

---

## Lot 5 — Aujourd’hui : contexte Trail minimal

### Objectif

Ajouter une lecture trail synthétique uniquement si utile.

### Travaux

1. Intégrer un message conditionnel dans la carte décision existante.
2. Ne pas ajouter une nouvelle grosse carte.
3. Limiter à :
   - un contexte ;
   - une vigilance.
4. Ne rien afficher si pas pertinent.

### Critères d’acceptation

- `Aujourd’hui` reste lisible en moins de 10 secondes.
- Pas plus d’un message trail visible.
- La recommandation reste prudente.

---

## Lot 6 — Détail activité Trail

### Objectif

Afficher l’analyse trail complète au bon endroit.

### Travaux

1. Ajouter section `Lecture trail`.
2. Affichage conditionnel.
3. Ajouter états :
   - altitude insuffisante ;
   - activité non trail ;
   - données incomplètes.
4. Ajouter sous-blocs :
   - profil ;
   - montée ;
   - descente ;
   - segments clés ;
   - charge musculaire.

### Critères d’acceptation

- Activité route plate non polluée.
- Trail lisible et utile.
- Pas de conclusion trop affirmative.

---

## Lot 7 — Analytics Trail

### Objectif

Suivre la progression trail dans Analytics.

### Travaux

Ajouter tendances :

- D+ hebdo ;
- D- hebdo ;
- charge descente ;
- temps montée ;
- temps descente ;
- VAM montée ;
- spécificité objectif.

### Critères d’acceptation

- Analytics peut être plus détaillé que Aujourd’hui.
- Les graphiques restent compréhensibles.
- Les données absentes sont correctement gérées.

---

## Lot 8 — Objectif Trail

### Objectif

Comparer entraînement réel vs course trail cible.

### Travaux

1. Étendre les objectifs si nécessaire.
2. Ajouter champs trail :
   - distance ;
   - D+ ;
   - D- ;
   - terrain ;
   - durée cible ;
   - montée/descente longue.
3. Ajouter diagnostic par dimensions.
4. Éviter score absolu.

### Critères d’acceptation

- Diagnostic clair.
- Pas de promesse de performance.
- Objectifs route existants non cassés.

---

## Lot 9 — Glossaire et vulgarisation Trail

### Objectif

Ajouter les définitions trail sans surcharger l’UI.

### Travaux

1. Ajouter entrées glossaire trail.
2. Ajouter tooltips compacts.
3. Corriger vocabulaire visible.
4. Distinguer estimation / mesure / calcul RunNSee.

### Critères d’acceptation

- Tooltips courts.
- Glossaire complet.
- Vocabulaire homogène.

---

## Lot 10 — Tests et recette complète

### Backend

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

### Frontend

```bash
cd frontend
npm ci
npm test -- --run
npm run build
```

### Recette fonctionnelle

Vérifier :

- utilisateur affiché sur toutes les pages ;
- statut Strava connecté/non connecté ;
- statut Garmin connecté/non connecté ;
- bouton sync globale ;
- sync Strava seule ;
- sync Garmin seule ;
- sync globale avec les deux connectés ;
- sync globale avec un seul provider connecté ;
- sync globale avec provider en erreur ;
- absence de secret dans les réponses ;
- Aujourd’hui reste synthétique ;
- activité route sans section trail ;
- activité trail avec section trail ;
- Analytics trail ;
- objectif trail.

---

# PARTIE D — Risques de régression

## 18. Risques principaux

| Zone | Risque | Garde-fou |
|---|---|---|
| Layout global | surcharge visuelle | version compacte, mobile-first |
| Auth | exposition de routes protégées | `requireAuth` partout |
| Providers | fuite secrets | réponse status filtrée |
| Sync globale | jobs concurrents | vérification job actif |
| Strava | historique relancé par erreur | sync incrémentale uniquement |
| Garmin recovery | perturbation timestamp | timestamps séparés ou logique claire |
| Garmin activité | enrichissement illimité | bornage ou skip |
| Aujourd’hui | trop d’indicateurs | 1 contexte + 1 vigilance max |
| Trail | surinterprétation | wording prudent |
| Route | pollution UI trail | affichage conditionnel |

---

## 19. Définition de terminé

Le chantier est terminé uniquement si :

- les statuts Strava/Garmin sont visibles sur toutes les pages authentifiées ;
- le bouton global permet de lancer les synchronisations prévues ;
- les sync individuelles existantes restent fonctionnelles ;
- aucune route sensible n’est publique ;
- aucun secret n’est exposé ;
- l’onglet `Aujourd’hui` reste synthétique ;
- les calculs trail sont testés ;
- les analyses trail détaillées sont affichées uniquement aux bons endroits ;
- les fichiers `.ai/*.md` sont mis à jour ;
- les tests backend/frontend passent ;
- les commits sont atomiques ;
- le push GitHub déclenche la CI/CD ;
- après validation complète, ce plan est historisé dans `docs/old/` avec un nom horodaté.

---

# PARTIE E — Historisation du plan après validation

---

## 20. Historisation du fichier de plan dans `docs/old/`

### Objectif

Une fois le chantier terminé, validé, commité et poussé, le fichier de plan utilisé par CODEX / Claude Code Pro ne doit pas rester comme document de travail actif.

Il doit être historisé dans le dossier :

```text
docs/old/
```

Cette historisation doit être réalisée **uniquement si tout est OK suite au commit**.

---

## 20.1 Condition obligatoire avant historisation

Ne pas déplacer le fichier dans `docs/old/` tant que toutes les conditions suivantes ne sont pas validées :

- les lots prévus ont été réalisés ou explicitement documentés comme non réalisés ;
- les tests backend sont exécutés ;
- les tests frontend sont exécutés ;
- le build frontend est OK ;
- la validation Git est propre ;
- les fichiers `.ai/*.md` sont mis à jour ;
- les commits atomiques sont réalisés ;
- le push GitHub est effectué ;
- la chaîne CI/CD est déclenchée ;
- la CI/CD est verte ou les limites sont explicitement documentées.

Commandes minimales avant historisation :

```bash
git status --short
git diff --stat
git diff --check
```

Le résultat attendu doit être propre ou uniquement contenir le déplacement du fichier vers `docs/old/`.

---

## 20.2 Emplacement actif recommandé avant exécution

Pendant l’exécution du chantier, le fichier peut être placé dans :

```text
.ai/runsee_plan_trail_sync_global_codex.md
```

ou :

```text
docs/runsee_plan_trail_sync_global_codex.md
```

L’emplacement exact doit respecter l’organisation réelle du dépôt.

---

## 20.3 Déplacement après validation

Une fois tout validé, déplacer le fichier vers :

```text
docs/old/runsee_plan_trail_sync_global_codex_YYYYMMDD.md
```

Exemple :

```text
docs/old/runsee_plan_trail_sync_global_codex_20260507.md
```

Créer le dossier s’il n’existe pas :

```bash
mkdir -p docs/old
```

Puis déplacer le fichier :

```bash
git mv docs/runsee_plan_trail_sync_global_codex.md docs/old/runsee_plan_trail_sync_global_codex_YYYYMMDD.md
```

Adapter la commande si le fichier était initialement placé dans `.ai/`.

---

## 20.4 Commit d’historisation

Faire un commit dédié uniquement à l’historisation :

```text
docs(old): archive completed trail and provider sync plan
```

Ce commit doit intervenir après les commits de développement et après validation.

---

## 20.5 Mise à jour des fichiers `.ai/*.md`

Après historisation, vérifier que les fichiers `.ai/*.md` ne pointent pas vers un plan actif obsolète.

Mettre à jour si nécessaire :

```text
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
.ai/codebase_map.md
```

Exemple de mention possible dans `.ai/current_context.md` :

```text
Le plan Trail + statut providers + sync globale a été exécuté puis historisé dans docs/old/.
```

---

## 20.6 Règle de non-régression documentaire

Ne pas supprimer le contenu du plan.

Ne pas écraser un ancien fichier dans `docs/old/`.

Toujours utiliser un nom horodaté.

Ne pas historiser un plan si :

- des lots sont encore en cours ;
- la CI/CD est rouge sans justification ;
- les tests n’ont pas été exécutés ;
- le commit n’est pas poussé ;
- les fichiers `.ai/*.md` ne sont pas à jour.

---

## 21. Message final attendu de l’agent

À la fin, CODEX / Claude Code Pro doit produire une synthèse :

```text
Lots réalisés :
- Lot 1 : ...
- Lot 2 : ...
...

Tests exécutés :
- backend : ...
- frontend : ...
- PostgreSQL : ...
- CI/CD : ...

Risques résiduels :
- ...

Fichiers .ai mis à jour :
- ...

Historisation :
- plan déplacé dans docs/old/ : oui/non
- chemin final : ...

Commits :
- ...
```
