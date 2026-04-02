function formatDistance(meters) {
  if (meters === null || meters === undefined) return "-";
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatElevation(value) {
  if (value === null || value === undefined) return "-";
  return `${Math.round(value)} m`;
}

function formatHeartRate(value) {
  if (value === null || value === undefined) return "-";
  return `${Math.round(value)} bpm`;
}

function formatPace(split) {
  const distance = Number(split.distance || 0);
  const seconds = Number(split.moving_time ?? split.elapsed_time ?? 0);
  if (!distance || !seconds) return "-";
  const pacePerKm = seconds / (distance / 1000);
  const min = Math.floor(pacePerKm / 60);
  const sec = Math.round(pacePerKm % 60);
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}/km`;
}

function buildSplitRows(splits = []) {
  return splits.map((split, index) => ({
    key: split.id || `${index + 1}`,
    label: split.split || split.name || `${index + 1}`,
    distance: formatDistance(split.distance),
    pace: formatPace(split),
    elevation: formatElevation(split.elevation_difference ?? split.total_elevation_gain),
    heartRate: formatHeartRate(split.average_heartrate),
  }));
}

function SplitTable({ title, subtitle, rows, emptyMessage }) {
  return (
    <div className="subcard">
      <h3 className="subcard-title">{title}</h3>
      <p className="card-subtitle">{subtitle}</p>
      {!rows.length ? (
        <div className="empty-state compact-empty">{emptyMessage}</div>
      ) : (
        <div className="table-wrapper top-gap-sm">
          <table className="table premium-table compact-table">
            <thead>
              <tr>
                <th>Split</th>
                <th>Distance</th>
                <th>Allure</th>
                <th>D+</th>
                <th>FC moy.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
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

export default function ActivitySplitsCard({ detailedPayload }) {
  const metricSplits = Array.isArray(detailedPayload?.splits_metric)
    ? detailedPayload.splits_metric
    : Array.isArray(detailedPayload?.splits_standard)
      ? detailedPayload.splits_standard
      : [];
  const watchLaps = Array.isArray(detailedPayload?.laps) ? detailedPayload.laps : [];

  const metricRows = buildSplitRows(metricSplits);
  const lapRows = buildSplitRows(watchLaps);

  return (
    <section className="top-gap-sm">
      <div className="card-header-row">
        <div>
          <h3 className="card-title">Splits</h3>
          <p className="card-subtitle">Splits Strava automatiques et tours enregistrés par la montre, lorsqu'ils sont disponibles localement.</p>
        </div>
      </div>
      <div className="grid two-columns">
        <SplitTable
          title="Splits automatiques"
          subtitle="Découpage km par km proposé par Strava."
          rows={metricRows}
          emptyMessage="Enrichis l'activité pour récupérer les splits Strava détaillés."
        />
        <SplitTable
          title="Tours montre"
          subtitle="Laps enregistrés par l'appareil pendant l'effort."
          rows={lapRows}
          emptyMessage="Aucun lap montre disponible sur cette activité."
        />
      </div>
    </section>
  );
}
