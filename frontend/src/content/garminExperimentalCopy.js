export const GARMIN_EXPERIMENTAL_STATUS = {
  unavailable: {
    label: "En preparation",
    className: "status-queued",
    helper: "La connexion n'est pas encore activee. Ce bloc pose le cadre produit et securite.",
  },
  disconnected: {
    label: "Non connecte",
    className: "status-idle",
    helper: "Aucune session Garmin n'est associee a ce compte RunNSee.",
  },
  consent_required: {
    label: "Consentement requis",
    className: "status-queued",
    helper: "Tu dois valider le caractere experimental avant de connecter Garmin.",
  },
  consentRequired: {
    label: "Consentement requis",
    className: "status-queued",
    helper: "Tu dois valider le caractere experimental avant de connecter Garmin.",
  },
  connecting: {
    label: "Connexion en cours",
    className: "status-running",
    helper: "RunNSee verifie la connexion Garmin sans conserver ton mot de passe.",
  },
  mfa_required: {
    label: "Code requis",
    className: "status-queued",
    helper: "Garmin demande une validation supplementaire pour terminer la connexion.",
  },
  mfaRequired: {
    label: "Code requis",
    className: "status-queued",
    helper: "Garmin demande une validation supplementaire pour terminer la connexion.",
  },
  connected: {
    label: "Connecte",
    className: "status-success",
    helper: "La session Garmin est utilisable pour synchroniser tes signaux de recuperation.",
  },
  syncing: {
    label: "Sync en cours",
    className: "status-running",
    helper: "RunNSee recupere ou actualise tes donnees Garmin.",
  },
  expired: {
    label: "Expire",
    className: "status-failed",
    helper: "La session Garmin doit etre renouvelee.",
  },
  error: {
    label: "Erreur Garmin",
    className: "status-failed",
    helper: "Garmin est indisponible, limite les appels ou refuse la session actuelle.",
  },
};

export const GARMIN_EXPERIMENTAL_COPY = {
  eyebrow: "Source de recuperation",
  title: "Garmin experimental",
  subtitle: "Connexion non officielle pour enrichir tes signaux de recuperation.",
  notice:
    "Cette connexion Garmin est experimentale et non officielle. Elle sert a enrichir tes signaux de recuperation. Ton mot de passe Garmin n'est jamais stocke. La connexion peut cesser de fonctionner si Garmin modifie ses acces.",
  connectionUnavailableAction: "Connexion bientot disponible",
  consentTitle: "Cadre de consentement",
  consentItems: [
    "RunNSee utilisera tes identifiants uniquement pendant la connexion.",
    "Ton mot de passe Garmin ne sera jamais stocke.",
    "Les sessions et tokens devront etre chiffres avant tout stockage.",
    "Tu pourras deconnecter Garmin et demander la suppression des donnees associees.",
  ],
  priorityTitle: "Donnees prioritaires",
  prioritySignals: [
    "Sommeil",
    "HRV",
    "FC repos",
    "Stress",
    "Body Battery",
  ],
  usageTitle: "Usage prevu",
  usageItems: [
    "Ameliorer la synthese decisionnelle avec la recuperation quotidienne.",
    "Conserver Strava comme source principale des activites.",
    "Utiliser Garmin seulement pour enrichir les activites Strava deja reconnues.",
  ],
  formTitle: "Connexion Garmin",
  consentCheckbox: "J'accepte d'utiliser ce connecteur Garmin experimental et non officiel.",
  emailLabel: "Email Garmin",
  passwordLabel: "Mot de passe Garmin",
  mfaLabel: "Code Garmin",
  connectAction: "Connecter Garmin",
  reconnectAction: "Reconnecter Garmin",
  disconnectAction: "Deconnecter Garmin",
  connectedCaption:
    "Session Garmin chiffree cote serveur. Les donnees de recuperation seront synchronisees dans le lot suivant.",
  credentialsCaption:
    "Renseigne tes identifiants Garmin pour creer une session chiffree. Le mot de passe est oublie apres la tentative.",
  mfaCaption:
    "Garmin demande un code. Garde ton mot de passe dans le formulaire, renseigne le code puis relance la connexion.",
  tooltip: [
    {
      label: "Pourquoi",
      text: "Garmin apporte des signaux de recuperation que Strava ne fournit pas toujours : sommeil, HRV, stress et FC repos.",
    },
    {
      label: "Limite",
      text: "Le connecteur repose sur une librairie non officielle. Il doit rester experimental et remplacable par l'API Garmin officielle plus tard.",
    },
    {
      label: "Securite",
      text: "Le mot de passe Garmin ne doit jamais etre conserve. Les sessions devront etre chiffrees et supprimables.",
    },
  ],
};

export function getGarminExperimentalStatus(status = "unavailable") {
  return GARMIN_EXPERIMENTAL_STATUS[status] || GARMIN_EXPERIMENTAL_STATUS.unavailable;
}
