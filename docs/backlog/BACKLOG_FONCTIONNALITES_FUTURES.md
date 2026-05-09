# RunNSee — Backlog fonctionnalités futures

Ce document liste les fonctionnalités validées comme **dettes** lors des chantiers UX/UI. Elles sont **placeholders désactivables** dans la version courante et seront implémentées dans un cycle ultérieur dédié.

Tenu à jour à chaque chantier qui identifie une dette.

---

## 1. Météo (Lot 2-bis Alpine Light)

| Champ | Valeur |
|---|---|
| Statut | Placeholder désactivable |
| Apparu en | Lot 2-bis (refonte topbar Alpine Light) |
| Description | La topbar du mockup affiche météo + vent (ex: "12°C Ciel dégagé · Vent 8 km/h") à droite de la barre de page |
| Implémentation actuelle | Composant `WeatherBadge` désactivé par défaut via flag interne. Si activé, affiche un placeholder statique "—°C —" |
| Décision | Pas de service météo câblé tant que le besoin n'est pas validé en production |
| Dépendances futures | API externe à choisir (OpenWeather, MeteoFrance), localisation de l'athlète, gestion cache |
| Estimation | 4-6 h pour câblage complet (backend + endpoint + cache + refresh policy) |
| Validation | Le `WeatherBadge` est masqué en navigation tant que le backend n'est pas câblé |

## 2. Sortie suggérée (Lot 3-bis Alpine Light)

| Champ | Valeur |
|---|---|
| Statut | Placeholder désactivable |
| Apparu en | Lot 3-bis (page Aujourd'hui) |
| Description | Le mockup montre une carte "Sortie suggérée" sur la page Aujourd'hui avec type ("Sortie Endurance"), zone FC, distance cible, durée cible, dénivelé cible, et bouton "Voir le détail" |
| Implémentation actuelle | Composant `SuggestedWorkoutCard` qui affiche un placeholder statique générique "Sortie endurance fondamentale, Zone 2" calculé à partir du verdict du jour, sans personnalisation profonde |
| Décision | Pas d'algorithme de génération de séance personnalisée. Affichage cohérent avec le verdict. |
| Dépendances futures | Algorithme de planification basé sur charge récente, allures de référence VDOT, objectif actif, plan d'entraînement utilisateur, contexte trail |
| Référence scientifique | Daniels Running Formula (zones d'allure E/M/T/I/R), Coggan zones FC, prudence : ne pas sur-prescrire |
| Estimation | 8-12 h pour algorithme prudent (génération + UI personnalisée + tests) |
| Validation | Tant que la carte est placeholder, ne pas en faire un canal prescriptif. Préfixer la séance par "Suggestion : ..." pour bien marquer le caractère indicatif |

## 3. Disponibilité (Lot 3-bis Alpine Light)

| Champ | Valeur |
|---|---|
| Statut | Calculée mais à valider scientifiquement |
| Apparu en | Lot 3-bis (page Aujourd'hui, KPI "Disponibilité") |
| Description | KPI synthétique "es-tu disponible pour une séance exigeante aujourd'hui ?" complémentaire de "Récupération" (état physiologique) |
| Implémentation prévue | Score composite : `Disponibilité = α * AptitudeRunNSee + β * (TSB normalisé)` avec :
- AptitudeRunNSee 0-100 (déjà calculée par `recoveryViewModel.readiness.score`, formule Plews+Buchheit+Le Meur)
- TSB (Training Stress Balance) normalisé : optimum +5 à +25, pénalisé en surfatigue ou désentraînement
- α=0.6, β=0.4 (pondération à valider) |
| Référence scientifique | Banister 1991 (TSB), Plews et al. 2013 (HRV), Coggan-Allen 2019 (TrainingPeaks PMC) |
| Décision | À valider par revue scientifique avant déploiement comme indicateur autonome. Tant que pas validé : afficher comme "Disponibilité (estimation)" avec tooltip prudent |
| Estimation | 2 h pour formule + tests + tooltip pédagogique |

## 4. Page Progression (Lot 7)

| Champ | Valeur |
|---|---|
| Statut | Route à créer |
| Apparu en | Lot 2-bis (menu sidebar inclut Progression alors que la route n'existe pas encore) |
| Description | Nouvelle vue principale "Progression" avec 4 sous-onglets : Cumul annuel / Évolution depuis le début de l'année / Comparaisons / Tendances long terme |
| Décision | Le menu sidebar doit afficher l'entrée Progression dès Lot 2-bis (cible de navigation). La page elle-même est créée en Lot 7. En attendant, click sur Progression doit afficher un EmptyState "Page en construction" plutôt qu'une 404 |
| Dépendances | Reprend les graphiques historiques RunNSee : volume hebdomadaire, moyenne glissante, cumul annuel, comparaison N-1, volume mensuel, régularité |

## 5. Algorithme conseil du jour (Lot 2-bis et 3-bis)

| Champ | Valeur |
|---|---|
| Statut | Reformulation simple du verdict |
| Apparu en | Lot 2-bis (sidebar AdviceCard) et Lot 3-bis (CoachAdviceBar bas de page) |
| Description | Conseil du jour court (1-2 phrases) basé sur verdict + recommandation + vigilance |
| Implémentation actuelle | Reformulation de `dashboardDecisionModel.recommendation.label` ou `insight`, sans LLM ni génération profonde |
| Évolution future possible | Génération coach personnalisée tenant compte de l'historique, de l'objectif, du plan d'entraînement |
| Validation | Tant que la formulation reste descriptive (pas prescriptive), pas de risque |

---

## Convention

- Les fonctionnalités placeholder sont **opérationnelles visuellement** mais ne consomment pas de service externe ni d'algorithme complexe.
- Chaque dette a une **estimation effort** et une **référence scientifique** quand pertinent.
- Une dette est levée par un chantier dédié + validation utilisateur + Quality Gate complet.
