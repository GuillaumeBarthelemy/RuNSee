const noop = () => {};

export default function UserPreferencesCard({ options = {}, onOptionChange = noop }) {
  const locale = options.userLocale || "fr-FR";
  const distanceUnit = options.userDistanceUnit || "km";
  const weekStartsOn = options.userWeekStartsOn || "monday";

  return (
    <section className="card">
      <div className="card-header-row wrap-on-mobile">
        <div>
          <h2 className="card-title">Preferences</h2>
          <p className="card-subtitle">Reglages generaux utilises par l'application sur cet appareil.</p>
        </div>
      </div>

      <div className="filters-grid top-gap-sm">
        <label className="field">
          <span className="field-label">Langue</span>
          <select
            className="field-input"
            value={locale}
            onChange={(event) => onOptionChange("userLocale", event.target.value)}
          >
            <option value="fr-FR">Francais</option>
            <option value="en-US">Anglais</option>
          </select>
        </label>

        <label className="field">
          <span className="field-label">Unite distance</span>
          <select
            className="field-input"
            value={distanceUnit}
            onChange={(event) => onOptionChange("userDistanceUnit", event.target.value)}
          >
            <option value="km">Kilometres</option>
            <option value="mi">Miles</option>
          </select>
        </label>

        <label className="field">
          <span className="field-label">Debut de semaine</span>
          <select
            className="field-input"
            value={weekStartsOn}
            onChange={(event) => onOptionChange("userWeekStartsOn", event.target.value)}
          >
            <option value="monday">Lundi</option>
            <option value="sunday">Dimanche</option>
          </select>
        </label>
      </div>
    </section>
  );
}
