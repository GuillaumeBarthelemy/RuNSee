import { useState } from "react";

const STANDARD_DISTANCES = [
  { key: "5k", label: "5 km", distanceMeters: 5000 },
  { key: "10k", label: "10 km", distanceMeters: 10000 },
  { key: "halfMarathon", label: "Semi-marathon", distanceMeters: 21097 },
  { key: "marathon", label: "Marathon", distanceMeters: 42195 },
  { key: "custom", label: "Distance personnalisee", distanceMeters: 0 },
];

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("fr-FR", { dateStyle: "long" });
}

function formatDistance(meters) {
  const safe = Number(meters) || 0;
  if (safe >= 1000) {
    return `${(safe / 1000).toFixed(safe % 1000 === 0 ? 0 : 1)} km`;
  }
  return `${safe} m`;
}

function paceToString(value) {
  const seconds = Math.round(Number(value) || 0);
  if (seconds <= 0) return "-";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")} /km`;
}

function paceFromString(value) {
  const safe = String(value || "").trim();
  if (!safe) return null;
  const match = safe.match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

const noop = () => {};

export default function RaceObjectivesCard({
  races = [],
  activeRace = null,
  isLoading = false,
  isMutating = false,
  onCreate = noop,
  onArchive = noop,
  onReactivate = noop,
}) {
  const [name, setName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [standardDistanceKey, setStandardDistanceKey] = useState("10k");
  const [customDistanceMeters, setCustomDistanceMeters] = useState("");
  const [targetPace, setTargetPace] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  const isCustom = standardDistanceKey === "custom";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!name.trim() || !raceDate) {
      setFormError("Renseigne au moins le nom et la date de la course.");
      return;
    }

    const payload = {
      name: name.trim(),
      raceDate,
      standardDistanceKey: isCustom ? "" : standardDistanceKey,
      distanceMeters: isCustom ? Number(customDistanceMeters) : undefined,
      notes: notes.trim() || undefined,
    };

    const targetPaceSeconds = paceFromString(targetPace);
    if (targetPaceSeconds && targetPaceSeconds >= 120 && targetPaceSeconds <= 1200) {
      payload.targetPaceSecondsPerKm = targetPaceSeconds;
    } else if (targetPace.trim() && !targetPaceSeconds) {
      setFormError("Allure cible attendue au format MM:SS (ex. 4:50).");
      return;
    }

    if (isCustom && (!Number(customDistanceMeters) || Number(customDistanceMeters) < 800)) {
      setFormError("Distance personnalisee invalide (au moins 800 m).");
      return;
    }

    try {
      await onCreate(payload);
      setName("");
      setRaceDate("");
      setStandardDistanceKey("10k");
      setCustomDistanceMeters("");
      setTargetPace("");
      setNotes("");
    } catch (error) {
      setFormError(error?.response?.data?.userMessage || error?.message || "Echec de l'enregistrement.");
    }
  };

  return (
    <section className="card card-accent">
      <div className="card-header-row wrap-on-mobile">
        <div>
          <h2 className="card-title">Courses objectifs</h2>
          <p className="card-subtitle">
            Saisis ta prochaine course pour activer le countdown, le chrono predit et le plan de taper recommande dans Performance.
          </p>
        </div>
      </div>

      {activeRace ? (
        <div className="alert alert-info top-gap-sm">
          <strong>Active : {activeRace.name}</strong> - {formatDate(activeRace.raceDate)} - {formatDistance(activeRace.distanceMeters)}.
          {activeRace.targetPaceSecondsPerKm
            ? ` Allure cible : ${paceToString(activeRace.targetPaceSecondsPerKm)}.`
            : ""}
        </div>
      ) : (
        <div className="alert alert-info top-gap-sm">
          Aucune course active pour le moment. Renseigne ton prochain dossard pour activer le suivi.
        </div>
      )}

      <form className="top-gap-sm" onSubmit={handleSubmit}>
        <div className="filters-grid">
          <label className="field field-span-2">
            <span className="field-label">Nom de la course</span>
            <input
              className="field-input"
              type="text"
              value={name}
              placeholder="Ex. Marathon de Paris"
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Date</span>
            <input
              className="field-input"
              type="date"
              value={raceDate}
              onChange={(event) => setRaceDate(event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Distance</span>
            <select
              className="field-input"
              value={standardDistanceKey}
              onChange={(event) => setStandardDistanceKey(event.target.value)}
            >
              {STANDARD_DISTANCES.map((entry) => (
                <option key={entry.key} value={entry.key}>{entry.label}</option>
              ))}
            </select>
          </label>

          {isCustom ? (
            <label className="field">
              <span className="field-label">Distance personnalisee (m)</span>
              <input
                className="field-input"
                type="number"
                inputMode="numeric"
                min="800"
                step="10"
                value={customDistanceMeters}
                placeholder="Ex. 15000"
                onChange={(event) => setCustomDistanceMeters(event.target.value)}
              />
            </label>
          ) : null}

          <label className="field">
            <span className="field-label">Allure cible (MM:SS)</span>
            <input
              className="field-input"
              type="text"
              value={targetPace}
              placeholder="Ex. 4:50"
              onChange={(event) => setTargetPace(event.target.value)}
            />
          </label>

          <label className="field field-span-2">
            <span className="field-label">Notes (optionnel)</span>
            <input
              className="field-input"
              type="text"
              value={notes}
              maxLength={500}
              placeholder="Conditions specifiques, denivele, objectif sub-X, etc."
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
        </div>

        {formError ? <div className="alert alert-error top-gap-sm">{formError}</div> : null}

        <div className="card-header-row top-gap-sm wrap-on-mobile">
          <button type="submit" className="button button-dark" disabled={isMutating || isLoading}>
            {isMutating ? "Enregistrement..." : "Activer cette course"}
          </button>
        </div>
      </form>

      <div className="top-gap-sm">
        <h3 className="subcard-title">Historique</h3>
        {races.length ? (
          <table className="table compact-table">
            <thead>
              <tr>
                <th>Statut</th>
                <th>Course</th>
                <th>Date</th>
                <th>Distance</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {races.map((race) => (
                <tr key={race.id}>
                  <td>
                    <span className={`status-pill ${race.isActive ? "status-success" : "status-idle"}`}>
                      {race.isActive ? "Active" : "Archivee"}
                    </span>
                  </td>
                  <td>{race.name}</td>
                  <td>{formatDate(race.raceDate)}</td>
                  <td>{formatDistance(race.distanceMeters)}</td>
                  <td>
                    {race.isActive ? (
                      <button
                        type="button"
                        className="button button-outline"
                        disabled={isMutating}
                        onClick={() => onArchive(race.id)}
                      >
                        Archiver
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="button button-outline"
                        disabled={isMutating}
                        onClick={() => onReactivate(race.id)}
                      >
                        Reactiver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">Aucune course saisie pour le moment.</p>
        )}
      </div>
    </section>
  );
}
