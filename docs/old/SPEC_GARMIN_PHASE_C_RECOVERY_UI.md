# Phase C — Cartes UI Récupération + Lot 8 ciblé enrichissement activités

> **Audience** : agent CODEX sans contexte préalable de la conversation.
> **Objectif** : exposer les données Garmin de récupération dans les onglets Aujourd'hui, Tendance, Performance, et enrichir la fiche activité avec cadence/puissance Garmin.
> **Contraintes** : principe « enrichissement, pas dépendance ». Toutes les cartes doivent fonctionner correctement et de manière dégradée (mais pas en erreur) sans Garmin connecté.

---

## 1. Contexte

Le moteur de récupération Garmin est en place (Phase A). Le snapshot quotidien est stocké dans `ExternalDailyRecoverySnapshot` avec les champs : `date`, `sleepDurationSeconds`, `sleepScore`, `hrvAvgMs`, `hrvStatus`, `restingHr`, `stressAvg`, `stressMax`, `bodyBatteryMorning`, `bodyBatteryMin`, `bodyBatteryMax`, `bodyBatteryEnd`, `dataQuality`.

Endpoint GET `/providers/garmin/recovery/snapshots?days=N` exporte ces données.

Aujourd'hui, ces snapshots ne sont **exploités que par la carte Décision sur Aujourd'hui**. Les autres pages (Tendance, Performance) ignorent complètement Garmin. La fiche activité ne montre pas non plus les données Garmin (Lot 8 jamais implémenté).

### Cible Phase C
1. **Aujourd'hui** : nouvelle carte « Récupération » (4 mini-tuiles avec sparkline) sous la carte Décision.
2. **Tendance** : nouvelle section « Récupération vs charge » (graphique double axe sur 90 j).
3. **Performance** : nouvelle carte « Forme physiologique » (HRV + FC repos baselines long terme).
4. **Fiche activité** : Lot 8 ciblé, onglet « Garmin » avec cadence par split + puissance running (si disponible).

---

## 2. Lots de la Phase C

| Lot | Objet | Effort |
|---|---|---|
| C1 | Carte Récupération sur Aujourd'hui (4 mini-tuiles + sparklines) | 4-5 h |
| C2 | Section Récupération vs charge sur Tendance | 4-5 h |
| C3 | Carte Forme physiologique sur Performance | 3-4 h |
| C4 | Lot 8 ciblé : cadence + puissance Garmin sur la fiche activité | 4-6 h |
| C5 | Tests + commit final | 1-2 h |

---

## 3. Lot C1 — Carte Récupération sur Aujourd'hui

### Objectif
Exposer en 4 tuiles compactes les signaux Garmin clés : Sommeil, HRV, FC repos, Stress (Body Battery en bonus si dispo).

### Fichiers
- `frontend/src/components/TodayRecoveryCard.jsx` (CREER)
- `frontend/src/utils/recoveryViewModel.js` (CREER)
- `frontend/src/pages/DashboardPage.jsx` (intégrer le composant)
- `frontend/src/styles.css` (styles)
- `frontend/src/content/trainingMvpCopy.js` (tooltip info)

### `recoveryViewModel.js` — utilitaire d'agrégation

Fonctions exportées :

```js
// Convertit la liste brute de snapshots en série journalière prête pour les sparklines
export function buildRecoveryViewModel(snapshots = []) {
  // Trie par date, calcule des séries ordonnées des 14 derniers jours
  // Retourne {
  //   sleep: { recentAverage, baselineAverage, deltaPercent, series: [{ date, value }] },
  //   hrv: { ... },
  //   restingHr: { ... },
  //   stress: { ... },
  //   bodyBattery: { ... },
  //   coverage: 0..1,
  //   confidenceLabel: "Haute" | "Moyenne" | "Faible" | "Standard",
  //   hasData: boolean,
  // }
}
```

Logique :
- Series : 14 derniers jours, valeurs absentes = `null`.
- recentAverage : moyenne 7 derniers jours (skip null).
- baselineAverage : moyenne du jour −35 au jour −7 (skip null).
- deltaPercent : `(recent - baseline) / baseline * 100`, null si baseline insuffisante (< 14 j).
- Sur le `bodyBattery` : utiliser `bodyBatteryMorning` en priorité, fallback `bodyBatteryEnd`.

### `TodayRecoveryCard.jsx`

Layout : 4 tuiles en grille (responsive : 4 colonnes desktop, 2x2 tablette, 1x4 mobile).

Pour chaque tuile :
- Titre vulgarisé : "Sommeil", "Variabilité cardiaque", "FC au repos", "Stress" (PAS "HRV" en titre — utiliser "Variabilité cardiaque").
- Valeur principale (gros chiffre) :
  - Sommeil : `7 h 18` (formaté depuis sleepDurationSeconds moyenne 7 j)
  - HRV : `52 ms`
  - FC repos : `54 bpm`
  - Stress : `38 / 100`
- Indicateur tone (vert/jaune/rouge selon delta vs baseline OU seuils absolus si pas de baseline)
- Mini-sparkline 14 jours (lignes simples, sans axe, height ~ 30 px)
- Tooltip InfoTooltip avec contenu vulgarisé + glossaryKey

Si `recoveryViewModel.hasData === false` : afficher le composant entier en mode placeholder :
- "Connecte Garmin pour voir tes signaux de récupération."
- Bouton "Configurer Garmin" → lien vers `/admin#garmin`.

### Position dans DashboardPage
Insérer **sous** la `DashboardDecisionSummaryCard` et **au-dessus** des `TodayFormCards`. Cela garde la décision en haut, puis détaille les signaux Garmin pour ceux qui veulent creuser.

### Tooltip InfoTooltip — contenus

Ajouter dans `frontend/src/content/trainingMvpCopy.js` :
```js
export const TRAINING_MVP_RECOVERY_INFO = {
  sleep: buildInfoBlocks({
    role: "Lire ta durée de sommeil moyenne sur les 7 derniers jours.",
    calculation: "Moyenne pondérée des durées de sommeil détectées par Garmin.",
    interpretation: "< 6 h 30 = sommeil court qui peut peser sur tes adaptations. 7 h - 8 h = bonne plage. > 9 h = peut signaler une fatigue sous-jacente.",
    action: "Si plusieurs nuits courtes d'affilée, allège l'intensité du jour suivant.",
    reference: "Walker, Why We Sleep (2017) ; recommandations sport endurance 7-9 h.",
    glossaryKey: "sommeil",
  }),
  hrv: buildInfoBlocks({
    role: "Lire la variabilité cardiaque (HRV) de ton compte Garmin sur 7 jours.",
    calculation: "Moyenne 7 jours comparée à ta baseline 35 jours.",
    interpretation: "HRV stable ou en hausse vs baseline = bonne récupération. -7 % vs baseline = à surveiller. -12 % = signal de fatigue marqué.",
    action: "Une HRV en chute prolongée invite à privilégier l'endurance facile et à dormir davantage.",
    reference: "Stanley et al. (2013), HRV in elite endurance athletes.",
    glossaryKey: "hrv",
  }),
  restingHr: buildInfoBlocks({
    role: "Lire ta fréquence cardiaque au repos sur 7 jours.",
    calculation: "Moyenne 7 jours comparée à ta baseline 35 jours.",
    interpretation: "Stable = normal. +3 bpm vs baseline = à surveiller. +6 bpm = signal de fatigue/maladie potentielle.",
    action: "Si la FC repos reste haute plusieurs jours sans cause évidente, considère une journée de repos.",
    glossaryKey: "fc-repos",
  }),
  stress: buildInfoBlocks({
    role: "Lire le score de stress moyen Garmin sur 7 jours.",
    calculation: "Moyenne des scores Garmin (0-100, plus haut = plus stressé).",
    interpretation: "< 30 = stress bas. 30-55 = stress modéré. > 55 = stress élevé qui pèse sur la récupération.",
    action: "Score Garmin propriétaire, à croiser avec ton ressenti.",
    glossaryKey: "stress",
  }),
};
```

### Acceptance C1
- Sur Aujourd'hui, juste sous la carte Décision, 4 tuiles affichent Sommeil / HRV / FC repos / Stress.
- Chaque tuile a un sparkline 14 jours et un delta vs baseline.
- Avec Garmin déconnecté, message d'invitation à connecter avec lien vers Admin.
- Tooltips fonctionnels sur chaque tuile avec lien glossaire.

---

## 4. Lot C2 — Section Récupération vs charge sur Tendance

### Objectif
Permettre de visualiser les corrélations entre charge d'entraînement (CTL/ATL/TSB) et signaux de récupération sur 90 jours.

### Fichiers
- `frontend/src/components/RecoveryVsLoadChart.jsx` (CREER)
- `frontend/src/utils/recoveryCorrelations.js` (CREER)
- `frontend/src/pages/AnalyticsPage.jsx` (intégrer)
- `frontend/src/styles.css`

### Logique métier

`recoveryCorrelations.js` :
```js
export function alignRecoveryWithLoad({ loadModel, snapshots, days = 90 }) {
  // loadModel.chartData = série journalière { date, ctl, atl, tsb, load }
  // snapshots = série Garmin { date, sleepDurationSeconds, hrvAvgMs, restingHr, stressAvg, ... }
  // Retourne une série fusionnée : [{ date, load, ctl, tsb, sleep, hrv, restingHr, stress }]
  // sur les `days` derniers jours, alignée sur la date.
}

export function computeRecoveryLoadInsights(alignedSeries) {
  // Détecte des patterns simples :
  // - "Tes HRV chutent en moyenne X % les jours après TSB < -10"
  // - "Ton sommeil moyen baisse de X h après une semaine > 600 pts"
  // Retourne 2-3 insights textuels clés.
}
```

### Composant `RecoveryVsLoadChart.jsx`

Graphique combiné (Recharts) :
- Axe X : date (90 j)
- Axe Y gauche : CTL (ligne bleue) + ATL (ligne orange)
- Axe Y droite : Sommeil (en heures, ligne verte) + HRV (ms, ligne mauve)
- Bouton toggle pour choisir 2 signaux Y droite parmi : Sommeil, HRV, FC repos, Stress, Body Battery.

Sous le graphique : 2-3 insights textuels en bullet (sortie de `computeRecoveryLoadInsights`).

### Position dans AnalyticsPage
Nouvelle section après `LoadChartCard` et avant `EfficiencyCard`. Titre : "Récupération vs charge".

Si `recoverySnapshots.length === 0` : pas afficher la section du tout (silencieux).
Si `recoverySnapshots.length < 14` : afficher la section avec un message "Données Garmin trop récentes pour analyse fiable, reviens dans X jours".

### Acceptance C2
- Sur Tendance (`/analytics`), nouvelle section "Récupération vs charge" entre la charge et l'efficience.
- Graphique double axe fonctionne, toggle des signaux opérationnel.
- 2-3 insights textuels affichés.
- Comportement dégradé propre sans Garmin (section masquée).

---

## 5. Lot C3 — Carte Forme physiologique sur Performance

### Objectif
Vue long terme : HRV moyenne 28 j vs 90 j, FC repos baseline annuelle, Training Readiness Garmin si dispo.

### Fichiers
- `frontend/src/components/PerformancePhysioCard.jsx` (CREER)
- `frontend/src/pages/PerformancePage.jsx` (intégrer)

### Contenu

3 mini-blocs :
1. **HRV long terme** : valeur 28 j + delta vs 90 j + sparkline 90 j.
2. **FC repos baseline** : valeur 28 j + delta vs même période N-1 (si données disponibles, sinon vs 90 j).
3. **Training Readiness Garmin** (signal externe propriétaire) : score moyen 7 j si dispo, sinon "Non disponible" + petit message expliquant que Garmin diffuse ce signal mais pas systématiquement via la lib non officielle.

### Position dans PerformancePage
Section après `VdotProfileCard` et avant `BestEffortsPanel`. Titre : "Forme physiologique".

Si pas de Garmin → section masquée silencieusement.

### Acceptance C3
- Sur Performance (`/performance`), nouvelle section "Forme physiologique" entre VDOT et Best Efforts.
- 3 blocs avec sparklines 90 j.
- Comportement dégradé propre sans Garmin.

---

## 6. Lot C4 — Lot 8 ciblé : enrichissement fiche activité (cadence + puissance)

### Objectif
Quand une activité Strava a un enrichissement Garmin matché, afficher dans la fiche détail un onglet "Garmin" avec :
- Cadence par split (sparkline 1 valeur par split)
- Puissance running moyenne par split (si dispo)
- Training Effect Garmin (signal secondaire, label seulement)

### Pré-requis
- Le `ActivityProviderEnrichment` doit déjà contenir les données pertinentes. Vérifier dans le service `activityEnrichment.service.js` qu'on récupère bien `splits` Garmin avec cadence et puissance.
- Si non, étendre `garminconnectBridge.py` pour inclure l'endpoint activité détaillée, ou utiliser un enrichissement à la demande lors de l'ouverture de la fiche.

### Décision technique
Pour cette phase : **enrichissement à la demande** quand l'utilisateur ouvre la fiche activité. Pas de backfill massif.

### Fichiers backend
- `backend/src/services/providers/garminActivityEnrichment.service.js` (CREER)
- `backend/src/controllers/activity.controller.js` (étendre `enrichActivity` pour inclure Garmin si possible)
- `backend/src/routes/activity.routes.js` (route inchangée, juste payload enrichi)

### Fichiers frontend
- `frontend/src/components/GarminEnrichmentPanel.jsx` (CREER)
- `frontend/src/components/ActivityDetailTabs.jsx` (ajouter onglet "Garmin" conditionnel)
- `frontend/src/services/activity.service.js` (rien à changer si l'enrichissement est inline)

### Logique
1. Quand l'utilisateur ouvre la fiche d'une activité Strava :
   - Le frontend appelle `getActivityById(stravaActivityId)`.
   - Le backend retourne l'activité avec un éventuel `garminEnrichment: { splits: [{ index, distanceKm, durationSeconds, paceSecondsPerKm, cadenceSpm, powerWatts }], trainingEffect: { aerobic, anaerobic, label } }`.
2. Si `garminEnrichment` présent et non vide : afficher l'onglet "Garmin" dans `ActivityDetailTabs`.
3. L'onglet contient :
   - Tableau split : index, distance, allure, cadence, puissance.
   - Sparkline cadence par split.
   - Sparkline puissance par split (si dispo).
   - Bloc Training Effect (aérobie + anaérobie, labels Garmin propriétaires).

### Comportement dégradé
- Pas de Garmin connecté → pas d'onglet, comportement actuel intact.
- Garmin connecté mais pas de match pour cette activité → pas d'onglet (silencieux).
- Match partiel (cadence sans puissance) → onglet présent, puissance affichée "Non disponible".

### Acceptance C4
- Pour une activité Strava qui a un match Garmin : onglet "Garmin" visible avec splits enrichis.
- Pour une activité sans match : pas d'onglet, comportement actuel intact.
- Aucune modification backend ne casse la fiche activité existante.

---

## 7. Lot C5 — Tests + commit final

### Tests Vitest à ajouter
Dans `frontend/src/utils/recoveryViewModel.test.js` :
- 5 scénarios sur `buildRecoveryViewModel` : vide, 7 j seulement, 14 j, 28 j, 56 j.
- 3 scénarios sur `alignRecoveryWithLoad` : load complet + recovery complet, partiel, vide.
- 2 scénarios sur `computeRecoveryLoadInsights`.

### Tests visuels manuels
| Page | Vérification |
|---|---|
| `/` (Aujourd'hui) | Bloc "Récupération" sous Décision avec 4 tuiles |
| `/analytics` | Section "Récupération vs charge" entre charge et efficience |
| `/performance` | Carte "Forme physiologique" entre VDOT et Records |
| `/activities/:id` | Onglet "Garmin" présent uniquement si match |
| Sans Garmin connecté | Aucune section Récup ne s'affiche, pas d'erreur |

---

## 8. Tests locaux à exécuter

```bash
cd frontend
npx eslint src/components/Today*.jsx src/components/RecoveryVsLoad*.jsx src/components/PerformancePhysio*.jsx src/components/Garmin*.jsx src/utils/recovery*.js --max-warnings 0
npm test
npm run build
npm run dev  # tests visuels manuels
```

---

## 9. Commits + push CI/CD

### Commit C1
```bash
git add frontend/src/components/TodayRecoveryCard.jsx
git add frontend/src/utils/recoveryViewModel.js
git add frontend/src/utils/recoveryViewModel.test.js
git add frontend/src/pages/DashboardPage.jsx
git add frontend/src/styles.css
git add frontend/src/content/trainingMvpCopy.js
git commit -m "Phase C1 : carte Recuperation sur Aujourd'hui (4 tuiles + sparklines, fallback sans Garmin)"
git push origin main
```

### Commit C2
```bash
git add frontend/src/components/RecoveryVsLoadChart.jsx
git add frontend/src/utils/recoveryCorrelations.js
git add frontend/src/pages/AnalyticsPage.jsx
git commit -m "Phase C2 : section Recuperation vs charge sur Tendance (graphique double axe, insights)"
git push origin main
```

### Commit C3
```bash
git add frontend/src/components/PerformancePhysioCard.jsx
git add frontend/src/pages/PerformancePage.jsx
git commit -m "Phase C3 : carte Forme physiologique sur Performance (HRV long terme, FC repos baseline)"
git push origin main
```

### Commit C4
```bash
git add backend/src/services/providers/garminActivityEnrichment.service.js
git add backend/src/controllers/activity.controller.js
git add frontend/src/components/GarminEnrichmentPanel.jsx
git add frontend/src/components/ActivityDetailTabs.jsx
git commit -m "Phase C4 : Lot 8 cible - cadence et puissance Garmin sur la fiche activite (a la demande)"
git push origin main
```

### Commit C5
```bash
git add frontend/src/utils/recoveryViewModel.test.js
git add docs/SPEC_GARMIN_PHASE_C_RECOVERY_UI.md
git commit -m "Phase C5 : tests Vitest sur recoveryViewModel + spec doc"
git push origin main
```

Chaque push déclenche le workflow `deploy-vm.yml`.

---

## 10. Acceptance globale Phase C

- [ ] C1 : carte Récupération visible sur Aujourd'hui (avec ou sans données).
- [ ] C2 : section Récupération vs charge fonctionnelle sur Tendance.
- [ ] C3 : carte Forme physiologique fonctionnelle sur Performance.
- [ ] C4 : onglet Garmin sur fiche activité avec cadence + puissance.
- [ ] C5 : tests Vitest verts, doc à jour.
- [ ] Sans Garmin connecté : aucune carte Récup ne s'affiche, comportement actuel intact partout.
- [ ] CI/CD verte sur les 5 commits.

---

## 11. Hors scope

- Pas d'enrichissement automatique massif des activités passées (Lot 8 reste "à la demande").
- Pas d'alertes spécifiques Garmin (déjà couvertes par bandeau alerts existant).
- Pas de système de recommandations basé sur des patterns historiques (Phase D).
- Pas de modification du moteur de décision (déjà en Phase A).
