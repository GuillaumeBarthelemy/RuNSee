import { memo, useEffect, useState } from "react";
import { listSessions, revokeOtherSessions, revokeSession } from "../../services/account.service.js";
import useToast from "../../hooks/useToast.js";

function parseUserAgent(ua) {
  const text = String(ua || "").toLowerCase();
  let browser = "Navigateur";
  let os = "—";
  if (text.includes("chrome")) browser = "Chrome";
  else if (text.includes("firefox")) browser = "Firefox";
  else if (text.includes("safari") && !text.includes("chrome")) browser = "Safari";
  else if (text.includes("edge")) browser = "Edge";
  if (text.includes("windows")) os = "Windows";
  else if (text.includes("mac os") || text.includes("macintosh")) os = "macOS";
  else if (text.includes("android")) os = "Android";
  else if (text.includes("iphone") || text.includes("ipad")) os = "iOS";
  else if (text.includes("linux")) os = "Linux";
  return `${browser} · ${os}`;
}

function formatDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffMin < 24 * 60) return `il y a ${Math.round(diffMin / 60)} h`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function extractErrorMessage(err, fallback) {
  return err?.response?.data?.userMessage || err?.response?.data?.message || err?.message || fallback;
}

function SessionsModal({ open = false, onClose = () => {} }) {
  const { pushToast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reload = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await listSessions();
      setSessions(list);
    } catch (err) {
      setError(extractErrorMessage(err, "Impossible de charger les sessions."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) reload();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleRevoke = async (sessionId) => {
    try {
      await revokeSession(sessionId);
      pushToast({ message: "Session déconnectée.", tone: "success" });
      reload();
    } catch (err) {
      pushToast({ message: extractErrorMessage(err, "Erreur lors de la révocation."), tone: "error" });
    }
  };

  const handleRevokeOthers = async () => {
    try {
      const r = await revokeOtherSessions();
      const n = r?.revokedSessionsCount || 0;
      pushToast({ message: n > 0 ? `${n} session${n > 1 ? "s" : ""} déconnectée${n > 1 ? "s" : ""}.` : "Aucune autre session à déconnecter.", tone: "success" });
      reload();
    } catch (err) {
      pushToast({ message: extractErrorMessage(err, "Erreur."), tone: "error" });
    }
  };

  const othersCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div className="reglages-modal-overlay" onClick={onClose} role="presentation">
      <div className="reglages-modal reglages-modal-wide" role="dialog" aria-modal="true" aria-labelledby="reglages-sessions-title" onClick={(e) => e.stopPropagation()}>
        <div className="reglages-modal-head">
          <h3 id="reglages-sessions-title" className="reglages-modal-title">Sessions actives</h3>
          <button type="button" className="reglages-modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>

        {loading ? (
          <p className="reglages-modal-description">Chargement…</p>
        ) : error ? (
          <div className="reglages-modal-error">{error}</div>
        ) : sessions.length === 0 ? (
          <p className="reglages-modal-description">Aucune session active.</p>
        ) : (
          <ul className="reglages-sessions-list">
            {sessions.map((s) => (
              <li key={s.id} className={`reglages-sessions-row ${s.isCurrent ? "is-current" : ""}`}>
                <div className="reglages-sessions-info">
                  <strong>{parseUserAgent(s.userAgent)}{s.isCurrent ? " · cette session" : ""}</strong>
                  <small>{s.ipAddress || "IP inconnue"} · dernière activité {formatDate(s.lastSeenAt || s.createdAt)}</small>
                </div>
                {s.isCurrent ? (
                  <span className="reglages-sessions-current-badge">Actuelle</span>
                ) : (
                  <button type="button" className="reglages-btn reglages-btn-soft" onClick={() => handleRevoke(s.id)}>
                    Déconnecter
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="reglages-modal-actions">
          <button type="button" className="reglages-btn" onClick={onClose}>Fermer</button>
          {othersCount > 0 ? (
            <button type="button" className="reglages-btn reglages-btn-danger" onClick={handleRevokeOthers}>
              Déconnecter les {othersCount} autre{othersCount > 1 ? "s" : ""}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default memo(SessionsModal);
