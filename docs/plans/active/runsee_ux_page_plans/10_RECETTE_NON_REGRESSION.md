# RunNSee — Recette et non-régression Alpine Light

Référence PDF : page 28  
Priorité : P0 obligatoire.

---

## 1. Compréhension du besoin

La recette doit prouver que la refonte UX n'a pas dégradé :

- la navigation ;
- les calculs ;
- l'affichage des données ;
- les connexions Strava/Garmin ;
- le responsive ;
- la maintenabilité.

---

## 2. Commandes frontend obligatoires

```bash
cd frontend
npm test -- --run
npm run build
```

Si une commande échoue, Claude doit :

1. s'arrêter ;
2. expliquer l'erreur ;
3. corriger uniquement ce qui est lié au chantier ;
4. relancer la commande.

---

## 3. Commandes backend de sécurité

Même si le chantier est frontend :

```bash
cd backend
npm test
npx prisma validate
npm run prisma:pg:validate
npm run db:compare-schemas
node --check src/app.js
node --check src/server.js
```

Si le backend n'a pas été modifié, un échec préexistant doit être documenté, pas masqué.

---

## 4. Recette routes

| Route | Attendu |
|---|---|
| `/` | Aujourd'hui s'ouvre, pas de données fictives |
| `/activities` | Liste cartes, filtres, détail accessible |
| `/activities/:id` | Détail activité inchangé |
| `/analytics#overview` | Vue d'ensemble Analyse |
| `/analytics#charges` | Charges |
| `/analytics#tendances` | Tendances |
| `/analytics#intensites` | Intensités |
| `/analytics#recuperation` | Sommeil & récupération |
| `/performance#overview` | Vue d'ensemble Performance |
| `/performance#vdot` | VDOT & profil |
| `/performance#allures` | Allures |
| `/performance#fc-performance` | FC de performance |
| `/performance#records` | Records |
| `/progression#cumul-annuel` | Cumul annuel |
| `/progression#volume` | Volume |
| `/progression#regularite` | Régularité |
| `/progression#comparaisons` | Comparaisons |
| `/admin#compte` | Compte |
| `/admin#connexions` | Connexions |
| `/admin#entrainement` | Entraînement |
| `/admin#donnees` | Données |
| `/admin#a-propos` | À propos |
| `/glossaire` | Glossaire dédié |

---

## 5. Recette mobile

Tester au minimum :

- 375 px ;
- 768 px ;
- desktop large.

Contrôler :

- pas d'overflow horizontal ;
- onglets scrollables ;
- cartes lisibles ;
- right rail sous le contenu sur mobile ;
- boutons accessibles ;
- pas de texte coupé critique.

---

## 6. Recette données

Contrôler avec les cas suivants :

| Cas | Attendu |
|---|---|
| Strava seul | pages utilisables, Garmin en état vide |
| Garmin seul | activité visible si réelle |
| Strava + Garmin | source claire, pas de double comptage |
| Aucune activité période | état vide propre |
| Pas de FC | pas de zones fictives |
| Pas de sommeil/VFC | récupération non interprétée |
| Activité merged | non doublonnée |
| Randonnée/trail | pas utilisée comme record route si règle existante |

---

## 7. Contrôles de vocabulaire

```bash
rg "YTD|year to date|HRV|Body Battery|GAP|Decoupling|EPOC|Puissance|power|watts" frontend/src
```

Règle :

- les termes peuvent exister dans les utilitaires ou alias techniques ;
- ils ne doivent pas être les libellés principaux visibles utilisateur ;
- `Puissance` ne doit pas apparaître dans Performance.

---

## 8. Contrôles anti-données fictives

```bash
rg "12.4|1:02|620 m|fake|mock|dummy|lorem|sunny|weather" frontend/src
```

Tout résultat doit être justifié ou supprimé.

---

## 9. Contrôles imports et composants morts

À faire en fin de chantier seulement :

```bash
rg "GlossaryModal|AppTopbar|AdminSectionHeader|TodayRecoveryCard|RecoverySnapshotCard" frontend/src
```

Supprimer uniquement si :

- aucun import actif ;
- aucun test ne dépend du composant ;
- le build reste OK.

---

## 10. Documentation à mettre à jour

Claude doit mettre à jour :

- `.ai/current_context.md`
- `.ai/open_tasks.md`
- `.ai/regression_risks.md`
- `.ai/codebase_map.md`
- `docs/quality/RUNSEE_TEST_LOG.md`
- `docs/quality/RUNSEE_VALIDATION_MATRIX.md`
- `docs/quality/RUNSEE_RELEASE_CHECKLIST.md`
- `docs/backlog/BACKLOG_FONCTIONNALITES_FUTURES.md`
- `.tmp/alpine_light/00_SUIVI_CHANTIER_ALPINE_LIGHT.md` si présent.

---

## 11. Archive propre post-chantier

Commande projet :

```powershell
powershell -ExecutionPolicy Bypass -File deployment\scripts\Export-RunSeeSourceArchive.ps1 -OutputPath C:\Services\RuNSee\runsee-source-review-alpine-light-ui-final.zip
```

L'archive ne doit pas contenir :

- `node_modules/` ;
- `dist/` ;
- `.env` ;
- `*.db` ;
- `*.log` ;
- `runtime/` ;
- `.tmp/`.

---

## 12. Critère GO final

GO final uniquement si :

- tests frontend OK ;
- build frontend OK ;
- backend non régressif ;
- toutes les routes OK ;
- mobile OK ;
- placeholders inventoriés ;
- docs alignées ;
- aucun écart structurel majeur avec le PDF.

Tag proposé si tout est validé :

```bash
git tag runsee-stable-alpine-light-ui-final
git push origin runsee-stable-alpine-light-ui-final
```

---

## 13. Recette spécifique reprise post-lots 0 à 2

Avant de démarrer `03_PAGE_ACTIVITES.md`, exécuter cette recette ciblée.

### 13.1 Page Aujourd'hui / PDF page 5

Contrôles manuels :

- la sidebar affiche `Accueil`, pas `Aujourd'hui` ;
- le titre de page affiche `Aujourd'hui` ;
- la topbar ne contient aucune météo fictive ;
- les actions calendrier/notifications/compte ne sont pas des boutons actifs sans action ;
- la rangée basse contient bien `Récupération`, `Sommeil`, `Fréquence cardiaque au repos`, `Disponibilité`, `Sortie suggérée`, ou l'écart est documenté ;
- aucune valeur exacte de séance suggérée n'est inventée.

### 13.2 Contrôle sémantique KPI

À vérifier dans `DashboardPage.jsx` et éventuels view models :

```bash
rg "Charge|Fatigue|CTL|ATL|/100|summary\.ctl|summary\.atl|summary\.load" frontend/src/pages frontend/src/utils frontend/src/components
```

Critères :

- `summary.ctl` ne doit pas être présenté comme `Charge (7 j)` sans justification ;
- `summary.atl` peut alimenter `Fatigue`, mais `/100` doit être supprimé si la valeur n'est pas bornée ;
- si une normalisation est ajoutée, elle doit être isolée dans un view model frontend et documentée.

### 13.3 Contrôle topbar placeholders

```bash
rg "Calendrier|Notifications|Météo|weatherEnabled|alpine-topbar-icon-button" frontend/src
```

Critères :

- pas de données météo en dur ;
- pas de compteur notifications fictif ;
- bouton sans action = `disabled` ou lien réel.
