const noop = () => {};

function PreferenceRow({ label, description, children }) {
  return (
    <div className="admin-preference-row">
      <div className="admin-preference-copy">
        <span className="field-label">{label}</span>
        <span className="small-text">{description}</span>
      </div>
      <div className="admin-preference-control">
        {children}
      </div>
    </div>
  );
}

export default function UserPreferencesCard({ options = {}, onOptionChange = noop }) {
  const locale = options.userLocale || "fr-FR";
  const distanceUnit = options.userDistanceUnit || "km";
  const weekStartsOn = options.userWeekStartsOn || "monday";

  return (
    <section className="card admin-preferences-card">
      <div className="card-header-row wrap-on-mobile">
        <div>
          <span className="eyebrow admin-card-kicker">Local</span>
          <h2 className="card-title">Preferences</h2>
          <p className="card-subtitle">Reglages d'affichage et de calendrier appliques sur cet appareil.</p>
        </div>
      </div>

      <div className="admin-preference-list">
        <PreferenceRow label="Langue" description="Libelles et formats de lecture dans l'interface.">
          <select
            className="field-input"
            value={locale}
            onChange={(event) => onOptionChange("userLocale", event.target.value)}
          >
            <option value="fr-FR">Francais</option>
            <option value="en-US">Anglais</option>
          </select>
        </PreferenceRow>

        <PreferenceRow label="Unite distance" description="Unite utilisee pour les volumes et les allures.">
          <select
            className="field-input"
            value={distanceUnit}
            onChange={(event) => onOptionChange("userDistanceUnit", event.target.value)}
          >
            <option value="km">Kilometres</option>
            <option value="mi">Miles</option>
          </select>
        </PreferenceRow>

        <PreferenceRow label="Debut de semaine" description="Point d'ancrage des vues calendaires hebdomadaires.">
          <select
            className="field-input"
            value={weekStartsOn}
            onChange={(event) => onOptionChange("userWeekStartsOn", event.target.value)}
          >
            <option value="monday">Lundi</option>
            <option value="sunday">Dimanche</option>
          </select>
        </PreferenceRow>
      </div>
    </section>
  );
}
