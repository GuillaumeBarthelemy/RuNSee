function formatDistance(meters) {
  const numeric = Number(meters);
  if (!Number.isFinite(numeric)) return "-";
  return `${(numeric / 1000).toFixed(2)} km`;
}

function formatElevation(value, { signed = false } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";

  const rounded = Math.round(numeric);

  if (!signed || rounded <= 0) {
    return `${rounded} m`;
  }

  return `+${rounded} m`;
}

function formatHeartRate(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "-";
  return `${Math.round(numeric)} bpm`;
}

function formatPace(split) {
  const distance = Number(split?.distance || 0);
  const seconds = Number(split?.moving_time ?? split?.elapsed_time ?? 0);
  if (!distance || !seconds) return "-";
  const pacePerKm = seconds / (distance / 1000);
  const min = Math.floor(pacePerKm / 60);
  const sec = Math.round(pacePerKm % 60);
  const normalizedSeconds = sec === 60 ? 0 : sec;
  const normalizedMinutes = sec === 60 ? min + 1 : min;
  return `${String(normalizedMinutes).padStart(2, "0")}:${String(normalizedSeconds).padStart(2, "0")}/km`;
}

function buildSplitRows(splits = [], { elevationAccessor = null, signedElevation = false } = {}) {
  const safeSplits = Array.isArray(splits) ? splits : [];

  return safeSplits.map((split, index) => ({
    key: split?.id || `${index + 1}`,
    label: split?.split || split?.name || `${index + 1}`,
    distance: formatDistance(split?.distance),
    pace: formatPace(split),
    elevation: formatElevation(
      typeof elevationAccessor === "function"
        ? elevationAccessor(split)
        : split?.elevation_difference ?? split?.total_elevation_gain,
      { signed: signedElevation },
    ),
    heartRate: formatHeartRate(split?.average_heartrate),
  }));
}

function SplitTable({ title, subtitle, rows = [], emptyMessage, elevationHeader = "D+" }) {
  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <div className="subcard">
      <h3 className="subcard-title">{title}</h3>
      <p className="card-subtitle">{subtitle}</p>
      {!safeRows.length ? (
        <div className="empty-state compact-empty">{emptyMessage}</div>
      ) : (
        <div className="table-wrapper top-gap-sm">
          <table className="table premium-table compact-table">
            <thead>
              <tr>
                <th>Split</th>
                <th>Distance</th>
                <th>Allure</th>
                <th>{elevationHeader}</th>
                <th>FC moy.</th>
              </tr>
            </thead>
            <tbody>
              {safeRows.map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td>{row.distance}</td>
                  <td>{row.pace}</td>
                  <td>{row.elevation}</td>
                  <td>{row.heartRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ActivitySplitsCard({ detailedPayload = null }) {
  const metricSplits = Array.isArray(detailedPayload?.splits_metric)
    ? detailedPayload.splits_metric
    : Array.isArray(detailedPayload?.splits_standard)
      ? detailedPayload.splits_standard
      : [];
  const watchSplits = Array.isArray(detailedPayload?.laps) ? detailedPayload.laps : [];

  const metricRows = buildSplitRows(metricSplits, {
    elevationAccessor: (split) => split?.elevation_difference,
    signedElevation: true,
  });
  const watchRows = buildSplitRows(watchSplits, {
    elevationAccessor: (split) => split?.total_elevation_gain ?? split?.elevation_difference,
  });

  return (
    <section className="top-gap-sm">
      <div className="card-header-row">
        <div>
          <h3 className="card-title">Splits</h3>
          <p className="card-subtitle">
            Les splits automatiques Strava affichent la variation nette d'altitude par segment.
            Les splits montre affichent le D+ fourni par l'appareil.
          </p>
        </div>
      </div>
      <div className="grid two-columns">
        <SplitTable
          title="Splits automatiques"
          subtitle="Decoupage km par km propose par Strava, avec variation nette d'altitude."
          rows={metricRows}
          elevationHeader="Delta alt."
          emptyMessage="Enrichis l'activite pour recuperer les splits Strava detailles."
        />
        <SplitTable
          title="Splits montre"
          subtitle="Splits enregistres par l'appareil pendant l'effort."
          rows={watchRows}
          emptyMessage="Aucun split montre disponible sur cette activite."
        />
      </div>
    </section>
  );
}
