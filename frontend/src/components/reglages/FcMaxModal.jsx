import { memo, useEffect, useState } from "react";
import useModal from "../../hooks/useModal.js";

/**
 * FcMaxModal — Modifier la FC max + FC repos + sexe biologique.
 *
 * Props :
 *   - open
 *   - initialFcMax / initialRestingHr / initialBiologicalSex
 *   - onClose
 *   - onSave(payload) : { heartRateMax, restingHeartrate, biologicalSex }
 */
function FcMaxModal({
  open = false,
  initialFcMax = 184,
  initialRestingHr = 60,
  initialBiologicalSex = "unspecified",
  onClose = () => {},
  onSave = () => {},
}) {
  const [fcMax, setFcMax] = useState(initialFcMax);
  const [restingHr, setRestingHr] = useState(initialRestingHr);
  const [sex, setSex] = useState(initialBiologicalSex);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setFcMax(initialFcMax);
      setRestingHr(initialRestingHr);
      setSex(initialBiologicalSex);
      setError("");
    }
  }, [open, initialFcMax, initialRestingHr, initialBiologicalSex]);

  const { containerRef, handleOverlayClick } = useModal({ open, onClose, busy: submitting });

  if (!open) return null;

  const fcMaxNum = Number(fcMax);
  const restingNum = Number(restingHr);
  const fcMaxValid = Number.isFinite(fcMaxNum) && fcMaxNum >= 80 && fcMaxNum <= 260;
  const restingValid = Number.isFinite(restingNum) && restingNum >= 30 && restingNum <= 120;
  const restingBelowMax = restingNum < fcMaxNum - 20;
  const canSubmit = fcMaxValid && restingValid && restingBelowMax;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      await onSave({
        heartRateMax: fcMaxNum,
        restingHeartrate: restingNum,
        biologicalSex: sex,
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.userMessage || err?.message || "Erreur de sauvegarde.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reglages-modal-overlay" onClick={handleOverlayClick} role="presentation">
      <form ref={containerRef} className="reglages-modal" role="dialog" aria-modal="true" aria-labelledby="reglages-fcmax-title" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3 id="reglages-fcmax-title" className="reglages-modal-title">Modifier ta fréquence cardiaque</h3>
        <p className="reglages-modal-description">
          Ces valeurs personnalisent les zones FC, la TRIMP et l'estimation de la charge.
          Garde-les à jour quand tes tests terrain évoluent.
        </p>

        <div className="reglages-field">
          <label htmlFor="rg-fc-max">FC max (bpm)</label>
          <input
            id="rg-fc-max"
            type="number"
            value={fcMax}
            onChange={(e) => setFcMax(e.target.value)}
            min={80}
            max={260}
            required
          />
          {!fcMaxValid && fcMax !== "" ? <span className="reglages-field-error">Entre 80 et 260 bpm.</span> : null}
        </div>

        <div className="reglages-field">
          <label htmlFor="rg-fc-rest">FC repos (bpm)</label>
          <input
            id="rg-fc-rest"
            type="number"
            value={restingHr}
            onChange={(e) => setRestingHr(e.target.value)}
            min={30}
            max={120}
            required
          />
          {!restingValid && restingHr !== "" ? <span className="reglages-field-error">Entre 30 et 120 bpm.</span> : null}
          {restingValid && fcMaxValid && !restingBelowMax ? (
            <span className="reglages-field-error">La FC repos doit être au moins 20 bpm sous la FC max.</span>
          ) : null}
        </div>

        <div className="reglages-field">
          <label htmlFor="rg-sex">Sexe biologique</label>
          <select id="rg-sex" value={sex} onChange={(e) => setSex(e.target.value)}>
            <option value="unspecified">Non précisé</option>
            <option value="male">Homme</option>
            <option value="female">Femme</option>
          </select>
        </div>

        {error ? <div className="reglages-modal-error">{error}</div> : null}

        <div className="reglages-modal-actions">
          <button type="button" className="reglages-btn" onClick={onClose} disabled={submitting}>Annuler</button>
          <button type="submit" className="reglages-btn reglages-btn-primary" disabled={!canSubmit || submitting}>
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default memo(FcMaxModal);
