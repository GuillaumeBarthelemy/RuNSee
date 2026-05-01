// Structure standard d'un bloc d'aide RunNSee (5 blocs progressifs).
// - role            : 1 phrase, ce que l'indicateur mesure (toujours present).
// - calculation     : description vulgarisee du calcul (toujours present).
// - interpretation  : ce que ta valeur veut dire, avec seuils chiffres si possible.
// - extra           : note technique courte ajoutee a la fin de "Comment lire" (optionnel, retrocompat).
// - action          : recommandation concrete liee aux seuils (optionnel mais recommande).
// - reference       : reference scientifique pour aller plus loin (optionnel).
// Les anciens consommateurs qui ne passent que role/calculation/interpretation/extra
// continuent de fonctionner sans modification.
export function buildInfoBlocks({
  role,
  calculation,
  interpretation,
  extra = "",
  action = "",
  reference = "",
  glossaryKey = "",
}) {
  const normalizedGlossaryKey = String(glossaryKey || "").trim();
  const attachGlossaryKey = (block) => (
    normalizedGlossaryKey ? { ...block, glossaryKey: normalizedGlossaryKey } : block
  );

  return [
    role ? { label: "En bref", text: role } : null,
    calculation ? { label: "Calcul", text: calculation } : null,
    interpretation
      ? {
          label: "Comment lire ta valeur",
          text: extra ? `${interpretation} ${extra}` : interpretation,
        }
      : null,
    action ? { label: "Action concrete", text: action } : null,
    reference ? { label: "Pour aller plus loin", text: reference } : null,
  ].filter(Boolean).map(attachGlossaryKey);
}

export const SHARED_FILTER_COPY = {
  subtitle: "Une meme periode et un meme perimetre pilotent les ecrans.",
  resetLabel: "Reinitialiser les filtres partages",
  info: buildInfoBlocks({
    role: "Piloter tes 3 ecrans avec une seule periode et un seul perimetre sport.",
    calculation:
      "Tous les KPI, graphiques et tableaux sont recalcules sur la meme selection de dates, de sports et de recherche. Les presets 7 j / 30 j / 90 j correspondent a des fenetres glissantes, puis certains graphiques hebdomadaires regroupent ensuite ta selection par semaines calendaires.",
    interpretation:
      "Tu compares ainsi des blocs vraiment alignes entre eux, sans changer de contexte d'une page a l'autre.",
    action:
      "Pour suivre une preparation longue, garde le preset 90 j actif et compare ta charge cumulee a la meme periode de l'annee precedente via la section Comparaison historique.",
  }),
};

export const SHARED_KPI_COPY = {
  recentLoad7d: {
    hint: "Pression recente",
    info: buildInfoBlocks({
      role: "Mesurer ta contrainte tres recente.",
      calculation:
        "RunNSee additionne ta charge cumulee sur les 7 derniers jours glissants jusqu'a ta date de fin choisie. La charge utilisee est le TRIMP Banister si ta cardio est exploitable, puis le suffer score Strava ou un proxy documente en dernier recours.",
      interpretation:
        "Reperes coureur amateur : < 200 pts = bloc leger. 200-400 pts = bloc standard. 400-600 pts = bloc dense. > 600 pts = bloc tres charge.",
      action:
        "Si tu enchaines plusieurs semaines > 600 pts sans baisse, prevois une semaine d'allegement pour absorber sans perdre la base.",
      reference: "Banister (1991) ; Coggan & Allen (2019).",
      extra: "Multi-sport selon le perimetre choisi.",
      glossaryKey: "trimp",
    }),
  },
  fitness: {
    hint: "Base de charge",
    info: buildInfoBlocks({
      role: "Mesurer ta base de travail construite sur plusieurs semaines.",
      calculation:
        "RunNSee regarde tes 42 derniers jours glissants jusqu'a ta date de fin choisie, puis ramene cela a une semaine moyenne pour lisser les variations trop courtes (lecture proche du CTL).",
      interpretation:
        "Reperes coureur : < 30 = decouverte ou reprise. 30-50 = pratique reguliere. 50-80 = bloc specifique confirme. > 80 = preparation marathon avancee.",
      action:
        "Une progression saine de ta base est de +5 a +8 % par semaine. Au-dela de +10 %, surveille ta fatigue (ATL).",
      reference: "Coggan & Allen (2019).",
      extra: "Multi-sport selon le perimetre choisi.",
      glossaryKey: "ctl",
    }),
  },
  freshness: {
    hint: "Balance de charge",
    info: buildInfoBlocks({
      role: "Lire ton equilibre entre base recente et pression de charge.",
      calculation:
        "Formule simple : balance de charge = base de charge 42 j glissants - pression recente 7 j glissants. Equivalent a ton TSB.",
      interpretation:
        "Reperes : > +25 = tres frais (jour de course). +5 a +25 = forme positive. -10 a +5 = neutre. -10 a -30 = bloc de progression. < -30 = surcharge probable.",
      action:
        "Pour ta course objectif, vise une balance entre +10 et +25 le jour J. Pour reprogresser apres bloc dur, repasse au-dessus de -10 avant d'ajouter de l'intensite.",
      reference: "Coggan & Allen (2019).",
      extra: "Multi-sport selon le perimetre choisi.",
      glossaryKey: "tsb",
    }),
  },
  regularity: {
    hint: "Semaines actives recentes",
    info: buildInfoBlocks({
      role: "Mesurer ta constance de pratique.",
      calculation:
        "RunNSee regarde les 4 dernieres semaines calendaires couvertes par ta selection, regroupees du lundi au dimanche, puis calcule la part de semaines avec au moins une activite (semaines actives / semaines observees).",
      interpretation:
        "Reperes : 100 % = constance ideale. 75 % = bonne base mais une semaine sautee, a surveiller. 50 % ou moins = pratique tres irreguliere, ta base de charge va decrocher.",
      action:
        "Vise au moins 75 % sur tes 4 dernieres semaines pour entretenir ta base. En dessous, regarde si une cause specifique explique l'arret (blessure, voyage) ou si la routine est a reconstruire.",
      extra: "Multi-sport selon le perimetre choisi.",
    }),
  },
  rollingDistance: {
    hint: "7 j glissants",
    info: buildInfoBlocks({
      role: "Te garder un repere de volume simple sur la fenetre recente.",
      calculation: "RunNSee additionne tes kilometres des 7 derniers jours glissants jusqu'a ta date de fin choisie.",
      interpretation:
        "Indicateur brut : utile pour voir rapidement si ton volume recent etait leger ou charge. A croiser avec ta charge (TRIMP) qui integre l'intensite.",
      action:
        "Garde une progression de volume hebdo de l'ordre de +5 a +10 % par semaine sur un bloc, puis -25 a -35 % la semaine de relache.",
      extra: "Multi-sport selon le perimetre choisi.",
      glossaryKey: "trimp",
    }),
  },
  rollingTime: {
    hint: "7 j glissants",
    info: buildInfoBlocks({
      role: "Lire ton volume recent en temps plutot qu'en vitesse.",
      calculation: "RunNSee additionne ton temps en mouvement des 7 derniers jours glissants jusqu'a ta date de fin choisie.",
      interpretation:
        "Tres utile quand ton allure n'est pas comparable d'une seance a l'autre (trail, terrain accidente, multi-sport).",
      action:
        "En trail, ce repere est plus fiable que les km. Vise une progression de temps proche de celle de la charge.",
      extra: "Multi-sport selon le perimetre choisi.",
    }),
  },
  rollingElevation: {
    hint: "7 j glissants",
    info: buildInfoBlocks({
      role: "Mesurer la contrainte du terrain sur ta fenetre recente.",
      calculation: "RunNSee additionne ton denivele positif des 7 derniers jours glissants jusqu'a ta date de fin choisie.",
      interpretation:
        "Particulierement utile en trail ou sur les semaines vallonnees. Un D+ qui monte fort sans hausse de volume = signal d'augmentation forte de la contrainte musculaire excentrique.",
      action:
        "Si ton D+ hebdo bondit de plus de 50 % d'un coup, attends-toi a une fatigue specifique (mollets, quadriceps). Etalonne sur 2-3 semaines.",
      extra: "Multi-sport selon le perimetre choisi.",
    }),
  },
};
