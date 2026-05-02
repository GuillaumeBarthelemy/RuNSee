# Phase D — Cross-data Garmin × Strava (analyses différenciantes)

> **Audience** : agent CODEX sans contexte préalable de la conversation.
> **Objectif** : exploiter le couplage activités Strava + récupération Garmin pour produire des analyses **personnalisées** que ni Strava seul ni Garmin Connect seul ne fournissent.
> **Contraintes** : principe « enrichissement, pas dépendance ». Toutes les analyses cross-data doivent fonctionner avec un dataset partiel et indiquer clairement la confiance.

---

## 1. Contexte et valeur produit

Strava fournit les activités. Garmin (via la phase précédente) fournit les snapshots de récupération quotidiens (sommeil, HRV, FC repos, stress, Body Battery). Aucun outil mainstream ne croise ces deux sources pour produire des **statistiques personnelles** type :

- "Tes meilleures séances qualité (efficience > seuil) tombent quand HRV ≥ baseline et sommeil ≥ 7 h."
- "Quand tu enchaines 3 sorties en moins de 5 jours après une nuit < 6 h, ton allure seuil baisse de X %."
- "Ton sommeil chute en moyenne de 30 min après une charge journalière > 80 pts."
- "Tu progresses mieux quand ta semaine combine charge stable + sommeil moyen 7 h 15 +."

C'est ce qui rend RunNSee différenciant. Cette phase est exploratoire : on construit les bases analytiques, on expose 3-4 insights principaux, puis on itère selon ce que les athlètes trouvent utile.

---

## 2. Lots de la Phase D

| Lot | Objet | Effort |
|---|---|---|
| D1 | Util `crossDataAnalytics.js` (corrélations, agrégations) | 5-6 h |
| D2 | Carte "Tes patterns" sur Performance (3-4 insights personnels) | 4-5 h |
| D3 | Section "Récup × Activité" sur la fiche activité | 2-3 h |
| D4 | Tests Vitest et acceptance | 2-3 h |

---

## 3. Lot D1 — Util `crossDataAnalytics.js`

### Objectif
Fournir des fonctions pures qui produisent des insights cross-data interprétables.

### Fichiers
- `frontend/src/utils/crossDataAnalytics.js` (CREER)
- `frontend/src/utils/crossDataAnalytics.test.js` (CREER en D4)

### Fonctions exportées

#### D1.1 `joinActivitiesWithRecovery({ activities, snapshots })`
Joint chaque activité avec :
- Le snapshot Garmin du **jour de l'activité** (J).
- Le snapshot du **jour précédent** (J-1, particulièrement le sommeil de la nuit avant).

Retourne une liste `[{ activity, recoveryDay, recoveryEve }]`.

#### D1.2 `analyzeQualityVsRecovery(joined)`
Identifie les "meilleures séances" :
- Filtre les activités avec `__paceSecondsPerKm > 0` ET intensité Z3+ détectable (via `dominantIntensityLabel` si présent ou via FC moyenne / FC max ratio > 0.85).
- Pour chaque, regarde si `recoveryDay.hrvAvgMs >= baseline` ET `recoveryEve.sleepDurationSeconds >= baseline_sleep`.
- Calcule la part des "bonnes séances" qui tombent sur des "bonnes journées récup" vs total.
- Retourne :
  ```
  {
    sampleSize: N,
    qualitySessionsAnalyzed: M,
    pctOnGoodRecoveryDays: 0.78,  // 78 % des séances qualité tombent un jour avec HRV/sommeil OK
    insight: "78 % de tes séances qualité tombent quand HRV et sommeil sont au vert.",
    confidence: "Haute" | "Moyenne" | "Faible",
    hasData: boolean,
  }
  ```

#### D1.3 `analyzeChargeImpactOnSleep(joined)`
Pour chaque activité, regarde le sommeil **du jour J (la nuit après)** vs la baseline 14 j de l'utilisateur.
- Calcule la moyenne du delta sommeil après chaque activité.
- Stratifie par charge : activités < 50 pts, 50-150, 150-300, > 300.
- Retourne :
  ```
  {
    sampleSize: N,
    bands: {
      light:    { count, avgSleepDeltaMin },     // ex. -2 min
      moderate: { count, avgSleepDeltaMin },     // ex. +5 min
      hard:     { count, avgSleepDeltaMin },     // ex. -22 min
      veryHard: { count, avgSleepDeltaMin },     // ex. -38 min
    },
    insight: "Après une séance > 300 pts, ton sommeil descend de 38 min en moyenne.",
    confidence,
    hasData,
  }
  ```

#### D1.4 `analyzeMonotonyVsHrv(joined, varianceProfile)`
Si la monotonie de Foster (déjà calculée par `buildLoadVarianceProfile`) est élevée, comparer la HRV correspondante.
- Stratifie : monotonie faible (< 1,5), modérée (1,5-2,2), élevée (> 2,2).
- Calcule la HRV moyenne sur les 7 j de chaque période.
- Retourne :
  ```
  {
    sampleSize,
    bands: {
      low:      { weeks: N, avgHrv: ... },
      moderate: { weeks: N, avgHrv: ... },
      high:     { weeks: N, avgHrv: ... },
    },
    insight: "Tes semaines avec monotonie > 2,2 ont une HRV moyenne 6 % plus basse.",
    confidence,
    hasData,
  }
  ```

#### D1.5 `buildPersonalPatterns({ activities, snapshots, varianceProfile })`
Orchestrateur qui appelle les 3 analyses ci-dessus et produit un objet :
```
{
  qualityVsRecovery: {...},
  chargeImpactOnSleep: {...},
  monotonyVsHrv: {...},
  globalConfidence: "Haute" | "Moyenne" | "Faible",
  hasMinimumData: boolean,  // true si au moins 60 jours de croisement
}
```

`hasMinimumData` exige :
- Au moins 60 jours de snapshots Garmin avec signaux (sommeil + HRV).
- Au moins 20 activités sur la même période.

Si `false`, l'orchestrateur retourne quand même les analyses partielles mais marque `globalConfidence: "Faible"` et expose la condition manquante.

### Acceptance D1
- 4 fonctions exportées (3 analyses + 1 orchestrateur).
- Toutes acceptent un dataset vide ou partiel sans crasher.
- Toutes retournent `hasData: false` si le sample est trop petit.

---

## 4. Lot D2 — Carte "Tes patterns" sur Performance

### Objectif
Afficher 3-4 insights personnels en une carte compacte sur la page Performance.

### Fichiers
- `frontend/src/components/PersonalPatternsCard.jsx` (CREER)
- `frontend/src/pages/PerformancePage.jsx` (intégrer)
- `frontend/src/styles.css`

### Layout proposé

```
[CARTE : "Tes patterns personnels"]
[sous-titre : "Statistiques tirées du croisement de tes activités et de tes signaux de récupération."]

[Bloc 1 — Qualité vs récupération]
  78 % de tes séances qualité tombent quand sommeil et HRV sont au vert.
  Confiance : Haute (53 séances analysées).

[Bloc 2 — Impact de la charge sur le sommeil]
  Après une séance > 300 pts, ton sommeil descend de 38 min en moyenne.
  Confiance : Moyenne (12 séances).

[Bloc 3 — Monotonie et HRV]
  Tes semaines avec monotonie > 2,2 ont une HRV 6 % plus basse en moyenne.
  Confiance : Faible (7 semaines).

[Note de bas]
"Ces patterns affinent ta compréhension personnelle. Ils ne remplacent jamais ton ressenti."
```

### Comportement dégradé

- Si `hasMinimumData === false` : afficher uniquement les insights qui ont `hasData: true` + un bandeau d'avertissement :
  > Tu as moins de 60 jours de croisement Strava + Garmin. Les patterns détectés sont indicatifs et se renforceront avec plus de données.
- Si **aucun** insight n'a `hasData: true` : ne pas afficher la carte.

### Position
Sur `/performance`, après `BestEffortsPanel` et avant `PerformancePhysioCard` (créée en Phase C). Si la Phase C n'est pas encore appliquée, après `BestEffortsPanel` simplement.

### Acceptance D2
- Carte présente sur Performance avec 3 insights numériques.
- Confiance affichée par insight.
- Carte masquée si pas assez de données.
- Bandeau d'avertissement si dataset partiel.

---

## 5. Lot D3 — Section "Récup × Activité" sur la fiche activité

### Objectif
Sur la fiche d'une activité donnée, afficher le snapshot Garmin du jour ET de la veille pour donner du contexte.

### Fichiers
- `frontend/src/components/ActivityRecoveryContextCard.jsx` (CREER)
- `frontend/src/components/ActivityDetailTabs.jsx` (intégrer dans l'onglet "Garmin" ou en bandeau séparé)
- `frontend/src/utils/crossDataAnalytics.js` (compléter avec helper `getRecoveryContextForActivity`)

### Logique

Pour une activité (date `D`) :
1. Récupérer le snapshot du jour `D` (récup avant l'activité, mesurée la nuit précédente).
2. Récupérer le snapshot du jour `D+1` (récup après l'activité, mesurée la nuit suivante).
3. Comparer chaque signal au baseline 14-28 j.
4. Afficher en bandeau compact :
   ```
   Avant : sommeil 7 h 15 (+0:05 vs baseline), HRV 58 ms (+2 %), stress 35.
   Après : sommeil 6 h 45 (-25 min vs baseline), HRV 49 ms (-12 %), FC repos +3 bpm.
   ```

### Cas d'absence
- Si le snapshot avant ou après est manquant : afficher uniquement celui qui existe avec mention "Donnée absente avant/après".
- Si les deux sont manquants : pas de bandeau du tout.

### Acceptance D3
- Sur une activité avec snapshots Garmin avant/après : bandeau "Avant/Après" affiché dans l'onglet Garmin de la fiche activité.
- Sur une activité sans snapshot : pas de bandeau, comportement existant intact.

---

## 6. Lot D4 — Tests + finalisation

### Tests Vitest à créer
Dans `frontend/src/utils/crossDataAnalytics.test.js` :

| Scénario | Vérification |
|---|---|
| Empty activities + empty snapshots | `hasData: false` partout, pas de crash |
| 5 activités + 5 snapshots | `hasMinimumData: false`, mais analyses fonctionnent |
| 30 activités + 90 snapshots | `hasMinimumData: true`, insights produits |
| Activités sans data récup associée | Skip propre, pas d'erreur |
| Charge stratifiée 4 bandes | Chaque bande a `count` et `avgSleepDeltaMin` cohérents |
| Monotonie 3 bandes | Cohérence des HRV moyennes |
| `joinActivitiesWithRecovery` avec dates exactes | Match par date locale (timezone aware) |

### Tests visuels manuels
| Page | Vérification |
|---|---|
| `/performance` | Carte "Tes patterns" visible avec 3 blocs si dataset suffisant |
| `/performance` | Carte masquée si pas de Garmin |
| `/activities/:id` | Bandeau "Avant/Après" dans onglet Garmin si snapshots dispo |

---

## 7. Tests locaux à exécuter

```bash
cd frontend
npx eslint src/utils/crossDataAnalytics.js src/utils/crossDataAnalytics.test.js src/components/PersonalPatternsCard.jsx src/components/ActivityRecoveryContextCard.jsx --max-warnings 0
npm test
npm run build
npm run dev  # tests visuels manuels
```

---

## 8. Commits + push CI/CD

### Commit D1 + D4 partiel
```bash
git add frontend/src/utils/crossDataAnalytics.js
git add frontend/src/utils/crossDataAnalytics.test.js
git commit -m "Phase D1 : moteur cross-data Garmin x Strava (qualite vs recup, charge vs sommeil, monotonie vs hrv)"
git push origin main
```

### Commit D2
```bash
git add frontend/src/components/PersonalPatternsCard.jsx
git add frontend/src/pages/PerformancePage.jsx
git add frontend/src/styles.css
git commit -m "Phase D2 : carte Patterns personnels sur Performance (3 insights chiffres avec confiance)"
git push origin main
```

### Commit D3
```bash
git add frontend/src/components/ActivityRecoveryContextCard.jsx
git add frontend/src/components/ActivityDetailTabs.jsx
git commit -m "Phase D3 : contexte recup avant/apres sur la fiche activite"
git push origin main
```

### Commit D4
```bash
git add docs/SPEC_GARMIN_PHASE_D_CROSS_DATA.md
git commit -m "Phase D4 : doc spec cross-data Garmin x Strava"
git push origin main
```

Chaque push déclenche le workflow `deploy-vm.yml`.

---

## 9. Acceptance globale Phase D

- [ ] D1 : `crossDataAnalytics.js` exporte les 4 fonctions clés.
- [ ] D2 : carte "Tes patterns" sur Performance avec 3 insights.
- [ ] D3 : bandeau "Avant/Après" sur la fiche activité.
- [ ] D4 : 7+ tests Vitest verts.
- [ ] Sans Garmin : aucune carte cross-data ne s'affiche, aucune erreur.
- [ ] CI/CD verte sur les 4 commits.

---

## 10. Hors scope

- Pas de machine learning ni de modèle prédictif. Toutes les analyses sont des statistiques descriptives.
- Pas de seuils calibrés par algo : les seuils (60 j, 20 activités, etc.) sont des règles métier figées.
- Pas d'export PDF / partage social des patterns.
- Pas de recommandations actives (les patterns sont descriptifs, pas prescriptifs).
- Pas d'historique cross-année (analyses limitées aux 365 derniers jours pour rester rapide).
- Pas de comparaison interathlète.

---

## 11. Notes pour l'évolution future

Si la Phase D fonctionne bien, des extensions naturelles :

- **D+** : prédiction "ta prochaine séance qualité a 80 % de chance d'être réussie si tu attends 1 jour de plus" basée sur les patterns détectés.
- **D++** : seuils auto-adaptés par utilisateur (ex. seuil sommeil personnalisé au lieu de 6 h 30 universel).
- **D+++** : intégration dans la décision Aujourd'hui (la décision se base sur les patterns personnels en plus des règles génériques).

Ces extensions ne sont **pas dans le scope de cette phase**, à débattre selon retour utilisateur.
