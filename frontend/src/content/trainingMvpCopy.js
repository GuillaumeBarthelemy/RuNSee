import { buildInfoBlocks } from "./analyticsCopy.js";

// Conventions du copy RunNSee :
// - Tutoiement systematique pour rapprocher du ton athlete / coach.
// - Chaque bloc d'aide suit la structure En bref / Calcul / Comment lire ta valeur / Action concrete / Pour aller plus loin.
// - Les seuils chiffres viennent de la litterature standard (Banister 1991, Coggan, Foster 1998, Seiler 2010, Jones 2019).
//   Tu peux les ajuster en relecture si ton ressenti differe : ce sont des reperes, pas des verites absolues.

export const TRAINING_MVP_KPI_INFO = {
  load: buildInfoBlocks({
    role: "Mesurer ta charge d'entrainement cumulee sur la periode filtree.",
    calculation:
      "RunNSee calcule d'abord un TRIMP Banister a partir de la duree, de la FC moyenne, de la FC max et de ta FC repos. Si la cardio n'est pas exploitable, il bascule sur le suffer score Strava puis sur un proxy duree / distance / D+. Un point de charge correspond a peu pres a une minute d'effort soutenu en endurance fondamentale.",
    interpretation:
      "Plus ta charge cumulee monte, plus ton bloc recent a ete sollicitant. La tendance compare ta selection a la periode precedente equivalente. Sur 7 jours, < 200 pts = bloc leger, 200-400 pts = bloc standard, 400-600 pts = bloc dense, > 600 pts = bloc tres charge a surveiller.",
    action:
      "Si tu enchaines plusieurs blocs > 600 pts/sem sans baisse, prevois une semaine de relachement (charge -30 a -40 %) pour absorber.",
    reference:
      "Banister, Calvert, Savage, Bach (1975) ; TRIMP : Banister (1991), modele exponentiel adopte par TrainingPeaks.",
    extra: "Multi-sport selon le perimetre choisi.",
    glossaryKey: "trimp",
  }),
  ctl: buildInfoBlocks({
    role: "Lire ta charge chronique, c'est-a-dire ta base de fond construite sur plusieurs semaines.",
    calculation:
      "Le CTL est une moyenne ponderee exponentielle de ta charge journaliere sur 42 jours (convention Banister 1991 / Coggan TrainingPeaks). Il represente ton socle de charge long terme calcule sur la meme methode de charge que le reste de l'application.",
    interpretation:
      "Plus ton CTL est eleve, plus ta base recente est solide. Reperes indicatifs pour un coureur : CTL < 30 = decouverte ou reprise. 30-50 = pratique reguliere (3-4 sorties/sem). 50-80 = coureur confirme en bloc specifique. > 80 = niveau preparation marathon avancee.",
    action:
      "Une progression saine de ton CTL est de +5 a +8 % par semaine. Au-dela de +10 %, surveille ton ATL et ton TSB.",
    reference:
      "Coggan & Allen, Training and Racing with a Power Meter (3e ed., 2019) ; Performance Management Chart, TrainingPeaks.",
    extra: "Exprime en points de charge. Constante de temps : 42 jours.",
    glossaryKey: "ctl",
  }),
  atl: buildInfoBlocks({
    role: "Lire ta fatigue recente de court terme.",
    calculation:
      "L'ATL est une moyenne ponderee exponentielle de ta charge journaliere sur 7 jours (convention Banister 1991 / Coggan TrainingPeaks). Il reagit plus vite aux gros blocs et aux relachements que ton CTL.",
    interpretation:
      "Plus ton ATL monte, plus ta pression recente est forte. Reperes : ATL < CTL = bloc en lissage ou recuperation. ATL ~ CTL = rythme de croisiere. ATL > CTL × 1,3 = surcharge aigue, vigilance.",
    action:
      "Si ton ATL depasse ton CTL de plus de 30 %, planifie 2 a 3 jours faciles avant ta prochaine seance qualite.",
    reference:
      "Banister (1991) ; Coggan & Allen, op. cit.",
    extra: "Exprime en points de charge. Constante de temps : 7 jours.",
    glossaryKey: "atl",
  }),
  tsb: buildInfoBlocks({
    role: "Lire l'ecart entre ta base de fond et ta fatigue recente : ta fraicheur relative.",
    calculation:
      "Formule retenue : TSB = CTL - ATL. Un TSB positif signifie que ta charge longue domine ta fatigue recente ; un TSB negatif indique une pression recente superieure a ta base.",
    interpretation:
      "Reperes : TSB > +25 = tres frais, idealement le jour de course. +5 a +25 = forme positive. -10 a +5 = neutre, regime de croisiere. -10 a -30 = fatigue marquee, bloc de progression. < -30 = fatigue tres elevee, surcharge probable.",
    action:
      "Pour ta course objectif, vise un TSB entre +10 et +25 le jour J. Pour reprogresser apres bloc dur, repasse au-dessus de -10 avant d'ajouter de l'intensite.",
    reference:
      "Coggan & Allen, op. cit. ; Banister Performance Management Chart.",
    extra: "Exprime en points de charge.",
    glossaryKey: "tsb",
  }),
  efficiency: buildInfoBlocks({
    role: "Suivre ton efficience allure / FC sur les sorties vraiment comparables.",
    calculation:
      "Formule retenue : vitesse moyenne (km/h) / FC moyenne (bpm). RunNSee exclut les activites trop courtes, les FC aberrantes, les sorties trop vallonnees et, selon ton parametrage actif, le trail.",
    interpretation:
      "Une valeur plus haute signifie generalement plus de vitesse produite pour un meme cout cardio. Une pente positive sur 4 a 8 semaines = progression. Pente plate prolongee = plateau probable. Pente negative = fatigue, chaleur, ou contexte non comparable.",
    action:
      "Si ton efficience reste plate plus de 6 semaines, varie les stimulations : ajoute du fartlek, des cotes ou un bloc seuil.",
    reference:
      "Pfitzinger & Latter, Faster Road Racing (2014) ; Daniels' Running Formula (4e ed., 2022).",
    extra: "Reservee aux activites course / trail compatibles avec les garde-fous actifs.",
  }),
  regularity: buildInfoBlocks({
    role: "Mesurer si tu maintiens une presence reguliere d'une semaine a l'autre.",
    calculation:
      "RunNSee regarde les 4 dernieres semaines disponibles et calcule la part de semaines avec au moins une activite.",
    interpretation:
      "75 % ou plus = bonne constance. 50 a 75 % = rythme encore utile mais fragile. En dessous de 50 %, ta routine manque de continuite.",
    action:
      "Si la constance baisse, vise d'abord une sortie facile courte plutot qu'une grosse seance isolee.",
    reference:
      "ACSM Position Stand on training progression ; Friel, The Runner's Training Bible (2009).",
  }),
};

export const TRAINING_MVP_TODAY_VOLUME_INFO = {
  distanceKm: buildInfoBlocks({
    role: "Lire ton kilometrage de la semaine en cours.",
    calculation:
      "RunNSee prend le dernier bloc hebdomadaire de ta serie volume et le compare au bloc precedent.",
    interpretation:
      "Une hausse moderee est normale en bloc de progression. Une hausse au-dela de 20 % merite de surveiller la fatigue.",
    action:
      "Garde une progression douce et evite de compenser une semaine basse par une semaine brutalement tres haute.",
  }),
  count: buildInfoBlocks({
    role: "Compter tes seances de la semaine en cours.",
    calculation:
      "RunNSee compare le nombre d'activites du bloc hebdomadaire courant au bloc precedent.",
    interpretation:
      "Plus de seances peut aider a repartir la charge. Moins de seances n'est pas negatif si la semaine est volontairement allegee.",
    action:
      "Si tu ajoutes une seance, garde-la facile au depart pour ne pas concentrer trop de charge.",
  }),
  movingHours: buildInfoBlocks({
    role: "Lire ton temps actif de la semaine.",
    calculation:
      "RunNSee additionne le temps en mouvement sur le bloc hebdomadaire courant, puis le compare au bloc precedent.",
    interpretation:
      "Le temps est souvent plus stable que les kilometres, surtout en trail ou quand le terrain varie.",
    action:
      "Si les kilometres semblent bas mais le temps reste haut, ne force pas une compensation inutile.",
  }),
  elevationGain: buildInfoBlocks({
    role: "Mesurer la contrainte du relief cette semaine.",
    calculation:
      "RunNSee additionne le denivele positif du bloc hebdomadaire courant et le compare au bloc precedent.",
    interpretation:
      "Une hausse forte du denivele augmente la contrainte musculaire, meme si les kilometres restent stables.",
    action:
      "Apres une grosse hausse de denivele, prevois une sortie facile ou plate pour absorber.",
  }),
};

export const TRAINING_MVP_SECTION_INFO = {
  decisionSummary: buildInfoBlocks({
    role: "Te donner en quelques secondes une lecture de ta forme, de ta fatigue et d'une recommandation court terme.",
    calculation:
      "Le bloc croise ton TSB, le ratio ATL / CTL, ta tendance de charge et tes pics recents. La recommandation reste volontairement prudente : une fatigue aigue elevee ou une charge qui monte vite bloque le feu vert qualite.",
    interpretation:
      "L'objectif est de t'aider a decider de ta prochaine seance sans remplacer tes sensations, ta planification ni les signaux de recuperation non presents dans RunNSee (sommeil, HRV, stress).",
    action:
      "Quand le bloc reste neutre ou positif, ta fenetre est ouverte pour une seance qualite. Quand il signale une fatigue elevee, privilegie une seance facile ou un jour off.",
    reference:
      "Foster (1998) ; Coggan & Allen (2019) ; Halson (2014) sur la prevention de la surcharge.",
    glossaryKey: "tsb",
  }),
  loadChart: buildInfoBlocks({
    role: "Te permettre de lire en meme temps ta charge du jour, ta base de fond, ta fatigue recente et ta fraicheur.",
    calculation:
      "Les barres representent ta charge journaliere ou hebdomadaire. Les courbes reprennent ces memes points de charge sous forme de lissages : base de fond (CTL 42 j), fatigue recente (ATL 7 j) et fraicheur (TSB = CTL - ATL).",
    interpretation:
      "Tu lis a la fois la contrainte immediate, la tendance de fond et la marge entre les deux. Fatigue recente au-dessus de la base = bloc sollicitant. Fatigue qui repasse sous la base = phase d'absorption.",
    action:
      "Avant une course objectif, vise une courbe TSB qui remonte progressivement sur les 10 a 14 derniers jours pour atteindre ta fenetre fraicheur.",
    reference:
      "Coggan & Allen (2019) ; Mujika (2010) sur le tapering.",
    extra: "La granularite suit la plage de dates que tu as selectionnee.",
    glossaryKey: "ctl",
  }),
  efficiencyChart: buildInfoBlocks({
    role: "Te montrer l'evolution historique de ton efficience allure / FC.",
    calculation:
      "Chaque point consolide tes sorties comparables du jour ou de la semaine selon la plage choisie, avec les garde-fous actifs dans Administration.",
    interpretation:
      "Une pente haussiere traduit en general une meilleure efficience ; une pente baissiere signale soit une fatigue, soit un contexte moins comparable (chaleur, terrain, recuperation).",
    action:
      "Si ta pente est haussiere depuis 4 semaines, ton bloc paie. Si elle stagne ou descend malgre la regularite, repense l'alternance facile / qualite ou l'environnement (chaleur, sommeil).",
    reference:
      "Pfitzinger & Latter (2014) ; Joe Friel, The Triathlete's Training Bible.",
    extra: "Course / trail comparables uniquement.",
  }),
  intensity: buildInfoBlocks({
    role: "Te permettre de relire la distribution de tes intensites sur la selection courante.",
    calculation:
      "RunNSee essaie d'abord ta source prioritaire active dans Administration : zones FC ou zones allure. Si elle n'est pas exploitable sur le bloc, il bascule sur la source de repli disponible.",
    interpretation:
      "Cela te permet de voir ou se concentre vraiment ton temps ou ta charge, sans dupliquer deux graphiques concurrents.",
    action:
      "Pour un coureur d'endurance, une distribution proche de 80 % facile / 5 % tempo / 15 % intense (modele polarise Seiler) reste un bon objectif. Si tu vis a > 25 % en zone tempo, tu risques de cumuler de la fatigue grise.",
    reference:
      "Seiler (2010), What is Best Practice for Training Intensity and Duration Distribution in Endurance Athletes ?",
    extra: "La source active, les seuils et les replis viennent du parametrage d'administration.",
    glossaryKey: "polarization",
  }),
  weeklySupport: buildInfoBlocks({
    role: "Te garder une lecture simple de ton volume hebdomadaire.",
    calculation:
      "Le decoupage Glissante utilise des blocs consecutifs de 7 jours ancres sur ta date de fin selectionnee. Le decoupage Debut de semaine aligne les semaines sur le premier jour actif. Le mode Km somme la distance, le mode Seances compte les activites. La moyenne glissante 4 semaines aide ensuite a lire ta tendance.",
    interpretation:
      "Ce bloc reste un support de volume et de frequence, pas un substitut au graphe de charge. Une progression saine en volume reste de l'ordre de +5 a +10 % par semaine sur un bloc.",
    action:
      "Si tu sautes systematiquement la 4e ou 5e semaine, programme une semaine de relache officielle (-30 % volume) pour eviter le decrochage non planifie.",
    reference:
      "Friel, The Runner's Training Bible (2009) ; ACSM Position Stand on training progression.",
  }),
  monthlySupport: buildInfoBlocks({
    role: "Te faire relire ton cycle mois par mois en kilometres ou en charge.",
    calculation:
      "Le mode Km additionne ta distance mensuelle. Le mode Charge reprend la meme charge que le reste du produit : TRIMP Banister si la cardio est exploitable, puis repli suffer score ou proxy documente. Le decoupage Glissante construit des blocs mensuels ancres sur ta date de fin ; Debut de mois suit les mois calendaires.",
    interpretation:
      "Utile pour reperer tes blocs forts, tes mois de relache et la continuite de ta preparation. Un ratio plus haut mois / plus bas mois superieur a 2 sur un trimestre = activite tres irreguliere.",
    action:
      "Si ton mois courant est inferieur a 70 % de ton mois median sur 6 mois, attention au detraining : l'efficience peut baisser en 2 a 3 semaines.",
    reference:
      "Coyle (1984) sur la cinetique du detraining ; Mujika & Padilla (2000).",
    glossaryKey: "trimp",
  }),
  comparison: buildInfoBlocks({
    role: "Te permettre de comparer tes annees en YTD sur une metrique volumique ou de charge.",
    calculation:
      "La comparaison part du 1er janvier jusqu'a ta date de fin selectionnee. Le tableau et le graphe utilisent exactement la meme metrique.",
    interpretation:
      "Tu gardes ainsi un comparatif coherent pour les metriques cumulatives, sans forcer CTL / ATL / TSB dans un tableau ou ils seraient moins lisibles.",
    action:
      "Compare YTD a la meme periode N-1 pour situer ta progression annuelle. Plus utile sur la charge ou les km que sur les vitesses moyennes.",
    glossaryKey: "trimp",
  }),
  dynamicsGrid: buildInfoBlocks({
    role: "Regrouper les signaux qui expliquent pourquoi ton bloc se construit, stagne ou demande de l'absorption.",
    calculation:
      "La grille reprend les calculs existants : regularite de charge, pression cumulee Foster, structure d'intensite Seiler, hausse de charge ACWR EWMA, socle en recul, jours faciles necessaires, construction de la base, tendance d'efficience et repere seuil route.",
    interpretation:
      "Chaque carte affiche surtout une valeur et un statut. Les details de calcul et les seuils restent dans l'aide pour garder la page lisible.",
    action:
      "Si plusieurs cartes passent en warning ou danger, evite d'ajouter de l'intensite avant d'avoir relu charge, fatigue et activites recentes.",
    reference:
      "Foster (1998) ; Seiler (2010) ; Williams (2017) ; Coggan & Allen (2019) ; Jones (2019).",
    glossaryKey: "acwr",
  }),
  recentActivities: buildInfoBlocks({
    role: "Te garder un acces direct a tes seances qui expliquent la dynamique recente.",
    calculation:
      "Tes activites recentes sont annotees avec un type de seance estime, un niveau de charge et une dominante d'intensite, puis restent cliquables vers la fiche detaillee.",
    interpretation:
      "Pratique pour relire le contexte derriere une hausse de charge, une baisse de TSB ou un changement d'efficience.",
    action:
      "Quand un indicateur surprend (TSB qui plonge, efficience qui chute), commence par ouvrir tes 3 dernieres seances ici pour comprendre.",
    glossaryKey: "tsb",
  }),
  vdotProfile: buildInfoBlocks({
    role: "Te donner un repere de potentiel route : VDOT performance, VO2max equivalente, temps probables et allures EF / S1 / S2.",
    calculation:
      "RunNSee calcule un VDOT a partir de tes meilleurs efforts route enrichis (5 km, 10 km, semi, marathon) en appliquant la regression Daniels & Gilbert. Les chronos route combinent ensuite records reels, extrapolation endurance type Riegel et modele Daniels, avec une confiance par distance.",
    interpretation:
      "Les temps route sont des reperes de potentiel sur parcours regulier. Les allures EF / S1 / S2 servent a calibrer l'entrainement : elles ne sont pas des predictions directes de course.",
    action:
      "Utilise les distances avec confiance haute pour cadrer ton potentiel actuel. Si une distance reste prudente, cherche plutot a enrichir la course support ou a refaire un test route comparable.",
    reference:
      "Daniels, Daniels' Running Formula (4e ed., 2022) ; Daniels & Gilbert, Oxygen Power: Performance Tables for Distance Runners (1979).",
    extra: "Ton VDOT se reactualise des qu'un nouveau record route fiable est detecte. Le trail, le denivele et les efforts non maximaux reduisent la confiance.",
    glossaryKey: "vdot",
  }),
  loadDynamics: buildInfoBlocks({
    role: "Te donner cinq lectures avancees pour anticiper la suite : hausse de charge, socle en recul, jours faciles necessaires, construction de la base et tendance d'efficience.",
    calculation:
      "Hausse de charge = ACWR EWMA (Williams 2017) avec lambda 0,25 sur 7 j et 0,069 sur 28 j. Socle en recul = chute du CTL > 10 % sur 28 j. Jours faciles necessaires = projection iterative du CTL/ATL avec 0 charge ou volume tres leger. Construction de la base = pente CTL sur 28 j ramenee en %/sem. Tendance d'efficience = regression lineaire sur 8 semaines normalisee au niveau median.",
    interpretation:
      "Chaque indicateur est colore selon son tone : positif = zone confort, neutre = a surveiller, warning ou danger = action conseillee.",
    action:
      "Utilise ces signaux pour valider tes decisions du jour : une hausse de charge > 1,5 ou un socle en recul doivent influencer ta planification immediate.",
    reference:
      "Williams (2017) ; Coyle (1984) ; Coggan & Allen (2019).",
    extra: "Les seuils restent indicatifs et basent leur valeur sur la litterature ; ressens et croise avec ton sommeil / HRV / charge subjective.",
    glossaryKey: "acwr",
  }),
  advancedSignals: buildInfoBlocks({
    role: "T'afficher des reperes de second niveau, utiles pour comprendre la structure de ton bloc sans surcharger le tableau principal.",
    calculation:
      "Regularite de charge = moyenne de charge journaliere 7 j / ecart-type 7 j. Pression cumulee = charge 7 j x regularite de charge. Structure intensite consolide tes zones faciles, tempo et intenses. Vitesse critique est estimee a partir de tes meilleurs efforts route disponibles.",
    interpretation:
      "Une regularite de charge trop haute signale des journees trop similaires. La pression cumulee combine volume et repetition. La structure d'intensite indique si ton bloc est surtout facile, tempo ou intense. La vitesse critique te donne un repere de performance, pas une prescription d'allure.",
    action:
      "Quand la regularite de charge passe au-dessus de 2,0 plusieurs semaines de suite, force-toi a une journee tres facile ou un jour off pour casser la repetition.",
    reference:
      "Foster (1998) sur monotonie/strain ; Seiler (2010) sur la polarisation ; Jones (2019) sur Critical Speed.",
    extra:
      "Ces indicateurs sont descriptifs et dependent fortement de la qualite des donnees enrichies, des zones FC et des records disponibles.",
    glossaryKey: "monotony",
  }),
};

export const TRAINING_MVP_ADVANCED_SIGNAL_INFO = {
  monotony: buildInfoBlocks({
    role: "Mesurer si ta charge des 7 derniers jours est variee ou concentree sur des journees similaires.",
    calculation:
      "Formule Foster descriptive : moyenne de tes charges journalieres sur 7 jours / ecart-type des charges journalieres. Les jours sans activite restent dans la fenetre avec une charge a 0.",
    interpretation:
      "Reperes : monotonie < 1,5 = bonne variabilite, alternance saine entre jours faciles et denses. 1,5 a 2,0 = correct sans plus, marge de variation a soigner. > 2,0 = monotone, vigilance sur l'accumulation. > 2,5 = signal fort de routine repetitive a casser.",
    action:
      "Au-dessus de 2,0, intercale un jour off ou une seance vraiment facile (< 30 % de ta charge moyenne) pour faire chuter la monotonie sans toucher au volume.",
    reference:
      "Foster (1998), Monitoring training in athletes with reference to overtraining syndrome.",
    extra: "Ce n'est pas un diagnostic medical ni une prediction de blessure ; il sert a relire ta structure recente.",
    glossaryKey: "monotony",
  }),
  strain: buildInfoBlocks({
    role: "Combiner ton volume de charge recent et ta monotonie pour reperer les blocs denses.",
    calculation:
      "Formule Foster descriptive : strain 7 j = charge totale des 7 derniers jours × monotonie.",
    interpretation:
      "Reperes : < 600 pts = strain leger. 600 a 1500 = strain modere typique d'un bloc construit. 1500 a 3000 = strain eleve, vigilance. > 3000 = strain tres eleve, signal d'absorption necessaire.",
    action:
      "Au-dessus de 2500-3000 pts, planifie une semaine d'allegement (-30 % volume) ou au moins 2 jours faciles consecutifs.",
    reference:
      "Foster (1998), op. cit.",
    extra: "L'unite reste en points descriptifs RunNSee, calculee avec la meme charge que les autres indicateurs.",
    glossaryKey: "strain",
  }),
  intensityStructure: buildInfoBlocks({
    role: "Te resumer la repartition facile / tempo / intense de ta selection.",
    calculation:
      "RunNSee regroupe Z1-Z2 en facile, Z3 en tempo, Z4-Z5 en intense, a partir de la repartition d'intensite disponible sur la periode.",
    interpretation:
      "Reperes Seiler : modele polarise = > 75 % facile + < 10 % tempo + 10-20 % intense (souvent associe a la meilleure progression sur l'endurance). Pyramidal = facile dominant + plus de tempo que d'intense (plus classique chez les coureurs amateurs). Seuil = part importante en tempo (utile en bloc specifique mais a ne pas tenir trop longtemps).",
    action:
      "Si tu vises la course longue (semi/marathon), tend vers le modele polarise sur tes blocs d'endurance et reserve les blocs seuil aux 6-8 dernieres semaines avant l'objectif.",
    reference:
      "Seiler (2010) ; Esteve-Lanao et al. (2007) sur la distribution chez les marathoniens.",
    extra: "La qualite depend des zones FC ou allure disponibles et des donnees detaillees recuperees.",
    glossaryKey: "polarization",
  }),
  criticalSpeed: buildInfoBlocks({
    role: "Te donner un repere de performance route issu de tes meilleurs efforts disponibles.",
    calculation:
      "Ta vitesse critique est estimee a partir d'au moins deux records route enrichis. RunNSee cherche la paire exploitable avec un ecart de distance suffisant, puis calcule la pente distance / temps. Modele Monod & Scherrer (1965) adapte a la course.",
    interpretation:
      "Reperes : 12-13 km/h = coureur loisir confirme. 14-15 km/h = competiteur amateur (~3h30 marathon). 16-17 km/h = coureur regional avance. 18+ km/h = niveau elite. Cette CS approche ton seuil lactique 2 et l'allure soutenable ~30 a 60 min.",
    action:
      "Tu peux utiliser ta CS comme reference d'allure seuil pour tes seances tempo et tes intervalles longs (90-100 % CS sur 3 a 6 min, 95-100 % CS sur 12 a 30 min cumulees).",
    reference:
      "Monod & Scherrer (1965) ; Jones et al. (2019), Critical Power: An Important Fatigue Threshold.",
    extra: "L'estimation devient plus fiable quand tes records 5 km, 10 km, semi ou autres efforts route sont bien enrichis et comparables.",
    glossaryKey: "criticalSpeed",
  }),
};

export const TRAINING_MVP_LOAD_DYNAMICS_SIGNAL_INFO = {
  acwrEwma: buildInfoBlocks({
    role: "Mesurer le rapport entre ta charge aigue recente et ta charge chronique avec un lissage exponentiel.",
    calculation:
      "ACWR EWMA Williams 2017 : moyenne ponderee exponentielle courte sur 7 jours et longue sur 28 jours, puis ratio aigu / chronique.",
    interpretation:
      "< 0,8 = decharge ou reprise. 0,8-1,3 = zone equilibree. 1,3-1,5 = montee de charge a surveiller. > 1,5 = pression aigue elevee.",
    action:
      "Au-dessus de 1,5, garde une semaine plus facile avant de remettre une grosse seance qualite.",
    reference:
      "Williams S, West S, Cross MJ, Stokes KA (2017), Better way to determine the acute:chronic workload ratio?",
    glossaryKey: "acwr",
  }),
  detraining: buildInfoBlocks({
    role: "Detecter une baisse de ton socle CTL sur les dernieres semaines.",
    calculation:
      "RunNSee compare ton CTL actuel a ton CTL d'il y a 28 jours et signale une perte si la chute depasse les seuils de vigilance.",
    interpretation:
      "Une chute moderee peut etre une decharge utile. Une chute marquee hors taper ou coupure planifiee indique un risque de perte de fitness.",
    action:
      "Si l'alerte s'active sans raison prevue, relance progressivement avec une hausse proche de +5 % par semaine.",
    reference:
      "Coyle EF (1984), Time course of loss of adaptations after stopping prolonged intense endurance training.",
    glossaryKey: "ctl",
  }),
  timeToRecover: buildInfoBlocks({
    role: "Estimer le nombre de jours necessaires pour retrouver une fraicheur TSB cible.",
    calculation:
      "Projection jour par jour du CTL et de l'ATL avec charge nulle ou tres legere, jusqu'a atteindre le TSB cible.",
    interpretation:
      "0-3 jours = reserve proche. 4-7 jours = quelques jours faciles. Au-dela, ton bloc demande une vraie phase d'absorption.",
    action:
      "Utilise cette estimation pour caler les seances qualite et les semaines de relache.",
    glossaryKey: "tsb",
  }),
  ctlProgression: buildInfoBlocks({
    role: "Lire la vitesse a laquelle ta base CTL monte ou descend.",
    calculation:
      "Variation relative du CTL sur les 28 derniers jours, ramennee en pourcentage par semaine.",
    interpretation:
      "+5 a +8 %/sem = progression saine. > +10 %/sem = progression tres rapide. Valeur negative = relache ou detraining possible.",
    action:
      "Au-dessus de +10 %/sem plusieurs semaines de suite, prevois une semaine allegee.",
    reference:
      "Coggan & Allen, Training and Racing with a Power Meter (3e ed., 2019).",
    glossaryKey: "ctl",
  }),
  efficiencyPlateau: buildInfoBlocks({
    role: "Detecter si ton efficience allure / FC progresse, stagne ou recule.",
    calculation:
      "Regression lineaire sur les points d'efficience exploitables des dernieres semaines, normalisee en pourcentage par semaine.",
    interpretation:
      "Pente positive = progression. Pente proche de zero = plateau. Pente negative = fatigue, chaleur ou contexte moins comparable.",
    action:
      "Sur plateau durable, varie les stimulations : fartlek, cotes ou bloc seuil court.",
  }),
};
