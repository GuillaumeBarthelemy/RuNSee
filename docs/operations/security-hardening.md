# Sécurité — Lots 1 & 2 (CSRF + Rate limit + Sessions)

Référence opérationnelle pour le déploiement et les clients HTTP non-navigateur.

## Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `TRUST_PROXY` | `1` en prod, `0` en dev | Nombre de hops reverse proxy devant Express. À ajuster si déploiement direct ou multi-proxy (CDN + nginx → `2`). |
| `SESSION_COOKIE_HOST_PREFIX` | `false` | Si `true`, le cookie de session devient `__Host-runsee_session` (impose secure + path=/ + pas de Domain). **Activer en HTTPS uniquement** et hors fenêtre haute trafic — déconnecte tous les utilisateurs actifs une fois. |
| `SESSION_COOKIE_NAME` | `runsee_session` | Nom de base du cookie de session. |
| `SESSION_COOKIE_SECURE` | auto (HTTPS) | Force le flag `Secure` sur le cookie. |

## Rate limiting

- **Global** : 300 requêtes / 15 min / IP
- **Auth** (`/auth/signup`, `/auth/login`, `/auth/password`) : 10 / 15 min, clé combinée IP + email pour mitiger le blocage CGNAT collectif
- **Garmin connect** (`/providers/garmin/connect`) : 5 / 15 min / IP

En cas de 429, la réponse contient `{ error: { code: "RATE_LIMITED" } }`.

## CSRF — clients HTTP non-navigateur (curl, Python, CI)

Le backend exige le pattern **double-submit cookie** sur toute méthode mutante (`POST/PUT/PATCH/DELETE`), sauf `/auth/strava/callback` (redirect tiers).

### Procédure

1. **GET initial** : récupérer le cookie `runsee_csrf` (généré côté serveur si absent).
2. **Mutation** : envoyer la valeur du cookie dans le header `X-CSRF-Token`.

### Exemple curl

```bash
# 1. Premier GET pour obtenir le cookie CSRF + session
curl -c cookies.txt https://api.example.com/health

# 2. Lecture du token dans le jar cookies
CSRF=$(awk '/runsee_csrf/ {print $7}' cookies.txt)

# 3. Mutation avec header CSRF + cookie
curl -b cookies.txt -c cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -X POST https://api.example.com/auth/login \
  -d '{"email":"user@example.com","password":"..."}'
```

### Exemple Python (requests)

```python
import requests

s = requests.Session()
s.get("https://api.example.com/health")  # récupère cookie csrf
csrf = s.cookies.get("runsee_csrf")
s.post(
    "https://api.example.com/auth/login",
    json={"email": "user@example.com", "password": "..."},
    headers={"X-CSRF-Token": csrf},
)
```

### Erreur `403 CSRF_INVALID`

Cause typique : header `X-CSRF-Token` absent ou différent du cookie. Vérifier que :
- Le client maintient bien le jar de cookies entre les requêtes.
- Le cookie `runsee_csrf` est lisible côté client (non-httpOnly côté serveur).

## Politique de mot de passe

À l'inscription et au changement :
- ≥ 10 caractères, ≤ 256
- Au moins 3 catégories parmi : majuscule, minuscule, chiffre, spécial
- Refusé si dans la blacklist top 30 (HIBP).

À la connexion : pas de revalidation (compatibilité comptes existants).

## Sessions

- Cookie httpOnly, sameSite=lax, secure en HTTPS.
- TTL : `SESSION_TTL_DAYS` (défaut 30j).
- `lastSeenAt` mis à jour avec throttle 5 min.
- Purge automatique quotidienne des sessions `expiresAt` ou `revokedAt` < now - 30j (job `cleanupSessions.js`).

## Migration Lot 3 — Cohérence données

Migration `20260528100000_lot3_data_consistency` :

1. **Index SyncJob** : `[appUserId, queuedAt DESC]` — accélère `listSyncJobs` et `getCurrentSyncJob`.
2. **Backfill Garmin displayName** : remplace UUID v4 par l'email saisi (`accountIdentifier`) pour les connexions Garmin existantes.
3. **CHECK constraints postgres** sur `AppUser.{language, themePreference, unitsPreference, densityPreference, role, status}` — défense en profondeur contre modifications DB directes.
4. **Pré-normalisation** : avant les CHECK constraints, les valeurs hors-liste sont remises à leur défaut (`fr`, `light`, `metric`, `comfort`, `user`, `active`).

### À vérifier avant déploiement postgres

```sql
SELECT DISTINCT language FROM "AppUser";
SELECT DISTINCT "themePreference" FROM "AppUser";
SELECT DISTINCT role, status FROM "AppUser";
```

Si des valeurs custom existent (autre que défaut), elles seront **écrasées** par la pré-normalisation. Sauvegarder avant si nécessaire.

### Garmin displayName

Les utilisateurs Garmin connectés avant le fix `extractGarminProfile` voient leur UUID au lieu de leur email. Cette migration met à jour la DB. Pas de reconnexion requise. Heuristique :
- Postgres : regex stricte `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`
- Sqlite : longueur 36 + tirets aux positions 9/14/19/24

## Lot 4 — Endpoint `/sync/data-quality`

`GET /sync/data-quality?days=30` (auth requise).

Réponse :
```json
{
  "days": 30,
  "total": 22,
  "complete":  { "count": 22, "pct": 100 },
  "fc":        { "count": 22, "pct": 100 },
  "power":     null,
  "altimetry": { "count": 21, "pct": 95 }
}
```

Notes :
- `power: null` quand aucune activité n'a `averageWatts > 0` sur la fenêtre. Le frontend doit masquer la barre dans ce cas.
- `days` clampé entre 1 et 365.
- 5 `COUNT(*)` parallèles ; perf < 50 ms sur 1k activités.

`GET /sync/summary` expose désormais `autoSyncIntervalMinutes` (depuis `env.autoIncrementalSyncIntervalMinutes`).

## Lot 7 — i18n + Cleanup + Rotation clés

### Audit git history `.env*`

Vérifié : seuls des fichiers `.example` ont été versionnés. `frontend/.env` brièvement présent ne contenait que des URLs publiques (pas de secrets). **Aucune fuite.**

### Archive

`AGENTS.md` + `SUIVI_CHANTIER_ALPINE_LIGHT.md` déplacés dans `docs/archive/` (commande `git mv`).

### Rotation `RUNSEE_PROVIDER_TOKEN_ENCRYPTION_KEY`

Procédure :

```bash
# 1. Lancer une instance avec ancienne + nouvelle cle (les 2 sont valides pour decrypt)
export RUNSEE_PROVIDER_TOKEN_ENCRYPTION_KEY=NEW_KEY
export RUNSEE_PROVIDER_TOKEN_ENCRYPTION_KEY_PREVIOUS=OLD_KEY

# 2. Re-chiffrer toutes les sessions provider avec la nouvelle cle
cd backend && npm run providers:reencrypt

# 3. Une fois OK, retirer la variable PREVIOUS et redeployer
unset RUNSEE_PROVIDER_TOKEN_ENCRYPTION_KEY_PREVIOUS
```

Le service crypto essaie toutes les clés candidates au décryptage (nouvelle puis ancienne). Aucune interruption utilisateur pendant la rotation.

### i18n scaffold (maison, léger)

`frontend/src/i18n/i18n.js` — wrapper minimal compatible `react-i18next` API :

```jsx
import { useTranslation } from "../i18n/i18n.js";
function MyComp() {
  const t = useTranslation();
  return <button>{t("common.save")}</button>;
}
```

- Locales : `fr.js` (default) + `en.js` (squelette).
- Pilotage via `user.language` dans `UserPreferencesProvider` (`setLanguage` côté i18n).
- Migration progressive : extraire les strings au fil des refactors.
- **Pas d'install react-i18next** (économie ~200 KB bundle). API compatible pour swap ultérieur.

## Lot 6 — Tests + Observabilité

### Logger applicatif

`backend/src/config/logger.js` — wrapper minimal sur console, sortie JSON par ligne. Niveaux `trace|debug|info|warn|error`. Filtrage via `LOG_LEVEL` (défaut `info` en prod, `debug` ailleurs). Point d'entrée unique pour migrer vers pino plus tard sans refactor des call sites. `console.*` existants laissés en place (migration progressive).

### Variables env

```env
LOG_LEVEL=info   # trace|debug|info|warn|error
```

### Tests ajoutés

Backend (`npm test`) : 71 tests (+18 nouveaux)
- `account.service.test.js` : `validatePassword` (8 cas — longueur, complexité, blacklist, casse, edge nulls)
- `csrf.middleware.test.js` : 8 cas (cookie gen, methodes safe, exemption callback, header match/mismatch, PUT/PATCH/DELETE)
- `cleanupSessions.test.js` : idempotence start/stop

Frontend (`npm test`) : 311 tests (+9 nouveaux)
- `ReglagesDonneesTab.test.jsx` : `buildQualityBars` (5 cas — null, payload invalide, omission Puissance, couleurs)
- `usePolling.test.js` : formule backoff exponentiel (4 cas)

### Reporté

| Item | Raison | Quand |
|------|--------|-------|
| supertest sur `account.controller` | nécessite app boot + DB éphémère | itération future |
| axe-core a11y modals | nécessite jsdom + @testing-library/react + axe-core/react (~50 MB deps) | itération future |
| Tests `usePolling` hook complet (refs, cleanup) | idem jsdom requis | itération future |
| Migration `console.*` → `logger.*` (28 sites) | progressive, non bloquante | continu |

## Lot 5 — A11y modals + Toast hygiène

- `hooks/useModal.js` : ESC, focus trap Tab/Shift+Tab, focus restore via `openerRef`, focus initial sur le 1er focusable. Utilisé par 7 modals.
- `ToastProvider` : max 5 toasts visibles (FIFO eviction), dedup `message + tone` sur fenêtre 3s avec compteur `×N`.

### Différé en Lot 6 (testing infra)

- axe-core scan automatisé : nécessite `@testing-library/react` + `jsdom` + `axe-core/react`. Vérifier en Lot 6 avec setup vitest jsdom.
- Dark mode Recharts ScatterChart : à valider visuellement via Chrome MCP captures (pas d'edit aveugle).

## Lot 4 — Hook `usePolling`

Frontend, `hooks/usePolling.js`. Backoff exponentiel `base * 2^errors` cappé à `maxIntervalMs`. Stop immédiat sur 401/403 par défaut (`stopOnHttpStatus: [401, 403]`). Stop après `maxConsecutiveErrors` échecs.

## Migration `__Host-` cookie prefix (à planifier)

Pré-requis : HTTPS uniquement, déploiement non-clusterisé ou rolling-update accepté.

1. Notifier les utilisateurs d'une fenêtre de maintenance courte.
2. Déployer avec `SESSION_COOKIE_HOST_PREFIX=true`.
3. Tous les utilisateurs avec une session active sont déconnectés (nouveau nom de cookie ≠ ancien).
4. Reconnexion → nouveau cookie `__Host-runsee_session`.

Pas de rollback en douceur : pour revenir, désactiver le flag → tous déconnectés à nouveau.
