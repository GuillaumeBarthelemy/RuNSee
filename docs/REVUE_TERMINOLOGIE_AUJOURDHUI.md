# Revue terminologique - Onglet Aujourd'hui

## 1. Comprehension du besoin

Objectif : valider si la vulgarisation proposee pour **Forme et charge** / **Dynamique** peut etre appliquee coheremment a certains indicateurs de l'onglet **Aujourd'hui**, sans toucher aux calculs et sans ajouter de KPI.

L'onglet Aujourd'hui doit rester une page de pilotage court terme. Les labels doivent donc etre plus directs que dans Analyse, mais conserver une correspondance claire avec les indicateurs scientifiques.

## 2. Audit des libelles actuels

### 2.1 Fichiers audites

| Fichier | Zone |
|---|---|
| `frontend/src/pages/DashboardPage.jsx` | Assemblage de l'onglet Aujourd'hui |
| `frontend/src/components/DashboardDecisionSummaryCard.jsx` | Synthese decisionnelle |
| `frontend/src/components/TodayFormCards.jsx` | Fraicheur, base, charge |
| `frontend/src/components/TodayVolumeStrip.jsx` | Distance, seances, duree, denivele |
| `frontend/src/components/TodaySecondaryRow.jsx` | Constance, densite |
| `frontend/src/components/TodaySnapshotToday.jsx` | Snapshot activite du jour |
| `frontend/src/components/TodayAlertBanner.jsx` | Alertes du jour |
| `frontend/src/utils/todayAlerts.js` | Textes et titres des alertes |

### 2.2 Constats principaux

Points deja bons :

- `Fraicheur` remplace deja efficacement `TSB`.
- `Base de fond` remplace deja efficacement `CTL`.
- `Charge recente` evite deja le jargon `ATL`.
- `Constance` est plus lisible que regularite 4 semaines.
- Les alertes sont majoritairement formulees en langage coureur : surcharge probable, fatigue recente elevee, base en recul, volume en retrait.

Points a clarifier :

- `Charge recente` est ambigu : la valeur affichee peut etre la charge du jour si une activite existe aujourd'hui, sinon le cumul 7 jours. Le detail affiche pourtant "Volume + intensite cumules sur 7 jours".
- `Densite` est trop vague : l'indicateur correspond au strain Foster, donc a une pression cumulee par charge et repetition.
- `Distance semaine` est moins naturel que `Distance hebdo` ou `Kilometrage hebdo`.
- `Seances` gagnerait a devenir `Seances hebdo` pour etre symetrique avec distance / duree / denivele.
- `Snapshot du jour` est comprehensible mais moins coherent avec le vocabulaire francais sobre du reste de RunNSee.

## 3. Validation des termes proposes

### 3.1 Termes a conserver

| Libelle actuel | Decision | Justification |
|---|---|---|
| Fraicheur | Conserver ou preciser en `Marge de fraicheur` | Tres lisible. `Marge de fraicheur` est plus precis, mais `Fraicheur` fonctionne mieux en carte courte. |
| Base de fond | Conserver | Bonne vulgarisation de CTL. Clair, stable, actionnable. |
| Charge recente | Conserver avec clarification | Bon label, mais il faut aligner le detail avec la valeur affichee. |
| Constance | Conserver | Clair pour l'utilisateur, meilleur que regularite technique. |
| Forme du moment | Conserver | Tres bon label de synthese decisionnelle. |
| Fatigue | Conserver | Direct et comprehensible. |
| Recommandation | Conserver | Oriente decision, conforme a la page Aujourd'hui. |

### 3.2 Termes a renommer

| Actuel | Proposition recommandee | Alternative | Justification |
|---|---|---|---|
| Densite | Pression cumulee | Charge repetee | `Densite` est abstrait. `Pression cumulee` traduit mieux strain = charge x repetition. |
| Distance semaine | Distance hebdo | Kilometrage hebdo | Plus court, plus homogene avec les autres indicateurs hebdomadaires. |
| Seances | Seances hebdo | Frequence hebdo | Evite l'ambiguite avec le total global. |
| Duree | Duree hebdo | Temps actif hebdo | Precise la periode sans alourdir. |
| Denivele | Denivele hebdo | D+ hebdo | `Denivele hebdo` reste plus accessible que `D+`. |
| Snapshot du jour | Seance du jour | Activite du jour | Plus naturel et plus francais. |
| Ajuster la suite | Actions rapides | Preparer la suite | Le titre actuel est correct, mais `Actions rapides` est plus clair et deja employe en kicker. |

### 3.3 Termes a eviter en label visible sur Aujourd'hui

Ces termes peuvent rester dans les infobulles, mais ne devraient pas etre le premier niveau de lecture :

- CTL
- ATL
- TSB
- ACWR
- EWMA
- Strain
- Detraining
- Monotonie

## 4. Proposition de nomenclature cible

### 4.1 Cartes forme

| Carte actuelle | Nom cible court | Detail visible cible |
|---|---|---|
| Fraicheur | Fraicheur | Ta marge avant d'accumuler davantage de fatigue. |
| Base de fond | Base de fond | Ton socle construit sur plusieurs semaines. |
| Charge recente | Charge recente | Charge des derniers jours, avec le jour courant mis en avant si une sortie a ete detectee. |

Remarque importante :

- Si la carte continue a afficher parfois la charge du jour et parfois la charge 7 jours, le detail doit l'assumer explicitement.
- Sinon, il faudra choisir une seule logique d'affichage plus tard : charge du jour ou cumul 7 jours.

### 4.2 Cartes volume hebdo

| Carte actuelle | Nom cible |
|---|---|
| Distance semaine | Distance hebdo |
| Seances | Seances hebdo |
| Duree | Duree hebdo |
| Denivele | Denivele hebdo |

Justification :

- Le suffixe `hebdo` est court.
- Il evite les retours a la ligne longs.
- Il reste coherent avec le caractere pilotage court terme de la page.

### 4.3 Cartes secondaires

| Carte actuelle | Nom cible | Detail cible |
|---|---|---|
| Constance | Constance | Semaines actives recentes |
| Densite | Pression cumulee | Charge recente et repetition des efforts |

Justification :

- `Constance` peut rester tel quel.
- `Pression cumulee` est plus actionnable que `Densite`.
- Le concept scientifique `strain` doit rester dans l'infobulle.

### 4.4 Snapshot du jour

| Actuel | Proposition |
|---|---|
| Snapshot du jour | Seance du jour |
| Aucune activite aujourd'hui | Aucune seance aujourd'hui |
| Activite detectee aujourd'hui | Seance detectee aujourd'hui |

Justification :

- `Snapshot` est un anglicisme inutile.
- `Seance du jour` parle mieux a un coureur.
- `Activite` peut rester dans les details si l'application couvre multi-sport, mais la page se veut running/performance.

## 5. Alignement avec la future section Analyse

Correspondance recommandee :

| Aujourd'hui | Analyse | Sigle scientifique |
|---|---|---|
| Fraicheur | Marge de fraicheur | TSB |
| Base de fond | Base de fond | CTL |
| Charge recente | Fatigue recente / charge recente | ATL ou charge 7 j selon contexte |
| Pression cumulee | Pression cumulee 7 j | Strain Foster |
| Constance | Regularite de charge | Regularite / active weeks |
| Distance hebdo | Volume hebdomadaire | Distance |
| Seances hebdo | Seances hebdomadaires | Count |

Regle de coherence :

- Aujourd'hui peut utiliser des labels plus courts.
- Analyse doit etre plus explicative.
- Les deux doivent partager la meme traduction des concepts.

## 6. Proposition d'action sans code immediat

### Lot A - Harmonisation wording court terme

Objectif : ajuster les labels visibles sans changer les composants.

Actions proposees :

- `Distance semaine` -> `Distance hebdo`
- `Seances` -> `Seances hebdo`
- `Duree` -> `Duree hebdo`
- `Denivele` -> `Denivele hebdo`
- `Densite` -> `Pression cumulee`
- `Snapshot du jour` -> `Seance du jour`

Risque : faible, copy only.

### Lot B - Clarification de Charge recente

Objectif : supprimer l'ambiguite entre charge du jour et charge 7 jours.

Option 1 recommandee :

- Conserver `Charge recente`
- Modifier le detail visible :
  - `Charge des derniers jours, avec le jour courant mis en avant si une sortie a ete detectee.`

Option 2 plus stricte :

- Toujours afficher le cumul 7 jours.
- Garder `Charge 7 j` ou `Charge recente`.

Decision produit a prendre avant implementation :

- Pour Aujourd'hui, je recommande l'option 1 car elle donne plus de poids a la sortie du jour.

### Lot C - Harmonisation des infobulles

Objectif : garder le lien scientifique sans imposer les sigles.

Actions proposees :

- Dans les infobulles, commencer par le sens utilisateur.
- Mettre les sigles en seconde phrase :
  - `Ce repere correspond au TSB.`
  - `Ce repere correspond au CTL.`
  - `Ce repere correspond au strain Foster.`

## 7. Verification de non-regression

Contraintes :

- Aucun calcul ne doit changer.
- Les valeurs affichees doivent rester strictement identiques.
- Les seuils de couleur doivent rester identiques.
- Les alertes existantes ne doivent pas etre reordonnees par simple changement de label.
- Les tooltips doivent conserver les references scientifiques.

Tests manuels recommandes apres implementation future :

- Ouvrir Aujourd'hui avec periode 7 j par defaut.
- Verifier les trois cartes forme : fraicheur, base, charge.
- Verifier une journee avec activite aujourd'hui.
- Verifier une journee sans activite aujourd'hui.
- Verifier les cartes volume sur mobile.
- Verifier les alertes warning / danger.
- Verifier que les infobulles mentionnent encore CTL / ATL / TSB / strain.

## 8. Conclusion

Validation globale : oui, la vulgarisation proposee pour Analyse est compatible avec l'onglet Aujourd'hui.

Point fort : Aujourd'hui est deja proche de la cible avec `Fraicheur`, `Base de fond`, `Charge recente`, `Constance`.

Point a corriger en priorite : `Densite` doit devenir `Pression cumulee`, et `Charge recente` doit etre clarifiee car sa valeur peut representer le jour courant ou le cumul 7 jours.

Recommandation : appliquer une harmonisation legere, sans refonte, pour garder la page courte, decisionnelle et immediatement comprehensible.
