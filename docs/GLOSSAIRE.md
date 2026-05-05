# GLOSSAIRE RuNSee — Indicateurs et terminologie

> Phase E2 — Vocabulaire canonique de RuNSee. Tous les composants, tooltips et copy doivent référencer ce document.
> Une entrée = un nom canonique. Les anciens termes sont listés en "Abréviation antérieure" pour traçabilité du renommage Phase J.

---

## Convention

Chaque entrée respecte le format :
- **Nom canonique FR**
- **Abréviation / nom interne code** (clé technique inchangée pour ne pas casser le code)
- **Unité**
- **Source** (Strava / Garmin / Calculé RuNSee)
- **Formule** (si calculé)
- **Référence scientifique** (si applicable)
- **Interprétation** (seuils, deltas)
- **Tooltip court** (≤ 80 caractères, format mobile)
- **Pages** (où l'indicateur apparaît)

---

## A — VFC (Variabilité de Fréquence Cardiaque)

- **Abréviation antérieure** : HRV
- **Clé code interne** : `hrvAvgMs` (inchangé)
- **Unité** : ms (millisecondes)
- **Source** : Garmin Connect — moyenne nocturne RMSSD
- **Formule** : moyenne des intervalles R-R nocturnes, transformation RMSSD
- **Référence** : Plews et al. (2013) *Sports Medicine* ; Buchheit (2014) *Front Physiol*
- **Interprétation** :
  - La valeur absolue dépend de l'individu (génétique, âge)
  - Compare-toi à ta baseline 28 j
  - Hausse > +5 % = bonne adaptation
  - Baisse > -8 % = vigilance (fatigue, stress, infection latente)
- **Tooltip court** : "Indicateur du système nerveux. Hausse = mieux récupéré."
- **Pages** : Dashboard, Performance, fiche Activity

---

## B — Score sommeil

- **Abréviation antérieure** : Sleep Score, sleepScore
- **Clé code interne** : `sleepScore`
- **Unité** : / 100
- **Source** : Garmin Connect (`dailySleepDTO.sleepScores.overall.value`)
- **Formule** : algorithme propriétaire Garmin combinant durée, phases (légère/profonde/REM), respiration, mouvements
- **Référence** : algorithme propriétaire (validé en interne par Garmin/Firstbeat)
- **Interprétation** :
  - < 50 : sommeil insuffisant
  - 50-70 : acceptable
  - 70-85 : bon
  - > 85 : excellent
- **Tooltip court** : "Qualité de la nuit selon Garmin (durée + phases + respiration)."
- **Pages** : Dashboard, Performance, Activity

---

## C — FC repos

- **Abréviation antérieure** : Resting HR, RestingHR, restingHr
- **Clé code interne** : `restingHr`
- **Unité** : bpm
- **Source** : Garmin Connect — FC minimale détectée pendant le sommeil
- **Formule** : FC minimale enregistrée durant la nuit (fenêtre 0h-6h)
- **Référence** : indicateur clinique standard
- **Interprétation** :
  - **Lower is better** : delta négatif vs baseline = bon signe
  - +5 % vs baseline sur 2 jours = vigilance (fatigue, début maladie, stress)
- **Tooltip court** : "FC mesurée pendant le sommeil. Plus basse = mieux récupéré."
- **Pages** : Dashboard, Performance, Activity

---

## D — Énergie (Body Battery Garmin)

- **Abréviation antérieure** : Body Battery
- **Clé code interne** : `bodyBatteryMorning`, `bodyBatteryEnd`
- **Unité** : %
- **Source** : Garmin Connect — algorithme Firstbeat
- **Formule** : algorithme propriétaire combinant sommeil, stress, activité (0 = vide / 100 = plein)
- **Référence** : algorithme propriétaire Firstbeat
- **Interprétation** :
  - < 30 au réveil : journée de régénération recommandée
  - 30-60 : vigilance sur l'intensité
  - > 60 : capacité à absorber une séance exigeante
- **Tooltip court** : "Énergie disponible selon Garmin (0 vide, 100 plein)."
- **Pages** : Dashboard, Performance, Activity

---

## E — Aptitude (Garmin Training Readiness)

- **Abréviation antérieure** : Training Readiness
- **Clé code interne** : `trainingReadinessScore`
- **Unité** : / 100
- **Source** : Garmin Connect — algorithme Firstbeat composite
- **Formule** : algorithme propriétaire combinant sommeil récent, VFC, charge récente, stress
- **Référence** : algorithme propriétaire (Firstbeat)
- **Note RuNSee** : RuNSee calcule également une "Aptitude RuNSee" maison (voir section AA) pour transparence.
- **Interprétation** :
  - 0-25 : faible — repos recommandé
  - 25-50 : limitée — endurance facile
  - 50-75 : modérée — séance modérée OK
  - 75-100 : haute — séance exigeante possible
- **Tooltip court** : "Aptitude du jour selon Garmin (sommeil + VFC + charge)."
- **Pages** : Dashboard

---

## F — Charge

- **Abréviation antérieure** : TRIMP, Load, Suffer Score, Charge cumulée
- **Clé code interne** : `loadValue` (inchangé)
- **Unité** : pts
- **Source** : Calculé RuNSee
- **Formule** : Banister TRIMP exponentiel à partir de durée, FC moyenne, FC max, FC repos. Fallback : sufferScore Strava puis proxy durée/distance/D+
- **Référence** : Banister (1991) ; Coggan adaptation TrainingPeaks (référence pratique)
- **Interprétation** (sur 7 j glissants) :
  - < 200 pts : bloc léger
  - 200-400 : bloc standard
  - 400-600 : bloc dense
  - > 600 : bloc très chargé à surveiller
- **Tooltip court** : "Effort cumulé sur la période (TRIMP Banister)."
- **Pages** : Dashboard, Analytics, Performance

---

## G — Base de fond

- **Abréviation antérieure** : CTL, Chronic Training Load, Socle
- **Clé code interne** : `ctl` (inchangé)
- **Unité** : pts
- **Source** : Calculé RuNSee
- **Formule** : moyenne pondérée exponentielle de la charge journalière sur 42 j (modèle Banister 1991 / Coggan TrainingPeaks)
- **Référence** : Banister (1991), Coggan
- **Interprétation** :
  - < 30 : découverte / reprise
  - 30-50 : pratique régulière
  - 50-80 : coureur confirmé
  - > 80 : préparation marathon avancée
  - Progression saine : +5 à +8 % par semaine
- **Tooltip court** : "Charge moyenne 42 jours (forme acquise)."
- **Pages** : Dashboard, Analytics

---

## H — Fatigue récente

- **Abréviation antérieure** : ATL, Acute Training Load, Stress
- **Clé code interne** : `atl` (inchangé)
- **Unité** : pts
- **Source** : Calculé RuNSee
- **Formule** : moyenne pondérée exponentielle de la charge journalière sur 7 j
- **Référence** : Banister (1991), Coggan
- **Interprétation** : reflète la charge à court terme, monte avant la base de fond après une semaine difficile
- **Tooltip court** : "Charge moyenne 7 jours (fatigue récente)."
- **Pages** : Dashboard, Analytics

---

## I — Fraîcheur

- **Abréviation antérieure** : TSB, Training Stress Balance, Form
- **Clé code interne** : `tsb` (inchangé)
- **Unité** : pts (différence Base de fond − Fatigue récente)
- **Source** : Calculé RuNSee
- **Formule** : `CTL - ATL`
- **Référence** : Banister (1991), Coggan
- **Interprétation** :
  - +25 : très fraîche, possible désentraînement si prolongé
  - +5 à +25 : optimum compétition
  - -10 à +5 : zone neutre, entraînement possible
  - -10 à -30 : surcompensation prévue, surveiller
  - < -30 : surcharge, repos recommandé
- **Tooltip court** : "Marge avant fatigue (positive = frais)."
- **Pages** : Dashboard, Analytics

---

## J — Allure ajustée

- **Abréviation antérieure** : GAP, Grade Adjusted Pace
- **Clé code interne** : `gapPaceSeconds` (à créer Phase H)
- **Unité** : min/km
- **Source** : Calculé RuNSee
- **Formule** : Minetti et al. (2002) — coût énergétique normalisé en fonction de la pente, allure ajustée comme si le terrain était plat
  - `C(i) = 155.4·i⁵ - 30.4·i⁴ - 43.3·i³ + 46.3·i² + 19.5·i + 3.6` (i = pente fraction)
  - `GAP = pace × C(0) / C(i)`
- **Référence** : Minetti, A. E. et al. (2002) *J Appl Physiol* — "Energy cost of walking and running at extreme uphill and downhill slopes"
- **Interprétation** : permet de comparer une séance vallonnée à une séance plate. Si GAP > allure brute, c'est que tu as couru en montée.
- **Tooltip court** : "Allure corrigée du dénivelé (équivalent terrain plat)."
- **Pages** : Activity Detail (header, splits)

---

## K — Dérive cardiaque

- **Abréviation antérieure** : Decoupling, Pa:Hr ratio
- **Clé code interne** : `cardiacDecoupling` (à créer Phase H)
- **Unité** : %
- **Source** : Calculé RuNSee
- **Formule** : `((pace_2nd_half / hr_2nd_half) / (pace_1st_half / hr_1st_half)) - 1`
  - 1ère et 2e moitié de séance comparées
- **Référence** : Allen & Coggan (2010) *Training and Racing with a Power Meter* ; Buchheit (2014) interprétation
- **Interprétation** :
  - < 2 % : excellent — endurance aérobie solide
  - 2-5 % : bon
  - 5-8 % : vigilance — fatigue ou intensité trop élevée
  - > 8 % : alerte — bloc trop intense, déshydratation possible
- **Tooltip court** : "Stabilité allure/FC. Bas = endurance solide."
- **Pages** : Activity Detail

---

## L — Dette d'oxygène

- **Abréviation antérieure** : EPOC
- **Clé code interne** : `epoc` (à exploiter depuis Garmin raw, Phase K)
- **Unité** : niveau qualitatif (Léger / Modéré / Élevé / Très élevé)
- **Source** : Garmin Connect (Firstbeat)
- **Formule** : algorithme Firstbeat, valeur brute en mL/kg masquée à l'utilisateur
- **Référence** : Børsheim & Bahr (2003) *Sports Medicine* (concept) ; Saalasti et al. (2007) (algorithme Firstbeat)
- **Interprétation** :
  - **Léger** (< 30 mL/kg) : récupération rapide attendue
  - **Modéré** (30-90) : récupération en quelques heures
  - **Élevé** (90-150) : récupération sur 24 h
  - **Très élevé** (> 150) : récupération > 36 h
- **Tooltip court** : "Intensité de la récupération à venir après cette séance."
- **Pages** : Activity Detail (Phase K)

---

## M — Vitesse critique (CS)

- **Abréviation antérieure** : Critical Speed, CS
- **Clé code interne** : `criticalSpeed` (existant)
- **Unité** : m/s ou min/km
- **Source** : Calculé RuNSee
- **Formule** : modèle 2-paramètres CS-D' de Jones et al. (régression sur efforts maximaux 3-20 min)
- **Référence** : Jones et al. (2010) *Med Sci Sports Exerc* — "Critical power: implications for determination of VO₂max and exercise tolerance"
- **Interprétation** : seuil aérobie au-delà duquel la fatigue s'accumule rapidement. Indicateur d'endurance pure.
- **Tooltip court** : "Allure seuil aérobie soutenable (modèle CS-D')."
- **Pages** : Performance, Analytics

---

## N — Distance critique (D')

- **Abréviation antérieure** : D', W' équivalent
- **Clé code interne** : `criticalDistance`
- **Unité** : m
- **Source** : Calculé RuNSee
- **Formule** : 2e paramètre du modèle CS-D' (Jones)
- **Référence** : Jones et al. (2010)
- **Interprétation** : "réserve" disponible au-delà de la vitesse critique avant épuisement
- **Tooltip court** : "Réserve d'effort au-dessus de la vitesse critique."
- **Pages** : Performance

---

## O — Monotonie (Foster)

- **Abréviation antérieure** : Foster monotony
- **Clé code interne** : `monotony` (existant)
- **Unité** : ratio sans unité
- **Source** : Calculé RuNSee
- **Formule** : `charge_moyenne_quotidienne_7j / écart_type_quotidien_7j`
- **Référence** : Foster et al. (1998) *Med Sci Sports Exerc*
- **Interprétation** :
  - < 1.5 : variation saine
  - 1.5-2.2 : modérée
  - > 2.2 : risque de surentraînement (charge concentrée sur jours similaires)
- **Tooltip court** : "Concentration de la charge sur la semaine. Bas = varié."
- **Pages** : Analytics

---

## P — Strain (Foster)

- **Abréviation antérieure** : Foster strain
- **Clé code interne** : `strain`
- **Unité** : pts × ratio
- **Source** : Calculé RuNSee
- **Formule** : `charge_hebdo_7j × monotony`
- **Référence** : Foster et al. (1998)
- **Interprétation** : indicateur de stress global. > 6000 = vigilance, > 8000 = alerte
- **Tooltip court** : "Stress global de la semaine (charge × monotonie)."
- **Pages** : Analytics

---

## Q — Polarisation

- **Abréviation antérieure** : Polarization, Pyramid, Threshold
- **Clé code interne** : `polarizationProfile`
- **Unité** : ratios %
- **Source** : Calculé RuNSee
- **Formule** : répartition par zones FC : Z1+Z2 (basse) / Z3 (modérée) / Z4+Z5 (haute)
- **Référence** : Seiler (2010) *Sportscience*
- **Interprétation** :
  - **Polarisée** : ~80 % bas, ~5 % modéré, ~15 % haut — modèle élite endurance
  - **Pyramidale** : décroissante (haut < modéré < bas)
  - **Seuil** : trop de modéré (Z3 > 25 %)
- **Tooltip court** : "Répartition des intensités sur la semaine."
- **Pages** : Analytics

---

## R — VO2max

- **Abréviation antérieure** : VO2max
- **Clé code interne** : `vo2max`
- **Unité** : mL/kg/min
- **Source** : Garmin Connect (estimation Firstbeat) ou calculé via VDOT (Daniels)
- **Formule** : algorithme Firstbeat (Garmin) ou table Daniels (record route)
- **Référence** : Daniels (2014) *Daniels' Running Formula* ; Saalasti et al. (2007) Firstbeat
- **Interprétation** :
  - 30-40 : sédentaire
  - 40-50 : amateur
  - 50-60 : amateur entraîné
  - 60-70 : compétiteur
  - > 70 : élite
- **Tooltip court** : "Capacité aérobie maximale (mL O₂ / kg / min)."
- **Pages** : Performance, Activity Detail

---

## S — VDOT

- **Abréviation antérieure** : VDOT, Daniels VDOT
- **Clé code interne** : `vdot`
- **Unité** : score Daniels (table)
- **Source** : Calculé RuNSee à partir des records route
- **Formule** : Daniels' Running Formula — table d'équivalence performance ↔ VDOT ↔ allures d'entraînement
- **Référence** : Daniels (2014)
- **Interprétation** : équivalent VO2max corrigé par l'efficacité de course. Permet de calibrer les zones d'allure (E, M, T, I, R).
- **Tooltip court** : "Profil de performance (Daniels' Running Formula)."
- **Pages** : Performance

---

## T — Stress moyen

- **Abréviation antérieure** : stressAvg
- **Clé code interne** : `stressAvg`
- **Unité** : / 100
- **Source** : Garmin Connect
- **Formule** : algorithme Firstbeat sur réactions cardiaques sur la journée
- **Référence** : algorithme propriétaire Firstbeat
- **Interprétation** :
  - 0-25 : repos profond
  - 25-50 : repos
  - 50-75 : moyen / actif
  - 75-100 : haut stress
- **Tooltip court** : "Niveau de stress moyen sur la journée."
- **Pages** : Dashboard, Activity

---

## U — Couverture des données

- **Abréviation antérieure** : dataQuality
- **Clé code interne** : `dataQuality`
- **Unité** : qualitatif (Complète / Partielle / Absente)
- **Source** : RuNSee (qualité de la collecte Garmin du jour)
- **Formule** : compte des sources disponibles parmi {sommeil, VFC, FC repos, body battery, stress}
- **Interprétation** :
  - **Complète** : 5 sources / 5 → snapshot fiable
  - **Partielle** : 1-4 sources → snapshot indicatif
  - **Absente** : 0 source → pas de snapshot
- **Tooltip court** : "Indique si toutes les sources Garmin sont remontées ce jour."
- **Pages** : Dashboard (badge confiance), Activity (mention discrète)

---

## V — Confiance (méta-indicateur)

- **Abréviation antérieure** : Confidence
- **Clé code interne** : `confidence`
- **Unité** : qualitatif (Haute / Moyenne / Faible)
- **Source** : Calculé RuNSee
- **Formule** : combine taille de l'échantillon et cohérence des signaux
- **Interprétation** : si Confiance Faible, ne pas surinterpréter le verdict / les patterns
- **Tooltip court** : "Fiabilité de la lecture (taille échantillon, cohérence)."
- **Pages** : Dashboard, Performance

---

## W — Aptitude RuNSee (Readiness)

- **Abréviation antérieure** : (nouveau, Phase F2)
- **Clé code interne** : `runseeReadinessScore` (à créer Phase F2)
- **Unité** : / 100
- **Source** : Calculé RuNSee (formule transparente, alternative au Training Readiness Garmin)
- **Formule** :
  - Score sommeil (poids 0.30, normalisé / 100)
  - Delta VFC vs baseline (poids 0.30)
  - Delta FC repos vs baseline (poids 0.20, inversé)
  - Stress journalier (poids 0.10, inversé)
  - Body Battery matin (poids 0.10)
  - Pondération réduite si données partielles
- **Référence** : Plews et al. (2013), Buchheit (2014), Le Meur et al. (2013) *Med Sci Sports Exerc*
- **Interprétation** : même barème que l'Aptitude Garmin (0-25 / 25-50 / 50-75 / 75-100)
- **Tooltip court** : "Aptitude du jour selon RuNSee (calcul transparent)."
- **Pages** : Dashboard

---

## X — Volume hebdomadaire

- **Clé code interne** : `weeklyVolume`
- **Unité** : km
- **Source** : Calculé Strava
- **Formule** : somme des distances sur les 7 jours glissants
- **Tooltip court** : "Distance cumulée sur les 7 derniers jours."
- **Pages** : Dashboard, Analytics

---

## Y — Régularité

- **Clé code interne** : `regularitySummary`
- **Unité** : nb séances + écart-type
- **Source** : Calculé RuNSee
- **Formule** : nombre de séances / écart-type des distances quotidiennes sur 4 semaines
- **Tooltip court** : "Constance de l'entraînement sur 4 semaines."
- **Pages** : Dashboard

---

## Z — Score effort perçu (RPE)

- **Abréviation antérieure** : RPE, sRPE
- **Clé code interne** : `rpe`
- **Unité** : / 10
- **Source** : Saisie utilisateur
- **Formule** : échelle CR-10 de Borg (1982)
- **Référence** : Borg (1982) ; Foster et al. (2001) *J Strength Cond Res* (sRPE = RPE × durée minutes)
- **Interprétation** :
  - 1-3 : très facile
  - 4-6 : modéré
  - 7-8 : difficile
  - 9-10 : maximal
- **Tooltip court** : "Effort ressenti sur l'échelle 0-10."
- **Pages** : Activity Detail

---

## Total entrées : **26** (objectif Phase E2 atteint : ≥ 21)

---

## Mapping ancien → nouveau (Phase J)

| Ancien terme code/UI | Terme canonique RuNSee | Pages impactées |
|---|---|---|
| HRV, hrv, HRV moy. | **VFC** | Recovery cards, Garmin enrichment, Performance physio |
| Body Battery | **Énergie** | Recovery cards, Garmin enrichment |
| Training Readiness | **Aptitude (Garmin)** | Decision summary |
| (nouveau) | **Aptitude RuNSee** | Phase F2 — jauge readiness |
| TRIMP / Suffer Score / Charge cumulée | **Charge** | Load chart, KpiGrid, narratives |
| CTL / Chronic Training Load | **Base de fond** | Load chart, KpiGrid |
| ATL / Acute Training Load | **Fatigue récente** | Load chart, KpiGrid |
| TSB / Form | **Fraîcheur** | Load chart, KpiGrid |
| GAP / Grade Adjusted Pace | **Allure ajustée** | Activity header, splits |
| Decoupling / Pa:Hr | **Dérive cardiaque** | Activity performance strip |
| EPOC | **Dette d'oxygène** | Activity Garmin tab |
| Sleep Score | **Score sommeil** | Recovery cards |
| Resting HR / RestingHR | **FC repos** | Recovery cards |
| stressAvg | **Stress moyen** | Recovery cards |
| dataQuality | **Couverture des données** | Tooltips uniquement |

**Total mappings : 15** (objectif ≥ 15 atteint).

---

## Convention de tooltip mobile (Phase J)

Toutes les infobulles RuNSee respectent désormais le format **compact** (≤ 80 caractères). Pour chaque indicateur, l'utilisateur peut accéder à la définition complète via un lien `<GlossaryLink>` qui mène à `/glossaire#ancre-de-l-indicateur`.

Format affiché en mobile :
```
┌────────────────────────────────────┐
│ VFC : Indicateur du système        │
│ nerveux. Hausse = mieux récupéré.  │
│                                    │
│ [Voir définition complète →]       │
└────────────────────────────────────┘
```

Le bouton ferme la popover et ouvre la page glossaire au bon ancrage.
