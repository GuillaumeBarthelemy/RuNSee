import { memo } from "react";
import { Link } from "react-router-dom";

function RaceObjectiveCallToAction({
  title = "Course objectif",
  subtitle = "Ajoute une course dans les reglages pour afficher le compte a rebours, l'allure cible et le plan de taper.",
  ctaLabel = "Configurer une course",
  to = "/admin#race-objectives",
}) {
  return (
    <section className="card race-objective-cta">
      <div>
        <h2 className="card-title">{title}</h2>
        <p className="card-subtitle">{subtitle}</p>
      </div>
      <Link className="button button-primary" to={to}>
        {ctaLabel}
      </Link>
    </section>
  );
}

export default memo(RaceObjectiveCallToAction);
