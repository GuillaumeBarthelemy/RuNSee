# RunNSee — Plan correctif UX Aujourd’hui + filtre + non-régression frontend

## 0. Objectif du plan

Ce document est destiné à CODEX / Claude Code Pro.

Objectif : corriger la dernière version RunNSee après intégration multi-sources / Trail / providers, avec une priorité forte sur :

1. la correction de la régression de persistance du filtre dans l’onglet `Aujourd’hui` ;
2. la refonte UX complète de l’onglet `Aujourd’hui` pour limiter le scroll et améliorer la lisibilité ;
3. la suppression des décalages / incohérences visuelles ;
4. la clarification du rôle du bloc Trail ;
5. la vérification de non-régression frontend après les dernières évolutions multi-sources Garmin/Strava.

Ce plan ne doit pas ajouter de nouvelles fonctionnalités métier.  
Il doit **fiabiliser et clarifier l’existant**.

---

## 1. Décisions validées

Les décisions suivantes sont validées et doivent être appliquées.

| Décision | Statut |
|---|---|
| Le filtre sport de `Aujourd’hui` ne doit pas être persisté durablement | Validé |
| La page `Aujourd’hui` doit être limitée à 4 blocs maximum | Validé |
| Les sections actuelles redondantes doivent être fusionnées ou retirées | Validé |
| Le Trail reste dans `Aujourd’hui` uniquement comme contexte/vigilance | Validé |
| Supprimer le `dist` obsolète, rebuild et vérifier que runtime = source | Validé |

---

## 2. Réponse claire : où va le bloc Trail ?

Le bloc Trail ne doit plus être affiché comme une grande carte analytique indépendante dans `Aujourd’hui`.

Il doit être réparti selon cette logique :

| Emplacement | Rôle du Trail |
|---|---|
| `Aujourd’hui` | Contexte décisionnel minimal : vigilance ou contexte qui modifie la séance du jour |
| `Détail activité` | Analyse Trail détaillée d’une séance : D+, D-, montée, descente, segments, charge musculaire |
| `Analytics` | Tendances Trail : D+ hebdo, D- hebdo, charge descente, spécificité Trail |
| `Objectifs` | Comparaison préparation réelle vs objectif Trail |
| `Glossaire` | Explication des concepts Trail |

### 2.1 Dans `Aujourd’hui`

Le Trail doit apparaître uniquement si cela change la décision du jour.

Exemples autorisés :

```text
Vigilance Trail : charge descente élevée récemment.
```

```text
Contexte Trail : spécificité récente correcte, pas de vigilance majeure.
```

```text
Trail : évite les descentes rapides aujourd’hui.
```

Exemples à ne plus afficher comme bloc indépendant :

```text
Spécificité trail récente : 624 m D+ et 519 m D-.
```

Ce type d’information brute doit être intégré dans les signaux clés ou déplacé vers Analytics.

### 2.2 Dans `Détail activité`

C’est ici que doit vivre l’analyse Trail détaillée.

Contenu attendu :

- profil terrain ;
- D+ / D- ;
- D+ / km ;
- D- / km ;
- montée principale ;
- descente principale ;
- charge musculaire descente ;
- segments clés ;
- qualité altitude.

### 2.3 Dans `Analytics`

C’est ici que doit vivre le suivi Trail dans le temps.

Contenu attendu :

- D+ hebdo ;
- D- hebdo ;
- temps montée ;
- temps descente ;
- charge descente ;
- plus longue montée ;
- plus longue descente ;
- VAM si disponible ;
- ratio route / trail / randonnée.

### 2.4 Dans `Objectifs`

C’est ici que doit vivre la comparaison avec une course Trail cible.

Contenu attendu :

- distance cible ;
- D+ cible ;
- D- cible ;
- durée cible ;
- spécificité récente ;
- exposition descente ;
- sortie longue ;
- cohérence préparation vs objectif.

---

# PARTIE A — Corrections préalables obligatoires

---

## 3. Lot 0 — Propreté dépôt, build et runtime

### 3.1 Problème

La capture runtime peut ne pas correspondre au code source transmis.

Hypothèses possibles :

- ancien `frontend/dist` servi ;
- cache navigateur ;
- build non relancé ;
- conteneur/frontend non redémarré ;
- archive contenant des artefacts obsolètes.

### 3.2 Travaux attendus

1. Restaurer ou vérifier `.gitignore` à la racine.
2. Restaurer ou vérifier `.gitattributes` à la racine.
3. Supprimer les artefacts obsolètes du dépôt si présents :
   - `frontend/dist/`
   - `node_modules/`
   - `.env`
   - `.env.*.local`
   - `*.log`
   - `*.db`
   - `.tmp/`
   - `deployment/postgresql/runtime/`
4. Rebuilder le frontend.
5. Redémarrer le frontend réellement servi.
6. Vérifier que la capture runtime correspond bien au code source.

### 3.3 Critères d’acceptation

- `git status --short` ne montre pas de suppression inattendue de `.gitignore` ou `.gitattributes`.
- `frontend/dist` n’est pas utilisé comme source de vérité dans l’archive de revue.
- L’interface affichée correspond au code source.
- Aucun secret ou artefact runtime n’est ajouté au commit.

### 3.4 Commit attendu

```text
chore(repo): restore source hygiene before today ux fixes
```

---

# PARTIE B — Correction de la persistance du filtre Aujourd’hui

---

## 4. Lot 1 — Corriger la persistance du filtre `todaySportGroup`

### 4.1 Problème

Le filtre sport de `Aujourd’hui` semble persister via le state dashboard, probablement localStorage.

Risque :

```text
Une ancienne sélection utilisateur biaise la lecture du jour.
```

Exemple :

- l’utilisateur filtre sur randonnée ou trail ;
- il revient plus tard ;
- `Aujourd’hui` reste filtré ;
- la décision du jour ne reflète plus tout l’entraînement pertinent.

### 4.2 Décision validée

Le filtre de `Aujourd’hui` **ne doit pas être persisté durablement**.

Il doit revenir au périmètre par défaut à chaque nouvelle ouverture de la page ou au minimum à chaque nouvelle session applicative.

### 4.3 Périmètre par défaut

Périmètre recommandé :

```text
Course / Trail
```

Il doit inclure :

- course route ;
- trail ;
- treadmill / piste si cohérent avec les groupes existants ;
- randonnée si elle a été décidée comme importée, mais à traiter prudemment selon les analytics.

À clarifier dans le code selon les constantes existantes.

### 4.4 Travaux attendus

1. Identifier où `todaySportGroup` est stocké.
2. Retirer `todaySportGroup` de la persistance longue.
3. Utiliser un `useState` local ou une persistance de session non durable.
4. Réinitialiser au défaut à chaque chargement initial.
5. Ajouter un bouton visible si le filtre est modifié :

```text
Réinitialiser
```

6. Si un filtre différent du défaut est actif, afficher un chip clair :

```text
Lecture filtrée : Randonnée
```

### 4.5 Critères d’acceptation

- Le filtre ne reste pas bloqué après fermeture/réouverture.
- Un filtre actif est immédiatement visible.
- Un filtre actif peut être réinitialisé en un clic.
- La lecture par défaut reste fiable.
- Aucun autre filtre du dashboard n’est cassé.

### 4.6 Tests attendus

- chargement initial ;
- changement de filtre ;
- navigation vers une autre page puis retour ;
- refresh navigateur ;
- nouvelle session ;
- reset filtre.

### 4.7 Commit attendu

```text
fix(today): stop persisting daily sport filter
```

---

# PARTIE C — Refonte UX complète de l’onglet Aujourd’hui

---

## 5. Objectif UX

L’onglet `Aujourd’hui` doit répondre à 4 questions, dans cet ordre :

```text
1. Quel est mon état aujourd’hui ?
2. Qu’est-ce que je peux faire ?
3. Quel est le principal risque ?
4. Pourquoi cette lecture ?
```

Il ne doit pas être une page Analytics.

Il doit être lisible rapidement, avec peu ou pas de scroll sur desktop.

---

## 6. Structure cible : 4 blocs maximum

La page `Aujourd’hui` doit être organisée ainsi :

```text
1. Header compact
2. Carte décision principale
3. Synthèse 7 jours
4. Activités à relire
```

Aucun autre bloc majeur ne doit être affiché sur `Aujourd’hui`, sauf alerte critique réellement utile.

---

## 7. Bloc 1 — Header compact

### 7.1 Objectif

Situer la lecture sans prendre trop de place.

### 7.2 Contenu cible

```text
Bonjour Guillaume
Mercredi 07 mai 2026 · Lecture sur 7 jours
Périmètre : Course / Trail [modifier]
```

Si filtre différent du défaut :

```text
Lecture filtrée : Randonnée [réinitialiser]
```

### 7.3 À éviter

Ne pas afficher un header trop haut.

Ne pas multiplier les dates techniques.

Ne pas afficher trois horizons temporels si cela n’aide pas la décision.

### 7.4 Critères d’acceptation

- Header compact.
- Périmètre visible.
- Filtre actif visible.
- Pas de surcharge de texte.

---

## 8. Bloc 2 — Carte décision principale

### 8.1 Objectif

C’est le cœur de la page.

Elle doit contenir :

1. verdict ;
2. recommandation du jour ;
3. vigilance ;
4. indicateurs résumés ;
5. signaux clés.

### 8.2 Structure cible desktop

```text
┌──────────────────────────────────────────────────────────────┐
│ LECTURE DU JOUR                                               │
│                                                              │
│ Forme correcte, marge présente                                │
│ Aujourd’hui : endurance, trail facile ou montée contrôlée.    │
│                                                              │
│ Vigilance                                                     │
│ Évite les descentes rapides : charge descente récente modérée.│
│                                                              │
│ [Aptitude 76] [Fatigue faible] [Charge en baisse] [Trail mod.]│
│                                                              │
│ Signaux : VFC stable · Sommeil correct · Charge 7j en baisse │
└──────────────────────────────────────────────────────────────┘
```

### 8.3 Structure cible mobile

```text
Lecture du jour

Forme correcte, marge présente.
Aujourd’hui : endurance ou trail facile.
Vigilance : évite les descentes rapides.

Aptitude 76 · Fatigue faible · Charge ↓ · Trail modéré
```

### 8.4 Rôle du Trail dans cette carte

Le Trail doit être intégré uniquement dans :

- la vigilance ;
- la recommandation ;
- un indicateur résumé ;
- les signaux clés.

Ne pas afficher un bloc Trail séparé.

### 8.5 Cas sans contexte Trail

Si aucun signal Trail pertinent :

```text
Aucun message Trail n’est affiché.
```

La carte doit rester propre.

### 8.6 Cas Trail modéré sans vigilance

Exemple :

```text
Contexte Trail : spécificité récente correcte.
```

### 8.7 Cas Trail avec vigilance

Exemple :

```text
Vigilance Trail : charge descente élevée, évite les descentes rapides.
```

### 8.8 Limites d’affichage

- 1 verdict maximum.
- 1 recommandation maximum.
- 1 vigilance maximum.
- 4 indicateurs résumés maximum.
- 4 à 5 signaux clés maximum.

### 8.9 Critères d’acceptation

- Le premier élément lu est le verdict.
- Le deuxième élément lu est ce que l’utilisateur peut faire.
- La vigilance est claire.
- Le Trail ne casse pas la hiérarchie.
- Pas de décalage visuel.
- Pas de largeur excessive des cartes internes.
- Mobile lisible sans scroll horizontal.

---

## 9. Bloc 3 — Synthèse 7 jours

### 9.1 Objectif

Remplacer l’empilement actuel :

- `TodayReadinessCard`
- `TodayFormCards`
- `TodayVolumeStrip`
- `TodaySecondaryRow`

par une seule synthèse compacte.

### 9.2 Structure cible

```text
Synthèse 7 jours

Récupération     Correcte      VFC stable · sommeil 85
Charge           En baisse     Bloc récent plus léger
Volume           42 km         624 m D+ · 519 m D-
Trail            Modéré        pas de vigilance majeure
```

ou sous forme de 4 tuiles compactes :

```text
[Récupération correcte] [Charge en baisse] [Volume 42 km] [Trail modéré]
```

### 9.3 Règle Trail

Dans cette synthèse, le Trail peut apparaître comme une ligne ou une tuile compacte.

Exemples :

```text
Trail : 624 m D+ · 519 m D-
```

ou :

```text
Trail : modéré · vigilance faible
```

Le détail doit rester dans Analytics.

### 9.4 Critères d’acceptation

- Une seule synthèse compacte.
- Pas de répétition avec la carte décision.
- Les données sont utiles à la décision.
- Pas de graphique lourd.
- Un lien discret peut pointer vers Analytics :

```text
Voir l’analyse complète
```

---

## 10. Bloc 4 — Activités à relire

### 10.1 Objectif

Remplacer :

- `TodaySnapshotToday`
- `RecentActivitiesCard`

par une seule carte utile.

Elle doit afficher uniquement les activités qui expliquent la lecture du jour.

### 10.2 Contenu cible

Maximum 3 activités.

Exemple :

```text
Activités à relire

Hier · Trail · 8,5 km · 360 m D+ · charge descente modérée
Dimanche · Trail · 10 km · 450 m D+ · intensité course
Mardi · Footing · 45 min facile
```

### 10.3 Règle de sélection

Priorité :

1. activité récente à forte charge ;
2. activité Trail récente ;
3. activité ayant modifié la vigilance ;
4. dernière activité du jour si elle existe.

Ne pas afficher 10 activités.

### 10.4 Critères d’acceptation

- 3 activités maximum.
- Activités vraiment utiles à la lecture.
- Pas de doublon avec la page Activités.
- Lien vers détail activité conservé.
- Fonctionne avec activités Strava et Garmin-only.

---

# PARTIE D — Composants à fusionner / retirer

---

## 11. Composants actuels concernés

### 11.1 À transformer ou fusionner

| Composant actuel | Action |
|---|---|
| `TodayHeader` | rendre compact |
| `DashboardDecisionSummaryCard` | refondre en carte décision principale |
| `TodayReadinessCard` | fusionner dans Synthèse 7 jours |
| `TodayFormCards` | fusionner dans carte décision et Synthèse |
| `TodayVolumeStrip` | fusionner dans Synthèse |
| `TodaySecondaryRow` | fusionner ou déplacer vers Analytics |
| `TodaySnapshotToday` | remplacer par Activités à relire |
| `RecentActivitiesCard` | remplacer par Activités à relire |

### 11.2 À conserver conditionnellement

| Composant | Condition |
|---|---|
| `TodayAlertBanner` | uniquement si alerte réelle et actionnable |

### 11.3 À ne pas faire

Ne pas supprimer brutalement un composant s’il est utilisé ailleurs.

Avant suppression :

```bash
grep -R "NomDuComposant" frontend/src
```

---

## 12. Nouveau découpage recommandé

Créer si utile :

```text
TodayDecisionPanel.jsx
TodaySevenDaySummary.jsx
TodayUsefulActivities.jsx
TodayScopeHeader.jsx
```

ou conserver les noms actuels si cela limite les changements.

Recommandation :

- éviter une explosion de nouveaux composants ;
- préférer 3 à 4 composants bien nommés ;
- préserver les tests existants.

---

# PARTIE E — Correction des décalages visuels

---

## 13. Problèmes à éviter

- cartes de hauteurs incohérentes ;
- alignements cassés ;
- zones trop larges ;
- grands blocs vides ;
- overflow horizontal ;
- scroll inutile ;
- chips qui wrap mal ;
- tailles de police non hiérarchisées.

---

## 14. Règles CSS attendues

### 14.1 Layout desktop

Utiliser une grille stable :

```css
.today-page {
  display: grid;
  gap: ...
}

.today-decision-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
}
```

Si la largeur devient insuffisante :

```css
@media (max-width: ...) {
  grid-template-columns: 1fr;
}
```

### 14.2 Pas de scroll horizontal

Vérifier :

```text
Aucun overflow-x sur mobile.
```

### 14.3 Hauteurs

Ne pas forcer des hauteurs fixes sauf nécessité.

Préférer :

```css
min-height
```

et des paddings cohérents.

### 14.4 Tones

Réutiliser les tons existants.

Ne pas créer une nouvelle palette.

---

# PARTIE F — Non-régression multi-sources

---

## 15. Points à vérifier

La refonte `Aujourd’hui` ne doit pas casser :

- activité Strava ;
- activité Strava enrichie Garmin ;
- activité Garmin-only ;
- activité randonnée Garmin ;
- filtre sport ;
- analytics ;
- navigation vers détail activité.

### 15.1 Identifiants activité

Si `Aujourd’hui` affiche des activités à relire, le lien doit utiliser une clé compatible multi-sources.

Ne pas supposer :

```text
stravaActivityId obligatoire
```

Préférer :

```text
activity.id
```

ou l’identifiant public déjà compatible backend.

### 15.2 Badges source

Si possible, afficher discrètement :

```text
Strava
Strava + Garmin
Garmin
Garmin · Randonnée
```

Mais ne pas surcharger.

---

# PARTIE G — Wording et vulgarisation

---

## 16. Wording cible

### 16.1 Titres

| Ancien / possible | Attendu |
|---|---|
| Lecture du jour | Lecture du jour |
| Contexte Trail | intégré dans vigilance ou synthèse |
| Forme du moment | Aptitude |
| Fatigue récente | Fatigue |
| Charge | Charge |
| Spécificité trail récente | Trail |

### 16.2 Messages recommandés

Cas disponible :

```text
Forme correcte, marge présente.
Aujourd’hui : endurance, trail facile ou montée contrôlée.
```

Cas vigilance descente :

```text
Vigilance : évite les descentes rapides, la charge descente récente est élevée.
```

Cas fatigue :

```text
Signaux de récupération fragiles : privilégie une sortie facile ou du repos actif.
```

Cas filtre actif :

```text
Lecture filtrée : Randonnée.
```

Cas données insuffisantes :

```text
Lecture prudente : données incomplètes.
```

---

## 17. Accents / mojibake

Corriger les libellés visibles sans accents ou encodés incorrectement.

Exemples :

| À corriger | Attendu |
|---|---|
| Randonnee | Randonnée |
| Activite | Activité |
| Perimetre | Périmètre |
| recuperation | récupération |
| seance | séance |
| deconnecter | déconnecter |
| rafraichissement | rafraîchissement |
| connecte | connecté |

Ne pas modifier les noms techniques de variables uniquement pour ajouter des accents.

---

# PARTIE H — Tests et recette

---

## 18. Tests frontend

Exécuter :

```bash
cd frontend
npm ci
npm test -- --run
npm run build
```

Ajouter ou adapter des tests pour :

- filtre `todaySportGroup` non persisté ;
- reset filtre ;
- rendu `TodayDecisionPanel`;
- absence de bloc Trail indépendant ;
- affichage Trail en vigilance ;
- activités à relire max 3 ;
- activité Garmin-only dans activités à relire ;
- version mobile sans overflow.

---

## 19. Tests backend minimaux

Même si le chantier est frontend, exécuter :

```bash
cd backend
npm ci
npm run prisma:generate
npx prisma validate
npm run prisma:pg:validate
npm run db:compare-schemas
npm test
```

Objectif : vérifier que la refonte n’est pas livrée sur un dépôt globalement cassé.

---

## 20. Recette manuelle

### 20.1 Filtre Aujourd’hui

Tester :

- ouverture initiale ;
- changement de filtre ;
- reset ;
- refresh navigateur ;
- nouvelle session ;
- filtre visible si actif.

### 20.2 UX desktop

Tester large écran :

- tout tient presque sans scroll ;
- pas de décalage ;
- carte décision lisible ;
- synthèse compacte ;
- activités à relire max 3.

### 20.3 UX mobile

Tester :

- pas de scroll horizontal ;
- pas de cartes trop larges ;
- ordre de lecture clair ;
- bouton reset filtre accessible.

### 20.4 Données

Tester :

- Strava seul ;
- Garmin seul ;
- Strava + Garmin ;
- randonnée Garmin ;
- aucune activité récente ;
- données recovery manquantes ;
- Trail récent ;
- aucun Trail récent.

---

# PARTIE I — Documentation `.ai/*.md`

---

## 21. Fichiers à mettre à jour

Mettre à jour :

```text
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
.ai/codebase_map.md
```

### 21.1 `current_context.md`

Mentionner :

- refonte `Aujourd’hui` en 4 blocs ;
- filtre `Aujourd’hui` non persisté ;
- Trail uniquement contexte/vigilance dans `Aujourd’hui`;
- analyses Trail détaillées déplacées vers Activité / Analytics / Objectifs.

### 21.2 `open_tasks.md`

Marquer terminé uniquement si testé :

- correction filtre ;
- refonte carte décision ;
- synthèse 7 jours ;
- activités à relire ;
- nettoyage runtime/source.

### 21.3 `regression_risks.md`

Ajouter ou mettre à jour :

- `DashboardPage`;
- `DashboardDecisionSummaryCard`;
- `TodayHeader`;
- filtre `todaySportGroup`;
- activités Garmin-only dans `Aujourd’hui`;
- CSS mobile.

### 21.4 `codebase_map.md`

Mettre à jour si nouveaux composants créés :

```text
TodayDecisionPanel
TodaySevenDaySummary
TodayUsefulActivities
TodayScopeHeader
```

---

# PARTIE J — Ordre d’exécution recommandé

---

## Lot 0 — Propreté dépôt / runtime

- restaurer `.gitignore` / `.gitattributes`;
- supprimer artefacts obsolètes ;
- rebuild frontend ;
- vérifier runtime = source.

Commit :

```text
chore(repo): restore source hygiene before today ux fixes
```

---

## Lot 1 — Correction filtre Aujourd’hui

- retirer persistance durable ;
- ajouter reset visible ;
- tester filtre.

Commit :

```text
fix(today): stop persisting daily sport filter
```

---

## Lot 2 — Refonte structure page Aujourd’hui

- limiter à 4 blocs ;
- supprimer empilement ;
- créer composants si nécessaire.

Commit :

```text
fix(today): simplify daily page structure
```

---

## Lot 3 — Carte décision principale

- verdict ;
- action ;
- vigilance ;
- indicateurs ;
- signaux clés ;
- Trail intégré.

Commit :

```text
fix(today): improve daily decision hierarchy
```

---

## Lot 4 — Synthèse 7 jours

- récupération ;
- charge ;
- volume ;
- Trail ;
- lien Analytics.

Commit :

```text
fix(today): consolidate seven day summary
```

---

## Lot 5 — Activités à relire

- max 3 activités ;
- sélection utile ;
- compatible multi-sources.

Commit :

```text
fix(today): replace recent activity stack with useful activities
```

---

## Lot 6 — Wording / responsive

- accents ;
- mojibake ;
- mobile ;
- pas de décalage.

Commit :

```text
fix(ui): polish today wording and responsive layout
```

---

## Lot 7 — Tests + `.ai`

- tests ;
- build ;
- documentation agent.

Commit :

```text
docs(ai): update today ux handoff and regression risks
```

---

# PARTIE K — Définition de terminé

---

## 22. Critères d’acceptation finaux

Le chantier est terminé uniquement si :

- le filtre `Aujourd’hui` ne persiste plus durablement ;
- un filtre actif est visible et réinitialisable ;
- `Aujourd’hui` est limité à 4 blocs maximum ;
- le Trail n’apparaît plus comme bloc analytique indépendant dans `Aujourd’hui`;
- le Trail est visible uniquement comme contexte/vigilance/synthèse ;
- les analyses Trail détaillées restent dans Activité / Analytics / Objectifs ;
- la page tient presque sans scroll sur desktop ;
- aucun overflow horizontal sur mobile ;
- les activités à relire sont limitées à 3 ;
- les activités Garmin-only ne cassent pas l’affichage ;
- `.gitignore` et `.gitattributes` sont présents ;
- le runtime correspond au code source ;
- les tests frontend passent ;
- le build frontend passe ;
- les fichiers `.ai/*.md` sont à jour.

---

## 23. Message final attendu de CODEX / Claude Pro

À la fin, produire :

```text
Correctifs réalisés :
- Propreté dépôt/runtime : ...
- Filtre Aujourd’hui : ...
- Refonte Aujourd’hui 4 blocs : ...
- Carte décision : ...
- Synthèse 7 jours : ...
- Activités à relire : ...
- Wording/responsive : ...

Tests exécutés :
- frontend test : ...
- frontend build : ...
- backend smoke : ...

Résultat UX :
- scroll desktop : ...
- mobile : ...
- filtre : ...
- Trail : ...

Risques résiduels :
- ...

Commits :
- ...
```
