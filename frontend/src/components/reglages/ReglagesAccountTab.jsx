import { memo, useState } from "react";

const LANGUAGE_OPTIONS = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
];
const TIMEZONE_OPTIONS = [
  { value: "Europe/Paris", label: "(GMT+2) Europe/Paris" },
  { value: "Europe/London", label: "(GMT+1) Europe/London" },
  { value: "America/New_York", label: "(GMT-4) America/New_York" },
];
const THEME_OPTIONS = [
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
  { value: "auto", label: "Auto (système)" },
];
const UNITS_OPTIONS = [
  { value: "metric", label: "Métriques" },
  { value: "imperial", label: "Impériales" },
];
const DENSITY_OPTIONS = [
  { value: "comfort", label: "Confort" },
  { value: "compact", label: "Compact" },
];

/**
 * ReglagesAccountTab — Mockup p.21 onglet Compte.
 *
 * 3 cartes : Informations de compte / Sécurité / Préférences d'affichage.
 */
function ReglagesAccountTab({ user = null }) {
  const [firstName, setFirstName] = useState(user?.firstName || user?.displayName?.split(" ")?.[0] || "");
  const [lastName, setLastName] = useState(user?.lastName || user?.displayName?.split(" ")?.slice(1).join(" ") || "");
  const [email, setEmail] = useState(user?.email || "");
  const [language, setLanguage] = useState("fr");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [theme, setTheme] = useState("light");
  const [units, setUnits] = useState("metric");
  const [density, setDensity] = useState("comfort");

  const handleSave = () => {
    // Placeholder : sauvegarde backend a brancher (PATCH /auth/me).
    if (typeof window !== "undefined" && window.alert) {
      window.alert("Modifications enregistrees (placeholder).");
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
            <input id="rg-firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="reglages-field">
            <label htmlFor="rg-lastName">Nom</label>
            <input id="rg-lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="reglages-field">
            <label htmlFor="rg-email">Email</label>
            <input id="rg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
          <button type="button" className="reglages-btn reglages-btn-primary" onClick={handleSave}>
            Enregistrer les modifications
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
              <button type="button" className="reglages-btn">Modifier</button>
            </div>
            <div className="reglages-row">
              <div>
                <small>Sessions actives</small>
                <span className="reglages-row-hint">1 session sur cet appareil</span>
              </div>
              <button type="button" className="reglages-btn">Voir</button>
            </div>
            <div className="reglages-row reglages-row-stack">
              <div>
                <small>Déconnexion de tous les appareils</small>
                <span className="reglages-row-hint">Tu seras déconnecté de tous tes appareils, sauf celui-ci.</span>
              </div>
              <button type="button" className="reglages-btn reglages-btn-soft">Déconnecter</button>
            </div>
          </section>

          <section className="reglages-card">
            <h3>Préférences d'affichage</h3>
            <div className="reglages-field reglages-field-row">
              <label htmlFor="rg-theme">Thème</label>
              <select id="rg-theme" value={theme} onChange={(e) => setTheme(e.target.value)}>
                {THEME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="reglages-field reglages-field-row">
              <label htmlFor="rg-units">Unités</label>
              <select id="rg-units" value={units} onChange={(e) => setUnits(e.target.value)}>
                {UNITS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="reglages-field reglages-field-row">
              <label htmlFor="rg-density">Densité d'affichage</label>
              <select id="rg-density" value={density} onChange={(e) => setDensity(e.target.value)}>
                {DENSITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default memo(ReglagesAccountTab);
