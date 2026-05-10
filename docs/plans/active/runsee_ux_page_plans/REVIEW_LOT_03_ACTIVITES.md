# Review — Mini-lot 13 (recalage Aujourd'hui) + Lot 03 (Activités)

Date : 2026-05-10
Branche : `main`
Commits : `368452e` (mini-lot 13) + commit Lot 03 à venir.

---

## 1. Mini-lot 13 — Recalage Aujourd'hui

### Fichiers lus
- `docs/plans/active/runsee_ux_page_plans/13_REPRISE_POST_LOTS_0_2_AUJOURDHUI.md`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/components/visuals/alpine/AlpineTopbar.jsx`
- `frontend/src/components/visuals/alpine/WeatherBadge.jsx`
- `frontend/src/utils/trainingMetrics.js`
- `frontend/src/utils/tonePicker.js`
- `frontend/src/styles.css`

### Fichiers modifiés
- `frontend/src/pages/DashboardPage.jsx` — KPI Charge/Fatigue, charts, rangée basse 5 cartes
- `frontend/src/components/visuals/alpine/AlpineTopbar.jsx` — boutons disabled + lien réel Compte
- `frontend/src/styles.css` — grid 5 colonnes pour la rangée basse + style is-disabled

### Corrections réalisées
- KPI Charge (compact + chart) : repassage de `summary.ctl` /100 → `charge7d` brut en pts. Suppression du `/100` impropre (CTL non borné).
- KPI Fatigue : libellé court "Fatigue", ATL en pts (pas /100).
- Chart "Charge d'entraînement" : data = `chartData.load` (TRIMP journalier) au lieu de CTL ; suppression fillZone/yAxis 0-100.
- Rangée récupération basse : restauration structure PDF page 5 = Récupération + Sommeil + FC repos + Disponibilité + Sortie suggérée. VFC déplacée en hint de Récupération.
- Topbar : Calendrier et Notifications passent en `disabled` + tooltip "À venir". Compte devient un lien réel `/admin#compte`. Plus aucun onClick vide.

### Écarts restants vs PDF page 5
- Aucun écart structurel. La VFC apparaît comme donnée secondaire (hint), conforme au plan §4.6.
- Les couleurs des charts restent fixées par chart (vert charge, bleu fatigue, bleu volume, vert dénivelé) pour ne pas suivre le tone de la valeur (sinon "Charge dense" apparaîtrait en orange/rouge).

### Placeholders documentés
- Météo (`WeatherBadge` désactivé par défaut) : journalisé `docs/backlog/BACKLOG_FONCTIONNALITES_FUTURES.md` section 1.
- Calendrier / Notifications topbar : journalisé en backlog (à câbler dans une phase ultérieure).
- Sortie suggérée : V7 placeholder, algorithme journalisé dans backlog section 2.

### Tests exécutés
- `npm test -- --run` : ✅ 168/168
- `npm run build` : ✅ succès
- ESLint sur fichiers modifiés : ✅ 0 erreur

---

## 2. Lot 03 — Page Activités

### Fichiers lus
- `docs/plans/active/runsee_ux_page_plans/03_PAGE_ACTIVITES.md`
- `frontend/src/pages/ActivitiesPage.jsx`
- `frontend/src/components/ActivitiesTable.jsx`
- `frontend/src/components/AnalyticsFiltersBar.jsx`
- `frontend/src/utils/activityAggregations.js`
- `frontend/src/utils/activityLinks.js`
- `frontend/src/components/visuals/alpine/SourceBadge.jsx`
- `frontend/src/components/visuals/alpine/RightRailCard.jsx`
- `frontend/src/components/visuals/alpine/EmptyState.jsx`

### Composants créés (`frontend/src/components/activities/`)
- `ActivityPeriodKpis.jsx` — bandeau 5 KPIs (Sorties / Distance totale / Dénivelé+ / Temps total / FC moyenne)
- `ActivityCardsView.jsx` — vue principale, rend EmptyState si vide
- `ActivityDateGroup.jsx` — section avec séparateur date + liste cartes
- `ActivityListCard.jsx` — carte horizontale (icône sport + titre + badges + 4 stats + lien détail)
- `ActivityRightRail.jsx` — Vue hebdo + Répartition sports + Meilleure sortie
- `ActivityIntensityBadge.jsx` — Facile/Modérée/Intense (heuristique FC moyenne)

### Util créé (`frontend/src/utils/`)
- `activitiesViewModel.js` :
  - `getActivityProviderLabel` / `getActivityProviderKey` (Strava / Garmin / Strava + Garmin)
  - `getActivityIntensity` (heuristique FC : <130 facile, 130-160 modérée, ≥160 intense)
  - `groupActivitiesByDate` (Aujourd'hui / Hier / dates absolues)
  - `computePeriodKpis` (5 KPIs sur activités filtrées)
  - `computeSportDistribution` (triée par distance)
  - `selectBestActivity` (plus longue distance — sinon null)
  - `computeWeeklySummary` (semaine courante, weekStartDay configurable)

### Page modifiée
- `frontend/src/pages/ActivitiesPage.jsx` — refonte complète :
  - Header "Activités" + sous-texte "Toutes vos sorties et entraînements."
  - `ActivityPeriodKpis` (bandeau 5 KPIs)
  - `AnalyticsFiltersBar` (existant, conservé)
  - Toggle "Vue cartes" / "Vue tableau"
  - Layout 2 colonnes desktop : `ActivityCardsView` + `ActivityRightRail`
  - `ActivitiesTable` conservé en fallback toggle

### CSS ajouté (`frontend/src/styles.css`)
- `.alpine-activities-kpis` (grid 5 colonnes responsive)
- `.alpine-activity-kpi`, `.alpine-activity-kpi-value`, etc.
- `.alpine-activities-view-toggle` + `.is-active`
- `.alpine-activities-layout` (grid 1fr + 320px desktop, 1 col mobile)
- `.alpine-activity-group`, `.alpine-activity-group-list`
- `.alpine-activity-card` (grid 44px + 1fr + auto, hover effect)
- `.alpine-activity-card-stats` (4 colonnes desktop, full row mobile)
- `.alpine-intensity-badge` (3 variantes : facile/moderee/intense)
- `.alpine-activity-right-rail` (3 RightRailCard empilées)
- `.alpine-rr-list`, `.alpine-rr-distribution` (avec barres horizontales), `.alpine-rr-best`

### Décisions prises
- Cards-first comme vue principale, table conservée en fallback via toggle (pas de suppression hard, validation utilisateur attendue).
- Groupement par date : Aujourd'hui / Hier / dates absolues lisibles en français (`day month year`).
- Intensité : heuristique FC moyenne (pas de FCmax personnalisée). Si FC absente, badge non affiché.
- Meilleure sortie : règle stable et explicite (plus longue distance). Si aucune distance exploitable → "Données insuffisantes" (pas de fallback arbitraire).
- Provider/source : utilise la même logique que `ActivitiesTable` (`sourceProvider` + `providerEnrichments[].providerCode`) pour cohérence.
- Lien détail : utilise `getActivityPublicId` ; si absent, carte non cliquable mais affichée (anti-régression : ne pas masquer une activité réelle).

### Placeholders ajoutés
- Aucun (toutes les sources de données viennent du hook existant `useActivityViewModel`).

### Anti-régression validée
- Aucun calcul métier modifié (`useActivityViewModel`, `filterActivities`, `getActivityPublicId` intacts).
- Aucune valeur fictive : si distance/D+/FC absente, affichage "—".
- Aucun `/activities/undefined` (vérifié `rg`).
- ActivitiesTable conservé en fallback (pas de perte de la lecture tabulaire).

### Tests exécutés
- `npm test -- --run` : ✅ 168/168
- `npm run build` : ✅ succès en ~700ms
- ESLint sur tous les fichiers nouveaux/modifiés : ✅ 0 erreur
- Recherches anti-régression :
  - `rg "12.4|1:02|620 m|fake|dummy"` frontend/src → ✅ aucun match
  - `rg "activities/undefined"` (hors commentaires) → ✅ aucun match
  - `rg "getActivityPublicId"` dans nouveaux composants → ✅ utilisé partout

### Risques de régression identifiés
- **Faible** : refonte ActivitiesPage cards-first. La table reste accessible via toggle. Aucun calcul métier modifié.
- **Faible** : heuristique d'intensité (FC moyenne). Si FC absente, badge masqué — comportement conservateur.
- **À surveiller** : sélection "Meilleure sortie" basée sur distance maximale. Stable mais peut surprendre si une longue marche apparaît au-dessus d'une course intense — documenté dans le code et affiché à l'utilisateur via la note "Critère : plus longue distance sur la période filtrée."

### Écarts restants vs PDF page 6
- Pas de mini-graphe sur les cartes (le PDF en montre un par activité). Le plan §10.2 indique "Le mini-graphe ne doit être affiché que si une série exploitable existe ; sinon afficher un trait neutre ou masquer la zone." Les séries d'allure/FC par activité ne sont pas exposées dans le hook actuel — le mini-graphe est masqué, conforme à la règle.
- Le filtre `intensité` dans la barre de filtres n'est pas encore exposé via `AnalyticsFiltersBar` existant (filtre source non plus). Ces filtres restent pour l'instant côté barre existante (sport, période, recherche). À étendre dans un lot ultérieur ou dans Lot 04 (Analyse) si nécessaire.

### GO / NO GO pour Lot 04
- **GO** :
  - Page Activités stable, cards-first conforme PDF page 6.
  - 5 KPIs période visibles avec règles "—" si absent.
  - Right rail fonctionnel avec données réelles.
  - Aucune donnée fictive.
  - Lien détail jamais cassé (`getActivityPublicId` partout).
  - Build + tests + ESLint verts.
  - Vocabulaire canonique respecté (FR, pas YTD/HRV/Body Battery/etc.).
EOF
echo "Review document created"