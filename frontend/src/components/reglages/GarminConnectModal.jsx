import { memo, useEffect, useState } from "react";
import useToast from "../../hooks/useToast.js";
import { connectGarmin } from "../../services/connexions.service.js";

function extractErrorMessage(err) {
  return err?.response?.data?.userMessage || err?.response?.data?.message || err?.message || "Erreur de connexion Garmin.";
}

/**
 * GarminConnectModal — Modal de connexion Garmin Connect (email + password).
 *
 * Le mot de passe est envoye au backend qui l'utilise une seule fois pour
 * etablir une session Garmin via le bridge Python (puis stocke le token).
 * Cf. backend/src/services/providers/garminProvider.service.js
 */
function GarminConnectModal({ open = false, onClose = () => {}, onSuccess = () => {} }) {
  const { pushToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setEmail(""); setPassword(""); setShowPwd(false); setError("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => { if (e.key === "Escape" && !submitting) onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose, submitting]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setError("");
    setSubmitting(true);
    try {
      await connectGarmin({ email, password });
      pushToast({ message: "Garmin connecté.", tone: "success" });
      onSuccess();
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reglages-modal-overlay" onClick={() => !submitting && onClose()} role="presentation">
      <form className="reglages-modal" role="dialog" aria-modal="true" aria-labelledby="reglages-garmin-title" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3 id="reglages-garmin-title" className="reglages-modal-title">Connecter Garmin Connect</h3>
        <p className="reglages-modal-description">
          Identifie-toi avec ton compte Garmin Connect. Tes identifiants sont utilisés
          uniquement pour établir la première session et ne sont jamais stockés en clair.
        </p>

        <div className="reglages-field">
          <label htmlFor="rg-garmin-email">Email Garmin Connect</label>
          <input
            id="rg-garmin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div className="reglages-field">
          <label htmlFor="rg-garmin-password">Mot de passe Garmin</label>
          <input
            id="rg-garmin-password"
            type={showPwd ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <label className="reglages-pwd-toggle">
          <input type="checkbox" checked={showPwd} onChange={(e) => setShowPwd(e.target.checked)} />
          Afficher le mot de passe
        </label>

        {error ? <div className="reglages-modal-error">{error}</div> : null}

        <div className="reglages-modal-actions">
          <button type="button" className="reglages-btn" onClick={onClose} disabled={submitting}>Annuler</button>
          <button type="submit" className="reglages-btn reglages-btn-primary" disabled={!email || !password || submitting}>
            {submitting ? "Connexion…" : "Connecter Garmin"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default memo(GarminConnectModal);
