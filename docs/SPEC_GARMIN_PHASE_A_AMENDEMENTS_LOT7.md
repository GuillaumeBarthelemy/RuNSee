# Phase A — Amendements Lot 7 Garmin (synthèse décisionnelle)

> **Audience** : agent CODEX sans contexte préalable de la conversation.
> **Objectif** : consolider l'implémentation Lot 7 déjà livrée (`buildDashboardDecisionSummary` enrichi avec données Garmin) en ajoutant des garde-fous, des tests et un wording enrichi.
> **Contraintes** : ne pas casser le comportement actuel ; respecter strictement le principe « Garmin enrichit, ne crée pas de dépendance ».

---

## 1. Contexte

Le Lot 7 a déjà été implémenté et déployé. Les éléments clés en place :

- **Backend** : endpoint `GET /providers/garmin/recovery/snapshots?days=N` (`backend/src/controllers/provider.controller.js` + `backend/src/services/providers/garminRecoveryBackfill.service.js`).
- **Frontend service** : `frontend/src/services/externalProvider.service.js` exporte `getGarminRecoverySnapshots({ days })`.
- **Page Dashboard** : `frontend/src/pages/DashboardPage.jsx` charge les snapshots (56 jours) au mount via `useEffect`, les passe dans `buildDashboardDecisionSummary(loadModel, contextLoadModel, { recoverySnapshots })`.
- **Moteur de décision** : `frontend/src/utils/performanceNarratives.js` :
  - `buildRecoveryDecisionProfile(snapshots)` : 7 derniers jours + baseline glissante 35 jours, score basé sur HRV%, FC repos delta, sommeil, stress, Body Battery.
  - `adjustRecommendationWithRecovery(recommendation, recovery)` : module la recommandation finale selon le tone récup.
- **UI** : `DashboardDecisionSummaryCard` reçoit `model.recovery` et `model.decisionMeta`.

### Seuils actuellement en place dans `buildRecoveryDecisionProfile`
| Signal | Seuil score −3 | score −2 | score +1 |
|---|---|---|---|
| HRV delta vs baseline | ≤ −12 % | ≤ −7 % | ≥ +6 % |
| FC repos delta | ≥ +6 bpm | ≥ +3 bpm | ≤ −3 bpm |
| Sleep score | — | < 55 | ≥ 75 |
| Sleep duration | — | < 6 h 30 | ≥ 7 h 30 |
| Stress moyen | — | ≥ 55 | ≤ 30 |
| Body Battery matin | — | < 35 | ≥ 70 |

### Confiance
```
confidenceScore = coverage * 0.45 + signalCoverage * 0.55
≥ 0.72 → Haute
≥ 0.42 → Moyenne
sinon → Faible
```

### Verdict d'audit
- ✅ Seuils chiffrés présents.
- ✅ Baseline glissante 35 jours.
- ✅ HRV / FC repos comparés à la baseline (pas valeur ponctuelle).
- ✅ Recommandation ajustée selon recovery.tone.
- ✅ Fallback `hasData: false` quand pas de snapshots.
- ⚠️ Pas de garde-fou si baseline trop courte (< 14 jours).
- ⚠️ Pas de test unitaire sur ces seuils.
- ⚠️ Wording général ("Solide / Neutre / A surveiller / Fragile") pas modulé selon les combinaisons typiques.
- ⚠️ Pas de vérification explicite que `DashboardDecisionSummaryCard` rend bien `model.recovery` et `model.decisionMeta`.

---

## 2. Lot A1 — Garde-fou baseline minimale

### Objectif
Ne pas produire de jugement sur HRV / FC repos delta tant que la baseline est trop courte (< 14 jours de snapshots avec signal).

### Fichiers
- `frontend/src/utils/performanceNarratives.js` (modifier `buildRecoveryDecisionProfile`)

### Modifications
1. Avant le calcul de `hrvDeltaPercent` et `restingHrDelta`, vérifier la longueur de `baselineSnapshots` :
   ```
   const baselineLength = baselineSnapshots.length;
   const baselineReliable = baselineLength >= 14;
   ```
2. Si `!baselineReliable`, ne pas calculer `hrvDeltaPercent` ni `restingHrDelta`. Pousser à la place dans `factors` :
   ```
   factors.push(`Baseline en cours de constitution (${baselineLength}/14 jours).`);
   ```
3. Conserver l'évaluation des autres signaux absolus (sommeil, stress, Body Battery) qui ne dépendent pas d'une baseline.
4. Si `baselineLength < 14` ET aucun autre signal n'est disponible, retourner `hasData: false` avec `detail: "Donnees Garmin trop recentes pour produire une lecture fiable."`.

### Acceptance A1
- Sur un compte Garmin connecté depuis < 14 jours, le panneau récupération du Dashboard affiche un message clair sans pénaliser le score.
- Sur un compte avec 14+ jours, comportement inchangé.

---

## 3. Lot A2 — Tests unitaires `buildRecoveryDecisionProfile`

### Objectif
Sécuriser le moteur contre les régressions futures.

### Décision technique
- Adopter **Vitest** (compatible Vite, déjà en place dans la stack frontend).
- Pas de framework de test E2E pour l'instant, juste unit tests sur les fonctions pures.

### Fichiers
- `frontend/package.json` (ajouter scripts + dev dependency)
- `frontend/vitest.config.js` (CREER)
- `frontend/src/utils/performanceNarratives.test.js` (CREER)

### Opérations

#### A2.1 Installer Vitest
Dans `frontend/` :
```
npm install --save-dev vitest @vitest/coverage-v8
```

Ajouter à `package.json` :
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

#### A2.2 Configuration `vitest.config.js`
```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.js", "src/**/*.test.jsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
```

#### A2.3 Tests `performanceNarratives.test.js`

Créer **8 scénarios** au minimum :

| # | Snapshots simulés | Résultat attendu |
|---|---|---|
| 1 | `[]` | `hasData: false`, label "Non disponible" |
| 2 | 7 snapshots vides (signaux null) | `hasData: false` |
| 3 | 7 jours sommeil 7h, HRV 60ms baseline 60ms (40 j) | `tone: "neutral"` ou `"positive"` selon score |
| 4 | 7 jours HRV récent 50ms baseline 60ms (35 j) → −16 % | `tone: "negative"` (HRV très basse) |
| 5 | 7 jours FC repos 60bpm baseline 54bpm (35 j) → +6 bpm | factor "FC repos elevee", score ≤ −3 |
| 6 | Sleep score 45 / 7 jours | factor "Sommeil faible", score ≤ −2 |
| 7 | Stress avg 60 + sleep score 75 | score mixé, label "Neutre" probable |
| 8 | Baseline = 7 jours seulement (A1 actif) | factor "Baseline en cours de constitution" + pas de delta HRV/FC |

Chaque test vérifie :
- `result.tone`
- `result.label`
- `result.score` dans la fourchette attendue
- `result.factors.length > 0` quand `hasData: true`
- `result.confidence.label` cohérent avec couverture

#### A2.4 Helper de génération de snapshots
Créer un helper local `buildRecoverySnapshot({ daysAgo, sleepDurationSeconds, sleepScore, hrvAvgMs, restingHr, stressAvg, bodyBatteryMorning })` qui retourne un objet snapshot avec date dérivée.

### Acceptance A2
- `npm test` dans `frontend/` exécute les 8 tests, tous verts.
- Couverture mesurée par `vitest run --coverage` sur `performanceNarratives.js` ≥ 70 % sur les fonctions Garmin.

---

## 4. Lot A3 — Audit du composant `DashboardDecisionSummaryCard`

### Objectif
Vérifier que le composant affiche bien `model.recovery` et `model.decisionMeta` (factors, confidence, limitingFactor) et corriger si l'affichage manque.

### Fichiers
- `frontend/src/components/DashboardDecisionSummaryCard.jsx` (lire + ajuster si nécessaire)

### Opérations

#### A3.1 Audit
Lire le composant. Vérifier :
1. La prop `model` reçue contient bien `recovery` et `decisionMeta`.
2. Au moins un bloc visuel affiche `recovery.label` + `recovery.detail` + `recovery.confidence.label`.
3. Si `recovery.hasData === false`, ne pas afficher le bloc récupération (évite le bruit).
4. Les `decisionMeta.factors` (max 4) sont affichés sous forme de liste compacte.
5. Le `limitingFactor` est mis en évidence comme point de vigilance.

#### A3.2 Corrections si manquant
Ajouter un bloc :
```
<section className="decision-recovery">
  <h3>Récupération Garmin</h3>
  <strong>{recovery.label}</strong> — confiance {recovery.confidence.label}
  <p>{recovery.detail}</p>
  <ul>
    {factors.slice(0, 4).map((factor) => <li>{factor}</li>)}
  </ul>
  {limitingFactor ? <small>Facteur limitant : {limitingFactor}</small> : null}
</section>
```

Conditions d'affichage :
- N'afficher la section que si `recovery.hasData === true`.
- Si `recovery.hasData === false`, l'utilisateur voit la décision charge-only sans mention Garmin (évite "absence Garmin" comme bruit visuel).

### Acceptance A3
- Sur un compte Garmin connecté avec données : la carte affiche un bloc "Récupération Garmin" avec label + confiance + facteurs.
- Sur un compte sans Garmin connecté : la carte n'affiche rien de spécifique Garmin (comportement préexistant intact).
- Test visuel sur `localhost:5174/` après `npm run dev` côté frontend.

---

## 5. Lot A4 — Wording enrichi des combinaisons typiques

### Objectif
Faire passer la recommandation de générique ("Récupération fragile : éviter la qualité…") à contextuelle ("Sommeil court et stress élevé : garde l'endurance facile aujourd'hui").

### Fichiers
- `frontend/src/utils/performanceNarratives.js` (modifier `adjustRecommendationWithRecovery`)

### Décisions de produit
Identifier 6 combinaisons typiques :

| Combinaison | Recommandation enrichie |
|---|---|
| `recovery.tone === "negative"` ET sleep faible dominant | Sommeil court récent : privilégie le repos ou une endurance très facile aujourd'hui. |
| `recovery.tone === "negative"` ET HRV basse dominante | Variabilité cardiaque en retrait : évite l'intensité, garde des allures faciles. |
| `recovery.tone === "negative"` ET stress élevé dominant | Stress élevé : courte sortie facile ou repos actif aujourd'hui. |
| `recovery.tone === "warning"` ET fatigue élevée (charge) | Bloc dense + récupération à surveiller : maintiens le volume mais réduis l'intensité. |
| `recovery.tone === "positive"` ET TSB > +5 | Fraîcheur et récupération solides : fenêtre ouverte pour une séance qualité. |
| `recovery.tone === "neutral"` (défaut) | Garder le comportement actuel. |

### Logique
1. Conserver la logique existante de `adjustRecommendationWithRecovery`.
2. Ajouter une couche de wording basée sur le `limitingFactor` :
   ```
   if (recovery.tone === "negative") {
     if (recovery.limitingFactor === "Sommeil faible" || recovery.limitingFactor === "Sommeil court") {
       return { label: "Sommeil court récent : privilégie le repos ou une endurance très facile.", tone: "negative" };
     }
     if (recovery.limitingFactor === "Variabilite cardiaque basse") {
       return { label: "HRV en retrait : évite l'intensité, garde des allures faciles.", tone: "negative" };
     }
     // ...
   }
   ```
3. Garder un fallback générique si aucune combinaison ne matche.

### Acceptance A4
- Selon le `limitingFactor` retourné par `buildRecoveryDecisionProfile`, le `recommendation.label` est contextuel.
- Tests unitaires (extension du Lot A2) couvrent les 6 combinaisons.

---

## 6. Tests locaux à exécuter (Phase A)

Une fois les 4 lots A1-A4 implémentés :

```bash
# 1. Lint
cd frontend && npx eslint src/utils/performanceNarratives.js src/components/DashboardDecisionSummaryCard.jsx --max-warnings 0

# 2. Tests unitaires
cd frontend && npm test

# 3. Build
cd frontend && npm run build

# 4. Test manuel runtime
cd frontend && npm run dev
# Ouvrir http://localhost:5174/
# Vérifier la carte Décision sur Aujourd'hui
# - avec Garmin connecté : bloc Récupération visible
# - sans Garmin : pas de mention
# - avec Garmin < 14 jours : message "Baseline en cours"
```

---

## 7. Commit + push pour CI/CD

À la fin de la Phase A, après validation locale :

```bash
cd /c/Services/RuNSee
git status
git add frontend/src/utils/performanceNarratives.js
git add frontend/src/utils/performanceNarratives.test.js
git add frontend/vitest.config.js
git add frontend/package.json frontend/package-lock.json
git add frontend/src/components/DashboardDecisionSummaryCard.jsx
git add docs/SPEC_GARMIN_PHASE_A_AMENDEMENTS_LOT7.md

git commit -m "Phase A Garmin : amendements Lot 7 (baseline >=14j, tests Vitest, wording enrichi, audit UI)

- Garde-fou baseline minimale 14 jours pour HRV/FC repos
- Suite Vitest avec 8 scenarios couvrant les profils recuperation
- Wording de recommandation contextualise selon limitingFactor
- Affichage explicite du bloc Recuperation dans DashboardDecisionSummaryCard"

git push origin main
```

Le push déclenche le workflow `.github/workflows/deploy-vm.yml` :
- Job validate (lint + build + prisma:pg:validate)
- Job deploy si validate passe (push sur la VM IONOS)
- Healthchecks publics finaux

Surveiller `https://github.com/GuillaumeBarthelemy/RuNSee/actions` pour confirmer succès.

---

## 8. Acceptance globale Phase A

- [ ] Lot A1 : baseline < 14 j → message clair, pas de pénalité fictive.
- [ ] Lot A2 : 8 tests Vitest verts, couverture ≥ 70 % sur `performanceNarratives.js`.
- [ ] Lot A3 : bloc Récupération visible dans la carte Décision quand `hasData`, masqué sinon.
- [ ] Lot A4 : 6 wording contextualisés actifs selon `limitingFactor`.
- [ ] CI/CD verte sur la branche `main`.
- [ ] Healthchecks publics OK post-deploy.

---

## 9. Hors scope Phase A

- Pas de nouvelles cartes UI dédiées (Phase C).
- Pas de modifications du backend Garmin (le service `listGarminRecoverySnapshotsForUser` reste tel quel).
- Pas d'ajout de signaux Garmin supplémentaires (Training Readiness, VO2max Garmin → Phase C/D).
- Pas de cross-data activités × récup (Phase D).
