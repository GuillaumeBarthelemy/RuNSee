// Glossaire RunNSee : definitions vulgarisees + references scientifiques.
// Affiche dans le composant GlossaryModal et accessible depuis la barre superieure.
// Chaque entree est volontairement courte et orientee athlete (tutoiement).

export const GLOSSARY_ENTRIES = [
  {
    key: "trimp",
    term: "TRIMP",
    aliases: ["Training Impulse", "Charge Banister"],
    category: "Charge",
    short: "Charge d'entrainement calculee a partir de ta FC, de la duree et de ta zone d'effort.",
    definition:
      "Le TRIMP (TRaining IMPulse) traduit en un seul nombre l'effort cumule d'une seance a partir de la duree, de la FC moyenne, de ta FC max et de ta FC repos. Plus l'effort est long ou intense, plus le TRIMP est haut. C'est la base que RunNSee utilise pour calculer ta charge journaliere, puis ton CTL et ton ATL.",
    formula:
      "TRIMP = duree (min) × HRratio × k.a × exp(k.b × HRratio), avec HRratio = (FCmoyenne - FCrepos) / (FCmax - FCrepos) et k = 0,64 / 1,92 (homme) ou 0,86 / 1,67 (femme).",
    reference: "Banister EW, Calvert TW (1980) ; Banister (1991), Modeling elite athletic performance.",
  },
  {
    key: "ctl",
    term: "CTL",
    aliases: ["Chronic Training Load", "Base de charge"],
    category: "Charge",
    short: "Ta base de fond, lissage exponentiel de ta charge sur 42 jours.",
    definition:
      "Le CTL (Chronic Training Load) represente ta base d'entrainement long terme. C'est une moyenne ponderee exponentielle de ta charge journaliere sur 42 jours : les jours recents pesent plus, les anciens pesent moins. Plus ton CTL est haut, plus ta capacite a encaisser un bloc dur est solide.",
    reference: "Coggan & Allen (2019), Training and Racing with a Power Meter ; TrainingPeaks Performance Management Chart.",
    thresholds: "< 30 = decouverte. 30-50 = pratique reguliere. 50-80 = bloc specifique confirme. > 80 = preparation marathon avancee.",
  },
  {
    key: "atl",
    term: "ATL",
    aliases: ["Acute Training Load", "Pression recente"],
    category: "Charge",
    short: "Ta fatigue recente, lissage exponentiel sur 7 jours.",
    definition:
      "L'ATL (Acute Training Load) reflete la pression de charge tres recente. C'est le pendant court terme du CTL : moyenne exponentielle sur 7 jours. Quand ton ATL passe au-dessus de ton CTL, tu accumules de la fatigue ; quand il descend en dessous, tu absorbes.",
    reference: "Coggan & Allen (2019).",
    thresholds: "ATL < CTL = bloc en lissage. ATL ~ CTL = rythme de croisiere. ATL > CTL × 1,3 = surcharge aigue.",
  },
  {
    key: "tsb",
    term: "TSB",
    aliases: ["Training Stress Balance", "Forme", "Fraicheur"],
    category: "Charge",
    short: "Ta fraicheur relative : ecart entre ta base de fond et ta fatigue recente.",
    definition:
      "Le TSB (Training Stress Balance) correspond simplement a CTL - ATL. Quand il est positif, ta base recente domine la fatigue : tu es frais. Quand il est negatif, la pression recente prend le dessus : tu es fatigue. Pour une course objectif, tu vises un TSB entre +10 et +25 le jour J.",
    reference: "Coggan & Allen (2019) ; Mujika (2010) sur le tapering.",
    thresholds: "> +25 = tres frais. +5 a +25 = forme positive. -10 a +5 = neutre. < -30 = surcharge probable.",
  },
  {
    key: "monotony",
    term: "Monotonie (Foster)",
    aliases: ["Monotonie", "Foster monotony"],
    category: "Variabilite",
    short: "Mesure de la variabilite de ta charge sur 7 jours.",
    definition:
      "Indicateur Foster qui mesure si tes journees d'entrainement se ressemblent. Calcul : moyenne / ecart-type des charges journalieres sur 7 jours. Une valeur basse signale une bonne alternance entre jours faciles et denses ; une valeur haute signale une routine repetitive et un risque d'accumulation grise.",
    reference: "Foster (1998), Monitoring training in athletes with reference to overtraining syndrome.",
    thresholds: "< 1,5 = bonne variabilite. 1,5-2,0 = correct sans plus. > 2,0 = monotone, vigilance.",
  },
  {
    key: "strain",
    term: "Strain (Foster)",
    aliases: ["Charge totale ponderee"],
    category: "Variabilite",
    short: "Combinaison du volume et de la monotonie sur 7 jours.",
    definition:
      "Strain = charge 7 jours × monotonie. Combine le volume cumule et la repetitivite. Un strain eleve signale un bloc dense ET monotone, ce qui est le profil le plus a risque d'accumulation de fatigue.",
    reference: "Foster (1998).",
    thresholds: "< 600 = leger. 600-1500 = modere. 1500-3000 = eleve. > 3000 = signal d'absorption necessaire.",
  },
  {
    key: "polarization",
    term: "Polarisation (Seiler)",
    aliases: ["Polarized training", "Distribution polarisee"],
    category: "Distribution",
    short: "Modele de distribution des intensites privilegiant le facile et l'intense.",
    definition:
      "Modele d'entrainement popularise par Seiler : viser environ 80 % de temps en zones faciles (Z1-Z2), tres peu en zone tempo / seuil (Z3, < 10 %), et 10 a 20 % en zones intenses (Z4-Z5). Ce modele est associe aux meilleures progressions chez les coureurs d'endurance.",
    reference: "Seiler (2010), What is Best Practice for Training Intensity and Duration Distribution in Endurance Athletes ?",
    thresholds: "Polarise = > 75 % facile + < 10 % tempo. Pyramidal = facile + plus de tempo que d'intense. Seuil = part importante en tempo.",
  },
  {
    key: "criticalSpeed",
    term: "Vitesse critique (CS)",
    aliases: ["Critical Speed", "CS"],
    category: "Performance",
    short: "Allure soutenable de l'ordre de 30 a 60 minutes, repere de seuil aerobie haut.",
    definition:
      "Modele Monod & Scherrer (1965) adapte a la course par Jones (2019). La CS est l'asymptote de la relation distance / temps sur tes meilleurs efforts (typiquement 5 km, 10 km, semi). Elle approche ton seuil lactique 2 et est utile pour calibrer tes seances tempo et seuil.",
    reference: "Monod & Scherrer (1965) ; Jones et al. (2019), Critical Power: An Important Fatigue Threshold.",
    thresholds: "12-13 km/h = loisir confirme. 14-15 km/h = competiteur amateur (~3h30 marathon). 16-17 km/h = regional avance. 18+ km/h = elite.",
  },
  {
    key: "vdot",
    term: "VDOT (Daniels)",
    aliases: ["VDOT", "VO2max equivalent Daniels"],
    category: "Performance",
    short: "Indice de performance Daniels equivalent a ton VO2max.",
    definition:
      "Indice cree par Jack Daniels qui traduit une performance recente (5 km, 10 km, semi, marathon) en un score VDOT equivalent au VO2max ml/kg/min. Le VDOT permet ensuite de deriver tes 5 allures cibles d'entrainement (Easy, Marathon, Threshold, Interval, Repetition).",
    reference: "Daniels' Running Formula (4e ed., 2022).",
    thresholds: "30-40 = debutant. 40-50 = amateur regulier. 50-60 = competiteur amateur confirme. 60-70 = niveau regional. 70+ = niveau national / international.",
  },
  {
    key: "gap",
    term: "GAP (Grade Adjusted Pace)",
    aliases: ["Allure ajustee a la pente", "GAP"],
    category: "Performance",
    short: "Ton allure equivalente sur le plat compte tenu de la pente reelle.",
    definition:
      "Le GAP traduit l'allure reelle en allure equivalente sur le plat en tenant compte du cout energetique de la pente. RunNSee utilise le modele de Minetti (2002) : courir a +10 % en montee coute environ 1,7 fois plus d'energie qu'a plat. Sans GAP, comparer une sortie vallonnee a une sortie plate est trompeur.",
    reference: "Minetti et al. (2002), Energy cost of walking and running at extreme uphill and downhill slopes.",
  },
  {
    key: "aerobicDecoupling",
    term: "Derive cardiaque",
    aliases: ["Aerobic decoupling", "Cardiac drift"],
    category: "Intra-seance",
    short: "Pourcentage d'augmentation du ratio FC / allure entre la 1re et la 2e moitie d'une sortie.",
    definition:
      "Sur une sortie longue en endurance fondamentale, on attend que ta FC reste stable pour une allure stable. Si ta FC monte alors que l'allure baisse, c'est de la derive cardiaque. Une derive < 5 % = base aerobie solide. Au-dela, soit la sortie etait trop longue pour ton niveau, soit la nutrition ou la chaleur ont compte.",
    reference: "Joe Friel, The Triathlete's Training Bible ; trainingpeaks.com/blog/how-to-test-your-aerobic-fitness.",
    thresholds: "< 3 % = excellente base aerobie. 3-5 % = base correcte. 5-8 % = base limite, sortie un peu trop longue ou conditions difficiles. > 8 % = base aerobie a renforcer.",
  },
  {
    key: "sufferScore",
    term: "Suffer Score",
    aliases: ["Strava Relative Effort"],
    category: "Charge",
    short: "Score proprietaire Strava base sur le temps passe en zones FC.",
    definition:
      "Score calcule par Strava a partir du temps passe dans chaque zone de FC, avec une ponderation exponentielle des zones hautes. Pratique mais opaque (pondication non publique) et incomparable d'un athlete a l'autre. RunNSee l'utilise uniquement en repli quand le TRIMP n'est pas calculable.",
    reference: "Strava documentation : strava.com/relative-effort.",
  },
  {
    key: "acwr",
    term: "ACWR",
    aliases: ["Acute:Chronic Workload Ratio", "Ratio aigu/chronique"],
    category: "Charge",
    short: "Ratio entre ta charge aigue (7 j) et ta charge chronique (28-42 j).",
    definition:
      "Indicateur descriptif de l'ecart entre pression recente et base de fond. Popularise par Gabbett (2016) avec une zone 'sweet spot' 0,8-1,3, mais son caractere predictif de blessure a ete remis en cause par Impellizzeri (2020). RunNSee l'affiche comme repere de pression d'entrainement, sans pretention de prediction.",
    reference: "Gabbett (2016) ; Impellizzeri et al. (2020), Acute:Chronic Workload Ratio: Conceptual Issues and Fundamental Pitfalls.",
    thresholds: "< 0,8 = decharge ou reprise. 0,8-1,3 = zone equilibree. > 1,5 = montee de charge a surveiller.",
  },
  {
    key: "rpe",
    term: "RPE",
    aliases: ["Rating of Perceived Exertion", "Effort percu"],
    category: "Subjectif",
    short: "Effort percu sur l'echelle de Borg modifiee (1-10).",
    definition:
      "Echelle subjective d'effort : 1 = tres facile, 5 = soutenu, 10 = effort maximal. Multiplie par la duree, donne le sRPE (session-RPE) qui est une charge alternative quand la cardio n'est pas disponible. Pas encore saisi dans RunNSee mais prevu.",
    reference: "Borg (1982) ; Foster et al. (2001), A new approach to monitoring exercise training.",
  },
];

export const GLOSSARY_CATEGORIES = ["Charge", "Variabilite", "Distribution", "Performance", "Intra-seance", "Subjectif"];
