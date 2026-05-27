import { memo, useCallback, useEffect, useMemo, useState } from "react";
import useToast from "../../hooks/useToast.js";
import useRunSeeData from "../../hooks/useRunSeeData.js";
import { formatRelativeDate } from "../../services/connexions.service.js";
import {
  getCurrentSyncJob,
  getSyncSummary,
  listSyncJobs,
  startDetailBackfill,
  startGlobalSync,
} from "../../services/sync.service.js";

const AUTO_SYNC_INTERVAL_LABEL = "Activée (toutes les 30 min)";

function extractErrorMessage(err, fallback) {
  return err?.response?.data?.userMessage || err?.response?.data?.message || err?.message || fallback;
}

function jobTypeLabel(jobType) {
  if (!jobType) return "Synchronisation";
  const t = String(jobType).toLowerCase();
  if (t.includes("incremental")) return "Incrémentale";
  if (t.includes("historical")) return "Historique";
  if (t.includes("detail")) return "Backfill détails";
  if (t.includes("recovery")) return "Récupération";
  if (t.includes("fitness")) return "Fitness";
  return jobType;
}

function jobSourceLabel(job) {
  // SyncJob du backend Runsee = principalement Strava activities ;
  // les recoveries / fitness Garmin sont dans des jobs differents.
  const t = String(job?.jobType || "").toLowerCase();
  if (t.includes("recovery") || t.includes("garmin") || t.includes("fitness")) return "Garmin";
  return "Strava";
}

function jobActivitiesCount(job) {
  return (job?.activitiesInserted || 0) + (job?.activitiesUpdated || 0);
}

function jobStatusIndicator(job) {
  const s = String(job?.status || "").toLowerCase();
  if (s === "success" || s === "completed") return "ok";
  if (s === "failed" || s === "error") return "error";
  if (s === "running" || s === "queued") return "running";
  return "ok";
}

function nextAutoSyncEstimate(lastSyncAt, intervalMinutes = 30) {
  if (!lastSyncAt) return null;
  const t = new Date(lastSyncAt).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t + intervalMinutes * 60_000);
}

/**
 * Calcule la qualite des donnees sur les 30 derniers jours :
 *   - Activités complètes (avec moving time + distance)
 *   - FC continue (averageHeartrate > 0)
 *   - Puissance (averageWatts > 0)
 *   - Altimétrie (totalElevationGain > 0 OU device altimeter renseigne)
 */
function computeDataQuality(activities = []) {
  const now = Date.now();
  const cutoff = now - 30 * 24 * 60 * 60 * 1000;
  const recent = activities.filter((a) => {
    const d = new Date(a?.startDateLocal || a?.startDate || 0).getTime();
    return Number.isFinite(d) && d >= cutoff;
  });
  const total = recent.length;
  if (total === 0) {
    return {
      total: 0,
      bars: [
        { key: "complete",  label: "Activités complètes", value: 0, of: 0, total: 0, color: "#94a3b8" },
        { key: "fc",        label: "FC continue",         value: 0, of: 0, total: 0, color: "#94a3b8" },
        { key: "power",     label: "Puissance",           value: 0, of: 0, total: 0, color: "#94a3b8" },
        { key: "altimetry", label: "Altimétrie",          value: 0, of: 0, total: 0, color: "#94a3b8" },
      ],
    };
  }
  const complete = recent.filter((a) => Number(a?.movingTime) > 0 && Number(a?.distance) > 0).length;
  const withFc = recent.filter((a) => Number(a?.averageHeartrate) > 0).length;
  const withPower = recent.filter((a) => Number(a?.averageWatts) > 0).length;
  const withAlt = recent.filter((a) => Number(a?.totalElevationGain) > 0).length;
  const pickColor = (pct) => {
    if (pct >= 90) return "#15803d";
    if (pct >= 70) return "#22c55e";
    if (pct >= 50) return "#eab308";
    return "#f97316";
  };
  const mkBar = (key, label, count) => {
    const pct = Math.round((count / total) * 100);
    return { key, label, value: pct, of: count, total, color: pickColor(pct) };
  };
  return {
    total,
    bars: [
      mkBar("complete",  "Activités complètes", complete),
      mkBar("fc",        "FC continue",         withFc),
      mkBar("power",     "Puissance",           withPower),
      mkBar("altimetry", "Altimétrie",          withAlt),
    ],
  };
}

/**
 * ReglagesDonneesTab — Mockup p.24 (Phase 2).
 *
 * Wiring complet :
 *   - GET /sync/summary + /sync/jobs au mount
 *   - Bouton "Synchroniser maintenant" -> POST /sync/all + polling 5s
 *   - "Compléter les données manquantes" -> POST /sync/jobs/detail-backfill
 *   - Qualité données calculée depuis activities (useRunSeeData) sur 30j
 */
function ReglagesDonneesTab() {
  const { pushToast } = useToast();
  const { safeActivities } = useRunSeeData({ includeActivities: true });

  const [summary, setSummary] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [currentJob, setCurrentJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [actionBusy, setActionBusy] = useState({});

  const refresh = useCallback(async () => {
    try {
      const [sum, j, cur] = await Promise.all([
        getSyncSummary().catch(() => null),
        listSyncJobs(8).catch(() => []),
        getCurrentSyncJob().catch(() => null),
      ]);
      setSummary(sum);
      setJobs(Array.isArray(j) ? j : []);
      setCurrentJob(cur);
    } catch {
      // Silent (ne pas spammer toast en cas d'erreur reseau au mount)
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // Polling 5s pendant qu'un job est en cours
  useEffect(() => {
    if (!syncing && !currentJob) return undefined;
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [syncing, currentJob, refresh]);

  const lastSyncAt = useMemo(() => {
    const candidates = [
      summary?.lastIncrementalSync?.endedAt,
      summary?.lastHistoricalSync?.endedAt,
      summary?.lastDetailBackfillSync?.endedAt,
    ].filter(Boolean);
    if (!candidates.length) return null;
    return candidates.sort((a, b) => new Date(b) - new Date(a))[0];
  }, [summary]);

  const nextSyncAt = useMemo(() => nextAutoSyncEstimate(lastSyncAt, 30), [lastSyncAt]);

  const quality = useMemo(() => computeDataQuality(safeActivities), [safeActivities]);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await startGlobalSync();
      pushToast({ message: "Synchronisation globale lancée.", tone: "success" });
      // Refresh immediat + polling
      await refresh();
    } catch (err) {
      pushToast({ message: extractErrorMessage(err, "Échec de la synchronisation."), tone: "error" });
    } finally {
      // Garde le state syncing tant que currentJob non null OU 5s min
      setTimeout(() => setSyncing(false), 5000);
    }
  };

  const handleDetailBackfill = async () => {
    setActionBusy((p) => ({ ...p, complete: true }));
    try {
      await startDetailBackfill();
      pushToast({ message: "Backfill des détails lancé.", tone: "success" });
      await refresh();
    } catch (err) {
      pushToast({ message: extractErrorMessage(err, "Erreur."), tone: "error" });
    } finally {
      setActionBusy((p) => ({ ...p, complete: false }));
    }
  };

  const isSyncing = syncing || Boolean(currentJob);

  return (
    <div className="reglages-tab reglages-donnees-tab">
      <div className="reglages-donnees-grid">
        <section className="reglages-card">
          <h3>Synchronisations {loading ? <small>· chargement…</small> : null}</h3>
          <div className="reglages-row">
            <div>
              <small>Dernière synchronisation globale</small>
              <strong>{formatRelativeDate(lastSyncAt)}</strong>
            </div>
          </div>
          <div className="reglages-row">
            <div>
              <small>Automatique</small>
              <strong>{AUTO_SYNC_INTERVAL_LABEL}</strong>
              <span className="reglages-row-hint">Réglable depuis la configuration serveur.</span>
            </div>
          </div>
          <div className="reglages-row">
            <div>
              <small>Prochaine synchronisation</small>
              <strong>{nextSyncAt ? formatRelativeDate(nextSyncAt) : "—"}</strong>
            </div>
          </div>
          {currentJob ? (
            <div className="reglages-modal-info">
              Synchronisation en cours : {jobTypeLabel(currentJob.jobType)} ·
              {" "}{currentJob.activitiesInserted || 0} ajoutée(s),
              {" "}{currentJob.activitiesUpdated || 0} mise(s) à jour.
            </div>
          ) : null}
          <button
            type="button"
            className="reglages-btn reglages-btn-primary reglages-btn-block"
            onClick={handleSyncNow}
            disabled={isSyncing}
          >
            {isSyncing ? "Synchronisation en cours…" : "Synchroniser maintenant"}
          </button>
        </section>

        <section className="reglages-card">
          <h3>Historique des imports</h3>
          {jobs.length === 0 ? (
            <p className="reglages-row-hint">Aucun import enregistré pour l'instant.</p>
          ) : (
            <ul className="reglages-history-list">
              {jobs.slice(0, 5).map((job) => {
                const count = jobActivitiesCount(job);
                const status = jobStatusIndicator(job);
                const when = job.endedAt || job.startedAt || job.queuedAt;
                return (
                  <li key={job.id} className="reglages-history-row">
                    <span className="reglages-history-date">{formatRelativeDate(when)}</span>
                    <span className="reglages-history-source">{jobSourceLabel(job)}</span>
                    <span className="reglages-history-count">
                      {count > 0 ? `${count} activité${count > 1 ? "s" : ""}` : jobTypeLabel(job.jobType)}
                    </span>
                    <span className={`reglages-history-status reglages-history-status-${status}`}>
                      {status === "ok" ? "✓" : status === "running" ? "…" : "!"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="reglages-donnees-grid">
        <section className="reglages-card">
          <h3>Qualité des données <small>(30 derniers jours · {quality.total} activités)</small></h3>
          {quality.total === 0 ? (
            <p className="reglages-row-hint">Pas encore d'activités sur les 30 derniers jours.</p>
          ) : (
            <ul className="reglages-quality-list">
              {quality.bars.map((q) => (
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
          )}
        </section>

        <section className="reglages-card">
          <h3>Actions sur les données</h3>
          <ul className="reglages-actions-list">
            <li>
              <span className="reglages-actions-icon" aria-hidden="true">🔄</span>
              <div>
                <strong>Compléter les données manquantes</strong>
                <small>Récupère les détails (laps, samples) des activités importées sans détail.</small>
              </div>
              <button
                type="button"
                className="reglages-btn"
                onClick={handleDetailBackfill}
                disabled={actionBusy.complete || isSyncing}
              >
                {actionBusy.complete ? "Lancement…" : "Lancer"}
              </button>
            </li>
            <li>
              <span className="reglages-actions-icon" aria-hidden="true">📊</span>
              <div>
                <strong>Reconstruire les métriques</strong>
                <small>Recalcule les indicateurs et tendances depuis les activités existantes.</small>
              </div>
              <button type="button" className="reglages-btn" disabled title="Bientôt disponible">
                Bientôt
              </button>
            </li>
            <li>
              <span className="reglages-actions-icon" aria-hidden="true">🧹</span>
              <div>
                <strong>Réinitialiser les caches</strong>
                <small>Libère l'espace et resynchronise les vignettes.</small>
              </div>
              <button type="button" className="reglages-btn" disabled title="Bientôt disponible">
                Bientôt
              </button>
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
