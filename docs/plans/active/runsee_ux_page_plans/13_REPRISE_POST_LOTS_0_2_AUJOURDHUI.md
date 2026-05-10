# RunNSee — Reprise après lots 0 à 2 / recalage avant Activités

Date : 2026-05-10  
Contexte : les premiers plans ont été joués. La page `Activités` n'a pas encore été refondue, ce qui est normal.

---

## 1. Objectif du mini-lot

Avant de lancer le lot `03_PAGE_ACTIVITES.md`, Claude doit stabiliser les derniers écarts de la page `Aujourd'hui` et du layout global.

Ce mini-lot est une **correction / sécurisation**, pas un changement fonctionnel.

À faire :

- corriger les incohérences visibles avec le PDF page 5 ;
- sécuriser les placeholders topbar ;
- vérifier la sémantique des KPI Charge / Fatigue ;
- ne pas toucher aux pages non encore jouées.

À ne pas faire :

- ne pas commencer `Analyse` ;
- ne pas commencer `Performance` ;
- ne pas commencer `Progression` ;
- ne pas refondre le backend ;
- ne pas changer les calculs métier.

---

## 2. État attendu à ce stade

| Zone | État attendu | Commentaire |
|---|---|---|
| Layout / sidebar | Déjà travaillé | Corriger seulement les écarts visibles. |
| Page Aujourd'hui | Déjà travaillée | Recalage page 5 nécessaire. |
| Page Activités | Non jouée | État table-first normal, à traiter au lot 3. |
| Analyse | Non concernée | Ne pas modifier. |
| Performance | Non concernée | Ne pas modifier. |
| Progression | Non concernée | Ne pas modifier. |
| Réglages / Glossaire | Non concernées | Ne pas modifier. |

---

## 3. Revue obligatoire avant correction

Claude doit lire :

- `frontend/src/pages/DashboardPage.jsx` ;
- `frontend/src/layouts/AppShell.jsx` ;
- `frontend/src/layouts/AppLayout.jsx` ;
- `frontend/src/components/AppNavigation.jsx` ;
- `frontend/src/components/visuals/alpine/AlpineTopbar.jsx` ;
- `frontend/src/components/visuals/alpine/WeatherBadge.jsx` ;
- `frontend/src/components/visuals/alpine/KpiCardCompact.jsx` ;
- `frontend/src/components/visuals/alpine/KpiChartCard.jsx` ;
- `frontend/src/components/visuals/alpine/RecoveryKpiCard.jsx` ;
- `frontend/src/components/visuals/alpine/SuggestedWorkoutCard.jsx` ;
- `frontend/src/utils/trainingMetrics.js` ;
- `frontend/src/utils/dashboardSuggestedWorkout.js` ;
- `frontend/src/styles.css`.

---

## 4. Corrections attendues

### 4.1 Sidebar et titre

Conserver la cohérence PDF :

- sidebar : `Accueil` ;
- titre page : `Aujourd'hui 👋` ou `Aujourd'hui` selon composant existant.

Ne pas renommer `Accueil` en `Aujourd'hui`.

### 4.2 Topbar météo

Le PDF montre une météo, mais aucune donnée météo réelle n'est garantie.

Règle :

- si météo réelle absente : pas de température, ciel ou vent fictif ;
- option recommandée : afficher un chip neutre `Météo à venir` ou masquer le chip ;
- si le chip est visible avec données absentes, il doit être clairement non réel.

### 4.3 Topbar actions

Les boutons calendrier / notifications / compte ne doivent pas être des faux boutons actifs.

Décision recommandée :

- `Compte` → lien réel vers `/admin#compte` si possible ;
- `Calendrier` → désactivé ou tooltip `À venir` ;
- `Notifications` → désactivé ou tooltip `À venir` ;
- pas de `onClick` vide ;
- pas de hover qui suggère une action sur un bouton désactivé.

### 4.4 KPI Charge / Fatigue

Vérifier la source de chaque valeur affichée.

#### Charge

Le mockup affiche `Charge (7 j)`.

Acceptable :

- utiliser une charge 7 jours réelle ;
- afficher `/100` uniquement si un score normalisé est explicitement construit ;
- sinon afficher la valeur brute sans `/100`.

Non acceptable :

- afficher `summary.ctl` comme `Charge (7 j)` ;
- afficher `/100` sur une métrique non bornée.

#### Fatigue

Le mockup affiche `Fatigue (ATL)`.

Acceptable :

- utiliser `summary.atl` avec libellé `Fatigue`, tooltip `ATL` ;
- afficher `/100` uniquement si l'échelle est bornée/documentée.

Non acceptable :

- ajouter `/100` seulement pour imiter le mockup.

### 4.5 Graphiques

Chaque graphe doit avoir un libellé cohérent avec la série :

| Série tracée | Libellé principal recommandé |
|---|---|
| `load` | Charge d'entraînement |
| `ctl` | Condition |
| `atl` | Fatigue |
| volume horaire | Volume |
| D+ | Dénivelé |

### 4.6 Rangée récupération basse

Revenir à la structure PDF :

1. Récupération ;
2. Sommeil ;
3. Fréquence cardiaque au repos ;
4. Disponibilité ;
5. Sortie suggérée.

La VFC ne doit pas remplacer `Récupération` dans la structure principale.
Elle peut apparaître comme :

- hint ;
- tooltip ;
- donnée secondaire ;
- lien vers Analyse > Sommeil & récupération.

### 4.7 Sortie suggérée

Conserver la prudence déjà mise en place :

- aucune distance exacte inventée ;
- aucun D+ exact inventé ;
- plage de durée uniquement si justifiée ;
- CTA cohérent avec l'existant réel.

Si aucun détail de séance n'existe, préférer :

- `Voir l'analyse` → `/analytics` ;
- ou `Comprendre la suggestion` → `/analytics`.

---

## 5. Tests obligatoires

Après correction :

```bash
cd frontend
npm test -- --run
npm run build
```

Contrôles ciblés :

```bash
rg "12.4|1:02|620 m|Ciel dégagé|Vent 8|fake|mock|dummy" frontend/src
rg "Charge|Fatigue|CTL|ATL|/100|summary\.ctl|summary\.atl|summary\.load" frontend/src/pages frontend/src/utils frontend/src/components
rg "Calendrier|Notifications|Compte|weatherEnabled|alpine-topbar-icon-button" frontend/src
```

---

## 6. Compte rendu attendu

Claude doit répondre avec :

```md
## Mini-lot 2.5 — Recalage Aujourd'hui

### Fichiers lus
- ...

### Fichiers modifiés
- ...

### Corrections réalisées
- ...

### Écarts restants vs PDF page 5
- ...

### Placeholders documentés
- ...

### Tests exécutés
- npm test -- --run : OK/KO
- npm run build : OK/KO

### GO / NO GO pour Lot 3 Activités
- GO si la page Aujourd'hui est stable.
```

---

## 7. GO pour Activités

GO uniquement si :

- page `Aujourd'hui` stable ;
- pas de donnée fictive visible ;
- topbar propre ;
- KPI sémantiquement corrects ;
- tests frontend relancés ;
- les écarts éventuels sont documentés.

Ensuite seulement, lancer `03_PAGE_ACTIVITES.md`.
