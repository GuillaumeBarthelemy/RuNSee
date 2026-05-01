import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { startIncrementalSync } from "../services/sync.service.js";

function TodayQuickActions({
  onReload = null,
}) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const handleSync = async () => {
    setStatus("loading");
    setMessage("");

    try {
      await startIncrementalSync();
      if (typeof onReload === "function") {
        await onReload();
      }
      setStatus("success");
      setMessage("Synchronisation lancee. Les nouvelles activites apparaitront apres traitement.");
    } catch {
      setStatus("error");
      setMessage("La synchronisation n'a pas pu etre lancee. Reessaie depuis l'administration si besoin.");
    }
  };

  return (
    <section className="today-quick-actions">
      <div>
        <p className="section-kicker">Suite</p>
        <h2 className="section-title">Actions rapides</h2>
        <p className="card-subtitle">Trois raccourcis pour verifier, comprendre ou recalculer avant ta prochaine decision.</p>
      </div>
      <div className="today-quick-action-grid">
        <button
          className="button button-primary"
          type="button"
          disabled={status === "loading"}
          onClick={handleSync}
        >
          {status === "loading" ? "Synchronisation..." : "Synchroniser maintenant"}
        </button>
        <Link className="button button-secondary" to="/performance">
          Voir mes allures cibles
        </Link>
        <Link className="button button-secondary" to="/analytics">
          Voir ma tendance complete
        </Link>
      </div>
      {message ? <p className={`today-quick-action-status today-quick-action-status-${status}`}>{message}</p> : null}
    </section>
  );
}

export default memo(TodayQuickActions);
