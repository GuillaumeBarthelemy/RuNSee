# RunNSee — Plan page Réglages / Admin

Référence PDF : pages 21 à 26  
Route technique : `/admin`  
Libellé UI : `Réglages`  
Fichier principal : `frontend/src/pages/AdminPage.jsx`  
Priorité : P2 — structure déjà partiellement OK, alignement visuel à finaliser.

---

## 1. Compréhension du besoin

La page Réglages doit centraliser :

- compte ;
- connexions Strava/Garmin ;
- paramètres d'entraînement ;
- données / synchronisation ;
- informations à propos.

La route peut rester `/admin` pour ne pas casser l'existant, mais l'interface doit afficher `Réglages`.

---

## 2. État actuel connu

`AdminPage.jsx` utilise `TabbedSettings`.  
La structure en onglets est globalement présente.

Composants existants :

- `TabbedSettings.jsx`
- `AccountOverviewCard.jsx`
- `AccountSecurityCard.jsx`
- `StravaAppSettingsCard.jsx`
- `GarminExperimentalCard.jsx`
- `GarminActivityBackfillCard.jsx`
- `TrainingAnalyticsSettingsCard.jsx`
- `PhysiologicalProfileCard.jsx`
- `RaceObjectivesCard.jsx`
- `SyncStatusCard.jsx`
- `SyncSummaryCard.jsx`
- `SyncActions.jsx`
- `UserPreferencesCard.jsx`

---

## 3. Onglets obligatoires

| Onglet UI | Hash recommandé | Page PDF | Rôle |
|---|---|---:|---|
| Compte | `#compte` | 22 | Identité et préférences |
| Connexions | `#connexions` | 23 | Strava / Garmin |
| Entraînement | `#entrainement` | 24 | FC, zones, objectifs |
| Données | `#donnees` | 25 | Sync, imports, qualité |
| À propos | `#a-propos` | 26 | Méthode, version, limites |

La page PDF 21 correspond à la vue globale / entrée Réglages.

---

## 4. Fichiers à lire avant modification

- `frontend/src/pages/AdminPage.jsx`
- `frontend/src/components/TabbedSettings.jsx`
- `frontend/src/components/AccountOverviewCard.jsx`
- `frontend/src/components/AccountSecurityCard.jsx`
- `frontend/src/components/StravaAppSettingsCard.jsx`
- `frontend/src/components/GarminExperimentalCard.jsx`
- `frontend/src/components/GarminActivityBackfillCard.jsx`
- `frontend/src/components/TrainingAnalyticsSettingsCard.jsx`
- `frontend/src/components/PhysiologicalProfileCard.jsx`
- `frontend/src/components/RaceObjectivesCard.jsx`
- `frontend/src/components/SyncStatusCard.jsx`
- `frontend/src/components/SyncSummaryCard.jsx`
- `frontend/src/components/SyncActions.jsx`
- `frontend/src/components/UserPreferencesCard.jsx`
- `frontend/src/components/visuals/alpine/SubTabs.jsx`
- `frontend/src/components/visuals/alpine/RightRailCard.jsx`
- `frontend/src/components/visuals/alpine/EmptyState.jsx`
- `frontend/src/styles.css`

---

## 5. Page Réglages — vue globale PDF 21

### Attendu

- titre `Réglages` ;
- sous-texte rassurant ;
- onglets visibles ;
- cartes blanches Alpine Light ;
- éventuel résumé statut connexions ;
- aucun jargon admin dans le titre.

### À éviter

- titre `Admin` ;
- style hétérogène ;
- empilement sans hiérarchie ;
- boutons dangereux trop visibles.

---

## 6. Onglet Compte — PDF 22

### Contenu attendu

- profil utilisateur ;
- email ;
- préférences d'affichage ;
- sécurité ;
- session ;
- langue/fuseau si disponible.

### Placeholders acceptables

- préférences avancées non câblées ;
- sessions multi-appareils ;
- export profil.

Ils doivent être marqués `À venir`.

---

## 7. Onglet Connexions — PDF 23

### Contenu attendu

- carte Strava ;
- carte Garmin Connect ;
- statut connecté/non connecté ;
- dernière synchronisation ;
- actions manuelles existantes ;
- statut backfill Garmin activité si déjà câblé ;
- explication source de données.

### Garde-fous

Ne pas casser :

- `GarminExperimentalCard` ;
- `GarminActivityBackfillCard` ;
- `StravaAppSettingsCard` ;
- endpoints existants.

Ne pas afficher Garmin connecté si ce n'est pas vrai.

---

## 8. Onglet Entraînement — PDF 24

### Contenu attendu

- profil physiologique ;
- FC max ;
- zones FC ;
- objectifs course ;
- paramètres de calcul.

### Règles

- Ne pas modifier les règles de zones.
- Ne pas supprimer les objectifs existants.
- Utiliser libellés français.

---

## 9. Onglet Données — PDF 25

### Contenu attendu

- statut synchronisation ;
- historique imports ;
- qualité des données ;
- recalculs éventuels ;
- purge ou reset si existant ;
- export / sauvegarde en placeholder si non câblé.

### Sécurité

Toute action destructive doit demander confirmation.  
Ne pas créer de bouton actif si l'action backend n'existe pas.

---

## 10. Onglet À propos — PDF 26

### Contenu attendu

- version RunNSee si disponible ;
- méthode de calcul synthétique ;
- sources Strava/Garmin ;
- limites d'interprétation ;
- lien vers Glossaire ;
- crédits / mentions.

### Ton

- clair ;
- pédagogique ;
- pas juridique lourd ;
- pas médical.

---

## 11. Risques / points de vigilance

| Risque | Contrôle |
|---|---|
| Route `/admin` cassée | conserver route |
| UI affiche Admin au lieu de Réglages | vérifier libellés |
| Bouton destructif sans confirmation | audit actions Données |
| Statut connexion faux | utiliser données provider réelles |
| Garmin Phase K cassé | ne pas modifier services backend |
| Placeholders trompeurs | marquer `À venir` |

---

## 12. Vérification de non-régression

Commandes :

```bash
cd frontend
npm test -- --run
npm run build
```

Contrôles manuels :

- `/admin#compte`
- `/admin#connexions`
- `/admin#entrainement`
- `/admin#donnees`
- `/admin#a-propos`
- clics Strava ;
- clics Garmin ;
- état non connecté ;
- mobile 375 px.

---

## 13. Critères d'acceptation

- UI affiche `Réglages`, pas `Admin`.
- Les 5 onglets existent.
- Les cartes sont harmonisées Alpine Light.
- Les actions existantes fonctionnent encore.
- Les placeholders sont neutres et inventoriés.
- Build frontend OK.
