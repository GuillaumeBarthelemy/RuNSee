import { memo, useMemo, useState } from "react";

const ZONE_META = [
  { key: "z1", label: "Z1 Récupération", maxPct: 64, color: "#3b82f6" },
  { key: "z2", label: "Z2 Endurance",    maxPct: 75, color: "#22c55e" },
  { key: "z3", label: "Z3 Tempo",        maxPct: 84, color: "#eab308" },
  { key: "z4", label: "Z4 Seuil",        maxPct: 93, color: "#f97316" },
  { key: "z5", label: "Z5 VO₂max",       maxPct: 100, color: "#ef4444" },
];

const SMOOTHING_OPTIONS = [
  { value: "exp30", label: "Exponentielle (30 s)" },
  { value: "ma15",  label: "Moyenne mobile (15 s)" },
  { value: "none",  label: "Brute" },
];
const ZONES_METHOD_OPTIONS = [
  { value: "custom_hr",  label: "Personnalisé (FC max)" },
  { value: "karvonen",   label: "Karvonen (FC réserve)" },
  { value: "lactate",    label: "Seuil lactique" },
];
const GAP_OPTIONS = [
  { value: "on",  label: "Activée" },
  { value: "off", label: "Désactivée" },
];
const PACE_UNIT_OPTIONS = [
  { value: "min_km", label: "min/km" },
  { value: "min_mi", label: "min/mi" },
];
const SPEED_UNIT_OPTIONS = [
  { value: "kmh", label: "km/h" },
  { value: "mph", label: "mph" },
];

/**
 * ReglagesEntrainementTab — Mockup p.23 onglet Entraînement.
 *
 * FC max + zones / FTP + unites / preferences de calcul.
 */
function ReglagesEntrainementTab({ fcMax = 184, ftp = 268, lastFcUpdate = "28 avr. 2025", lastFtpUpdate = "15 avr. 2025" }) {
  const [smoothing, setSmoothing] = useState("exp30");
  const [zonesMethod, setZonesMethod] = useState("custom_hr");
  const [gap, setGap] = useState("on");
  const [speedUnit, setSpeedUnit] = useState("kmh");
  const [paceUnit, setPaceUnit] = useState("min_km");
  const [powerUnit, setPowerUnit] = useState("watts");
  const [weightUnit, setWeightUnit] = useState("kg");

  // Calcul des zones (FC max-based)
  const zones = useMemo(() => {
    // Calcule d'abord les bornes (uppers), puis derive lower depuis l'index precedent
    const uppers = ZONE_META.map((z) => Math.round(fcMax * (z.maxPct / 100)));
    return ZONE_META.map((z, i) => {
      const upper = uppers[i];
      const prevUpper = i === 0 ? 0 : uppers[i - 1];
      const lower = i === 0 ? 0 : prevUpper + 1;
      let display;
      if (i === 0) display = `< ${upper + 1} bpm`;
      else if (i === ZONE_META.length - 1) display = `> ${prevUpper} bpm`;
      else display = `${lower} – ${upper} bpm`;
      let displayPct;
      if (i === 0) displayPct = `< ${z.maxPct}%`;
      else if (i === ZONE_META.length - 1) displayPct = `> ${ZONE_META[i - 1].maxPct}%`;
      else displayPct = `${ZONE_META[i - 1].maxPct} – ${z.maxPct}%`;
      return { ...z, lower, upper, display, displayPct };
    });
  }, [fcMax]);

  return (
    <div className="reglages-tab reglages-entrainement-tab">
      <div className="reglages-entrainement-grid">
        <section className="reglages-card">
          <h3>Fréquence cardiaque</h3>
          <div className="reglages-metric-row">
            <div>
              <small>FC max (bpm)</small>
              <strong className="reglages-metric-value">{fcMax}</strong>
              <span className="reglages-metric-hint">Définie le {lastFcUpdate}</span>
            </div>
            <button type="button" className="reglages-btn">Modifier</button>
          </div>
        </section>

        <section className="reglages-card">
          <h3>Zones de fréquence cardiaque</h3>
          <ul className="reglages-zones-list">
            {zones.map((z) => (
              <li key={z.key} className="reglages-zone-row">
                <span className="reglages-zone-dot" style={{ background: z.color }} />
                <span className="reglages-zone-label">{z.label}</span>
                <span className="reglages-zone-range">{z.display}</span>
                <span className="reglages-zone-pct">{z.displayPct}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="reglages-btn reglages-btn-block">Modifier les zones</button>
        </section>

        <section className="reglages-card">
          <h3>Zones de puissance (FTP)</h3>
          <div className="reglages-metric-row">
            <div>
              <small>FTP (W)</small>
              <strong className="reglages-metric-value">{ftp}</strong>
              <span className="reglages-metric-hint">Définie le {lastFtpUpdate}</span>
            </div>
            <button type="button" className="reglages-btn">Modifier</button>
          </div>
        </section>

        <section className="reglages-card">
          <h3>Unités d'entraînement</h3>
          <div className="reglages-field reglages-field-row">
            <label>Vitesse</label>
            <select value={speedUnit} onChange={(e) => setSpeedUnit(e.target.value)}>
              {SPEED_UNIT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="reglages-field reglages-field-row">
            <label>Allure</label>
            <select value={paceUnit} onChange={(e) => setPaceUnit(e.target.value)}>
              {PACE_UNIT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="reglages-field reglages-field-row">
            <label>Puissance</label>
            <select value={powerUnit} onChange={(e) => setPowerUnit(e.target.value)}>
              <option value="watts">Watts</option>
              <option value="w_kg">W/kg</option>
            </select>
          </div>
          <div className="reglages-field reglages-field-row">
            <label>Poids</label>
            <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)}>
              <option value="kg">Kilogrammes</option>
              <option value="lb">Livres</option>
            </select>
          </div>
        </section>
      </div>

      <section className="reglages-card reglages-card-full">
        <h3>Préférences de calcul</h3>
        <div className="reglages-calc-grid">
          <div className="reglages-field">
            <label>Méthode de lissage de la FC</label>
            <select value={smoothing} onChange={(e) => setSmoothing(e.target.value)}>
              {SMOOTHING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="reglages-field">
            <label>Calcul des zones</label>
            <select value={zonesMethod} onChange={(e) => setZonesMethod(e.target.value)}>
              {ZONES_METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="reglages-field">
            <label>Allure de référence (GAP)</label>
            <select value={gap} onChange={(e) => setGap(e.target.value)}>
              {GAP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </section>
    </div>
  );
}

export default memo(ReglagesEntrainementTab);
