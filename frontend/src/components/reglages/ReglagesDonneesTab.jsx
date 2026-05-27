import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import useToast from "../../hooks/useToast.js";
import usePolling from "../../hooks/usePolling.js";
import { buildQualityBars } from "./dataQuality.js";
import { formatRelativeDate } from "../../services/connexions.service.js";
import {
  getCurrentSyncJob,
  getDataQuality,
  getSyncSummary,
  listSyncJobs,
  startDetailBackfill,
  startGlobalSync,
} from "../../services/sync.service.js";

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

  const [summary, setSummary] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [currentJob, setCurrentJob] = useState(null);
  const [qualityPayload, setQualityPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [actionBusy, setActionBusy] = useState({});
  const syncTimerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  const refresh = useCallback(async () => {
    const [sum, j, cur, q] = await Promise.all([
      getSyncSummary().catch(() => null),
      listSyncJobs(8).catch(() => []),
      getCurrentSyncJob().catch(() => null),
      getDataQuality({ days: 30 }).catch(() => null),
    ]);
    if (!mountedRef.current) return;
    setSummary(sum);
    setJobs(Array.isArray(j) ? j : []);
    setCurrentJob(cur);
    if (q) setQualityPayload(q);
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => {
      if (mountedRef.current) setLoading(false);
    });
  }, [refresh]);

  // Polling backoff exponentiel pendant qu'un job tourne.
  usePolling(refresh, {
    enabled: syncing || Boolean(currentJob),
    baseIntervalMs: 5000,
    maxIntervalMs: 30000,
    maxConsecutiveErrors: 6,
  });

  const lastSyncAt = useMemo(() => {
    const candidates = [
      summary?.lastIncrementalSync?.endedAt,
      summary?.lastHistoricalSync?.endedAt,
      summary?.lastDetailBackfillSync?.endedAt,
    ].filter(Boolean);
    if (!candidates.length) return null;
    return candidates.sort((a, b) => new Date(b) - new Date(a))[0];
  }, [summary]);

  // Periodicite reelle exposee par le backend (env-driven), fallback 30 min.
  const autoSyncIntervalMinutes = summary?.autoSyncIntervalMinutes || 30;
  const nextSyncAt = useMemo(
    () => nextAutoSyncEstimate(lastSyncAt, autoSyncIntervalMinutes),
    [lastSyncAt, autoSyncIntervalMinutes],
  );

  const quality = useMemo(() => buildQualityBars(qualityPayload), [qualityPayload]);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await startGlobalSync();
      pushToast({ message: "Synchronisation globale lancée.", tone: "success" });
      await refresh();
    } catch (err) {
      pushToast({ message: extractErrorMessage(err, "Échec de la synchronisation."), tone: "error" });
    } finally {
      // Cleanup explicite : ecrasement de tout timer pendant.
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setSyncing(false);
        syncTimerRef.current = null;
      }, 5000);
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
              <strong>{`Activée (toutes les ${autoSyncIntervalMinutes} min)`}</strong>
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
