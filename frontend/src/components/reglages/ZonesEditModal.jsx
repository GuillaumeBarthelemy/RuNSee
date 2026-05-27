import { memo, useEffect, useMemo, useState } from "react";
import useModal from "../../hooks/useModal.js";

/**
 * ZonesEditModal — Edition manuelle des zones FC (Z1max, Z2max, Z3max, Z4max).
 * Z1 = < Z1max  |  Z2 = Z1max+1 → Z2max  |  Z3 = Z2max+1 → Z3max  |
 * Z4 = Z3max+1 → Z4max  |  Z5 = > Z4max
 *
 * Validation : Z1max < Z2max < Z3max < Z4max < fcMax
 */
const ZONE_DEFS = [
  { key: "z1", label: "Z1 Récupération (max)", fieldKey: "heartRateZone1Max", color: "#3b82f6" },
  { key: "z2", label: "Z2 Endurance (max)",    fieldKey: "heartRateZone2Max", color: "#22c55e" },
  { key: "z3", label: "Z3 Tempo (max)",        fieldKey: "heartRateZone3Max", color: "#eab308" },
  { key: "z4", label: "Z4 Seuil (max)",        fieldKey: "heartRateZone4Max", color: "#f97316" },
];

function ZonesEditModal({
  open = false,
  initialValues = {},
  fcMax = 184,
  onClose = () => {},
  onSave = () => {},
}) {
  const [values, setValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      // Si initialValues vide -> utilise valeurs par defaut % FC max
      const defaults = {
        heartRateZone1Max: initialValues.heartRateZone1Max ?? Math.round(fcMax * 0.64),
        heartRateZone2Max: initialValues.heartRateZone2Max ?? Math.round(fcMax * 0.75),
        heartRateZone3Max: initialValues.heartRateZone3Max ?? Math.round(fcMax * 0.84),
        heartRateZone4Max: initialValues.heartRateZone4Max ?? Math.round(fcMax * 0.93),
      };
      setValues(defaults);
      setError("");
    }
  }, [open, initialValues, fcMax]);

  const { containerRef, handleOverlayClick } = useModal({ open, onClose, busy: submitting });

  const validation = useMemo(() => {
    const z1 = Number(values.heartRateZone1Max);
    const z2 = Number(values.heartRateZone2Max);
    const z3 = Number(values.heartRateZone3Max);
    const z4 = Number(values.heartRateZone4Max);
    const allFinite = [z1, z2, z3, z4].every((n) => Number.isFinite(n) && n >= 60 && n <= 250);
    if (!allFinite) return { ok: false, reason: "Chaque zone doit être entre 60 et 250 bpm." };
    if (!(z1 < z2 && z2 < z3 && z3 < z4)) return { ok: false, reason: "Les zones doivent être strictement croissantes (Z1 < Z2 < Z3 < Z4)." };
    if (z4 >= fcMax) return { ok: false, reason: `Z4 max doit être < FC max (${fcMax}).` };
    return { ok: true };
  }, [values, fcMax]);

  if (!open) return null;

  const handleField = (key, val) => {
    setValues((prev) => ({ ...prev, [key]: val === "" ? "" : Number(val) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validation.ok) return;
    setError("");
    setSubmitting(true);
    try {
      await onSave(values);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.userMessage || err?.message || "Erreur de sauvegarde.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setValues({
      heartRateZone1Max: Math.round(fcMax * 0.64),
      heartRateZone2Max: Math.round(fcMax * 0.75),
      heartRateZone3Max: Math.round(fcMax * 0.84),
      heartRateZone4Max: Math.round(fcMax * 0.93),
    });
  };

  return (
    <div className="reglages-modal-overlay" onClick={handleOverlayClick} role="presentation">
      <form ref={containerRef} className="reglages-modal" role="dialog" aria-modal="true" aria-labelledby="reglages-zones-title" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3 id="reglages-zones-title" className="reglages-modal-title">Modifier les zones de fréquence cardiaque</h3>
        <p className="reglages-modal-description">
          Saisis le seuil supérieur de chaque zone (en bpm). La <strong>Z5 VO₂max</strong>
          {" "}correspond à tout ce qui est au-dessus de Z4. FC max actuelle : <strong>{fcMax} bpm</strong>.
        </p>

        {ZONE_DEFS.map((zone) => (
          <div key={zone.key} className="reglages-field">
            <label htmlFor={`rg-${zone.key}`}>
              <span className="reglages-zone-dot" style={{ background: zone.color, marginRight: 8 }} />
              {zone.label}
            </label>
            <input
              id={`rg-${zone.key}`}
              type="number"
              value={values[zone.fieldKey] ?? ""}
              onChange={(e) => handleField(zone.fieldKey, e.target.value)}
              min={60}
              max={250}
              required
            />
          </div>
        ))}

        {!validation.ok && Object.values(values).some((v) => v !== "" && v != null) ? (
          <div className="reglages-modal-info">{validation.reason}</div>
        ) : null}

        {error ? <div className="reglages-modal-error">{error}</div> : null}

        <div className="reglages-modal-actions">
          <button type="button" className="reglages-btn reglages-btn-soft" onClick={handleReset} disabled={submitting}>
            Valeurs % FC max
          </button>
          <button type="button" className="reglages-btn" onClick={onClose} disabled={submitting}>Annuler</button>
          <button type="submit" className="reglages-btn reglages-btn-primary" disabled={!validation.ok || submitting}>
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default memo(ZonesEditModal);
