import { memo } from "react";
import { Link } from "react-router-dom";

const APP_VERSION = "v1.2.0";
const LAST_UPDATE = "2 mai 2025";

/**
 * ReglagesAboutTab — Mockup p.25 onglet À propos.
 */
function ReglagesAboutTab() {
  return (
    <div className="reglages-tab reglages-about-tab">
      <section className="reglages-card">
        <h3>À propos de RuNSee</h3>
        <p>
          RuNSee transforme tes données d'entraînement en indicateurs simples,
          fiables et actionnables.
        </p>
        <p>
          Notre approche scientifique et nos algorithmes propriétaires t'aident
          à mieux comprendre ta progression, optimiser la récupération et
          atteindre tes objectifs en endurance.
        </p>
      </section>

      <div className="reglages-about-grid">
        <section className="reglages-card reglages-about-mini">
          <span className="reglages-about-icon" aria-hidden="true">🧪</span>
          <div>
            <strong>Méthodologie</strong>
            <small>Des indicateurs basés sur la physiologie de l'endurance et la science du sport.</small>
            <a className="reglages-link" href="#methodologie">Découvrir notre méthodologie →</a>
          </div>
        </section>
        <section className="reglages-card reglages-about-mini">
          <span className="reglages-about-icon" aria-hidden="true">📚</span>
          <div>
            <strong>Sources scientifiques</strong>
            <small>Exploration des études et travaux à l'origine de nos indicateurs.</small>
            <a className="reglages-link" href="#sources">Voir les références →</a>
          </div>
        </section>
        <section className="reglages-card reglages-about-mini">
          <span className="reglages-about-icon" aria-hidden="true">📦</span>
          <div>
            <strong>Version</strong>
            <small>RunNSee Alpine Light · {APP_VERSION}</small>
            <span className="reglages-about-meta">Dernière mise à jour : {LAST_UPDATE}</span>
          </div>
        </section>
        <section className="reglages-card reglages-about-mini">
          <span className="reglages-about-icon" aria-hidden="true">🤝</span>
          <div>
            <strong>Crédits</strong>
            <small>Conçu et développé avec passion par l'équipe RunNSee.</small>
            <span className="reglages-about-meta">Merci à toutes et tous ! ❤️</span>
          </div>
        </section>
      </div>

      <section className="reglages-card reglages-about-glossary">
        <span className="reglages-about-icon" aria-hidden="true">📖</span>
        <div>
          <strong>Glossaire</strong>
          <small>Comprends tous les termes et acronymes utilisés dans RunNSee.</small>
        </div>
        <Link className="reglages-btn reglages-btn-primary" to="/glossaire">Ouvrir le glossaire</Link>
      </section>
    </div>
  );
}

export default memo(ReglagesAboutTab);
