import { useEffect, useState } from "react";
import InfoTooltip from "./InfoTooltip.jsx";
import { updateActivityRpe } from "../services/activity.service.js";

const RPE_OPTIONS = [
  { value: 1, label: "1 - Tres tres facile" },
  { value: 2, label: "2 - Facile" },
  { value: 3, label: "3 - Moderement facile" },
  { value: 4, label: "4 - Modere" },
  { value: 5, label: "5 - Soutenu" },
  { value: 6, label: "6 - Tres soutenu" },
  { value: 7, label: "7 - Tres dur" },
  { value: 8, label: "8 - Tres tres dur" },
  { value: 9, label: "9 - Maximal" },
  { value: 10, label: "10 - Effort total" },
];

const INFO_BLOCKS = [
  { label: "En bref", text: "Note l'effort percu de cette seance sur l'echelle de Borg modifiee (CR-10)." },
  { label: "Calcul", text: "Le sRPE Foster = duree (min) × RPE (1-10). Si tu saisis ton RPE, RunNSee utilisera cette charge subjective en l'absence de TRIMP cardio fiable, avant de tomber sur le suffer score Strava." },
  { label: "Comment lire ta valeur", text: "1-3 = recuperation et footing tres facile. 4-5 = sortie soutenue mais conversationnelle. 6-7 = bloc qualitatif (tempo / seuil). 8-9 = intervalles VO2max / course. 10 = effort total et rare." },
  { label: "Action concrete", text: "Note ton RPE 30 minutes apres la seance pour eviter le biais de fin d'effort. Sur les sorties EF, vise un RPE stable (3-4) ; sur un seuil bien execute, RPE 6-7 cumule sur la seance reste classique." },
  { label: "Pour aller plus loin", text: "Foster C et al. (2001), A new approach to monitoring exercise training. J Strength Cond Res 15(1):109-115." },
];

const noop = () => {};

function getActivityRouteId(activity) {
  return activity?.id || activity?.stravaActivityId || activity?.sourceActivityId || "";
}

export default function ActivityRpeCard({ activity = null, onUpdated = noop }) {
  const initialRpe = activity?.userRpe ?? "";
  const [selectedRpe, setSelectedRpe] = useState(initialRpe);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setSelectedRpe(activity?.userRpe ?? "");
  }, [activity?.userRpe, activity?.id, activity?.stravaActivityId, activity?.sourceActivityId]);

  const routeId = getActivityRouteId(activity);

  if (!routeId) {
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const payload = selectedRpe === "" ? null : Number(selectedRpe);
      const updated = await updateActivityRpe(routeId, payload);
      setStatusMessage(payload === null ? "RPE efface." : `RPE enregistre : ${payload}.`);
      onUpdated(updated);
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.userMessage
          || error?.response?.data?.message
          || error?.message
          || "Echec de l'enregistrement du RPE.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="card activity-rpe-card">
      <div className="card-header-row wrap-on-mobile">
        <div>
          <div className="title-with-info">
            <h3 className="subcard-title">Effort percu (RPE)</h3>
            <InfoTooltip
              title="Effort percu (RPE)"
              content={INFO_BLOCKS}
              label="Afficher l'aide pour l'effort percu"
              glossaryKey="rpe"
            />
          </div>
          <p className="card-subtitle">
            Note ta seance sur l'echelle de Borg CR-10. RunNSee utilisera ce RPE pour calculer le sRPE Foster en repli si la cardio n'est pas exploitable.
          </p>
        </div>
      </div>

      <div className="filters-grid top-gap-sm">
        <label className="field field-span-2">
          <span className="field-label">RPE percu</span>
          <select
            className="field-input"
            value={selectedRpe === null || selectedRpe === undefined ? "" : selectedRpe}
            onChange={(event) => setSelectedRpe(event.target.value)}
          >
            <option value="">Non renseigne</option>
            {RPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      {errorMessage ? <div className="alert alert-error top-gap-sm">{errorMessage}</div> : null}
      {statusMessage ? <div className="alert alert-success top-gap-sm">{statusMessage}</div> : null}

      <div className="card-header-row top-gap-sm wrap-on-mobile">
        <button type="button" className="button button-dark" disabled={isSaving} onClick={handleSave}>
          {isSaving ? "Enregistrement..." : "Enregistrer le RPE"}
        </button>
        {activity?.userRpe ? (
          <span className="small-text">
            sRPE estime : {Math.round((Number(activity.movingTime) || 0) / 60 * Number(activity.userRpe))} pts
          </span>
        ) : null}
      </div>
    </section>
  );
}
