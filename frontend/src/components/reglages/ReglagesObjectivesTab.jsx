import { memo, useMemo, useState } from "react";
import useRaceObjectives from "../../hooks/useRaceObjectives.js";
import useToast from "../../hooks/useToast.js";

const DISTANCES = [
  { key: "5k", label: "5 km", meters: 5000 },
  { key: "10k", label: "10 km", meters: 10000 },
  { key: "halfMarathon", label: "Semi-marathon", meters: 21097 },
  { key: "marathon", label: "Marathon", meters: 42195 },
  { key: "custom", label: "Personnalisée", meters: 0 },
];

const TERRAINS = [
  { value: "", label: "Non précisé" },
  { value: "road", label: "Route" },
  { value: "trail", label: "Trail" },
  { value: "mixed", label: "Mixte" },
];

function paceFromString(str) {
  const m = String(str || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function formatDistance(meters) {
  const km = Number(meters) / 1000;
  if (!Number.isFinite(km) || km <= 0) return "—";
  return `${km % 1 === 0 ? km : km.toFixed(1).replace(".", ",")} km`;
}

function daysUntil(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function extractErr(err, fallback) {
  return err?.response?.data?.userMessage || err?.response?.data?.message || err?.message || fallback;
}

function ObjectiveCard({ race, isActive, onArchive, onReactivate, busy }) {
  const days = daysUntil(race.raceDate);
  const isPast = days != null && days < 0;
  return (
    <div className={`reglages-objective-card ${isActive ? "is-active" : ""} ${isPast ? "is-past" : ""}`}>
      <div className="reglages-objective-main">
        <div className="reglages-objective-head">
          <strong className="reglages-objective-name">{race.name}</strong>
          {isActive ? <span className="reglages-objective-badge is-active">Active</span> : null}
          {isPast && !isActive ? <span className="reglages-objective-badge is-past">Passée</span> : null}
        </div>
        <div className="reglages-objective-meta">
          <span>📅 {formatDate(race.raceDate)}</span>
          <span>📏 {formatDistance(race.distanceMeters)}</span>
          {race.targetPaceSecondsPerKm ? (
            <span>🎯 {Math.floor(race.targetPaceSecondsPerKm / 60)}:{String(race.targetPaceSecondsPerKm % 60).padStart(2, "0")}/km</span>
          ) : null}
          {days != null && days >= 0 ? <span className="reglages-objective-countdown">J-{days}</span> : null}
        </div>
      </div>
      <div className="reglages-objective-actions">
        {isActive ? (
          <button type="button" className="reglages-btn reglages-btn-soft" disabled={busy} onClick={() => onArchive(race.id)}>
            Archiver
          </button>
        ) : (
          <button type="button" className="reglages-btn reglages-btn-soft" disabled={busy} onClick={() => onReactivate(race.id)}>
            Activer
          </button>
        )}
      </div>
    </div>
  );
}

function ReglagesObjectivesTab() {
  const { races, activeRace, isMutating, createRace, archiveRace, reactivateRace } = useRaceObjectives();
  const { pushToast } = useToast();

  const [name, setName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [distanceKey, setDistanceKey] = useState("10k");
  const [customMeters, setCustomMeters] = useState("");
  const [targetPace, setTargetPace] = useState("");
  const [elevationGain, setElevationGain] = useState("");
  const [terrain, setTerrain] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const isCustom = distanceKey === "custom";

  const sortedRaces = useMemo(() => {
    const list = Array.isArray(races) ? [...races] : [];
    return list.sort((a, b) => new Date(a.raceDate) - new Date(b.raceDate));
  }, [races]);

  const resetForm = () => {
    setName(""); setRaceDate(""); setDistanceKey("10k"); setCustomMeters("");
    setTargetPace(""); setElevationGain(""); setTerrain(""); setNotes(""); setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !raceDate) {
      setError("Nom et date sont requis.");
      return;
    }
    const payload = {
      name: name.trim(),
      raceDate,
      standardDistanceKey: isCustom ? "" : distanceKey,
      distanceMeters: isCustom ? Number(customMeters) : undefined,
      elevationGainMeters: elevationGain ? Number(elevationGain) : undefined,
      terrainType: terrain || undefined,
      notes: notes.trim() || undefined,
    };
    if (isCustom && (!Number(customMeters) || Number(customMeters) < 800)) {
      setError("Distance personnalisée invalide (≥ 800 m).");
      return;
    }
    const paceSec = paceFromString(targetPace);
    if (targetPace.trim() && !paceSec) {
      setError("Allure attendue au format MM:SS (ex. 4:50).");
      return;
    }
    if (paceSec) payload.targetPaceSecondsPerKm = paceSec;

    setError("");
    try {
      await createRace(payload);
      pushToast({ message: "Objectif ajouté.", tone: "success" });
      resetForm();
    } catch (err) {
      setError(extractErr(err, "Erreur lors de l'ajout de l'objectif."));
    }
  };

  const handleArchive = async (id) => {
    try { await archiveRace(id); pushToast({ message: "Objectif archivé.", tone: "success" }); }
    catch (err) { pushToast({ message: extractErr(err, "Erreur."), tone: "error" }); }
  };
  const handleReactivate = async (id) => {
    try { await reactivateRace(id); pushToast({ message: "Objectif activé.", tone: "success" }); }
    catch (err) { pushToast({ message: extractErr(err, "Erreur."), tone: "error" }); }
  };

  return (
    <div className="reglages-tab reglages-objectives-tab">
      <section className="reglages-card">
        <h3>Mes objectifs</h3>
        <p className="reglages-row-hint">
          L'objectif actif pilote le countdown, le chrono prédit et le plan de taper dans Performance.
        </p>
        {sortedRaces.length === 0 ? (
          <p className="reglages-row-hint">Aucun objectif pour l'instant. Ajoute ta prochaine course ci-dessous.</p>
        ) : (
          <div className="reglages-objectives-list">
            {sortedRaces.map((race) => (
              <ObjectiveCard
                key={race.id}
                race={race}
                isActive={activeRace?.id === race.id}
                onArchive={handleArchive}
                onReactivate={handleReactivate}
                busy={isMutating}
              />
            ))}
          </div>
        )}
      </section>

      <section className="reglages-card">
        <h3>Ajouter un objectif</h3>
        <form onSubmit={handleSubmit} className="reglages-objective-form">
          <div className="reglages-objective-form-grid">
            <div className="reglages-field reglages-field-span2">
              <label htmlFor="obj-name">Nom de la course</label>
              <input id="obj-name" type="text" value={name} placeholder="Ex. Marathon de Paris" onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="reglages-field">
              <label htmlFor="obj-date">Date</label>
              <input id="obj-date" type="date" value={raceDate} onChange={(e) => setRaceDate(e.target.value)} />
            </div>
            <div className="reglages-field">
              <label htmlFor="obj-dist">Distance</label>
              <select id="obj-dist" value={distanceKey} onChange={(e) => setDistanceKey(e.target.value)}>
                {DISTANCES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
            {isCustom ? (
              <div className="reglages-field">
                <label htmlFor="obj-custom">Distance (m)</label>
                <input id="obj-custom" type="number" min="800" step="10" value={customMeters} placeholder="Ex. 15000" onChange={(e) => setCustomMeters(e.target.value)} />
              </div>
            ) : null}
          </div>

          <details className="reglages-objective-advanced">
            <summary className="reglages-advanced-summary">Détails avancés (optionnel)</summary>
            <div className="reglages-objective-form-grid reglages-advanced-body">
              <div className="reglages-field">
                <label htmlFor="obj-pace">Allure cible (MM:SS)</label>
                <input id="obj-pace" type="text" value={targetPace} placeholder="Ex. 4:50" onChange={(e) => setTargetPace(e.target.value)} />
              </div>
              <div className="reglages-field">
                <label htmlFor="obj-elev">D+ objectif (m)</label>
                <input id="obj-elev" type="number" min="0" step="10" value={elevationGain} placeholder="Ex. 850" onChange={(e) => setElevationGain(e.target.value)} />
              </div>
              <div className="reglages-field">
                <label htmlFor="obj-terrain">Terrain</label>
                <select id="obj-terrain" value={terrain} onChange={(e) => setTerrain(e.target.value)}>
                  {TERRAINS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="reglages-field reglages-field-span2">
                <label htmlFor="obj-notes">Notes</label>
                <input id="obj-notes" type="text" value={notes} placeholder="Conditions, objectif sub-X, etc." onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          </details>

          {error ? <div className="reglages-modal-error">{error}</div> : null}

          <div className="reglages-objective-form-actions">
            <button type="submit" className="reglages-btn reglages-btn-primary" disabled={isMutating}>
              {isMutating ? "Ajout…" : "Ajouter et activer"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default memo(ReglagesObjectivesTab);
