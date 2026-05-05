// Glossaire RunNSee : definitions vulgarisees + references scientifiques.
// Affiche dans la page /glossaire et accessible depuis la barre superieure.
// Chaque entree est volontairement courte et orientee athlete (tutoiement).
//
// Convention :
// - `key` : clé technique stable (utilisée par GlossaryLink, ancres URL #key)
// - `term` : nom canonique français (UX_AUDIT.md / GLOSSAIRE.md)
// - `aliases` : anciens termes / abréviations / équivalents anglais
// - `category` : groupe de classement
// - `short` : description courte pour tooltip compact (≤ 80 caractères de préférence)
// - `definition` : explication complète pour la page glossaire
// - `formula`, `thresholds`, `reference` : optionnels selon pertinence

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
      "Echelle subjective d'effort : 1 = tres facile, 5 = soutenu, 10 = effort maximal. Multiplie par la duree, donne le sRPE (session-RPE) qui est une charge alternative quand la cardio n'est pas disponible.",
    reference: "Borg (1982) ; Foster et al. (2001), A new approach to monitoring exercise training.",
  },

  // --- Recuperation Garmin ----------------------------------------------------

  {
    key: "vfc",
    term: "VFC",
    aliases: ["HRV", "Variabilite de Frequence Cardiaque", "Heart Rate Variability"],
    category: "Recuperation",
    short: "Indicateur du systeme nerveux. Hausse vs ta baseline = mieux recupere.",
    definition:
      "La VFC (Variabilite de Frequence Cardiaque, RMSSD) mesure la variation des intervalles entre tes battements pendant la nuit. Plus elle est haute par rapport a TA baseline, plus le systeme parasympathique domine et plus tu es recupere. La valeur absolue depend de ton age et de ta genetique : ce qui compte c'est la tendance vs ta baseline 28 jours, pas la valeur d'un coureur a un autre.",
    reference: "Plews et al. (2013), Sports Medicine ; Buchheit (2014), Frontiers in Physiology.",
    thresholds: "Hausse > +5 % vs baseline = bonne adaptation. Stable = neutre. Baisse > -8 % = vigilance (fatigue, stress, infection latente).",
  },
  {
    key: "sleepScore",
    term: "Score sommeil",
    aliases: ["Sleep Score", "Score de sommeil Garmin"],
    category: "Recuperation",
    short: "Qualite de ta nuit selon Garmin (duree + phases + respiration).",
    definition:
      "Score Garmin de 0 a 100 calcule par l'algorithme Firstbeat a partir de la duree de sommeil, des phases (legere, profonde, REM), de la respiration et des mouvements nocturnes. C'est l'indicateur que tu vois dans l'app Garmin Connect.",
    reference: "Algorithme proprietaire Garmin / Firstbeat.",
    thresholds: "< 50 = sommeil insuffisant. 50-70 = acceptable. 70-85 = bon. > 85 = excellent.",
  },
  {
    key: "restingHr",
    term: "FC repos",
    aliases: ["Resting Heart Rate", "RHR"],
    category: "Recuperation",
    short: "FC mesuree pendant le sommeil. Plus basse = mieux recupere.",
    definition:
      "Frequence cardiaque minimale enregistree pendant ta nuit (typiquement avant 4h). C'est un indicateur ancien mais robuste : une FC repos qui monte de 5+ bpm sur 2 jours peut signaler fatigue, stress, debut de maladie ou dette de sommeil. Une baisse progressive sur plusieurs semaines = base aerobie qui se renforce.",
    reference: "Indicateur clinique standard ; Buchheit (2014) pour l'usage entrainement.",
    thresholds: "Vise une stabilite +-2 bpm vs ta baseline. +5 bpm sur 2 jours = vigilance. -3 bpm progressif = adaptation aerobie.",
  },
  {
    key: "energyLevel",
    term: "Energie",
    aliases: ["Body Battery", "Niveau d'energie"],
    category: "Recuperation",
    short: "Energie disponible selon Garmin (0 = vide, 100 = plein).",
    definition:
      "Score Garmin 0-100 calcule par l'algorithme Firstbeat qui combine ton sommeil, ton stress et ton activite. A regarder le matin au reveil : il indique la capacite de la journee a venir.",
    reference: "Algorithme proprietaire Garmin / Firstbeat (Saalasti et al. 2007 partiellement publie).",
    thresholds: "< 30 au reveil = journee de regeneration. 30-60 = vigilance sur l'intensite. > 60 = capacite a absorber une seance exigeante.",
  },
  {
    key: "trainingReadinessGarmin",
    term: "Aptitude (Garmin)",
    aliases: ["Training Readiness", "Aptitude a l'entrainement"],
    category: "Recuperation",
    short: "Aptitude du jour selon Garmin (sommeil + VFC + charge).",
    definition:
      "Score 0-100 calcule par Garmin / Firstbeat qui combine sommeil recent, VFC nocturne, charge des jours precedents et stress. Indique ta capacite a absorber une seance exigeante aujourd'hui. RunNSee affiche cette valeur lorsque Garmin la fournit, mais calcule egalement une Aptitude RunSee (recommandation transparente avec formule publique).",
    reference: "Algorithme proprietaire Garmin / Firstbeat.",
    thresholds: "0-25 = faible (repos recommande). 25-50 = limitee (endurance facile). 50-75 = moderee (seance modere OK). 75-100 = haute (seance exigeante possible).",
  },
  {
    key: "trainingReadinessRunsee",
    term: "Aptitude RunSee",
    aliases: ["Readiness RunSee"],
    category: "Recuperation",
    short: "Aptitude du jour calculee par RunSee, formule publique transparente.",
    definition:
      "Score 0-100 calcule par RunSee combinant : score sommeil (poids 0.30), delta VFC vs baseline (0.30), delta FC repos vs baseline inverse (0.20), stress journalier inverse (0.10), Energie du matin (0.10). Pondere a la baisse en cas de donnees partielles. Difference avec l'Aptitude Garmin : tu peux retracer comment chaque entree a influence le score.",
    reference: "Plews et al. (2013) ; Buchheit (2014) ; Le Meur et al. (2013), Med Sci Sports Exerc.",
    thresholds: "Meme baremes que l'Aptitude Garmin (0-25 / 25-50 / 50-75 / 75-100).",
  },
  {
    key: "stressAvg",
    term: "Stress moyen",
    aliases: ["Niveau de stress journalier"],
    category: "Recuperation",
    short: "Stress moyen sur la journee selon Garmin (0-100).",
    definition:
      "Score Garmin / Firstbeat calcule a partir de la VFC en continu sur la journee. Reflete l'activation du systeme nerveux sympathique. Different du stress psychologique : un effort sportif fait monter ce score, c'est normal.",
    reference: "Algorithme proprietaire Firstbeat.",
    thresholds: "0-25 = repos profond. 25-50 = repos. 50-75 = activite / stress moyen. 75-100 = haut stress.",
  },
  {
    key: "epoc",
    term: "Dette d'oxygene",
    aliases: ["EPOC", "Excess Post-exercise Oxygen Consumption"],
    category: "Intra-seance",
    short: "Intensite de la recuperation a venir apres cette seance.",
    definition:
      "L'EPOC est la consommation d'oxygene supplementaire que ton corps utilise apres l'effort pour retrouver son etat de repos (reconstitution glycogene, reparation tissulaire, regulation hormonale). Garmin le quantifie en mL/kg, RunSee le presente en niveau qualitatif (Leger / Modere / Eleve / Tres eleve) car la valeur brute n'est pas intuitive.",
    reference: "Borsheim & Bahr (2003), Sports Medicine ; algorithme Firstbeat (Saalasti et al. 2007).",
    thresholds: "Leger (< 30 mL/kg) = recuperation rapide. Modere (30-90) = recuperation en quelques heures. Eleve (90-150) = 24 h. Tres eleve (> 150) = > 36 h.",
  },

  // --- Performance complementaires ------------------------------------------

  {
    key: "criticalDistance",
    term: "Distance critique (D')",
    aliases: ["D prime", "W prime", "Anaerobic capacity"],
    category: "Performance",
    short: "Reserve d'effort au-dessus de la vitesse critique avant epuisement.",
    definition:
      "Second parametre du modele 2-parametres CS-D' de Jones. Represente la quantite d'energie anaerobie mobilisable au-dessus de ta vitesse critique. Une fois D' epuise, tu dois ralentir sous CS pour la regenerer. C'est ce qui te permet de finir un 10 km plus vite que ta CS pure.",
    reference: "Jones et al. (2010), Med Sci Sports Exerc, Critical power: implications for determination of VO2max and exercise tolerance.",
  },
  {
    key: "vo2max",
    term: "VO2max",
    aliases: ["Capacite aerobie maximale"],
    category: "Performance",
    short: "Capacite aerobie maximale (mL O2 / kg / min).",
    definition:
      "Volume maximal d'oxygene que tes muscles peuvent utiliser par minute, rapporte a ton poids. Garmin l'estime via Firstbeat ; RunSee le derive du VDOT a partir de tes records sur route. Indicateur clé pour comparer son niveau dans le temps, mais peu sensible aux changements rapides (evolue lentement).",
    reference: "Daniels (2014) ; Saalasti et al. (2007) Firstbeat.",
    thresholds: "30-40 = sedentaire. 40-50 = amateur. 50-60 = amateur entraine. 60-70 = competiteur. > 70 = elite.",
  },

  // --- Meta indicateurs ------------------------------------------------------

  {
    key: "dataQuality",
    term: "Couverture des donnees",
    aliases: ["dataQuality", "Qualite snapshot"],
    category: "Subjectif",
    short: "Indique si toutes les sources Garmin sont remontees ce jour.",
    definition:
      "Quand Garmin n'a pas pu collecter une source pour une nuit (montre dechargee, pas porte la nuit, sync manquee), la snapshot est marquee partielle. RunSee t'indique le niveau de couverture pour que tu saches quand un signal du jour est moins fiable.",
    thresholds: "Complete = 5 sources / 5 (snapshot fiable). Partielle = 1-4 sources (indicatif). Absente = 0 source.",
  },
  {
    key: "confidence",
    term: "Confiance",
    aliases: ["Niveau de confiance", "Fiabilite de la lecture"],
    category: "Subjectif",
    short: "Fiabilite de la lecture (taille echantillon, coherence).",
    definition:
      "Indicateur meta qui combine la taille de l'echantillon (nombre de jours / activites disponibles) et la coherence des signaux (concordance entre VFC, FC repos, sommeil). Si la Confiance est Faible, ne sur-interprete pas le verdict ou les patterns affiches : c'est qu'on n'a pas encore assez de donnees pour etre categorique.",
    thresholds: "Haute = echantillon suffisant + signaux concordants. Moyenne = donnees partielles. Faible = echantillon trop petit ou signaux contradictoires.",
  },
];

export const GLOSSARY_CATEGORIES = [
  "Charge",
  "Variabilite",
  "Distribution",
  "Performance",
  "Recuperation",
  "Intra-seance",
  "Subjectif",
];

/**
 * Lookup helper : retrouve une entrée par sa clé ou un de ses alias.
 */
export function findGlossaryEntry(key) {
  if (!key) return null;
  const normalized = String(key).toLowerCase().trim();
  return GLOSSARY_ENTRIES.find((entry) => {
    if (entry.key.toLowerCase() === normalized) return true;
    if (entry.term.toLowerCase() === normalized) return true;
    return (entry.aliases || []).some((alias) => alias.toLowerCase() === normalized);
  }) || null;
}
