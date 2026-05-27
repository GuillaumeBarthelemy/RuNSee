import { memo, useEffect, useState } from "react";
import { changePassword } from "../../services/account.service.js";
import useToast from "../../hooks/useToast.js";
import useModal from "../../hooks/useModal.js";

function extractErrorMessage(err) {
  return err?.response?.data?.userMessage || err?.response?.data?.message || err?.message || "Erreur lors du changement de mot de passe.";
}

// Politique alignee sur backend `validatePassword` :
//   - longueur minimale 10
//   - au moins 3 categories parmi : majuscule, minuscule, chiffre, special
//   - blacklist top mots de passe courants
const COMMON_PASSWORDS = new Set([
  "password", "123456", "12345678", "qwerty", "abc123", "letmein",
  "welcome", "monkey", "dragon", "password1", "password123", "admin",
  "admin123", "iloveyou", "azerty", "azerty123", "motdepasse", "soleil",
  "12345", "123456789", "1234567890", "qwerty123", "1q2w3e4r", "11111111",
  "00000000", "987654321", "qwertyuiop", "asdfghjkl", "zxcvbnm", "passw0rd",
]);

function evaluateStrength(password) {
  if (!password) return { score: 0, label: "—", valid: false, reason: "" };
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const categories = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;

  let score = 0;
  if (password.length >= 10) score += 1;
  if (password.length >= 14) score += 1;
  if (categories >= 2) score += 1;
  if (categories >= 3) score += 1;
  if (categories === 4 && password.length >= 12) score += 1;

  const isCommon = COMMON_PASSWORDS.has(password.toLowerCase());
  if (isCommon) score = Math.min(score, 1);

  let reason = "";
  let valid = true;
  if (password.length < 10) {
    valid = false;
    reason = "Au moins 10 caractères requis.";
  } else if (categories < 3) {
    valid = false;
    reason = "Combine au moins 3 types : majuscule, minuscule, chiffre, caractère spécial.";
  } else if (isCommon) {
    valid = false;
    reason = "Mot de passe trop courant.";
  }

  const labels = ["Très faible", "Faible", "Moyen", "Bon", "Fort", "Très fort"];
  return { score, label: labels[Math.min(score, labels.length - 1)], valid, reason };
}

function PasswordChangeModal({ open = false, onClose = () => {} }) {
  const { pushToast } = useToast();
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setOldPwd(""); setNewPwd(""); setConfirmPwd("");
      setShowPwd(false); setError("");
    }
  }, [open]);

  const { containerRef, handleOverlayClick } = useModal({ open, onClose, busy: submitting });

  if (!open) return null;

  const strength = evaluateStrength(newPwd);
  const newPwdValid = strength.valid;
  const matchValid = newPwd && confirmPwd && newPwd === confirmPwd;
  const canSubmit = oldPwd && newPwdValid && matchValid && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      const result = await changePassword({ oldPassword: oldPwd, newPassword: newPwd });
      const revoked = result?.revokedSessionsCount || 0;
      pushToast({
        message: revoked > 0
          ? `Mot de passe modifié. ${revoked} autre${revoked > 1 ? "s" : ""} session${revoked > 1 ? "s" : ""} déconnectée${revoked > 1 ? "s" : ""}.`
          : "Mot de passe modifié.",
        tone: "success",
      });
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reglages-modal-overlay" onClick={handleOverlayClick} role="presentation">
      <form ref={containerRef} className="reglages-modal" role="dialog" aria-modal="true" aria-labelledby="reglages-pwd-title" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3 id="reglages-pwd-title" className="reglages-modal-title">Modifier le mot de passe</h3>
        <p className="reglages-modal-description">
          Pour des raisons de sécurité, modifier ton mot de passe déconnectera tous tes autres appareils.
        </p>

        <div className="reglages-field">
          <label htmlFor="rg-pwd-old">Mot de passe actuel</label>
          <input
            id="rg-pwd-old"
            type={showPwd ? "text" : "password"}
            value={oldPwd}
            onChange={(e) => setOldPwd(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <div className="reglages-field">
          <label htmlFor="rg-pwd-new">Nouveau mot de passe</label>
          <input
            id="rg-pwd-new"
            type={showPwd ? "text" : "password"}
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            autoComplete="new-password"
            required
            minLength={10}
          />
          {newPwd ? (
            <div className={`reglages-pwd-strength reglages-pwd-strength-${strength.score}`}>
              <span className="reglages-pwd-strength-bar"><span style={{ width: `${(strength.score / 5) * 100}%` }} /></span>
              <span className="reglages-pwd-strength-label">{strength.label}</span>
            </div>
          ) : null}
          {newPwd && !newPwdValid ? (
            <span className="reglages-field-error">{strength.reason}</span>
          ) : null}
          {!newPwd ? (
            <span className="reglages-field-hint">10 caractères min · 3 types parmi : majuscule, minuscule, chiffre, spécial.</span>
          ) : null}
        </div>

        <div className="reglages-field">
          <label htmlFor="rg-pwd-confirm">Confirmer le nouveau mot de passe</label>
          <input
            id="rg-pwd-confirm"
            type={showPwd ? "text" : "password"}
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            autoComplete="new-password"
            required
          />
          {confirmPwd && !matchValid ? (
            <span className="reglages-field-error">Les mots de passe ne correspondent pas.</span>
          ) : null}
        </div>

        <label className="reglages-pwd-toggle">
          <input type="checkbox" checked={showPwd} onChange={(e) => setShowPwd(e.target.checked)} />
          Afficher les mots de passe
        </label>

        {error ? <div className="reglages-modal-error">{error}</div> : null}

        <div className="reglages-modal-actions">
          <button type="button" className="reglages-btn" onClick={onClose} disabled={submitting}>Annuler</button>
          <button type="submit" className="reglages-btn reglages-btn-primary" disabled={!canSubmit}>
            {submitting ? "Modification…" : "Modifier"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default memo(PasswordChangeModal);
