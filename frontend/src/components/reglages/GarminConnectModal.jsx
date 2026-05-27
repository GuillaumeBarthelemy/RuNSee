import { memo, useEffect, useState } from "react";
import useToast from "../../hooks/useToast.js";
import useModal from "../../hooks/useModal.js";
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
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (open) {
      setEmail(""); setPassword(""); setShowPwd(false); setError(""); setInfo("");
      setConsentAccepted(false); setMfaCode(""); setMfaRequired(false);
    }
  }, [open]);

  const { containerRef, handleOverlayClick } = useModal({ open, onClose, busy: submitting });

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !consentAccepted) return;
    setError("");
    setInfo("");
    setSubmitting(true);
    try {
      const result = await connectGarmin({
        email,
        password,
        consentAccepted: true,
        mfaCode: mfaRequired ? mfaCode : undefined,
      });
      // Le backend renvoie 200 OK avec mfaRequired:true quand Garmin demande
      // une validation MFA (et non une erreur). On bascule en mode MFA.
      if (result?.mfaRequired) {
        setMfaRequired(true);
        setInfo(result?.message || "Garmin a envoyé un code de validation à 6 chiffres par email. Saisis-le ci-dessous pour finaliser la connexion.");
        return;
      }
      // Sinon la connexion est effective
      pushToast({ message: result?.message || "Garmin connecté.", tone: "success" });
      onSuccess();
      onClose();
    } catch (err) {
      const data = err?.response?.data;
      // Cas d'erreur : on regarde si l'erreur contient un signal MFA
      if (data?.mfaRequired || /mfa|two-factor|verification/i.test(data?.userMessage || data?.message || "")) {
        setMfaRequired(true);
        setInfo("Code MFA requis. Saisis le code à 6 chiffres reçu par email Garmin.");
      } else {
        setError(extractErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reglages-modal-overlay" onClick={handleOverlayClick} role="presentation">
      <form ref={containerRef} className="reglages-modal" role="dialog" aria-modal="true" aria-labelledby="reglages-garmin-title" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
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

        {mfaRequired ? (
          <div className="reglages-field">
            <label htmlFor="rg-garmin-mfa">Code MFA (6 chiffres)</label>
            <input
              id="rg-garmin-mfa"
              type="text"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              autoComplete="one-time-code"
              inputMode="numeric"
              required
              placeholder="123456"
            />
          </div>
        ) : null}

        <label className="reglages-consent-row">
          <input
            type="checkbox"
            checked={consentAccepted}
            onChange={(e) => setConsentAccepted(e.target.checked)}
            required
          />
          <span>
            J'accepte que mes identifiants soient utilisés pour établir une session
            Garmin Connect. L'intégration Garmin est <strong>expérimentale</strong> et utilise
            une API non officielle ; elle peut cesser de fonctionner sans préavis.
          </span>
        </label>

        {info ? <div className="reglages-modal-info">{info}</div> : null}
        {error ? <div className="reglages-modal-error">{error}</div> : null}

        <div className="reglages-modal-actions">
          <button type="button" className="reglages-btn" onClick={onClose} disabled={submitting}>Annuler</button>
          <button
            type="submit"
            className="reglages-btn reglages-btn-primary"
            disabled={!email || !password || !consentAccepted || submitting || (mfaRequired && !mfaCode)}
          >
            {submitting ? "Connexion…" : mfaRequired ? "Valider le code MFA" : "Connecter Garmin"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default memo(GarminConnectModal);
