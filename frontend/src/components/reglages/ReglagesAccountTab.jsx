import { memo, useEffect, useMemo, useState } from "react";
import useToast from "../../hooks/useToast.js";
import useAuth from "../../hooks/useAuth.js";
import useUserPreferences from "../../hooks/useUserPreferences.js";
import { updateProfile } from "../../services/account.service.js";
import ConfirmDialog from "./ConfirmDialog.jsx";
import PasswordChangeModal from "./PasswordChangeModal.jsx";
import SessionsModal from "./SessionsModal.jsx";

const LANGUAGE_OPTIONS = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
];
const TIMEZONE_OPTIONS = [
  { value: "Europe/Paris",     label: "(GMT+2) Europe/Paris" },
  { value: "Europe/London",    label: "(GMT+1) Europe/London" },
  { value: "Europe/Berlin",    label: "(GMT+2) Europe/Berlin" },
  { value: "America/New_York", label: "(GMT-4) America/New_York" },
  { value: "America/Los_Angeles", label: "(GMT-7) America/Los_Angeles" },
  { value: "Asia/Tokyo",       label: "(GMT+9) Asia/Tokyo" },
];
const THEME_OPTIONS = [
  { value: "light", label: "Clair" },
  { value: "dark",  label: "Sombre" },
  { value: "auto",  label: "Auto (système)" },
];
const UNITS_OPTIONS = [
  { value: "metric",   label: "Métriques (km, m)" },
  { value: "imperial", label: "Impériales (mi, ft)" },
];
const DENSITY_OPTIONS = [
  { value: "comfort", label: "Confort" },
  { value: "compact", label: "Compact" },
];

function extractErrorMessage(err, fallback) {
  return err?.response?.data?.userMessage || err?.response?.data?.message || err?.message || fallback;
}

function validateEmail(value) {
  const v = String(value || "").trim();
  if (!v) return "L'adresse e-mail est requise.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Adresse e-mail invalide.";
  return null;
}

/**
 * ReglagesAccountTab — Mockup p.21 onglet Compte (Phase 2).
 *
 * Wiring complet :
 *   - Infos compte chargees depuis user (firstName, lastName, email, language,
 *     timezone), sauvegarde via PATCH /auth/me + toast.
 *   - Securite : modale changement mot de passe + modale sessions + confirm
 *     deconnexion globale.
 *   - Preferences : theme / units / density sauves a la volee via
 *     UserPreferencesContext (PATCH /auth/preferences).
 */
function ReglagesAccountTab() {
  const { user, refreshUser, logout } = useAuth();
  const { pushToast } = useToast();
  const { theme, units, density, setPreferences } = useUserPreferences();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [language, setLanguage] = useState("fr");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [saving, setSaving] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Sync depuis user
  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName || user.displayName?.split(" ")?.[0] || "");
    setLastName(user.lastName || user.displayName?.split(" ")?.slice(1).join(" ") || "");
    setEmail(user.email || "");
    setLanguage(user.language || "fr");
    setTimezone(user.timezone || "Europe/Paris");
  }, [user]);

  const initialValues = useMemo(() => ({
    firstName: user?.firstName || user?.displayName?.split(" ")?.[0] || "",
    lastName: user?.lastName || user?.displayName?.split(" ")?.slice(1).join(" ") || "",
    email: user?.email || "",
    language: user?.language || "fr",
    timezone: user?.timezone || "Europe/Paris",
  }), [user]);

  const isDirty = (
    firstName !== initialValues.firstName ||
    lastName !== initialValues.lastName ||
    email !== initialValues.email ||
    language !== initialValues.language ||
    timezone !== initialValues.timezone
  );

  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [confirmLogoutBusy, setConfirmLogoutBusy] = useState(false);

  const handleSave = async () => {
    const emailErr = validateEmail(email);
    setEmailError(emailErr || "");
    if (emailErr) return;
    if (firstName && firstName.length < 2) {
      pushToast({ message: "Le prénom doit contenir au moins 2 caractères.", tone: "error" });
      return;
    }
    if (lastName && lastName.length < 2) {
      pushToast({ message: "Le nom doit contenir au moins 2 caractères.", tone: "error" });
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ firstName, lastName, email, language, timezone });
      if (typeof refreshUser === "function") await refreshUser();
      pushToast({ message: "Modifications enregistrées.", tone: "success" });
    } catch (err) {
      pushToast({ message: extractErrorMessage(err, "Erreur lors de la sauvegarde."), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handlePreferenceChange = async (next) => {
    try {
      await setPreferences(next);
      pushToast({ message: "Préférence enregistrée.", tone: "success", duration: 2200 });
    } catch (err) {
      pushToast({ message: extractErrorMessage(err, "Erreur."), tone: "error" });
    }
  };

  const handleLogoutAll = async () => {
    // Déconnecte la session courante (les autres sont déjà gérées via revoke-others
    // au niveau changePassword, mais ici on déconnecte aussi celle-ci pour
    // forcer un re-login).
    setConfirmLogoutBusy(true);
    try {
      // 1. Révoque les autres sessions explicitement
      const { revokeOtherSessions: revokeOthers } = await import("../../services/account.service.js");
      const r = await revokeOthers();
      const n = r?.revokedSessionsCount || 0;
      // 2. Déconnecte la session courante via logout
      if (typeof logout === "function") {
        await logout();
      }
      pushToast({
        message: n > 0
          ? `Déconnecté de tous les appareils (${n + 1} sessions au total).`
          : "Déconnecté.",
        tone: "success",
      });
      setConfirmLogoutOpen(false);
    } catch (err) {
      pushToast({ message: extractErrorMessage(err, "Erreur."), tone: "error" });
    } finally {
      setConfirmLogoutBusy(false);
    }
  };

  return (
    <div className="reglages-tab reglages-account-tab">
      <div className="reglages-account-grid">
        {/* Colonne gauche : Infos compte */}
        <section className="reglages-card">
          <h3>Informations de compte</h3>
          <div className="reglages-field">
            <label htmlFor="rg-firstName">Prénom</label>
            <input id="rg-firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={50} />
          </div>
          <div className="reglages-field">
            <label htmlFor="rg-lastName">Nom</label>
            <input id="rg-lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={50} />
          </div>
          <div className="reglages-field">
            <label htmlFor="rg-email">Email</label>
            <input
              id="rg-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
              onBlur={(e) => setEmailError(validateEmail(e.target.value) || "")}
              autoComplete="email"
            />
            {emailError ? <span className="reglages-field-error">{emailError}</span> : null}
          </div>
          <div className="reglages-field">
            <label htmlFor="rg-lang">Langue</label>
            <select id="rg-lang" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="reglages-field">
            <label htmlFor="rg-tz">Fuseau horaire</label>
            <select id="rg-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {TIMEZONE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <button
            type="button"
            className="reglages-btn reglages-btn-primary"
            onClick={handleSave}
            disabled={!isDirty || saving}
          >
            {saving ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
        </section>

        {/* Colonne droite : Sécurité + Préférences */}
        <div className="reglages-account-side">
          <section className="reglages-card">
            <h3>Sécurité</h3>
            <div className="reglages-row">
              <div>
                <small>Mot de passe</small>
                <span className="reglages-row-hint">Modifier ton mot de passe</span>
              </div>
              <button type="button" className="reglages-btn" onClick={() => setPwdModalOpen(true)}>Modifier</button>
            </div>
            <div className="reglages-row">
              <div>
                <small>Sessions actives</small>
                <span className="reglages-row-hint">Voir et gérer tes appareils connectés</span>
              </div>
              <button type="button" className="reglages-btn" onClick={() => setSessionsModalOpen(true)}>Voir</button>
            </div>
            <div className="reglages-row reglages-row-stack">
              <div>
                <small>Déconnexion de tous les appareils</small>
                <span className="reglages-row-hint">Tu seras déconnecté partout, y compris ici. Re-connexion nécessaire.</span>
              </div>
              <button type="button" className="reglages-btn reglages-btn-soft" onClick={() => setConfirmLogoutOpen(true)}>Déconnecter</button>
            </div>
          </section>

          <section className="reglages-card">
            <h3>Préférences d'affichage</h3>
            <div className="reglages-field reglages-field-row">
              <label htmlFor="rg-theme">Thème</label>
              <select id="rg-theme" value={theme} onChange={(e) => handlePreferenceChange({ theme: e.target.value })}>
                {THEME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="reglages-field reglages-field-row">
              <label htmlFor="rg-units">Unités</label>
              <select id="rg-units" value={units} onChange={(e) => handlePreferenceChange({ units: e.target.value })}>
                {UNITS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="reglages-field reglages-field-row">
              <label htmlFor="rg-density">Densité d'affichage</label>
              <select id="rg-density" value={density} onChange={(e) => handlePreferenceChange({ density: e.target.value })}>
                {DENSITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </section>
        </div>
      </div>

      {/* Modals */}
      <PasswordChangeModal open={pwdModalOpen} onClose={() => setPwdModalOpen(false)} />
      <SessionsModal open={sessionsModalOpen} onClose={() => setSessionsModalOpen(false)} />
      <ConfirmDialog
        open={confirmLogoutOpen}
        title="Déconnecter tous les appareils ?"
        description="Toutes tes sessions (y compris celle-ci) seront fermées. Tu devras te reconnecter pour continuer à utiliser RuNSee."
        confirmLabel={confirmLogoutBusy ? "Déconnexion…" : "Tout déconnecter"}
        cancelLabel="Annuler"
        tone="danger"
        onConfirm={handleLogoutAll}
        onCancel={() => !confirmLogoutBusy && setConfirmLogoutOpen(false)}
      />
    </div>
  );
}

export default memo(ReglagesAccountTab);
