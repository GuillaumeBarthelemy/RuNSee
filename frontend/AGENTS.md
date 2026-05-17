# AGENTS.md — Frontend RuNSee

Scope : `frontend/` (React 19 + Vite 8 + React Router, JS/JSX pur).

**Pour les regles transverses, lire d'abord `../AGENTS.md` et `../.ai/dev_rules.md` a la racine du repo.**

## Quality gate frontend (avant tout commit)

```bash
cd frontend
npm test -- --run           # 211/211 attendus
npm run lint -- --max-warnings 0
npm run build               # ~470 ms typique
```

## Conventions specifiques frontend

### Structure

- `pages/` : orchestrateurs (montent les hooks, calculent les view-models via `useMemo`).
- `components/<scope>/` : composants visuels groupes par scope (`analytics/`, `visuals/alpine/`, etc.).
- `utils/<feature>.js` : helpers metier purs (aucune dep React, JSDoc obligatoire).
- `services/` : appels API (`axios`, exports nommes).
- `hooks/` : custom hooks reutilisables.

### Composants Alpine Light reutilisables

A utiliser avant d'en creer de nouveaux :

- `OverviewIndicatorCard` (KPI card uniforme).
- `OverviewRangeBar` (SVG gradient + curseur HTML, gradients `warm`/`cool`/`polar`).
- `AlpineSelect` (dropdown stylise reutilisable).
- `TrendsRegularityHeatmap` (heatmap calendrier responsive).
- Pastilles d'icone : SVG inline 14 px herite `currentColor` dans un pill 26-30 px.

### Helpers metier par onglet

- `utils/analyticsFocus.js` (Vue d'ensemble).
- `utils/analyticsTrends.js` (Tendances).
- `utils/analyticsIntensities.js` (Intensites).
- `utils/analyticsRecovery.js` (Sommeil & recuperation).

### Patterns critiques

#### Rolling 30 j vs 30 j precedents (jamais "mois calendaire")

```js
export function buildXxxRolling30(data, endDate) {
  const e = endDate ?? new Date();
  const startCurrent  = new Date(e - 29 * 86400000);
  const endPrevious   = new Date(startCurrent - 1);
  const startPrevious = new Date(endPrevious - 29 * 86400000);
  return { current, previous, deltaAbs, deltaPct };
}
```

#### Classification (tone + hint)

```js
/**
 * Source: Seiler 2010, Stoggl & Sperlich 2014.
 * Elite endurance = 75-85 % LIT. Amateur structure >= 70 %.
 */
export function classifyEndurance(z1z2Share) {
  if (z1z2Share >= 75) return { tone: 1, hint: "Point fort" };
  if (z1z2Share >= 60) return { tone: 2, hint: "Bon" };
  return                     { tone: 4, hint: "Perfectible" };
}
```

Tones : 1 positif fort (vert) / 2 positif (lime) / 3 neutre (gris) / 4 vigilance (ambre) / 5 alerte (rouge).

### Direction gradient range bar (regle critique)

| Cas | Gradient | Exemples |
|---|---|---|
| LOW value = bon | `warm` | FC repos, Stress, Volume haut = mauvais |
| HIGH value = bon | `cool` | HRV, Sommeil, Etat de recuperation, CTL |
| OPTIMAL middle | `polar` | TSB autour de 0 |

Verifier en plaçant une valeur "good" sur la barre : le curseur doit visuellement tomber dans le vert.

### Couleurs metier conventionnees

- Primary / sommeil : `#3B82F6` / `#1268f3`
- Success / endurance / recuperation : `#16A34A` / `#15803d`
- Warning / orange chaud : `#F59E0B` / `#ea580c`
- Danger / seuil : `#EF4444` / `#dc2626`
- Tempo / FC repos : `#F97316`
- VO2max : `#475569`

Zones FC : Z1 bleu, Z2 vert, Z3 orange, Z4 rouge, Z5 gris fonce.

### Recharts patterns

- `isAnimationActive={false}` par defaut.
- `connectNulls` pour ne pas couper les lignes sur points manquants.
- `dot={{ r, fill, strokeWidth: 0 }}` avec fill explicite.
- `activeDot` avec halo blanc 2 px.
- `<LabelList position="top">` quand le mockup montre les valeurs au-dessus des barres/points.
- `<ReferenceArea>` pour highlight semaine courante (stroke dashed navy).

### SVG / preserveAspectRatio

- **Jamais `preserveAspectRatio="none"`** sauf justification documentee.
- Par defaut `xMidYMid meet` (cellules carrees, contenu non distordu).
- Pour sparkline lignes : `vector-effect="non-scaling-stroke"` pour conserver l'epaisseur de trait.

## Anti-patterns interdits

- ❌ Calcul metier dans un composant React (faire dans `utils/`).
- ❌ `useEffect` pour calculs synchrones (utiliser `useMemo`).
- ❌ Comparaison "mois courant vs mois precedent" (toujours rolling 30 j).
- ❌ `warm` pour HRV ou Sommeil (HIGH good => cool obligatoire).
- ❌ Sparkline qui occupe toute la largeur de la card sans `max-width`.
- ❌ Icone "fleche montante" pour libelle "en baisse".

## Vocabulaire V5 (libelles utilisateur)

| Interdit | A utiliser |
|---|---|
| HRV | VFC (cote utilisateur) |
| Body Battery | Energie |
| pts | UA |
| GAP | Allure ajustee |
| Decoupling | Derive cardiaque |
| EPOC (recent) | Charge d'entrainement Garmin |
| YTD | Cumul annuel |
