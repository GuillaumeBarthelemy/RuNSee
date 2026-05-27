import { memo, useEffect, useState } from "react";
import useModal from "../../hooks/useModal.js";

/**
 * FtpModal — Modifier la FTP (Functional Threshold Power) en watts.
 */
function FtpModal({
  open = false,
  initialFtp = 250,
  onClose = () => {},
  onSave = () => {},
}) {
  const [ftp, setFtp] = useState(initialFtp);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setFtp(initialFtp || "");
      setError("");
    }
  }, [open, initialFtp]);

  const { containerRef, handleOverlayClick } = useModal({ open, onClose, busy: submitting });

  if (!open) return null;

  const ftpNum = Number(ftp);
  const ftpValid = Number.isFinite(ftpNum) && ftpNum >= 50 && ftpNum <= 600;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ftpValid) return;
    setError("");
    setSubmitting(true);
    try {
      await onSave({ ftpWatts: ftpNum });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.userMessage || err?.message || "Erreur de sauvegarde.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reglages-modal-overlay" onClick={handleOverlayClick} role="presentation">
      <form ref={containerRef} className="reglages-modal" role="dialog" aria-modal="true" aria-labelledby="reglages-ftp-title" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3 id="reglages-ftp-title" className="reglages-modal-title">Modifier ta FTP</h3>
        <p className="reglages-modal-description">
          La FTP (Functional Threshold Power) est la puissance maximale que tu peux soutenir
          sur 1 heure. Elle permet de calculer tes zones de puissance.
        </p>

        <div className="reglages-field">
          <label htmlFor="rg-ftp">FTP (watts)</label>
          <input
            id="rg-ftp"
            type="number"
            value={ftp}
            onChange={(e) => setFtp(e.target.value)}
            min={50}
            max={600}
            required
            autoFocus
          />
          {!ftpValid && ftp !== "" ? <span className="reglages-field-error">Entre 50 et 600 W.</span> : null}
        </div>

        {error ? <div className="reglages-modal-error">{error}</div> : null}

        <div className="reglages-modal-actions">
          <button type="button" className="reglages-btn" onClick={onClose} disabled={submitting}>Annuler</button>
          <button type="submit" className="reglages-btn reglages-btn-primary" disabled={!ftpValid || submitting}>
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default memo(FtpModal);
