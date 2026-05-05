# UX_CHARTE — Charte visuelle RuNSee

> Phase E3 — Charte visuelle de référence pour les phases F-K.
> Aucune modification de code dans ce document. Les valeurs ici servent de spec aux composants Phase G.

---

## 1. Palette tones (5 niveaux)

Échelle qualitative unique pour tous les indicateurs (sommeil, VFC, charge, fraîcheur, dérive, etc.).

| Niveau | Nom interne | Hex clair | Hex foncé | RGB clair | Cas d'usage |
|---|---|---|---|---|---|
| 1 — Très bon | `--tone-1` | `#15803d` | `#22c55e` | 21, 128, 61 | Delta très favorable, score > 85, indicateur dans la zone optimale |
| 2 — Bon | `--tone-2` | `#65a30d` | `#84cc16` | 101, 163, 13 | Score 75-85, delta favorable, état stable positif |
| 3 — Neutre | `--tone-3` | `#64748b` | `#94a3b8` | 100, 116, 139 | Valeurs dans la norme, pas d'écart notable |
| 4 — Vigilance | `--tone-4` | `#b45309` | `#f59e0b` | 180, 83, 9 | Delta défavorable, score 50-75, signal à surveiller |
| 5 — Alerte | `--tone-5` | `#b91c1c` | `#ef4444` | 185, 28, 28 | Risque surcharge, score < 50, repos recommandé |

### Versions semi-transparentes (backgrounds)
Pour les fonds de cartes, utiliser une opacité 12 % :

| Niveau | Background clair |
|---|---|
| 1 | `rgba(34, 197, 94, 0.12)` |
| 2 | `rgba(132, 204, 22, 0.10)` |
| 3 | `rgba(100, 116, 139, 0.06)` |
| 4 | `rgba(245, 158, 11, 0.14)` |
| 5 | `rgba(239, 68, 68, 0.12)` |

### Déclaration CSS attendue Phase G

```css
:root {
  --tone-1: #15803d;
  --tone-2: #65a30d;
  --tone-3: #64748b;
  --tone-4: #b45309;
  --tone-5: #b91c1c;

  --tone-1-bg: rgba(34, 197, 94, 0.12);
  --tone-2-bg: rgba(132, 204, 22, 0.10);
  --tone-3-bg: rgba(100, 116, 139, 0.06);
  --tone-4-bg: rgba(245, 158, 11, 0.14);
  --tone-5-bg: rgba(239, 68, 68, 0.12);
}

@media (prefers-color-scheme: dark) {
  :root {
    --tone-1: #22c55e;
    --tone-2: #84cc16;
    --tone-3: #94a3b8;
    --tone-4: #f59e0b;
    --tone-5: #ef4444;
  }
}
```

### Mapping helper standard

Tous les composants visuels Phase G doivent exposer une fonction `pickTone(value, thresholds)` qui retourne `1` à `5`. Pour chaque indicateur, les seuils sont définis par le glossaire (cf. `GLOSSAIRE.md`).

Exemples :
- VFC : delta < -8% → 4 ; delta entre -8 et -3% → 3 ; delta > +5% → 1
- FC repos (inversé) : delta > +5% → 4 ; delta < -3% → 1
- Charge 7j : > 600 → 4 ; > 800 → 5

---

## 2. Typographie KPI

| Élément | Mobile (xs/sm) | Desktop (md+) | Poids | Couleur |
|---|---|---|---|---|
| Valeur principale (ex: "82") | 22 px | 28 px | 700 | `var(--color-text-primary)` ou tone si coloré |
| Unité (ex: "/ 100") | 13 px | 14 px | 500 | `var(--color-text-muted)` |
| Label section (ex: "SOMMEIL") | 11 px | 12 px | 600, uppercase, letter-spacing 0.04em | `var(--color-text-secondary)` |
| Delta (ex: "+5 %") | 12 px | 13 px | 500 | tone correspondant |
| Texte explicatif | 13 px | 14 px | 400 | `var(--color-text-secondary)` |
| Titre carte | 16 px | 18 px | 600 | `var(--color-text-primary)` |
| Sous-titre carte | 13 px | 14 px | 400 | `var(--color-text-muted)` |

### Règles
- **Valeur toujours visible**, pas seulement au survol
- **Unité collée à la valeur** avec espace fin
- **Label en uppercase** pour distinguer label/valeur
- **Pas de chiffre brut technique** (mL/kg, ratios complexes) sans tooltip explicatif
- **Vulgarisation** : préférer un niveau qualitatif ("Modéré") à une valeur brute incompréhensible quand pertinent (cf. Dette d'oxygène)

---

## 3. Composants visuels canoniques (Phase G)

### 3.1 `MetricGauge`

**Description** : jauge demi-cercle pour score 0-100, tone coloré selon palette.

**Props** :
- `value` : number (0-100)
- `min`, `max` : number (defaults 0, 100)
- `tone` : 1-5 (calculé par `pickTone` ou imposé)
- `unit` : string (ex: "/ 100")
- `label` : string (ex: "SOMMEIL")
- `showValue` : boolean (default true)

**Comportement responsive** :
- Mobile (< 768 px) : hauteur 80 px, demi-cercle
- Desktop : hauteur 110 px

**Cas d'usage** : Score sommeil, Aptitude RuNSee, Confiance.

**Layout** :
```
       ╭─────────╮
      ╱           ╲
     ╱     82      ╲
    │   /  100      │
    ╰─── SOMMEIL ───╯
```

---

### 3.2 `RangeBar`

**Description** : barre horizontale avec marqueur de valeur + zones colorées (5 niveaux).

**Props** :
- `value` : number
- `min`, `max` : number
- `zones` : array de `{ from, to, tone }` (ex: `[{from:0, to:50, tone:5}, {from:50, to:75, tone:3}, ...]`)
- `unit` : string
- `label` : string
- `valueDisplay` : string ("auto" → value + unit, ou personnalisé)

**Comportement responsive** :
- Mobile : largeur 100 %
- Desktop : largeur min 240 px

**Cas d'usage** : Charge 7j, Fraîcheur, Dérive cardiaque, Volume hebdo.

**Layout** :
```
DÉRIVE CARDIAQUE                +2.3 %
[━━━━━━━●━━━━━━━━━━━━━━━━━━━━]
 Excellent  Bon  Vigilance  Alerte
```

---

### 3.3 `MicroBars`

**Description** : remplaçant des sparklines. 7 ou 14 barres verticales colorées par tone.

**Props** :
- `series` : array de number
- `tones` : array de 1-5 (calculé ou imposé)
- `count` : 7 ou 14 (default 7)
- `height` : auto (32 px desktop / 24 px mobile)

**Comportement responsive** :
- Mobile : hauteur réduite, mais pas de scroll horizontal
- Desktop : taille standard

**Cas d'usage** : volume 7j Dashboard, sparkline charge, sparkline VFC sur 14 j.

**Layout** :
```
   ▂   ▄  ▆  ▇  ▆  ▄   (7 jours)
```

---

### 3.4 `TrendChip`

**Description** : pill compact affichant un delta avec flèche colorée.

**Props** :
- `delta` : number (signé)
- `unit` : string ("%", "ms", "bpm")
- `direction` : "up" | "down" | "neutral" (auto-détecté ou imposé)
- `tone` : 1-5
- `label` : string optionnel

**Comportement responsive** :
- Mobile : stackable verticalement
- Desktop : inline

**Cas d'usage** : delta vs repère sur tuiles Recovery.

**Layout** :
```
[↗ +5.2 % vs repère]   ← tone-1, vert
[↘ -8.1 % vs repère]   ← tone-4, orange
```

---

### 3.5 `BandPositioner`

**Description** : 4-5 bandes horizontales avec curseur de position.

**Props** :
- `bands` : array de `{ label, from, to, tone }`
- `value` : number
- `valueLabel` : string

**Comportement responsive** :
- Mobile : 1 colonne, bandes empilées
- Desktop : barres horizontales

**Cas d'usage** : monotonie Foster, polarisation.

**Layout** :
```
< 1.5  Variation saine    [●]   ← position du user
1.5-2.2  Modérée
> 2.2  Risque surcharge
```

**Existe partiellement** dans `DynamicsGrid` — à extraire et standardiser.

---

### 3.6 `GlossaryLink` (Phase J)

**Description** : lien simple vers une entrée du glossaire.

**Props** :
- `termKey` : string (ex: "vfc")
- `label` : string optionnel

**Comportement** :
- Click → navigation `/glossaire#vfc`
- Sur mobile : ferme la popover/tooltip avant navigation

**Layout** :
```
[Voir définition complète →]
```

---

## 4. Breakpoints responsive

| Largeur | Nom | Usage typique |
|---|---|---|
| < 480 px | xs | Smartphone portrait (iPhone SE 320, 375 px) |
| 480-768 px | sm | Smartphone paysage |
| 768-1024 px | md | Tablette portrait |
| 1024-1280 px | lg | Tablette paysage / petit desktop |
| > 1280 px | xl | Desktop standard |

### Grilles métriques par breakpoint

| Breakpoint | Grille KPI | Grille tuiles Recovery | Grille Patterns Performance |
|---|---|---|---|
| xs | 1 col | 1 col (puis 2) | 1 col |
| sm | 2 col | 2 col | 1 col |
| md | 2-3 col | 2-4 col | 2 col |
| lg | 3-4 col | 4 col | 3 col |
| xl | 4-5 col | 4 col | 3 col |

---

## 5. Espacements et grilles

| Élément | Mobile | Desktop |
|---|---|---|
| Gap entre cartes (sections) | 12 px | 16 px |
| Padding intérieur card | 14 px | 18 px |
| Padding header card | 14 px | 16 px |
| Gap entre tuiles dans une grid | 8 px | 12 px |
| Border-radius card | 12 px | 12 px |
| Border-radius tuile | 8 px | 10 px |

---

## 6. Règles tooltip mobile

- **Tap sur trigger** = popover qui apparaît en bas d'écran (bottom-sheet sur xs/sm)
- **Max 2 lignes de contenu** (≤ 80 caractères)
- **Bouton "Voir définition complète →"** présent si l'entrée existe au glossaire
- **Tap hors de la popover** = ferme
- **Échap (clavier)** = ferme
- **Pas de hover** sur mobile (uniquement tap)

### Layout mobile bottom-sheet

```
┌─────────────────────────────────┐
│  ┌───────────────────────────┐  │
│  │ ━━ (drag handle)          │  │
│  │ VFC                       │  │
│  │ Indicateur du système     │  │
│  │ nerveux. Hausse = mieux   │  │
│  │ récupéré.                 │  │
│  │                           │  │
│  │ [Voir définition →]       │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

---

## 7. Densité d'information par page

Limites maximales pour préserver la lisibilité :

| Page | Cartes max desktop | Cartes max mobile |
|---|---|---|
| Dashboard | 7 | 7 (scrollable) |
| Analytics | 10 | 10 (scrollable) |
| Performance | 6 | 6 (scrollable) |
| Activity Detail | 5 + onglets | 4 + onglets |
| Admin (par onglet) | 4 | 4 |

**Si une page approche la limite**, considérer :
- Regroupement (ex: TodayFormCards regroupe CTL/ATL/TSB)
- Onglets internes (ex: ActivityDetailTabs)
- Pagination ou accordéons mobiles (`MobileFoldableSection`)

---

## 8. Iconographie

### Indicateurs de tendance
- ↗ : amélioration (delta positif favorable, ou négatif favorable pour FC repos)
- ↘ : dégradation
- → : stable

### Indicateurs d'origine source (à utiliser modérément)
- Pas d'icônes Strava / Garmin dans l'UI principale (elles sont propriétaires)
- À la place : mention textuelle "selon Garmin" en italique gris quand source propriétaire (Aptitude Garmin, Énergie, EPOC)

### États
- ✓ : connecté / OK
- ⚠ : avertissement / vigilance
- ⛔ : déconnecté / erreur

---

## 9. Accessibilité

- Contraste **AA minimum** (ratio 4.5 pour le texte, 3 pour les éléments visuels) sur tous les tones
- **Navigation clavier** sur tooltip et tabs
- **aria-label** sur tous les boutons d'action et icônes
- **role="tab"** + **aria-selected** sur les tabs (Phase I)
- **prefers-reduced-motion** : désactiver les transitions sparkline / gauges si activé

---

## 10. Validation visuelle attendue

Avant merge Phase G :
1. Capture d'écran de chaque composant canonique (`MetricGauge`, `RangeBar`, `MicroBars`, `TrendChip`, `BandPositioner`) sur 3 résolutions (320 px, 768 px, 1280 px)
2. Validation par l'utilisateur de la palette tones et de la typographie sur ces captures
3. Aucun régression visuelle sur les pages existantes (qui n'ont pas encore migré vers ces composants)

Avant merge Phase F/H/I :
1. Capture d'écran avant/après pour chaque page touchée
2. Tests sur les 5 résolutions imposées (320, 375, 768, 1024, 1280 px)
3. Validation tutoiement maintenu et vocabulaire glossaire respecté
