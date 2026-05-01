# Refonte ergonomique du bandeau d'alertes Aujourd'hui — Dossier de specification CODEX

> **Audience** : agent CODEX sans contexte preliminaire de la conversation.
> **Objectif** : refondre le composant `TodayAlertBanner` (page Aujourd'hui, route `/`) pour passer d'une liste verticale de 3 cartes empilees a un pattern compact « priorite developpee + secondaires repliees » avec icones SVG par severite et par famille, score d'attention chiffre, mode silence et mode positive-only.
> **Contraintes** : aucun changement scientifique sur les calculs ; reutilise les utils existants ; tutoiement systematique ; aucun emoji dans l'UI.

---

## 1. Contexte technique

- **Stack** : React 18 + Vite, React Router v6, Recharts, axios.
- **Page concernee** : `frontend/src/pages/DashboardPage.jsx` (route `/`).
- **Composants existants** :
  - `frontend/src/components/TodayAlertBanner.jsx` (a refondre)
  - `frontend/src/utils/todayAlerts.js` (a etendre, deja en place avec 31 regles)
- **Glossaire / styles** :
  - Patterns CSS de reference : `.intra-session-block`, `.load-dynamics-block` (severite par tone).
  - SVG inline existants dans `frontend/src/components/AppNavigation.jsx` (modele de qualite).

Avant tout commit, executer `cd frontend && npx eslint <fichiers touches> --max-warnings 0` et `cd frontend && npm run build`.

---

## 2. Decisions de produit verrouillees

| # | Decision |
|---|---|
| 1 | **Pattern 7 combo** : 1 alerte priorite developpee plein largeur + autres alertes en pills horizontales sous la priorite. |
| 2 | **Icones SVG inline** uniquement (jamais d'emojis, pas de dependance npm). |
| 3 | **4 codes de severite** : danger (rouge), warning (orange), info (bleu), positive (vert). |
| 4 | **5 icones de famille** : Surcharge, Structure, Volume, Progression, Qualite donnees. **Pas d'icone famille pour les alertes positives** : leur cocher vert (severite) suffit. |
| 5 | **Actions ciblees** : la carte developpee affiche le bouton d'action contextuel (« Voir Tendance », « Voir Performance », etc.). Bouton « Masquer aujourd'hui » conserve mais reduit a un × discret en coin de carte/pill. |
| 6 | **Score d'attention 0-100** : affiche en tete du bandeau, calcule selon `100 - (danger × 25 + warning × 10 + info × 3)` clamp [0, 100]. |
| 7 | **Pas d'auto-prioritisation course objectif** : la regle de tri reste danger > warning > info > positive sans contournement. |
| 8 | **Mode silence** : bouton « Tout masquer aujourd'hui » en haut a droite qui rabat tout le bandeau jusqu'au lendemain. |
| 9 | **Mode positive-only** : si toutes les alertes actives sont de severite `positive`, fond vert clair, titre « Tout va bien — N bonnes nouvelles », liste compacte sans bouton masquer individuel. |
| 10 | **Mobile** : les pills secondaires s'expandent verticalement (1 colonne, pas de drawer). |

---

## 3. Architecture cible — vue d'ensemble

### Etat « warnings / danger / info actifs »

```
desktop, 3 alertes actives :
+--------------------------------------------------------------+
| Points a surveiller (3) [Score d'attention 65]   [Tout masquer]|
|                                                              |
| +----------------------------------------------------------+ |
| |[icon severite][icon famille] Trop de zone intermediaire  | |
| | Une part importante du temps est ni vraiment facile      | |
| | ni vraiment intense. Reclarifie les objectifs.          | |
| | [Voir Tendance ->]                          [×]           | |
| +----------------------------------------------------------+ |
|                                                              |
| [icon][icon] Efficience en recul   [×]                       |
| [icon][icon] Volume en retrait     [×]                       |
+--------------------------------------------------------------+
```

### Etat « positives uniquement »

```
+--------------------------------------------------------------+
| [icon check vert] Tout va bien — 3 bonnes nouvelles          |
|                                                              |
| [check] Forme ideale · [check] Nouveau record 10 km ·         |
| [check] Polarisation ideale                                   |
+--------------------------------------------------------------+
```

### Etat « 4+ alertes »

Affichage : 1 priorite developpee + 2 pills + lien `+N autres` qui developpe verticalement la liste complete (pas de drawer).

---

## 4. Score d'attention

### Calcul
```
danger_count = nombre d'alertes severite="danger"
warning_count = nombre d'alertes severite="warning"
info_count = nombre d'alertes severite="info"

score = 100 - (danger_count × 25 + warning_count × 10 + info_count × 3)
score = clamp(score, 0, 100)
```

Les alertes `positive` ne baissent pas le score.

### Tone du score
| Score | Tone | Couleur barre |
|---|---|---|
| >= 80 | positive | vert |
| 60-79 | neutral | jaune |
| 40-59 | warning | orange |
| < 40 | danger | rouge |

### Affichage
Composant `AlertScoreBadge` : barre de progression horizontale (largeur ~ 80 px) + chiffre sous la barre. Tooltip optionnel : « Score base sur le nombre et la gravite des alertes actives. ».

Position : a cote du titre « Points a surveiller » dans l'en-tete du bandeau.

---

## 5. Code couleur par severite

| Severite | Background | Border | Icon color |
|---|---|---|---|
| `danger` | `rgba(239, 68, 68, 0.10)` | `rgba(239, 68, 68, 0.45)` | `#ef4444` |
| `warning` | `rgba(245, 158, 11, 0.10)` | `rgba(245, 158, 11, 0.40)` | `#f59e0b` |
| `info` | `rgba(59, 130, 246, 0.08)` | `rgba(59, 130, 246, 0.35)` | `#3b82f6` |
| `positive` | `rgba(34, 139, 34, 0.08)` | `rgba(34, 139, 34, 0.35)` | `#16a34a` |

Ces tokens doivent s'appliquer uniformement aux cartes developpees, aux pills et au mode positive-only.

---

## 6. Icones SVG par severite

Composant a creer : `frontend/src/components/AlertSeverityIcon.jsx`.

Signature :
```
<AlertSeverityIcon severity="danger | warning | info | positive" size={20} />
```

### Specifications par severite

| Severite | Forme | Description SVG |
|---|---|---|
| `danger` | Cercle plein avec exclamation | Cercle rempli `currentColor`, point d'exclamation blanc au centre |
| `warning` | Triangle plein avec exclamation | Triangle isocele rempli `currentColor`, point d'exclamation blanc au centre |
| `info` | Cercle plein avec « i » | Cercle rempli `currentColor`, lettre `i` minuscule blanche au centre |
| `positive` | Cercle plein avec coche | Cercle rempli `currentColor`, coche blanche au centre |

`viewBox="0 0 24 24"`. Couleur via `fill="currentColor"` pour heriter du parent.

Reutiliser le pattern visuel de `AppNavigation.jsx` (path inline). Aucune dependance externe.

---

## 7. Icones SVG par famille

Composant a creer : `frontend/src/components/AlertFamilyIcon.jsx`.

Signature :
```
<AlertFamilyIcon family="surcharge | structure | volume | progression | data" size={18} />
```

### Specifications par famille

| Famille | Concept visuel | Description SVG |
|---|---|---|
| `surcharge` | Flamme | Forme de flamme stylisee (3 lobes), trait `currentColor` |
| `structure` | Trois barres | Bar chart 3 colonnes de hauteurs differentes, traits `currentColor` |
| `volume` | Route | Route en perspective ou ligne courbe avec marqueur km |
| `progression` | Fleche montante | Fleche orientee 45 degres vers le haut |
| `data` | Engrenage | Engrenage 6 dents simple |

`viewBox="0 0 24 24"`. Couleur via `stroke="currentColor"` (icones lineart cette fois pour distinguer visuellement de la severite qui est en `fill`).

Si la famille passee n'est pas reconnue, retourner `null`.

**Aucune icone famille pour les alertes positives.** Cas a traiter : si l'alerte est `positive`, le composant `AlertCard` / `AlertPill` n'inclut pas le composant `AlertFamilyIcon` du tout.

---

## 8. Mapping famille par alerte (ajout dans `todayAlerts.js`)

Etendre la structure `Alert` retournee par `buildTodayAlerts` :
```
{
  key: string,
  severity: "danger" | "warning" | "info" | "positive",
  family: "surcharge" | "structure" | "volume" | "progression" | "data",
  title: string,
  message: string,
  action: { label: string, href: string } | null,
}
```

### Mapping cle -> famille

| Cle d'alerte | Famille |
|---|---|
| `surcharge-tsb` | surcharge |
| `atl-superieur-ctl` | surcharge |
| `monotonie-elevee` | surcharge |
| `acwr-pic` | surcharge |
| `detraining` | surcharge |
| `course-imminente-tsb-bas` | surcharge |
| `strain-monotonie-cumules` | surcharge |
| `chute-fraicheur-brutale` | surcharge |
| `derive-cardiaque-excessive` | surcharge |
| `progression-ctl-trop-rapide` | surcharge |
| `forme-ideale` (positive) | surcharge |
| `polarisation-zone-grise` | structure |
| `pas-de-qualite-21j` | structure |
| `volume-sans-intensite` | structure |
| `saut-de-monotonie` | structure |
| `polarisation-ideale` (positive) | structure |
| `aucune-activite-7j` | volume |
| `aucune-activite-14j` | volume |
| `volume-hebdo-casse` | volume |
| `pas-de-sortie-longue` | volume |
| `streak-long-sans-repos` | volume |
| `plateau-efficience` | progression |
| `regression-efficience` | progression |
| `progression-ctl-saine` (positive) | progression |
| `vdot-en-hausse` (positive) | progression |
| `vdot-en-baisse` | progression |
| `nouveau-record` (positive) | progression |
| `fc-repos-non-renseignee` | data |
| `fc-max-non-renseignee` | data |
| `cardio-absent-derniere-seance` | data |

Si l'implementation actuelle n'a pas encore certaines des 31 regles, le mapping reste reference et applique au fur et a mesure.

---

## 9. Actions ciblees par alerte (ajout dans `todayAlerts.js`)

Etendre chaque alerte avec un champ `action` (peut etre `null`) :
```
action: { label: string, href: string } | null
```

`href` peut etre une route locale (`/analytics`, `/performance`, `/admin`, `/activities/{id}`) ou une cle speciale `"sync-strava"` qui declenche la synchro plutot qu'une navigation.

### Mapping cle -> action

| Cle d'alerte | label | href / cle |
|---|---|---|
| `surcharge-tsb` | Voir Tendance | `/analytics` |
| `atl-superieur-ctl` | Voir Tendance | `/analytics` |
| `monotonie-elevee` | Voir Tendance | `/analytics` |
| `acwr-pic` | Voir Tendance | `/analytics` |
| `detraining` | Voir Tendance | `/analytics` |
| `aucune-activite-7j` | Lancer la synchro Strava | `sync-strava` |
| `aucune-activite-14j` | Lancer la synchro Strava | `sync-strava` |
| `course-imminente-tsb-bas` | Voir Performance | `/performance` |
| `forme-ideale` | (null) | (null) |
| `strain-monotonie-cumules` | Voir Tendance | `/analytics` |
| `chute-fraicheur-brutale` | Voir Tendance | `/analytics` |
| `derive-cardiaque-excessive` | Voir la fiche | `/activities/{stravaActivityId}` |
| `progression-ctl-trop-rapide` | Voir Tendance | `/analytics` |
| `polarisation-zone-grise` | Voir l'intensite | `/analytics` |
| `pas-de-qualite-21j` | Voir Tendance | `/analytics` |
| `volume-sans-intensite` | Voir Tendance | `/analytics` |
| `saut-de-monotonie` | Voir Tendance | `/analytics` |
| `polarisation-ideale` | (null) | (null) |
| `volume-hebdo-casse` | Voir Tendance | `/analytics` |
| `pas-de-sortie-longue` | (null) | (null) |
| `streak-long-sans-repos` | (null) | (null) |
| `plateau-efficience` | Voir Tendance | `/analytics` |
| `regression-efficience` | Voir Tendance | `/analytics` |
| `progression-ctl-saine` | (null) | (null) |
| `vdot-en-hausse` | Voir Performance | `/performance` |
| `vdot-en-baisse` | Voir Performance | `/performance` |
| `nouveau-record` | Voir Performance | `/performance` |
| `fc-repos-non-renseignee` | Aller en Reglages | `/admin` |
| `fc-max-non-renseignee` | Aller en Reglages | `/admin` |
| `cardio-absent-derniere-seance` | (null) | (null) |

Pour les actions qui pointent vers `sync-strava`, la carte doit appeler la fonction `startIncrementalSync` (depuis `frontend/src/services/sync.service.js`) et non naviguer.

Pour `derive-cardiaque-excessive`, le `{stravaActivityId}` est l'identifiant de la derniere sortie longue exploitable, deja calcule dans la regle.

---

## 10. Composants a creer

### `AlertSeverityIcon.jsx`
Voir specs section 6.

### `AlertFamilyIcon.jsx`
Voir specs section 7.

### `AlertScoreBadge.jsx`
- Props : `score` (0-100), `tone` ("positive" | "neutral" | "warning" | "danger"), `tooltipContent` (optionnel).
- Affiche : barre de progression 80 px + chiffre + tooltip InfoTooltip si `tooltipContent` fourni.

### `AlertCard.jsx` (carte developpee, plein largeur)
- Props : `alert` (objet decrit section 8), `onAction`, `onDismiss`.
- Layout :
  - En-tete : `<AlertSeverityIcon>` + `<AlertFamilyIcon>` (si famille presente et severite != positive) + titre.
  - Body : message complet.
  - Footer : bouton action (si `alert.action`) a gauche, `×` a droite (icone close, pas le texte « Masquer aujourd'hui »).
- Le `×` declenche `onDismiss(alert.key)`.
- Le bouton action declenche `onAction(alert.action)`.
- Style : carte rectangulaire, fond + bordure selon severite, padding 16 px.

### `AlertPill.jsx` (pill compacte)
- Props : `alert`, `onClick`, `onDismiss`.
- Layout horizontal compact : `<AlertSeverityIcon size={14}>` + `<AlertFamilyIcon size={14}>` (si applicable) + titre court (1 ligne, ellipsis si trop long) + `×`.
- Au clic sur le corps de la pill (hors `×`) : `onClick(alert.key)` -> la pill devient la carte developpee dans le banner.
- Hover : tooltip avec le message complet de l'alerte (utiliser `InfoTooltip` ou un composant tooltip leger).
- Style : fond + bordure selon severite, padding 6-8 px, height ~ 32 px.

---

## 11. Composant principal `TodayAlertBanner.jsx` (refonte)

### Props
```
<TodayAlertBanner
  alerts={Array<Alert>}
  onSyncStrava={() => Promise<void>}
  // pas d'autres props ; l'integration avec sessionStorage et la navigation
  // est interne au composant
/>
```

### Logique d'affichage

1. **Filtrage** : retirer les alertes `key` deja ignorees pour le jour courant (sessionStorage `runsee-alert-ignored-{key}-{YYYY-MM-DD}`).
2. **Filtrage groupe « Tout masquer aujourd'hui »** : verifier sessionStorage `runsee-alerts-silent-{YYYY-MM-DD}`. Si present, retourner `null`.
3. **Tri** : `danger > warning > info > positive`. A severite egale, conserver l'ordre du tableau d'entree.
4. **Cas vide** : si aucune alerte apres filtrage, le composant retourne `null`.
5. **Cas positive-only** : si toutes les alertes restantes sont `severity === "positive"`, render le mode positive-only (voir section 12).
6. **Cas standard** : sinon, render le mode standard (voir section 13).

### Etat interne

- `expandedKey` (string) : cle de l'alerte actuellement developpee. Par defaut, la premiere alerte du tri.
- `showAll` (boolean) : si `true`, toutes les alertes au-dela de la priorite + 2 pills sont aussi affichees comme pills sous le bandeau initial.
- Les actions de masquage individuel mettent a jour sessionStorage et forcent un refresh local (rerender via state).

---

## 12. Mode positive-only

Si toutes les alertes restantes sont `positive` :

```
+--------------------------------------------------------------+
| [icon check vert] Tout va bien — N bonnes nouvelles          |
|                                                              |
| [check] Titre 1 · [check] Titre 2 · [check] Titre 3           |
+--------------------------------------------------------------+
```

- Fond `rgba(34, 139, 34, 0.08)`, bordure `rgba(34, 139, 34, 0.35)`.
- Titre : `Tout va bien — {N} bonnes nouvelles` ou `Tout va bien — 1 bonne nouvelle` au singulier.
- Liste horizontale (wrap si necessaire) : `<AlertSeverityIcon severity="positive" size={14}>` + titre court de l'alerte. Pas d'icone famille, pas de bouton « Masquer aujourd'hui » individuel, pas de score d'attention.
- Si l'utilisateur clique sur une alerte positive, elle peut declencher `action` si elle en a une (ex. `Voir Performance` pour `vdot-en-hausse`).

---

## 13. Mode standard

Si au moins une alerte est non-positive :

### En-tete du bandeau

```
Points a surveiller (N) [AlertScoreBadge score=...]      [Tout masquer aujourd'hui]
```

- Titre : `Points a surveiller (N)` ou `Point a surveiller` au singulier.
- Score d'attention : composant `<AlertScoreBadge>` avec score calcule.
- Bouton « Tout masquer aujourd'hui » : action -> sessionStorage `runsee-alerts-silent-{YYYY-MM-DD}` puis `setIsSilent(true)` qui demonte le banner.

### Corps du bandeau

- **Premiere alerte** (priorite haute) : render comme `<AlertCard>`.
- **Alertes suivantes (max 2 par defaut)** : render comme `<AlertPill>` sous la carte priorite, alignees horizontalement (wrap sur tablette/mobile).
- **Alertes 4+** : afficher 1 carte + 2 pills + un lien « + {N} autres ». Au clic sur ce lien, `setShowAll(true)` -> les pills supplementaires apparaissent egalement (verticalement).

### Comportements interactifs

- Clic sur une pill -> elle devient la carte priorite ; l'ancienne priorite descend en pill.
- Clic sur `×` d'une carte/pill -> sessionStorage `runsee-alert-ignored-{key}-{YYYY-MM-DD}` puis retire l'alerte du render (re-tri si necessaire).
- Clic sur action d'une carte :
  - Si `href === "sync-strava"` : appeler `onSyncStrava()` (fonction passee en prop par `DashboardPage`).
  - Si `href` commence par `/` : naviguer via `useNavigate` (router).
- Hover sur une pill -> tooltip avec le message complet.

### Persistance

Toutes les valeurs sessionStorage utilisent la date du jour au format `YYYY-MM-DD` (calculee via `new Date().toISOString().slice(0, 10)`).

---

## 14. Mobile (<= 768 px)

Differences vs desktop :

- Le score d'attention passe sur sa propre ligne en dessous du titre (au lieu de a cote).
- Le bouton « Tout masquer aujourd'hui » devient un bouton compact a droite du titre.
- Les pills secondaires se mettent en colonne unique (1 par ligne) au lieu de horizontal wrap.
- La carte priorite garde son layout, juste padding reduit.
- Si lien « + N autres » est clique, l'expansion verticale reste.
- Pas de drawer.

CSS : utiliser media queries dans `frontend/src/styles.css`.

---

## 15. Integration dans `DashboardPage.jsx`

`DashboardPage` doit :

1. Importer `startIncrementalSync` depuis `frontend/src/services/sync.service.js`.
2. Construire un handler `handleSyncStrava` qui appelle `startIncrementalSync()` puis `reload()` (deja disponible dans `useRunSeeData`).
3. Passer ce handler en prop `onSyncStrava` au composant `<TodayAlertBanner alerts={alerts} onSyncStrava={handleSyncStrava} />`.

L'integration est minime cote page : tout le reste de la logique est encapsule dans `TodayAlertBanner`.

---

## 16. Styles CSS a ajouter

Ajouter en fin de `frontend/src/styles.css`, sous une section commentaire claire :
```css
/* === Alert banner refonte === */
```

Classes a creer :
- `.alert-banner` : conteneur racine.
- `.alert-banner-header` : ligne titre + score + bouton silence.
- `.alert-banner-title` : texte « Points a surveiller » + compteur.
- `.alert-banner-silence` : bouton « Tout masquer aujourd'hui ».
- `.alert-banner-body` : conteneur pour la carte + pills.
- `.alert-banner-pill-row` : conteneur des pills, flex row sur desktop, column sur mobile.
- `.alert-banner-show-all` : lien « +N autres ».
- `.alert-card` : carte priorite, modifiers `.alert-card-danger / -warning / -info / -positive`.
- `.alert-card-action` : bouton action contextuelle.
- `.alert-card-dismiss` : bouton × discret en haut a droite.
- `.alert-pill` : pill compacte, modifiers de severite.
- `.alert-pill-dismiss` : bouton × dans la pill.
- `.alert-score-badge` : barre + chiffre, modifiers de tone.
- `.alert-banner-positive` : variation visuelle pour mode positive-only.
- `.alert-banner-positive-list` : liste horizontale wrap des positives.

Toutes les couleurs viennent du tableau de la section 5.

---

## 17. Hors scope

- Pas de modification des calculs scientifiques.
- Pas de modification des regles d'alertes elles-memes (leur condition de declenchement reste celle de `todayAlerts.js` actuel). Seuls les champs `family` et `action` sont ajoutes.
- Pas de drawer ni modale globale.
- Pas d'auto-prioritisation course objectif (V2 du plan d'origine).
- Pas de dependance npm ajoutee.
- Pas de tests unitaires crees.

---

## 18. Acceptance globale

A la fin du lot, sur la page `/` :

- 0 alerte active -> le banner ne s'affiche pas.
- 1 alerte active -> 1 carte plein largeur avec icone severite + icone famille (si applicable) + titre + message + action + ×.
- 2-3 alertes -> 1 carte + 1-2 pills compactes en dessous.
- 4+ alertes -> 1 carte + 2 pills + lien « +N autres » (clic developpe verticalement).
- Toutes positives -> banner vert clair, titre « Tout va bien — N bonnes nouvelles », pas de score, pas de bouton silence.
- Score d'attention visible et coherent avec la formule.
- Bouton « Tout masquer aujourd'hui » ferme le banner pour la journee.
- Bouton × individuel ferme l'alerte concernee pour la journee.
- Clic sur pill -> elle prend la place de la carte priorite.
- Hover sur pill -> tooltip avec message complet.
- Action « Lancer la synchro Strava » declenche bien la synchro et recharge les donnees.
- Mobile : layout en colonne, pas de drawer.
- Lint clean : `cd frontend && npx eslint <fichiers> --max-warnings 0`.
- Build clean : `cd frontend && npm run build`.

---

## 19. Resume des fichiers touches

### Fichiers crees
- `frontend/src/components/AlertSeverityIcon.jsx`
- `frontend/src/components/AlertFamilyIcon.jsx`
- `frontend/src/components/AlertScoreBadge.jsx`
- `frontend/src/components/AlertCard.jsx`
- `frontend/src/components/AlertPill.jsx`

### Fichiers modifies
- `frontend/src/components/TodayAlertBanner.jsx` (refonte complete)
- `frontend/src/utils/todayAlerts.js` (ajout `family` + `action` par alerte)
- `frontend/src/pages/DashboardPage.jsx` (passage prop `onSyncStrava`)
- `frontend/src/styles.css` (nouvelle section)

### Fichiers supprimes
- Aucun.

---

## 20. Conventions de qualite

- **Tutoiement** systematique.
- **Aucun emoji** dans l'UI ou la copy.
- **Aucun sigle non-explique** dans les libelles visibles ; les sigles peuvent rester dans tooltips/messages detailles.
- **Lint zero warning**.
- **Pas de dependance npm**.
- **Pas de tests unitaires**.
- **CSS** : ajouts en fin de `styles.css`, sous commentaire de section.
- **Composants** : un par fichier, PascalCase, props avec defauts, `memo` quand pertinent.
- **Backward compat** : verifier qu'aucun fichier autre que `TodayAlertBanner.jsx` ne consomme directement les anciennes structures de `todayAlerts.js`.
