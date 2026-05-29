import { memo, useState } from "react";
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

// "H:MM:SS" ou "MM:SS" -> secondes totales
function timeFromString(str) {
  const s = String(str || "").trim();
  if (!s) return null;
  const parts = s.split(":").map((p) => Number(p));
  if (parts.some((p) => Number.isNaN(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

function formatPace(secPerKm) {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return "";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  // gere l'arrondi 60s
  const mm = s === 60 ? m + 1 : m;
  const ss = s === 60 ? 0 : s;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

function formatTime(totalSec) {
  if (!Number.isFinite(totalSec) || totalSec <= 0) return "";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.round(totalSec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// vitesse km/h depuis allure s/km
function speedFromPace(secPerKm) {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return null;
  return 3600 / secPerKm;
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
  const [targetTime, setTargetTime] = useState("");
  const [elevationGain, setElevationGain] = useState("");
  const [terrain, setTerrain] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const isCustom = distanceKey === "custom";

  // Distance courante en km (preset ou perso) pour les calculs allure/temps.
  const distanceKm = (() => {
    const meters = isCustom
      ? Number(customMeters)
      : (DISTANCES.find((d) => d.key === distanceKey)?.meters || 0);
    return Number.isFinite(meters) && meters > 0 ? meters / 1000 : 0;
  })();

  // Saisir l'allure OU le temps : on calcule l'autre + la vitesse selon la
  // distance. Le champ saisi reste la source ; l'autre est derive.
  const handlePaceChange = (value) => {
    setTargetPace(value);
    const paceSec = paceFromString(value);
    if (paceSec && distanceKm > 0) {
      setTargetTime(formatTime(paceSec * distanceKm));
    } else if (!value) {
      setTargetTime("");
    }
  };

  const handleTimeChange = (value) => {
    setTargetTime(value);
    const timeSec = timeFromString(value);
    if (timeSec && distanceKm > 0) {
      setTargetPace(formatPace(timeSec / distanceKm));
    } else if (!value) {
      setTargetPace("");
    }
  };

  // Recalcule l'autre champ quand la distance change (source = allure si
  // saisie, sinon temps).
  const handleDistanceChange = (value) => {
    setDistanceKey(value);
    const km = value === "custom"
      ? Number(customMeters) / 1000
      : (DISTANCES.find((d) => d.key === value)?.meters || 0) / 1000;
    const paceSec = paceFromString(targetPace);
    const timeSec = timeFromString(targetTime);
    if (km > 0 && paceSec) {
      setTargetTime(formatTime(paceSec * km));
    } else if (km > 0 && timeSec) {
      setTargetPace(formatPace(timeSec / km));
    }
  };

  const paceSecLive = paceFromString(targetPace);
  const speedKmh = speedFromPace(paceSecLive);

  // Separation actifs/a venir vs passes pour la lisibilite.
  // nowTs via init paresseuse (Date.now() interdit dans le rendu : regle purity).
  const [nowTs] = useState(() => Date.now());
  const list = Array.isArray(races) ? [...races] : [];
  const upcomingRaces = [];
  const pastRaces = [];
  list.forEach((r) => {
    const isActive = activeRace?.id === r.id;
    const isFuture = new Date(r.raceDate).getTime() >= nowTs;
    if (isActive || isFuture) upcomingRaces.push(r);
    else pastRaces.push(r);
  });
  upcomingRaces.sort((a, b) => new Date(a.raceDate) - new Date(b.raceDate));
  pastRaces.sort((a, b) => new Date(b.raceDate) - new Date(a.raceDate));

  const resetForm = () => {
    setName(""); setRaceDate(""); setDistanceKey("10k"); setCustomMeters("");
    setTargetPace(""); setTargetTime(""); setElevationGain(""); setTerrain(""); setNotes(""); setError("");
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

    const timeSec = timeFromString(targetTime);
    if (targetTime.trim() && !timeSec) {
      setError("Temps attendu au format H:MM:SS ou MM:SS (ex. 0:45:30).");
      return;
    }
    if (timeSec) payload.targetDurationSeconds = timeSec;

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
        <h3>Objectifs actifs &amp; à venir</h3>
        <p className="reglages-row-hint">
          L'objectif principal (actif) pilote le countdown, le chrono prédit et le plan de taper dans Performance.
        </p>
        {upcomingRaces.length === 0 ? (
          <p className="reglages-row-hint">Aucun objectif actif ou à venir. Ajoute ta prochaine course ci-dessous.</p>
        ) : (
          <div className="reglages-objectives-list">
            {upcomingRaces.map((race) => (
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

      {pastRaces.length > 0 ? (
        <section className="reglages-card">
          <details>
            <summary className="reglages-advanced-summary">Objectifs passés ({pastRaces.length})</summary>
            <div className="reglages-objectives-list reglages-advanced-body">
              {pastRaces.map((race) => (
                <ObjectiveCard
                  key={race.id}
                  race={race}
                  isActive={false}
                  onArchive={handleArchive}
                  onReactivate={handleReactivate}
                  busy={isMutating}
                />
              ))}
            </div>
          </details>
        </section>
      ) : null}

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
              <select id="obj-dist" value={distanceKey} onChange={(e) => handleDistanceChange(e.target.value)}>
                {DISTANCES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
            {isCustom ? (
              <div className="reglages-field">
                <label htmlFor="obj-custom">Distance (m)</label>
                <input id="obj-custom" type="number" min="800" step="10" value={customMeters} placeholder="Ex. 15000"
                  onChange={(e) => { setCustomMeters(e.target.value); }}
                  onBlur={() => handleDistanceChange("custom")}
                />
              </div>
            ) : null}
          </div>

          {/* Objectif chrono : allure OU temps -> calcul auto de l'autre + vitesse */}
          <div className="reglages-objective-chrono">
            <span className="reglages-objective-chrono-title">Objectif chrono (optionnel)</span>
            <div className="reglages-objective-form-grid">
              <div className="reglages-field">
                <label htmlFor="obj-pace">Allure cible (MM:SS /km)</label>
                <input id="obj-pace" type="text" value={targetPace} placeholder="Ex. 4:50"
                  onChange={(e) => handlePaceChange(e.target.value)} />
              </div>
              <div className="reglages-field">
                <label htmlFor="obj-time">Temps cible (H:MM:SS)</label>
                <input id="obj-time" type="text" value={targetTime} placeholder="Ex. 0:45:30"
                  onChange={(e) => handleTimeChange(e.target.value)} />
              </div>
              <div className="reglages-field reglages-objective-chrono-derived">
                <label>Vitesse</label>
                <span className="reglages-objective-chrono-speed">
                  {speedKmh ? `${speedKmh.toFixed(1).replace(".", ",")} km/h` : "—"}
                </span>
              </div>
            </div>
            {distanceKm > 0 && (paceSecLive || timeFromString(targetTime)) ? (
              <span className="reglages-row-hint">
                Sur {formatDistance(distanceKm * 1000)} : {targetPace || "—"} /km · {targetTime || "—"}
                {speedKmh ? ` · ${speedKmh.toFixed(1).replace(".", ",")} km/h` : ""}
              </span>
            ) : (
              <span className="reglages-row-hint">Saisis l'allure ou le temps : l'autre se calcule selon la distance.</span>
            )}
          </div>

          <details className="reglages-objective-advanced">
            <summary className="reglages-advanced-summary">Détails avancés (optionnel)</summary>
            <div className="reglages-objective-form-grid reglages-advanced-body">
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
