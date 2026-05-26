import { memo, useState } from "react";

const QUALITY_BARS = [
  { key: "complete",  label: "Activités complètes", value: 96, of: 467, total: 484, color: "#15803d" },
  { key: "fc",        label: "FC continue",         value: 88, of: 446, total: 484, color: "#22c55e" },
  { key: "power",     label: "Puissance",           value: 72, of: 343, total: 484, color: "#eab308" },
  { key: "altimetry", label: "Altimétrie",          value: 98, of: 481, total: 484, color: "#15803d" },
];

/**
 * ReglagesDonneesTab — Mockup p.24 onglet Donnees.
 *
 * Synchronisations / Historique imports / Qualite donnees / Actions sur les donnees.
 */
function ReglagesDonneesTab({ history = [] }) {
  const [syncing, setSyncing] = useState(false);
  const handleSyncNow = () => {
    setSyncing(true);
    // Placeholder : appel POST /sync/incremental
    setTimeout(() => setSyncing(false), 1500);
  };
  return (
    <div className="reglages-tab reglages-donnees-tab">
      <div className="reglages-donnees-grid">
        <section className="reglages-card">
          <h3>Synchronisations</h3>
          <div className="reglages-row">
            <div>
              <small>Dernière synchronisation globale</small>
              <strong>Aujourd'hui à 07:42</strong>
            </div>
          </div>
          <div className="reglages-row">
            <div>
              <small>Automatique</small>
              <strong>Activée (toutes les 30 min)</strong>
            </div>
            <button type="button" className="reglages-btn">Modifier</button>
          </div>
          <div className="reglages-row">
            <div>
              <small>Prochaine synchronisation</small>
              <strong>Aujourd'hui à 08:12</strong>
            </div>
          </div>
          <button
            type="button"
            className="reglages-btn reglages-btn-primary reglages-btn-block"
            onClick={handleSyncNow}
            disabled={syncing}
          >
            {syncing ? "Synchronisation en cours…" : "Synchroniser maintenant"}
          </button>
        </section>

        <section className="reglages-card">
          <h3>Historique des imports</h3>
          <ul className="reglages-history-list">
            {(history.length ? history : [
              { date: "Aujourd'hui à 07:42", source: "Strava",  count: 12, status: "ok" },
              { date: "Aujourd'hui à 07:38", source: "Garmin",  count: 8,  status: "ok" },
              { date: "Hier à 21:15",         source: "Strava",  count: 6,  status: "ok" },
              { date: "Hier à 20:57",         source: "Garmin",  count: 3,  status: "ok" },
              { date: "4 mai à 19:32",        source: "Strava",  count: 11, status: "ok" },
            ]).map((row, i) => (
              <li key={i} className="reglages-history-row">
                <span className="reglages-history-date">{row.date}</span>
                <span className="reglages-history-source">{row.source}</span>
                <span className="reglages-history-count">{row.count} activité{row.count > 1 ? "s" : ""}</span>
                <span className={`reglages-history-status reglages-history-status-${row.status}`}>
                  {row.status === "ok" ? "✓" : "!"}
                </span>
              </li>
            ))}
          </ul>
          <a className="reglages-link" href="#historique">Voir tout l'historique</a>
        </section>
      </div>

      <div className="reglages-donnees-grid">
        <section className="reglages-card">
          <h3>Qualité des données <small>(30 derniers jours)</small></h3>
          <ul className="reglages-quality-list">
            {QUALITY_BARS.map((q) => (
              <li key={q.key} className="reglages-quality-row">
                <span className="reglages-quality-label">{q.label}</span>
                <span className="reglages-quality-bar">
                  <span className="reglages-quality-bar-fill" style={{ width: `${q.value}%`, background: q.color }} />
                </span>
                <span className="reglages-quality-value">{q.value} %</span>
                <span className="reglages-quality-detail">{q.of} / {q.total}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="reglages-card">
          <h3>Actions sur les données</h3>
          <ul className="reglages-actions-list">
            <li>
              <span className="reglages-actions-icon" aria-hidden="true">🔄</span>
              <div>
                <strong>Compléter les données manquantes</strong>
                <small>Tentera de récupérer les activités manquantes.</small>
              </div>
              <button type="button" className="reglages-btn">Lancer</button>
            </li>
            <li>
              <span className="reglages-actions-icon" aria-hidden="true">📊</span>
              <div>
                <strong>Reconstruire les métriques</strong>
                <small>Recalcule les indicateurs et tendances.</small>
              </div>
              <button type="button" className="reglages-btn">Lancer</button>
            </li>
            <li>
              <span className="reglages-actions-icon" aria-hidden="true">🧹</span>
              <div>
                <strong>Réinitialiser les caches</strong>
                <small>Libère l'espace et resynchronise les vignettes.</small>
              </div>
              <button type="button" className="reglages-btn">Lancer</button>
            </li>
          </ul>
        </section>
      </div>

      <div className="reglages-tip">
        <span aria-hidden="true">⛰️</span>
        <strong>Astuce :</strong> garde tes synchronisations régulières pour des analyses fiables et complètes.
      </div>
    </div>
  );
}

export default memo(ReglagesDonneesTab);
