/* global __APP_VERSION__, __APP_BUILD_DATE__, __APP_BUILD_SHA__ */
import { memo } from "react";
import { Link } from "react-router-dom";

const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
const APP_BUILD_DATE = typeof __APP_BUILD_DATE__ !== "undefined" ? __APP_BUILD_DATE__ : null;
const APP_BUILD_SHA = typeof __APP_BUILD_SHA__ !== "undefined" ? __APP_BUILD_SHA__ : "";

function formatBuildDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * ReglagesAboutTab — Mockup p.25 onglet À propos (Phase 2).
 *
 * Wiring :
 *   - Version + date de build + commit SHA injectes au build par Vite
 *     (define __APP_VERSION__ / __APP_BUILD_DATE__ / __APP_BUILD_SHA__).
 *   - Methodologie / Sources : pour l'instant pointe vers le glossaire en
 *     attendant des pages dediees.
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
            <Link className="reglages-link" to="/glossaire">Découvrir notre méthodologie →</Link>
          </div>
        </section>
        <section className="reglages-card reglages-about-mini">
          <span className="reglages-about-icon" aria-hidden="true">📚</span>
          <div>
            <strong>Sources scientifiques</strong>
            <small>Exploration des études et travaux à l'origine de nos indicateurs.</small>
            <Link className="reglages-link" to="/glossaire">Voir les références →</Link>
          </div>
        </section>
        <section className="reglages-card reglages-about-mini">
          <span className="reglages-about-icon" aria-hidden="true">📦</span>
          <div>
            <strong>Version</strong>
            <small>RunNSee Alpine Light · v{APP_VERSION}{APP_BUILD_SHA ? ` · ${APP_BUILD_SHA}` : ""}</small>
            <span className="reglages-about-meta">Dernière mise à jour : {formatBuildDate(APP_BUILD_DATE)}</span>
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
