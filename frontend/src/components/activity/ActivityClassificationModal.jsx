import { memo, useEffect, useMemo, useState } from "react";
import useModal from "../../hooks/useModal.js";
import useToast from "../../hooks/useToast.js";
import {
  SESSION_TYPES,
  SESSION_MARKERS,
  MAX_MARKERS,
  MAX_NOTES_LENGTH,
} from "../../constants/sessionTaxonomy.js";
import { updateActivityClassification } from "../../services/activity.service.js";

function extractErrorMessage(err) {
  return err?.response?.data?.userMessage
    || err?.response?.data?.message
    || err?.message
    || "Erreur lors de la classification.";
}

/**
 * ActivityClassificationModal — Modal de saisie type d'effort + marqueurs
 * + notes pour une activite.
 *
 * Props :
 *   - open
 *   - activity (Strava activity object)
 *   - suggestedType (optionnel) : type pre-selectionne par heuristique
 *   - onClose
 *   - onSaved(updatedActivity) : callback apres save reussi
 */
function ActivityClassificationModal({
  open = false,
  activity = null,
  suggestedType = null,
  onClose = () => {},
  onSaved = () => {},
}) {
  const { pushToast } = useToast();
  const [sessionType, setSessionType] = useState("");
  const [markers, setMarkers] = useState([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !activity) return;
    // Pre-selection : valeur existante (priorite) sinon suggestion.
    setSessionType(activity.userSessionType || suggestedType || "");
    setMarkers(Array.isArray(activity.userSessionMarkers) ? activity.userSessionMarkers : []);
    setNotes(activity.userNotes || "");
    setError("");
  }, [open, activity, suggestedType]);

  const { containerRef, handleOverlayClick } = useModal({ open, onClose, busy: submitting });

  const stravaId = useMemo(
    () => activity?.stravaActivityId || activity?.id,
    [activity],
  );

  if (!open || !activity) return null;

  const toggleMarker = (key) => {
    setMarkers((prev) => {
      if (prev.includes(key)) {
        return prev.filter((m) => m !== key);
      }
      if (prev.length >= MAX_MARKERS) return prev;
      return [...prev, key];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sessionType || submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const updated = await updateActivityClassification(stravaId, {
        sessionType,
        markers,
        notes: notes.trim(),
      });
      pushToast({ message: "Séance classifiée.", tone: "success" });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const isSuggestion = !activity.userClassifiedAt && Boolean(suggestedType);
  const notesRemaining = MAX_NOTES_LENGTH - notes.length;

  return (
    <div className="reglages-modal-overlay" onClick={handleOverlayClick} role="presentation">
      <form
        ref={containerRef}
        className="reglages-modal reglages-modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-class-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h3 id="activity-class-title" className="reglages-modal-title">
          Classifier la séance
        </h3>
        <p className="reglages-modal-description">
          Précise le type d'effort pour enrichir tes analyses (polarisation, comparaison N-1, charge stratifiée).
        </p>

        {isSuggestion ? (
          <div className="reglages-modal-info">
            ✨ Suggestion automatique pré-sélectionnée. Confirme ou ajuste.
          </div>
        ) : null}

        <div className="reglages-field">
          <label>Type d'effort *</label>
          <div className="activity-class-type-grid">
            {SESSION_TYPES.map((t) => (
              <button
                type="button"
                key={t.key}
                className={`activity-class-chip activity-class-chip-${t.tone} ${sessionType === t.key ? "is-active" : ""}`}
                onClick={() => setSessionType(t.key)}
                aria-pressed={sessionType === t.key}
              >
                <span className="activity-class-chip-icon" aria-hidden="true">{t.icon}</span>
                <span className="activity-class-chip-label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="reglages-field">
          <label>Marqueurs ({markers.length}/{MAX_MARKERS})</label>
          <div className="activity-class-markers">
            {SESSION_MARKERS.map((m) => {
              const active = markers.includes(m.key);
              const disabled = !active && markers.length >= MAX_MARKERS;
              return (
                <button
                  type="button"
                  key={m.key}
                  className={`activity-class-marker ${active ? "is-active" : ""}`}
                  onClick={() => toggleMarker(m.key)}
                  disabled={disabled}
                  aria-pressed={active}
                >
                  <span aria-hidden="true">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="reglages-field">
          <label htmlFor="rg-activity-notes">Notes personnelles</label>
          <textarea
            id="rg-activity-notes"
            className="reglages-textarea"
            rows={3}
            value={notes}
            maxLength={MAX_NOTES_LENGTH}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ressenti, conditions, plan associé..."
          />
          <span className="reglages-field-hint">
            {notesRemaining} caractère{notesRemaining > 1 ? "s" : ""} restant{notesRemaining > 1 ? "s" : ""}
          </span>
        </div>

        {error ? <div className="reglages-modal-error">{error}</div> : null}

        <div className="reglages-modal-actions">
          <button type="button" className="reglages-btn" onClick={onClose} disabled={submitting}>
            Annuler
          </button>
          <button
            type="submit"
            className="reglages-btn reglages-btn-primary"
            disabled={!sessionType || submitting}
          >
            {submitting ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default memo(ActivityClassificationModal);
