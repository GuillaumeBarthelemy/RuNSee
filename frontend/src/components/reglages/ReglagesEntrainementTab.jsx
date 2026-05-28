import { memo, useCallback, useEffect, useMemo, useState } from "react";
import useToast from "../../hooks/useToast.js";
import useUserPreferences from "../../hooks/useUserPreferences.js";
import {
  getTrainingAnalyticsSettings,
  saveTrainingAnalyticsSettings,
} from "../../services/trainingAnalyticsSettings.service.js";
import FcMaxModal from "./FcMaxModal.jsx";
import FtpModal from "./FtpModal.jsx";
import ZonesEditModal from "./ZonesEditModal.jsx";

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

function formatDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function extractErrorMessage(err, fallback) {
  return err?.response?.data?.userMessage || err?.response?.data?.message || err?.message || fallback;
}

/**
 * ReglagesEntrainementTab — Mockup p.23 (Phase 2).
 *
 * Wiring complet :
 *   - Charge GET /settings/training-analytics au montage
 *   - 3 modals : FcMaxModal, FtpModal, ZonesEditModal
 *   - Préférences calcul (lissage / méthode zones / GAP) -> PUT settings
 *   - Préférences unités (vitesse / allure / poids) -> UserPreferences (units global)
 *     (couvre metric vs imperial). Speed/pace specifiques restent en local pour l'instant.
 */
function ReglagesEntrainementTab() {
  const { pushToast } = useToast();
  const { units } = useUserPreferences();

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingPref, setSavingPref] = useState(false);

  const [fcModalOpen, setFcModalOpen] = useState(false);
  const [ftpModalOpen, setFtpModalOpen] = useState(false);
  const [zonesModalOpen, setZonesModalOpen] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTrainingAnalyticsSettings();
      setSettings(data?.settings || null);
    } catch (err) {
      pushToast({ message: extractErrorMessage(err, "Impossible de charger les paramètres."), tone: "error" });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const fcMax = settings?.heartRateMax ?? 184;
  const restingHr = settings?.restingHeartrate ?? 60;
  const biologicalSex = settings?.biologicalSex || "unspecified";
  const ftp = settings?.ftpWatts ?? null;
  const effectiveFrom = settings?.effectiveFrom || null;

  // Zones : utilise les valeurs DB si presentes, sinon recalcule depuis fcMax
  const zones = useMemo(() => {
    const z1 = settings?.heartRateZone1Max;
    const z2 = settings?.heartRateZone2Max;
    const z3 = settings?.heartRateZone3Max;
    const z4 = settings?.heartRateZone4Max;
    const hasCustom = z1 && z2 && z3 && z4;
    const uppers = hasCustom
      ? [z1, z2, z3, z4, fcMax]
      : ZONE_META.map((z) => Math.round(fcMax * (z.maxPct / 100)));
    return ZONE_META.map((z, i) => {
      const upper = uppers[i];
      const prevUpper = i === 0 ? 0 : uppers[i - 1];
      const lower = i === 0 ? 0 : prevUpper + 1;
      let display;
      if (i === 0) display = `< ${upper + 1} bpm`;
      else if (i === ZONE_META.length - 1) display = `> ${prevUpper} bpm`;
      else display = `${lower} – ${upper} bpm`;
      const pctMax = Math.round((upper / fcMax) * 100);
      const pctPrev = i === 0 ? 0 : Math.round((prevUpper / fcMax) * 100);
      let displayPct;
      if (i === 0) displayPct = `< ${pctMax}%`;
      else if (i === ZONE_META.length - 1) displayPct = `> ${pctPrev}%`;
      else displayPct = `${pctPrev} – ${pctMax}%`;
      return { ...z, lower, upper, display, displayPct };
    });
  }, [settings, fcMax]);

  // --- Save handlers (modals) ---
  const handleSaveFc = async (payload) => {
    const next = { ...(settings || {}), ...payload };
    await saveTrainingAnalyticsSettings(next);
    pushToast({ message: "Fréquence cardiaque enregistrée.", tone: "success" });
    await loadSettings();
  };
  const handleSaveFtp = async (payload) => {
    const next = { ...(settings || {}), ...payload };
    await saveTrainingAnalyticsSettings(next);
    pushToast({ message: "FTP enregistrée.", tone: "success" });
    await loadSettings();
  };
  const handleSaveZones = async (payload) => {
    const next = { ...(settings || {}), ...payload };
    await saveTrainingAnalyticsSettings(next);
    pushToast({ message: "Zones FC enregistrées.", tone: "success" });
    await loadSettings();
  };

  // --- Save handler (préférences calcul) ---
  const updatePreference = async (patch) => {
    if (savingPref) return;
    setSavingPref(true);
    const next = { ...(settings || {}), ...patch };
    setSettings(next); // Optimistic
    try {
      await saveTrainingAnalyticsSettings(next);
      pushToast({ message: "Préférence enregistrée.", tone: "success", duration: 2000 });
    } catch (err) {
      pushToast({ message: extractErrorMessage(err, "Erreur."), tone: "error" });
      await loadSettings(); // rollback
    } finally {
      setSavingPref(false);
    }
  };

  const speedUnit = units === "imperial" ? "mph" : "kmh";
  const paceUnit = units === "imperial" ? "min_mi" : "min_km";

  if (loading) {
    return <div className="reglages-tab"><p>Chargement…</p></div>;
  }

  return (
    <div className="reglages-tab reglages-entrainement-tab">
      <div className="reglages-entrainement-grid">
        <section className="reglages-card">
          <h3>Fréquence cardiaque</h3>
          <div className="reglages-metric-row">
            <div>
              <small>FC max (bpm)</small>
              <strong className="reglages-metric-value">{fcMax}</strong>
              <span className="reglages-metric-hint">
                FC repos : {restingHr} bpm · Sexe : {biologicalSex === "male" ? "Homme" : biologicalSex === "female" ? "Femme" : "—"}
              </span>
              {effectiveFrom ? (
                <span className="reglages-metric-hint">Définie le {formatDate(effectiveFrom)}</span>
              ) : null}
            </div>
            <button type="button" className="reglages-btn" onClick={() => setFcModalOpen(true)}>Modifier</button>
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
          <button type="button" className="reglages-btn reglages-btn-block" onClick={() => setZonesModalOpen(true)}>
            Modifier les zones
          </button>
        </section>

        <section className="reglages-card">
          <h3>Zones de puissance (FTP)</h3>
          <div className="reglages-metric-row">
            <div>
              <small>FTP (W)</small>
              <strong className="reglages-metric-value">{ftp || "—"}</strong>
              <span className="reglages-metric-hint">
                {ftp ? `Définie le ${formatDate(effectiveFrom)}` : "Pas encore définie"}
              </span>
            </div>
            <button type="button" className="reglages-btn" onClick={() => setFtpModalOpen(true)}>
              {ftp ? "Modifier" : "Définir"}
            </button>
          </div>
        </section>

        <section className="reglages-card">
          <h3>Unités d'entraînement</h3>
          <div className="reglages-field reglages-field-row">
            <label>Vitesse</label>
            <select value={speedUnit} disabled>
              {SPEED_UNIT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="reglages-field reglages-field-row">
            <label>Allure</label>
            <select value={paceUnit} disabled>
              {PACE_UNIT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="reglages-field reglages-field-row">
            <label>Puissance</label>
            <select defaultValue="watts" disabled>
              <option value="watts">Watts</option>
              <option value="w_kg">W/kg</option>
            </select>
          </div>
          <div className="reglages-field reglages-field-row">
            <label>Poids</label>
            <select defaultValue={units === "imperial" ? "lb" : "kg"} disabled>
              <option value="kg">Kilogrammes</option>
              <option value="lb">Livres</option>
            </select>
          </div>
          <p className="reglages-metric-hint" style={{ marginTop: 4 }}>
            Pour changer le système d'unités, va dans <strong>Compte → Préférences d'affichage → Unités</strong>.
          </p>
        </section>
      </div>

      <section className="reglages-card reglages-card-full">
        <h3>Préférences de calcul</h3>
        <div className="reglages-calc-grid">
          <div className="reglages-field">
            <label>Méthode de lissage de la FC</label>
            <select
              value={settings?.paceSmoothingMethod || "exp30"}
              onChange={(e) => updatePreference({ paceSmoothingMethod: e.target.value })}
              disabled={savingPref}
            >
              {SMOOTHING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="reglages-field">
            <label>Calcul des zones</label>
            <select
              value={settings?.zonesCalculationMethod || "custom_hr"}
              onChange={(e) => updatePreference({ zonesCalculationMethod: e.target.value })}
              disabled={savingPref}
            >
              {ZONES_METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="reglages-field">
            <label>Allure de référence (GAP)</label>
            <select
              value={settings?.gapEnabled === false ? "off" : "on"}
              onChange={(e) => updatePreference({ gapEnabled: e.target.value === "on" })}
              disabled={savingPref}
            >
              {GAP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Modals */}
      <FcMaxModal
        open={fcModalOpen}
        initialFcMax={fcMax}
        initialRestingHr={restingHr}
        initialBiologicalSex={biologicalSex}
        onClose={() => setFcModalOpen(false)}
        onSave={handleSaveFc}
      />
      <FtpModal
        open={ftpModalOpen}
        initialFtp={ftp || 250}
        onClose={() => setFtpModalOpen(false)}
        onSave={handleSaveFtp}
      />
      <ZonesEditModal
        open={zonesModalOpen}
        initialValues={settings || {}}
        fcMax={fcMax}
        onClose={() => setZonesModalOpen(false)}
        onSave={handleSaveZones}
      />
    </div>
  );
}

export default memo(ReglagesEntrainementTab);
