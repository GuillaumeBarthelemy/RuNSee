# RunNSee — Design system Alpine Light à préserver

Objectif : donner à Claude un cadre commun pour éviter des pages visuellement incohérentes.

---

## 1. Principe

La refonte doit utiliser les primitives Alpine Light existantes avant de créer de nouveaux composants.

Créer un composant uniquement si :

- aucun composant existant ne couvre le besoin ;
- la duplication serait plus risquée ;
- le composant est spécifique à une page métier.

---

## 2. Primitives existantes à privilégier

| Besoin | Composant existant |
|---|---|
| KPI standard | `KpiCard.jsx` |
| KPI compact | `KpiCardCompact.jsx` |
| KPI avec graphique | `KpiChartCard.jsx` |
| Récupération | `RecoveryKpiCard.jsx` |
| Rail droit | `RightRailCard.jsx` |
| Sous-onglets | `SubTabs.jsx` |
| Source Strava/Garmin | `SourceBadge.jsx` |
| État vide | `EmptyState.jsx` |
| Header page | `PageHeader.jsx` |
| Header section | `SectionHeader.jsx` |
| Conseil coach | `CoachAdviceBar.jsx` |
| Mini barres | `MicroBars.jsx` |
| Jauge / range | `RangeBar.jsx` |
| Tendance | `TrendChip.jsx` |

---

## 3. Layouts recommandés

### 3.1 Page standard

```text
PageHeader
Filtres ou sous-texte
SubTabs si page multi-onglets
Main grid
  Left content
  Right rail optionnel
```

### 3.2 Page à onglets

```text
PageHeader
FiltersBar si nécessaire
SubTabs
Tab content
```

### 3.3 Page avec rail droit

Desktop :

```text
[contenu principal 2/3] [rail droit 1/3]
```

Mobile :

```text
contenu principal
rail droit
```

Aucun overflow horizontal.

---

## 4. Règles CSS

- CSS vanilla uniquement.
- Pas de Tailwind.
- Pas de CSS-in-JS.
- Éviter les styles inline sauf cas très local justifié.
- Réutiliser les classes existantes avant d'en créer.
- Nommer les nouvelles classes par domaine :
  - `.activities-*`
  - `.analytics-*`
  - `.performance-*`
  - `.progression-*`
  - `.settings-*`
  - `.glossary-*`

---

## 5. Responsive

Minimum :

- 375 px ;
- 768 px ;
- desktop large.

Règles :

- les sous-onglets doivent scroller horizontalement si nécessaire ;
- les KPI passent de grille à 2 colonnes ou 1 colonne ;
- le rail droit passe sous le contenu ;
- les cartes activité passent en vertical ;
- aucun tableau large ne doit imposer un scroll horizontal non maîtrisé.

---

## 6. États obligatoires

Chaque page ou onglet doit gérer :

- loading ;
- erreur ;
- aucune donnée ;
- données partielles ;
- données complètes.

Ne pas confondre `0` et `donnée absente`.

---

## 7. Graphiques

Utiliser Recharts déjà présent.

Règles :

- graphes légers ;
- axes lisibles ;
- tooltips utiles ;
- pas de surcharge ;
- pas de couleurs arbitraires qui cassent le thème ;
- état vide si série insuffisante.

---

## 8. Icônes et badges

- Source : `SourceBadge`.
- Tendance : `TrendChip`.
- Confiance : composant existant ou petit badge discret.
- Ne pas multiplier les badges décoratifs.

---

## 9. Accessibilité minimale

- boutons avec libellé clair ;
- liens accessibles clavier ;
- contrastes suffisants ;
- `aria-label` si icône seule ;
- pas d'information uniquement portée par la couleur.

---

## 10. Nettoyage final uniquement

Ne pas supprimer les anciens composants au début.

Audit final :

```bash
rg "GlossaryModal|AppTopbar|AdminSectionHeader|TodayRecoveryCard|RecoverySnapshotCard" frontend/src
```

Supprimer seulement si :

- aucun import actif ;
- tests OK ;
- build OK.

---

## 11. Compléments après implémentation du socle

### 11.1 Contrôles visibles non câblés

Un contrôle visuel Alpine Light ne doit pas paraître actif s'il ne déclenche aucune action.

Règle :

- action réelle disponible : bouton actif ;
- action future : bouton désactivé, tooltip `À venir`, ou simple icône décorative non focusable ;
- lien réel disponible : utiliser un lien, par exemple compte → `/admin#compte`.

### 11.2 Fidélité PDF vs sémantique métier

Le PDF prime pour la structure visuelle, mais pas au prix d'une mauvaise sémantique métier.

Exemple : si le mockup affiche `Charge (7 j) 68 /100`, Claude doit vérifier que la donnée est bien un score borné.
Il est interdit de prendre une métrique brute (`CTL`, `ATL`, charge cumulée non bornée) et de lui ajouter `/100` uniquement pour ressembler au mockup.

### 11.3 Sidebar

Le libellé de navigation conforme au PDF est `Accueil`.
Le titre de page conforme au PDF est `Aujourd'hui`.
Ces deux libellés peuvent donc coexister sans anomalie.
