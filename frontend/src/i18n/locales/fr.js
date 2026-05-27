/**
 * Locale FR — table de traduction minimale (graine).
 *
 * Migration progressive : chaque fois qu'un libelle est extrait d'un
 * composant, l'ajouter ici avec une cle hierarchique (`section.action`).
 *
 * Lot 7 livre l'infrastructure mais ne migre pas les centaines de strings
 * existants (effort distinct estime 2-3 jours).
 */
export default {
  common: {
    save: "Enregistrer",
    cancel: "Annuler",
    confirm: "Confirmer",
    close: "Fermer",
    error: "Erreur",
    loading: "Chargement...",
    saved: "Enregistre.",
  },
  auth: {
    login: "Se connecter",
    logout: "Se deconnecter",
    signup: "Creer un compte",
    passwordChanged: "Mot de passe modifie.",
  },
  reglages: {
    profile: "Profil",
    preferences: "Preferences",
    sessions: "Sessions actives",
  },
};
