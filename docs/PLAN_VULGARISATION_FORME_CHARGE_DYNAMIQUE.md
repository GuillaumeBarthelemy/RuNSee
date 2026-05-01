# Plan de vulgarisation - Analyse / Forme et charge / Dynamique

## 1. Comprehension du besoin

Objectif : ameliorer la comprehension produit des sections **Forme et charge** et **Dynamique** dans l'onglet Analyse, sans modifier les calculs, sans modifier les donnees, et sans casser les composants existants.

La cible n'est pas d'ajouter de nouveaux KPI. La cible est de rendre les indicateurs deja presents plus lisibles pour un coureur structure, mais pas necessairement coach ou data analyst.

Questions utilisateur auxquelles ces deux sections doivent mieux repondre :

- Est-ce que je construis une base solide ?
- Est-ce que ma fatigue recente est trop haute ?
- Est-ce que je peux continuer a pousser ou dois-je absorber ?
- Qu'est-ce qui explique ma dynamique actuelle ?
- Quel indicateur dois-je regarder en premier ?

Perimetre strict de ce plan :

- Analyse uniquement.
- Sections concernees : **Forme et charge** et **Dynamique**.
- Propositions sans code pour l'instant.
- Pas de modification scientifique des formules.
- Pas de modification backend, schema, migrations ou endpoints.
- Pas de suppression d'indicateurs sans arbitrage explicite.

## 2. Audit detaille de l'existant

### 2.1 Fichiers audites

| Zone | Fichier | Role actuel |
|---|---|---|
| Page Analyse | `frontend/src/pages/AnalyticsPage.jsx` | Assemble les sections, construit les modeles, branche les composants et les textes d'aide |
| Graphe charge | `frontend/src/components/RollingLoadChart.jsx` | Affiche barres de charge + courbes CTL / ATL / TSB |
| KPI charge | `frontend/src/components/TrainingSummaryKpiGrid.jsx` | Affiche Charge, CTL, ATL, TSB et Efficience allure / FC |
| Grille dynamique | `frontend/src/components/DynamicsGrid.jsx` | Affiche 9 signaux avances dans une grille compacte |
| Copy scientifique | `frontend/src/content/trainingMvpCopy.js` | Contient les infobulles et textes d'aide principaux |
| Copy commune | `frontend/src/content/analyticsCopy.js` | Structure standard des infobulles RunNSee |
| Narrations | `frontend/src/utils/performanceNarratives.js` | Genere les phrases automatiques du graphe et des KPI |
| Dynamique avancee | `frontend/src/utils/loadDynamics.js` | Calcule ACWR EWMA, detraining, time-to-recover, progression CTL, plateau efficience |
| Intelligence entrainement | `frontend/src/utils/trainingIntelligence.js` | Calcule monotonie, strain, polarisation, vitesse critique |
| Styles | `frontend/src/styles.css` | Styles des sections, cartes KPI, grille dynamique, responsive |

### 2.2 Section "Forme et charge"

Structure actuelle dans `AnalyticsPage.jsx` :

- Kicker : `Forme`
- Titre : `Forme et charge`
- Sous-titre : `Charge, CTL, ATL et TSB pour comprendre la pression du bloc en cours.`
- Graphe : `Charge / CTL / ATL / TSB`
- KPI : `Charge`, `CTL`, `ATL`, `TSB`, `Efficience allure / FC`

Modele calcule :

- `buildTrainingLoadStateModel(...)`
- `buildEfficiencyHistoryModel(...)`
- `buildLoadChartNarrative(...)`
- `buildLoadKpiInterpretations(...)`

Constat positif :

- Les calculs sont centralises cote utils.
- Le graphe conserve une vraie profondeur temporelle.
- La copy scientifique existe deja et cite des references solides : Banister, Coggan, Foster, Seiler.
- Les infobulles sont structurees en 5 blocs : En bref / Calcul / Comment lire / Action / Reference.

Points de friction :

- Les sigles CTL / ATL / TSB sont visibles partout en label principal.
- Le graphe demande de connaitre la lecture TrainingPeaks avant de comprendre la courbe.
- Le sous-titre melange charge, fatigue, fraicheur et base sans priorite de lecture.
- L'efficience allure / FC est affichee dans le meme groupe que la charge, alors que c'est un indicateur de performance / rendement, pas de charge.
- La phrase automatique du graphe peut encore ressortir `CTL, ATL et TSB`, ce qui casse l'effort de vulgarisation.

### 2.3 Section "Dynamique"

Structure actuelle dans `DynamicsGrid.jsx` :

- Titre : `Dynamique`
- Sous-titre : `Neuf reperes compacts pour relire la regularite, la pression de charge, la recuperation et le niveau de performance.`
- Cartes affichees :
  - Monotonie
  - Strain 7 j
  - Polarisation
  - ACWR EWMA
  - Detraining
  - Time-to-recover
  - Progression CTL
  - Plateau d'efficience
  - Vitesse critique

Constat positif :

- Les indicateurs couvrent bien les dimensions importantes : regularite, surcharge, recuperation, progression, intensite, performance.
- Les valeurs ont deja un `tone` visuel : positive, neutral, warning, danger.
- La grille est responsive en 3 colonnes, 2 colonnes puis 1 colonne.
- Les infobulles sont deja riches.

Points de friction :

- Le bloc melange deux familles d'indicateurs :
  - Absorption / charge : monotonie, strain, ACWR, detraining, time-to-recover, progression CTL.
  - Qualite / performance : polarisation, plateau d'efficience, vitesse critique.
- Les labels sont tres techniques : `ACWR EWMA`, `Strain`, `Detraining`, `Time-to-recover`, `Progression CTL`.
- Le titre `Dynamique` est trop large : il ne dit pas si l'on parle de dynamique de charge, de forme, de performance ou d'intensite.
- Les details courts sont parfois plus techniques que decisionnels.
- L'utilisateur ne sait pas quelle carte regarder en premier.

### 2.4 Etat de la copy actuelle

La copy est scientifiquement serieuse, mais son niveau de lecture est heterogene.

Points forts :

- Les formules sont explicites.
- Les seuils existent.
- Les references scientifiques sont presentes.
- Les actions concretes existent dans les infobulles.

Points a ameliorer :

- Les labels visibles ne sont pas assez vulgarises.
- Les infobulles sont parfois trop techniques des le premier niveau.
- Les sigles apparaissent avant leur traduction.
- Les termes anglais non traduits brouillent la lecture : `strain`, `detraining`, `time-to-recover`, `ACWR EWMA`.
- Les actions utiles sont cachees dans l'infobulle alors qu'elles devraient etre plus visibles quand l'etat est warning / danger.

## 3. Risques et points de vigilance

### 3.1 Risques fonctionnels

- Renommer un KPI peut donner l'impression que le calcul change, alors qu'il ne change pas.
- Trop vulgariser peut faire perdre la precision scientifique.
- Masquer totalement les sigles peut frustrer les utilisateurs avances.
- Regrouper les cartes de dynamique peut degrader la densite si la mise en page est mal calibree.

### 3.2 Risques de regression UX

- Le graphe `RollingLoadChart` est reutilisable ailleurs : changer ses labels par defaut peut impacter d'autres pages.
- `TrainingSummaryKpiGrid` peut etre reutilise avec des labels attendus dans d'autres contextes.
- `TRAINING_MVP_KPI_INFO` est aussi utilise par les composants de la page Aujourd'hui.
- Les infobulles existantes servent de glossaire : il faut conserver les informations scientifiques.

### 3.3 Arbitrage propose

Principe : vulgariser les **labels visibles** et garder les sigles dans les **infobulles**.

Exemple :

- Label visible : `Base de fond`
- Infobulle : `Correspond au CTL, charge chronique lisse sur 42 jours.`

Cela preserve :

- La lisibilite grand public.
- La precision pour les utilisateurs avances.
- La compatibilite scientifique.

## 4. Analyse fonctionnelle

### 4.1 Lecture scientifique des indicateurs actuels

| Indicateur actuel | Ce qu'il mesure reellement | Probleme de comprehension |
|---|---|---|
| Charge | Charge cumulee sur la periode | Correct, mais l'unite "points" doit rester mieux contextualisee |
| CTL | Charge chronique / base de fond | Sigle opaque si affiche seul |
| ATL | Charge aigue / fatigue recente | Sigle opaque, "fatigue" est plus parlant |
| TSB | Difference CTL - ATL / fraicheur relative | Sigle opaque, "fraicheur" est plus parlant |
| Efficience allure / FC | Rendement cardio-vitesse | Pertinent, mais moins lie a la charge que les quatre autres |
| Monotonie | Variation de charge entre les jours | Le mot est parlant mais anxiogene sans explication |
| Strain | Charge 7 j x monotonie | Terme anglais peu actionnable |
| Polarisation | Distribution facile / tempo / intense | Terme correct pour coureur avance, moins pour debutant |
| ACWR EWMA | Ratio charge courte / charge longue | Sigle trop technique en label visible |
| Detraining | Perte de base recente | Anglais inutile en label visible |
| Time-to-recover | Jours necessaires pour retrouver une fraicheur cible | Anglais inutile en label visible |
| Progression CTL | Vitesse de construction de la base | Sigle opaque |
| Plateau d'efficience | Stagnation rendement cardio-vitesse | Correct mais doit dire "sur sorties comparables" |
| Vitesse critique | Repere proche seuil / performance route | Correct pour expert, demande une definition visible courte |

### 4.2 Probleme principal identifie

Le probleme n'est pas le fond scientifique. Le probleme est la **charge cognitive**.

Aujourd'hui, l'utilisateur lit :

> Charge / CTL / ATL / TSB, Monotonie, Strain, ACWR EWMA, Detraining...

Il doit traduire mentalement :

> Est-ce que ma base monte ? Est-ce que ma fatigue est trop haute ? Est-ce que je dois recuperer ?

La proposition consiste a faire cette traduction dans l'interface.

## 5. Proposition produit cible

### 5.1 Nouvelle promesse de lecture

La section doit dire clairement :

> "Tu vois si ton bloc construit, fatigue ou demande a etre absorbe."

La dynamique doit dire :

> "Tu comprends pourquoi la tendance est bonne, fragile ou a surveiller."

### 5.2 Architecture de lecture recommandee

Ordre de lecture propose :

1. **Charge et fraicheur** : lire le graphe principal.
2. **Les quatre reperes essentiels** : charge, base, fatigue, fraicheur.
3. **Ce qui explique la tendance** : signaux secondaires regroupes par famille.
4. **Action courte** : continuer, stabiliser, absorber, relancer.

### 5.3 Renommage recommande

| Actuel | Nouveau label visible propose | Sigle conserve ou non |
|---|---|---|
| Forme et charge | Charge et fraicheur | CTL/ATL/TSB dans tooltip uniquement |
| Charge / CTL / ATL / TSB | Charge, base, fatigue et fraicheur | Sigles dans legende secondaire ou tooltip |
| Charge | Charge du bloc | Aucun besoin de sigle |
| CTL | Base de fond | CTL en sous-label ou tooltip |
| ATL | Fatigue recente | ATL en sous-label ou tooltip |
| TSB | Marge de fraicheur | TSB en sous-label ou tooltip |
| Dynamique | Ce qui explique la tendance | Aucun sigle |
| Monotonie | Regularite de charge | Monotonie Foster en tooltip |
| Strain 7 j | Pression cumulee 7 j | Strain en tooltip |
| Polarisation | Structure d'intensite | Polarisation Seiler en tooltip |
| ACWR EWMA | Hausse de charge | ACWR EWMA en tooltip |
| Detraining | Socle en recul | Detraining en tooltip |
| Time-to-recover | Jours faciles necessaires | TSB cible en tooltip |
| Progression CTL | Construction de la base | CTL en tooltip |
| Plateau d'efficience | Tendance d'efficience | Efficience en tooltip |
| Vitesse critique | Repere seuil route | Critical Speed en tooltip |

### 5.4 Reorganisation de la section "Dynamique"

Au lieu d'une grille unique de 9 cartes equivalentes, proposer deux groupes visuels.

#### Groupe A - Absorption de la charge

Objectif : repondre a "Est-ce que je peux encaisser ce que je fais ?"

Cartes :

- Hausse de charge
- Pression cumulee 7 j
- Regularite de charge
- Jours faciles necessaires
- Socle en recul
- Construction de la base

#### Groupe B - Qualite du bloc

Objectif : repondre a "Est-ce que le contenu de mon entrainement me fait progresser ?"

Cartes :

- Structure d'intensite
- Tendance d'efficience
- Repere seuil route

Avantage :

- On conserve tous les indicateurs.
- On evite l'effet "mur de KPI".
- On donne une logique de lecture.

## 6. Propositions concretes de vulgarisation

### 6.1 Section "Charge et fraicheur"

Titre propose :

> Charge et fraicheur

Sous-titre propose :

> Lis si ton bloc construit une base, cree de la fatigue ou demande une phase d'absorption.

Titre graphe propose :

> Charge, base, fatigue et fraicheur

Sous-titre graphe propose :

> Les barres montrent la charge de chaque jour. Les courbes montrent ta base construite, ta fatigue recente et ta marge de fraicheur.

Note de lecture proposee :

> Si la fatigue recente passe durablement au-dessus de ta base, le bloc devient sollicitant. Si la fraicheur remonte, tu absorbes.

Legende proposee :

| Courbe actuelle | Libelle visible | Aide courte |
|---|---|---|
| Charge | Charge jour | Contrainte de la seance ou du jour |
| CTL | Base de fond | Socle construit sur plusieurs semaines |
| ATL | Fatigue recente | Pression des derniers jours |
| TSB | Fraicheur | Marge entre base et fatigue |

### 6.2 Cartes KPI de charge

Ordre recommande :

1. Charge du bloc
2. Base de fond
3. Fatigue recente
4. Marge de fraicheur

Efficience allure / FC :

- A sortir de ce bloc si possible.
- A conserver dans une zone performance / volume / efficience deja presente plus bas.
- Si conservation temporaire dans la grille, ajouter un separateur visuel ou un label "Performance".

Hints proposes :

| KPI | Hint visible |
|---|---|
| Charge du bloc | Contrainte cumulee de ta selection |
| Base de fond | Socle construit sur 6 semaines |
| Fatigue recente | Pression des 7 derniers jours |
| Marge de fraicheur | Ecart entre base et fatigue |

### 6.3 Cartes dynamique

Proposition de detail visible court :

| Carte | Detail actuel | Detail propose |
|---|---|---|
| Regularite de charge | Variabilite de charge sur 7 jours | Tes jours sont-ils bien alternes ou trop semblables ? |
| Pression cumulee 7 j | Densite de charge : volume recent x monotonie | Plus c'est haut, plus ton bloc demande a etre absorbe |
| Structure d'intensite | Regroupement Z1-Z2 / Z3 / Z4-Z5 | Repartition facile, tempo et intense |
| Hausse de charge | Aigu / chronique | Ta charge recente monte-t-elle trop vite ? |
| Socle en recul | Chute CTL | Ta base recule-t-elle depuis plusieurs semaines ? |
| Jours faciles necessaires | Projection TSB | Estimation du temps pour retrouver une marge de fraicheur |
| Construction de la base | Progression CTL | Vitesse a laquelle tu construis ton socle |
| Tendance d'efficience | Regression efficience | Ton rendement cardio-vitesse progresse-t-il encore ? |
| Repere seuil route | Vitesse critique | Allure repere proche de ton seuil soutenable |

### 6.4 Codes de lecture proposes

Ajouter ou renforcer une mini-legende commune :

| Couleur | Sens vulgarise |
|---|---|
| Vert | Tu peux construire |
| Bleu / neutre | Stable, a maintenir |
| Orange | A absorber ou surveiller |
| Rouge | Reduire la pression avant d'ajouter de l'intensite |

Cette legende evite de devoir interpreter chaque carte separement.

## 7. Plan d'action propose

### Lot 1 - Renommage visible sans refonte

Objectif : ameliorer immediatement la comprehension sans changer la structure.

Actions :

- Renommer les titres et sous-titres de la section.
- Remplacer les labels visibles CTL / ATL / TSB par des labels vulgarises.
- Conserver les sigles dans les infobulles.
- Revoir `scopeNote` pour eviter `CTL / ATL / TSB` en texte visible.
- Revoir les phrases automatiques qui mentionnent les sigles.

Fichiers probables :

- `frontend/src/pages/AnalyticsPage.jsx`
- `frontend/src/components/TrainingSummaryKpiGrid.jsx`
- `frontend/src/components/RollingLoadChart.jsx` si labels par defaut a ajuster proprement
- `frontend/src/utils/performanceNarratives.js`
- `frontend/src/content/trainingMvpCopy.js`

Risque :

- Moyen si `TrainingSummaryKpiGrid` est utilise ailleurs.

Garde-fou :

- Ne modifier que les labels passes en props depuis Analyse quand c'est possible.
- Eviter de changer les defaults globaux si un composant est reutilise.

### Lot 2 - Relecture des infobulles

Objectif : garder la precision scientifique, mais mettre la vulgarisation au premier niveau.

Actions :

- Reordonner les phrases : sens utilisateur d'abord, formule ensuite.
- Ajouter une phrase "Ce que tu dois regarder" pour les indicateurs principaux.
- Traduire les termes anglais dans les labels d'aide.
- Garder les references scientifiques en dernier bloc.

Fichiers probables :

- `frontend/src/content/trainingMvpCopy.js`
- eventuellement `frontend/src/content/analyticsCopy.js` si besoin d'un label standard plus clair.

Risque :

- Faible, copy only.

Garde-fou :

- Ne pas retirer les references ni les formules.
- Ne pas changer les `glossaryKey`.

### Lot 3 - Lecture guidee du graphe charge

Objectif : aider l'utilisateur a lire le graphe dans le bon ordre.

Actions :

- Ajouter une zone de lecture courte sous le sous-titre :
  - "1. Regarde les barres"
  - "2. Compare fatigue recente et base"
  - "3. Lis la fraicheur"
- Renforcer la phrase automatique avec une formulation decisionnelle.
- Conserver les zones visuelles TSB positives / negatives.

Fichiers probables :

- `frontend/src/components/RollingLoadChart.jsx`
- `frontend/src/pages/AnalyticsPage.jsx`
- `frontend/src/styles.css`

Risque :

- Faible a moyen selon reutilisation du graphe.

Garde-fou :

- Ajouter une prop optionnelle plutot que changer le rendu partout.

### Lot 4 - Reorganisation de la grille dynamique

Objectif : passer d'un mur de 9 KPI a deux familles lisibles.

Actions :

- Garder `DynamicsGrid`, mais structurer en deux sous-groupes :
  - Absorption de la charge
  - Qualite du bloc
- Ajouter une intro courte par sous-groupe.
- Garder toutes les cartes existantes.
- Conserver les tons existants.

Fichiers probables :

- `frontend/src/components/DynamicsGrid.jsx`
- `frontend/src/styles.css`
- `frontend/src/content/trainingMvpCopy.js`

Risque :

- Moyen : changement layout visible.

Garde-fou :

- Aucune modification de `loadDynamics.js` ou `trainingIntelligence.js`.
- Responsive : 2 groupes empiles sur mobile.

### Lot 5 - Bloc "Et maintenant ?"

Objectif : transformer la lecture en decision, sans nouveau calcul scientifique.

Actions :

- Ajouter un micro-bloc de synthese a partir des statuts deja calcules.
- Exemple de sorties :
  - "Tu peux construire : base stable, fatigue contenue."
  - "Absorbe : fatigue recente au-dessus de la base."
  - "Relance progressive : socle en recul."
  - "Surveille : charge qui monte vite et structure intense."

Fichiers probables :

- Nouveau composant possible : `frontend/src/components/AnalysisDecisionHint.jsx`
- `frontend/src/pages/AnalyticsPage.jsx`
- `frontend/src/styles.css`

Risque :

- Moyen : les recommandations doivent rester prudentes.

Garde-fou :

- S'appuyer uniquement sur `tone`, `label` et valeurs deja disponibles.
- Ajouter une mention : "A croiser avec tes sensations, sommeil, douleur, stress."

### Lot 6 - Harmonisation responsive et densite visuelle

Objectif : garder une page premium, dense mais lisible.

Actions :

- Verifier affichage desktop, intermediaire, mobile.
- Eviter les cartes trop hautes dans Dynamique.
- Mettre les details longs en tooltip plutot que dans le corps de carte.
- Renforcer les espaces entre groupes.

Fichiers probables :

- `frontend/src/styles.css`
- `frontend/src/components/DynamicsGrid.jsx`
- `frontend/src/components/TrainingSummaryKpiGrid.jsx`

Risque :

- Faible a moyen.

Garde-fou :

- Ne pas modifier les classes globales si une classe locale suffit.

## 8. Verification de non-regression

### 8.1 Contraintes de non-regression

- Les donnees affichees doivent rester identiques.
- Les calculs ne doivent pas etre modifies.
- Les graphes doivent conserver les memes series.
- Les tooltips doivent conserver les formules et references.
- Les filtres partages doivent rester inchanges.
- Les pages Aujourd'hui, Performance et Dashboard ne doivent pas recevoir de changement involontaire.

### 8.2 Fichiers a ne pas modifier pour cette evolution

Sauf validation explicite :

- `frontend/src/utils/loadEstimation.js`
- `frontend/src/utils/trainingMetrics.js`
- `frontend/src/utils/runningPerformance.js`
- `frontend/src/utils/loadDynamics.js`
- `frontend/src/utils/trainingIntelligence.js`
- `frontend/src/utils/raceObjectivePlanner.js`
- backend / Prisma / migrations

### 8.3 Tests manuels recommandes

Pour chaque lot implemente :

- Ouvrir Analyse en periode 7 j, 30 j, 90 j.
- Verifier que les valeurs Charge / Base / Fatigue / Fraicheur correspondent aux anciennes valeurs.
- Verifier que le graphe conserve les barres et courbes.
- Verifier que les infobulles s'ouvrent et restent lisibles.
- Verifier que les sigles restent accessibles dans les infobulles.
- Verifier Dynamique avec des cartes positive / warning / danger.
- Verifier mobile : grille dynamique en une colonne, pas de debordement.
- Verifier qu'aucun composant d'Aujourd'hui n'est degrade par les changements de copy commune.

### 8.4 Validation technique recommandee

Apres implementation future :

```powershell
cd C:\Services\RuNSee\frontend
npx eslint src/pages/AnalyticsPage.jsx src/components/DynamicsGrid.jsx src/components/TrainingSummaryKpiGrid.jsx src/components/RollingLoadChart.jsx src/content/trainingMvpCopy.js src/utils/performanceNarratives.js --max-warnings 0
npm run build
```

Adapter la commande aux fichiers reellement touches.

## 9. Hypotheses et limites

Hypotheses :

- Les calculs actuels sont conserves comme source de verite.
- L'utilisateur cible veut une lecture plus claire, pas une simplification scientifique abusive.
- Les sigles peuvent rester presents dans les infobulles, mais pas comme premier niveau de comprehension.
- L'evolution est prioritairement frontend / copy.

Limites :

- Sans donnees de sommeil, HRV, douleurs ou RPE journalier, les recommandations doivent rester prudentes.
- Le TSB ne suffit pas a lui seul a dire si une seance qualite est sure.
- ACWR, monotony et strain sont des indicateurs descriptifs, pas des predicteurs medicaux.
- La vitesse critique depend fortement de la qualite des records et des activites enrichies.

## 10. Synthese decisionnelle

Decision recommandee :

- Ne pas toucher aux formules.
- Ne pas ajouter de KPI.
- Renommer les labels visibles pour traduire les sigles.
- Reorganiser Dynamique en deux familles.
- Faire remonter une lecture actionnable courte.
- Garder toute la profondeur scientifique dans les infobulles.

Priorite d'execution :

1. Lot 1 : renommage visible.
2. Lot 2 : infobulles vulgarisees.
3. Lot 4 : grille dynamique en familles.
4. Lot 3 : lecture guidee du graphe.
5. Lot 5 : bloc "Et maintenant ?".
6. Lot 6 : QA responsive.

Cette approche donne un gain de lisibilite fort sans regression scientifique et sans effet "nouveau tableau de bord empile".
