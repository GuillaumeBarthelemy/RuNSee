# RunNSee — Lot Progression V5 strict — MAJ Alpine Light

## 1. Objectif

Construire une vraie page **Progression**, centrée sur l'évolution long terme, la construction de saison et la régularité.

La page Progression ne doit pas absorber Analyse ou Performance.

Règle validée :

```text
Analyse = comprendre l'état d'entraînement actuel.
Performance = mesurer le niveau et les capacités.
Progression = suivre la construction long terme.
```

---

## 2. Route

```text
/progression
```

Libellé visible :

```text
Progression
```

---

## 3. Conclusion de revue scientifique du mockup

Le mockup Progression existant est globalement cohérent et peut être conservé.

Aucune régénération du PDF n'est requise à ce stade.

Justification :

- le **volume hebdomadaire avec moyenne glissante** est pertinent pour suivre la construction progressive et lisser le bruit d'une semaine isolée ;
- le **cumul annuel** permet une lecture simple de la trajectoire de saison, à condition de ne pas le transformer en objectif inventé ;
- la **régularité** est utile pour analyser la constance, mais elle ne doit pas être présentée comme garantie de performance ou de prévention de blessure ;
- les **comparaisons N-1 / période précédente** sont pertinentes uniquement si les périodes ont une durée comparable et un périmètre identique ;
- les indicateurs physiologiques courts termes comme VFC, sommeil, stress et récupération doivent rester dans Analyse ;
- les records et niveaux doivent rester dans Performance.

Ajustement de cadrage demandé dans l'implémentation, sans modification visuelle majeure du mockup :

```text
FC moyenne en Cumul annuel = contexte secondaire, pas KPI principal de progression.
Charge d'entraînement en tendances long terme = signal secondaire, pas graphe central.
Aucune lecture causale forte sur blessure ou performance.
```

---

## 4. Sous-onglets obligatoires

Structure alignée sur le PDF mockup validé :

| Onglet visible | Hash | Rôle | Statut attendu |
|---|---|---|---|
| Cumul annuel | `#cumul-annuel` | volume depuis le début de l'année | complet |
| Volume | `#volume` | distance / durée / D+ hebdomadaires | complet |
| Régularité | `#regularite` | fréquence, semaines actives, jours actifs | complet |
| Comparaisons | `#comparaisons` | période vs période, N-1, route/trail | complet |

Ne pas utiliser `YTD` dans l'interface.

---

# 5. Règles métier globales

- Respecter le premier jour de semaine paramétré.
- Ne pas double-compter Garmin/Strava.
- Exclure les activités `isMerged`.
- Ne pas comparer deux périodes de durées différentes sans mention explicite.
- Ne pas afficher `YTD` : utiliser `Cumul annuel`.
- Ne pas inventer d'objectif annuel.
- Ne pas afficher un delta si le dénominateur vaut 0.
- Ne pas confondre absence de donnée et valeur zéro.
- Distinguer route / trail / randonnée si la composition du volume est affichée.
- Signaler les données partielles avec un état de confiance.
- Ne pas utiliser les randonnées dans des indicateurs de performance route.

---

# 6. Onglet Cumul annuel

## 6.1 Question métier

```text
Où en suis-je depuis le début de l'année ?
```

## 6.2 Contenu attendu

```text
Header Progression
Sous-titre : Suis ton évolution sur le long terme et construis ton avenir.
Sous-onglets
KPI annuels
Volume hebdomadaire + moyenne glissante
Cumulatif depuis le 1er janvier
Progression mensuelle
Régularité
Faits marquants
Tendances long terme
Conseil du jour
```

## 6.3 KPI

KPI principaux :

```text
Distance depuis le début de l'année
Temps depuis le début de l'année
Dénivelé depuis le début de l'année
Activités
Jours actifs
```

KPI secondaire autorisé :

```text
FC moyenne
```

Règle : FC moyenne ne doit pas être utilisée comme indicateur principal de progression, seulement comme contexte.

## 6.4 Graphiques

### Volume hebdomadaire avec moyenne glissante

Obligatoire.

```text
barres = distance hebdomadaire
ligne = moyenne glissante 4 semaines
```

Règles :

- respecter le premier jour de semaine paramétré ;
- semaines incomplètes signalées ;
- merged exclues ;
- Garmin/Strava dédupliqués.

### Cumulatif depuis le 1er janvier

Obligatoire.

Afficher au minimum :

```text
distance cumulée
temps cumulé
dénivelé cumulé
```

Comparaison N-1 autorisée si date alignée.

### Progression mensuelle

Afficher :

```text
distance mensuelle
dénivelé mensuel
```

ou deux séries si lisibles.

### Régularité synthétique

Afficher :

```text
score / anneau de régularité
jours actifs
séances
meilleure série
```

### Faits marquants

Afficher :

```text
meilleur mois
plus longue sortie
D+ le plus élevé
```

---

# 7. Onglet Volume

## 7.1 Question métier

```text
Comment évoluent mon volume, mon temps et mon dénivelé sur la durée ?
```

## 7.2 KPI

```text
Distance hebdo moyenne
Temps hebdo moyen
Dénivelé hebdo moyen
Sorties par semaine
```

## 7.3 Graphiques

### Volume hebdomadaire long terme

Obligatoire.

```text
barres = distance hebdo
ligne = moyenne glissante 4 semaines
```

### Temps hebdomadaire

Obligatoire.

```text
barres = temps hebdo
ligne = moyenne glissante 4 semaines
```

### Dénivelé hebdomadaire

Obligatoire.

```text
barres = D+ hebdo
ligne = moyenne glissante 4 semaines
```

### Composition du volume

Autorisé et pertinent.

Afficher sur les 12 dernières semaines :

```text
Trail / Montagne
Route
Sortie longue
Récupération
Autre
```

Règles :

- ne pas afficher si typage sport insuffisant ;
- afficher `Données partielles` si classification incertaine ;
- ne pas utiliser ce graphique pour juger la performance.

## 7.4 À retenir

Afficher des messages comme :

```text
Progression continue
Plus de dénivelé
Régularité en hausse
Tendance durable
Cap sur l'objectif
```

Éviter les affirmations causales fortes.

---

# 8. Onglet Régularité

## 8.1 Question métier

```text
Suis-je régulier dans ma pratique ?
```

## 8.2 KPI

```text
Semaines actives
Série actuelle
Sorties / semaine
Jours actifs
```

## 8.3 Graphiques

### Carte de régularité

Obligatoire.

Afficher une heatmap par jour :

```text
aucune activité
activité légère
activité modérée
activité élevée
```

Règles :

- ce n'est pas une carte de performance ;
- intensité de couleur basée sur charge ou volume selon disponibilité ;
- tooltip recommandé : date, type, distance, durée.

### Fréquence hebdomadaire

Obligatoire.

```text
barres = sorties par semaine
ligne = moyenne glissante 4 semaines
```

### Répartition des jours

Obligatoire.

Afficher la part d'activité par jour de semaine.

### Série de régularité

Obligatoire.

Afficher les semaines actives / pauses.

## 8.4 À retenir

Messages autorisés :

```text
Très bonne régularité
Série actuelle
Sorties / semaine stable
Jours d'entraînement équilibrés
```

Ne pas écrire :

```text
risque de blessure évité
progression garantie
```

---

# 9. Onglet Comparaisons

## 9.1 Question métier

```text
Qu'est-ce qui progresse par rapport à une période comparable ?
```

## 9.2 KPI

```text
vs N-1
vs 12 dernières semaines
Trail spécifique
Équilibre route / trail
```

## 9.3 Graphiques

### Volume mensuel année en cours vs N-1

Obligatoire.

Règle : comparer uniquement les mois disponibles ou préciser projection.

### Bloc de 12 semaines - comparaison

Obligatoire.

Comparer :

```text
période actuelle
période précédente de même durée
```

### Répartition par sport

Autorisé.

Afficher :

```text
année courante
année précédente ou période précédente
écart trail
écart course à pied
écart randonnée
autres
```

### Terrain & dénivelé

Obligatoire si D+ disponible.

Afficher :

```text
Dénivelé positif total
Dénivelé / km
```

## 9.4 Ce qui progresse / À surveiller

Conserver deux cartes :

```text
Ce qui progresse
À surveiller
```

Règles :

- ne pas surinterpréter ;
- mentionner les limites de période ;
- ne pas comparer si données insuffisantes ;
- signaler si la période actuelle est incomplète.

---

# 10. Revue scientifique et garde-fous

## 10.1 Ce qui est scientifiquement pertinent

### Volume hebdomadaire + moyenne glissante

Pertinent pour suivre la charge externe et la construction progressive. La moyenne glissante 4 semaines permet de lisser les variations d'une semaine isolée.

### Cumul annuel

Pertinent pour la lisibilité saisonnière, mais il doit être descriptif.

Ne pas transformer en objectif annuel inventé.

### Régularité

Pertinente pour comprendre la constance. Elle ne doit pas être présentée comme une garantie de performance.

### Comparaison N-1 / période précédente

Pertinente si les périodes sont équivalentes et si les données ont la même couverture.

### Composition route / trail

Pertinente pour RunNSee, car la préparation trail dépend fortement de la spécificité du terrain et du dénivelé. Ce n'est pas un indicateur de niveau.

## 10.2 Ce qui ne doit pas être mis dans Progression

```text
VFC
Sommeil
Stress
Énergie
Aptitude RuNSee
FC repos détaillée
Dette d'oxygène
Dérive cardiaque détaillée
Records
VDOT détaillé
Allures de référence
Charge ATL / CTL / TSB détaillée
```

Ces éléments appartiennent à Analyse ou Performance.

## 10.3 Risques d'interprétation

| Risque | Garde-fou |
|---|---|
| Croire que plus de volume = toujours mieux | Ajouter conseils de récupération et semaines allégées |
| Comparer période incomplète vs période complète | Mention obligatoire |
| Survaloriser la régularité | Message descriptif, pas prescriptif |
| Confondre randonnée et trail | Typage explicite |
| Double compter Garmin/Strava | Exclure merged et utiliser activité canonique |
| Confondre zéro et absence de donnée | États vides propres |

---

# 11. Sources scientifiques à documenter

À intégrer dans `docs/ux/SCIENTIFIC_NOTES_PROGRESSION.md` ou dans le glossaire si pertinent :

- charge d'entraînement et marqueurs de fatigue : revue Sports Medicine sur liens entre charge, fatigue, blessure / illness ;
- critiques et limites de l'ACWR / monotonie : à utiliser comme signaux descriptifs, pas prédictifs ;
- suivi trail : importance des variations de charge, monotonie et strain avant blessures dans des populations trail ;
- VFC : indicateur de récupération utile mais à conserver dans Analyse, pas Progression.

---

# 12. Composants recommandés

Renommer les composants pour éviter `YTD` :

```text
frontend/src/components/progression/ProgressionAnnualCumulativeTab.jsx
frontend/src/components/progression/ProgressionVolumeTab.jsx
frontend/src/components/progression/ProgressionRegularityTab.jsx
frontend/src/components/progression/ProgressionComparisonTab.jsx
frontend/src/components/progression/ProgressionInsightCard.jsx
frontend/src/components/progression/WeeklyVolumeMovingAverageChart.jsx
frontend/src/components/progression/AnnualCumulativeChart.jsx
frontend/src/components/progression/RegularityHeatmap.jsx
frontend/src/components/progression/PeriodComparisonCard.jsx
```

Nom interdit :

```text
ProgressionYearToDateTab.jsx
```

Sauf si uniquement maintenu temporairement en interne avec TODO de renommage, mais ne pas créer de nouveau composant avec ce nom.

---

# 13. Placeholders autorisés

Créer ou mettre à jour :

```text
docs/ux/PLACEHOLDERS_ALPINE_LIGHT.md
```

| Élément | Autorisé ? | Condition |
|---|---:|---|
| Objectif annuel | non | ne pas inventer |
| Projection annuelle | oui | uniquement si explicitement libellée projection |
| Dénivelé négatif | oui | si données non fiables, afficher données partielles |
| Charge descente | oui futur | placeholder explicite si non calculée |
| Composition route/trail | oui | si typage disponible |
| Comparaison N-1 | oui | si historique suffisant |
| Score régularité | oui | formule documentée obligatoire |
| Moyenne glissante | oui | fenêtre affichée explicitement |

---

# 14. États vides

Prévoir :

```text
pas assez d'historique
aucune activité sur la période
comparaison impossible
données D+ indisponibles
données sport/type insuffisantes
période courante incomplète
```

Exemples :

```text
Données insuffisantes pour comparer à N-1.
La période en cours est incomplète : lecture prudente.
Le dénivelé n'est pas disponible sur assez d'activités.
```

---

# 15. Non-régression

Vérifier :

```text
aucun placeholder global
4 onglets présents
Cumul annuel sans YTD
Volume / durée / D+ / séances affichés proprement
comparaisons fiables
états vides propres
pas de doublon avec Analyse
pas de doublon avec Performance
aucun double comptage Garmin/Strava
premier jour de semaine respecté
```

---

# 16. Checklist GO

- [ ] Route `/progression` fonctionnelle.
- [ ] Aucun placeholder global.
- [ ] 4 onglets présents.
- [ ] Cumul annuel sans `YTD`.
- [ ] Aucun composant nouvellement nommé `YearToDate`.
- [ ] Volume hebdo + moyenne glissante présents.
- [ ] Cumul annuel distance / temps / D+ présent.
- [ ] Régularité présente.
- [ ] Comparaisons fiables.
- [ ] États vides propres.
- [ ] Pas de doublon avec Analyse.
- [ ] Pas de doublon avec Performance.
- [ ] Placeholders inscrits.
- [ ] Tests/build exécutés.
- [ ] Quality gate rempli.
