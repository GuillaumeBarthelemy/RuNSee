import { memo } from "react";

/**
 * EmptyState — Alpine Light (Lot 1).
 *
 * État vide générique : pas encore de données, fonctionnalité non connectée,
 * filtre trop restrictif.
 *
 * Props :
 * - title : string (ex: "Pas encore de séance enregistrée")
 * - description : string optionnel
 * - icon : ReactNode optionnel
 * - action : { label, onClick } optionnel (CTA principal)
 * - secondaryAction : { label, onClick } optionnel
 */
function EmptyState({
  title = "Aucune donnée",
  description = "",
  icon = null,
  action = null,
  secondaryAction = null,
}) {
  return (
    <div className="alpine-empty-state" role="status">
      {icon ? <div className="alpine-empty-state-icon" aria-hidden="true">{icon}</div> : null}
      <h3 className="alpine-empty-state-title">{title}</h3>
      {description ? <p className="alpine-empty-state-description">{description}</p> : null}
      {(action || secondaryAction) ? (
        <div className="alpine-empty-state-actions">
          {action && action.label ? (
            <button
              type="button"
              className="alpine-button alpine-button--primary"
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ) : null}
          {secondaryAction && secondaryAction.label ? (
            <button
              type="button"
              className="alpine-button alpine-button--ghost"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default memo(EmptyState);
