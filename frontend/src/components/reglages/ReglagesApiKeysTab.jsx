import { memo, useState, useEffect, useCallback } from "react";
import api from "../../services/api.js";

const SCOPE_LABELS = {
  "activities:read":  "Activités",
  "recovery:read":    "Récupération",
  "fitness:read":     "Fitness",
  "objectives:read":  "Objectifs",
};
const ALL_SCOPES = Object.keys(SCOPE_LABELS);
const API_BASE = typeof window !== "undefined" ? window.location.origin.replace("runnsee.net", "api.runnsee.net") : "https://api.runnsee.net";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="reglages-api-copy-btn"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      {copied ? "✓ Copié" : "Copier"}
    </button>
  );
}

function NewTokenBanner({ rawToken, onClose }) {
  if (!rawToken) return null;
  return (
    <div className="reglages-api-token-banner">
      <div className="reglages-api-token-banner-head">
        <strong>🔑 Clé créée — copiez-la maintenant</strong>
        <span className="reglages-api-token-banner-warn">
          Elle ne sera plus affichée après fermeture de cette fenêtre.
        </span>
      </div>
      <div className="reglages-api-token-code">
        <code>{rawToken}</code>
        <CopyButton text={rawToken} />
      </div>
      <button type="button" className="reglages-api-token-banner-close" onClick={onClose}>
        J'ai sauvegardé ma clé →
      </button>
    </div>
  );
}

function ApiKeyRow({ apiKey, onRevoke }) {
  const [confirming, setConfirming] = useState(false);
  const isActive = !apiKey.revokedAt && (!apiKey.expiresAt || new Date(apiKey.expiresAt) > new Date());
  const scopes = apiKey.scopes?.split(",").map((s) => s.trim()) || [];

  return (
    <div className={`reglages-api-key-row ${!isActive ? "is-revoked" : ""}`}>
      <div className="reglages-api-key-info">
        <div className="reglages-api-key-name">
          <strong>{apiKey.name}</strong>
          <code className="reglages-api-key-prefix">{apiKey.keyPrefix}…</code>
          {isActive
            ? <span className="reglages-api-status active">Active</span>
            : <span className="reglages-api-status revoked">Révoquée</span>}
        </div>
        <div className="reglages-api-key-meta">
          <span>Créée le {formatDate(apiKey.createdAt)}</span>
          {apiKey.lastUsedAt && <span>· Utilisée {formatDate(apiKey.lastUsedAt)}</span>}
          {apiKey.expiresAt && <span>· Expire {formatDate(apiKey.expiresAt)}</span>}
        </div>
        <div className="reglages-api-scopes">
          {scopes.map((s) => (
            <span key={s} className="reglages-api-scope-chip">{SCOPE_LABELS[s] || s}</span>
          ))}
        </div>
      </div>
      {isActive && (
        <div className="reglages-api-key-actions">
          {confirming ? (
            <>
              <span className="reglages-api-revoke-confirm">Révoquer définitivement ?</span>
              <button type="button" className="reglages-api-btn-danger" onClick={() => onRevoke(apiKey.id)}>
                Confirmer
              </button>
              <button type="button" className="reglages-api-btn-ghost" onClick={() => setConfirming(false)}>
                Annuler
              </button>
            </>
          ) : (
            <button type="button" className="reglages-api-btn-ghost" onClick={() => setConfirming(true)}>
              Révoquer
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CreateKeyForm({ onCreate, hasActiveKey }) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState(new Set(ALL_SCOPES));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleScope = (s) => setScopes((prev) => {
    const next = new Set(prev);
    next.has(s) ? next.delete(s) : next.add(s);
    return next;
  });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Le nom est requis."); return; }
    if (!scopes.size) { setError("Sélectionne au moins un scope."); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/settings/api-keys", {
        name: name.trim(),
        scopes: [...scopes],
      });
      setName(""); setScopes(new Set(ALL_SCOPES));
      onCreate(data);
    } catch (err) {
      setError(err?.response?.data?.error?.details?.message || err?.response?.data?.message || "Erreur lors de la création.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="reglages-api-create-form" onSubmit={submit}>
      <div className="reglages-api-create-head">
        <h3>{hasActiveKey ? "Régénérer la clé" : "Créer une clé"}</h3>
        <p className="card-subtitle">
          La clé sera affichée une seule fois après création.
          {hasActiveKey ? " ⚠️ Une seule clé peut être active : créer une nouvelle clé révoquera automatiquement l'actuelle." : ""}
        </p>
      </div>
      <label className="reglages-field">
        <span>Nom de la clé <span aria-hidden="true">*</span></span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex : Grafana perso, Script analyse…"
          maxLength={80}
        />
      </label>
      <fieldset className="reglages-api-scopes-fieldset">
        <legend>Scopes d'accès</legend>
        {ALL_SCOPES.map((s) => (
          <label key={s} className="reglages-api-scope-option">
            <input type="checkbox" checked={scopes.has(s)} onChange={() => toggleScope(s)} />
            {SCOPE_LABELS[s]}
          </label>
        ))}
      </fieldset>
      {error && <p className="reglages-api-error">{error}</p>}
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Création…" : hasActiveKey ? "Régénérer la clé" : "Créer la clé"}
      </button>
    </form>
  );
}

function DocsSection() {
  return (
    <section className="reglages-api-docs">
      <h3>Documentation rapide</h3>
      <p>Authentifie tes requêtes avec un header <code>Authorization: Bearer &lt;ta-clé&gt;</code>.</p>
      <div className="reglages-api-endpoints">
        {[
          { method: "GET", path: "/api/v1/activities",     scope: "activities:read",  desc: "Liste tes activités (pagination, filtres from/to/sport)" },
          { method: "GET", path: "/api/v1/activities/:id", scope: "activities:read",  desc: "Détail d'une activité (id ou stravaId)" },
          { method: "GET", path: "/api/v1/recovery",       scope: "recovery:read",    desc: "Snapshots Garmin : sommeil, VFC, FC repos, Body Battery" },
          { method: "GET", path: "/api/v1/fitness",        scope: "fitness:read",     desc: "VO2max Garmin, endurance score…" },
          { method: "GET", path: "/api/v1/objectives",     scope: "objectives:read",  desc: "Courses objectifs planifiées" },
        ].map(({ method, path, scope, desc }) => (
          <div key={path} className="reglages-api-endpoint-row">
            <span className="reglages-api-method">{method}</span>
            <code>{API_BASE}{path}</code>
            <span className="reglages-api-scope-chip">{SCOPE_LABELS[scope] || scope}</span>
            <span className="reglages-api-endpoint-desc">{desc}</span>
          </div>
        ))}
      </div>
      <details className="reglages-api-example">
        <summary>Exemple curl</summary>
        <pre>{`curl "${API_BASE}/api/v1/activities?limit=10" \\
  -H "Authorization: Bearer rns_live_votreclé"`}
        </pre>
      </details>
    </section>
  );
}

function ReglagesApiKeysTab() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawToken, setRawToken] = useState("");

  const loadKeys = useCallback(async () => {
    try {
      const { data } = await api.get("/settings/api-keys");
      setKeys(data.apiKeys || []);
    } catch { /* silencieux */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const hasActiveKey = keys.some(
    (k) => !k.revokedAt && (!k.expiresAt || new Date(k.expiresAt) > new Date()),
  );

  const handleCreate = ({ rawToken: token, apiKey }) => {
    setRawToken(token);
    // Le backend révoque automatiquement toute clé active préexistante
    // (une seule clé vivante à la fois) : on reflète localement.
    const now = new Date().toISOString();
    setKeys((prev) => [
      apiKey,
      ...prev.map((k) => (k.revokedAt ? k : { ...k, revokedAt: now })),
    ]);
  };

  const handleRevoke = async (id) => {
    try {
      await api.delete(`/settings/api-keys/${id}`);
      setKeys((prev) => prev.map((k) => k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k));
    } catch { /* silencieux */ }
  };

  return (
    <div className="reglages-section">
      <div className="reglages-section-header">
        <h2 className="card-title">API & Accès</h2>
        <p className="card-subtitle">
          Expose tes données RunNSee via l'API REST sécurisée. Utile pour des dashboards,
          scripts ou outils tiers (Grafana, Python, tableurs…).
        </p>
      </div>

      <NewTokenBanner rawToken={rawToken} onClose={() => setRawToken("")} />

      <CreateKeyForm onCreate={handleCreate} hasActiveKey={hasActiveKey} />

      <section className="reglages-api-keys-list">
        <h3>Mes clés {keys.length > 0 && `(${keys.length})`}</h3>
        {loading ? (
          <p className="reglages-api-empty">Chargement…</p>
        ) : keys.length === 0 ? (
          <p className="reglages-api-empty">Aucune clé créée pour l'instant.</p>
        ) : (
          keys.map((k) => <ApiKeyRow key={k.id} apiKey={k} onRevoke={handleRevoke} />)
        )}
      </section>

      <DocsSection />
    </div>
  );
}

export default memo(ReglagesApiKeysTab);
