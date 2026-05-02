# Phase B — Hardening prod (Lot 9 + backups + monitoring)

> **Audience** : agent CODEX sans contexte préalable de la conversation.
> **Objectif** : fiabiliser l'exploitation Garmin et l'infra : observabilité, suppression utilisateur RGPD, backups off-site, healthcheck continu, alerting.
> **Contraintes** : pas de modification des calculs scientifiques ; préserver le principe « Garmin enrichit, ne crée pas de dépendance ».

---

## 1. Contexte

L'application RunNSee tourne en production sur une VM IONOS Ubuntu 24.04 (`/srv/runsee/repo`), déployée par CI GitHub Actions (`.github/workflows/deploy-vm.yml`). Les services en `docker-compose` :
- `runsee-postgres-prod` (Postgres 16, non exposé)
- `runsee-backend` (Express + Prisma + Python pour Garmin)
- `runsee-frontend` (Nginx)
- `runsee-cloudflared` (tunnel sortant)

Le backend Garmin est connecté à des comptes utilisateur via `garminconnect` (Python non officiel). Snapshots de récupération stockés dans `ExternalProviderRawData` + `ExternalDailyRecoverySnapshot`.

### Ce qui manque aujourd'hui
- Pas de bouton "supprimer toutes mes données Garmin" côté utilisateur.
- Pas de logs sanitisés : risque que des secrets (email, token) fuitent.
- Pas de monitoring continu (juste healthcheck post-deploy).
- Pas de backups Postgres off-site (les dumps locaux sur la VM disparaîtraient avec la VM).
- Pas d'alerte en cas de chute de service.
- Pas de métriques de sync Garmin agrégées.

---

## 2. Lots de la Phase B

| Lot | Objet | Effort |
|---|---|---|
| B1 | Suppression utilisateur RGPD (purge Garmin) | 2-3 h |
| B2 | Logs sanitisés + métriques sync agrégées | 2-3 h |
| B3 | Backups Postgres off-site (Cloudflare R2) | 2-3 h |
| B4 | Monitoring continu Uptime Kuma + alerting Telegram | 2-3 h |
| B5 | Tests intégration Garmin et exécution complète | 1-2 h |

---

## 3. Lot B1 — Endpoint de purge utilisateur Garmin

### Objectif
Permettre à un utilisateur de supprimer **toutes** ses données Garmin en un clic. Conformité RGPD (droit à l'effacement).

### Fichiers
- `backend/src/services/providers/garminProvider.service.js` (ajouter `purgeGarminDataForUser`)
- `backend/src/controllers/provider.controller.js` (ajouter `purgeGarminDataController`)
- `backend/src/routes/provider.routes.js` (ajouter route)
- `frontend/src/services/externalProvider.service.js` (ajouter `purgeGarminData`)
- `frontend/src/components/GarminExperimentalCard.jsx` (ajouter bouton + confirmation)

### Backend

#### B1.1 Service `purgeGarminDataForUser(appUserId)`
Dans une transaction Prisma :
1. `prisma.activityProviderEnrichment.deleteMany({ where: { providerCode: "garminconnect_unofficial", userId: appUserId } })`
2. `prisma.externalDailyRecoverySnapshot.deleteMany({ where: { userId: appUserId, providerCode: "garminconnect_unofficial" } })`
3. `prisma.externalProviderRawData.deleteMany({ where: { userId: appUserId, providerCode: "garminconnect_unofficial" } })`
4. `prisma.externalProviderConnection.deleteMany({ where: { appUserId, providerCode: "garminconnect_unofficial" } })`
5. Retour : `{ purgedCounts: { connections, snapshots, rawData, enrichments } }`

Nb : utiliser les noms de champs réels du schéma Prisma (vérifier `prisma-postgresql/schema.prisma`).

#### B1.2 Controller + route
```
DELETE /providers/garmin/data
Auth : requireAuth
```

Le controller appelle le service et retourne 200 avec le breakdown.

#### B1.3 Sécurité
- Confirmation cliente obligatoire (modale) avant l'appel.
- Pas d'appel sans `confirm: "PURGE_GARMIN"` dans le body (sécurité serveur).
- Logger l'action (sans données) : `console.info(\`Garmin data purged for user ${appUserId} at ${new Date().toISOString()}\`)`.

### Frontend

#### B1.4 Service
```js
export async function purgeGarminData() {
  const response = await api.delete("/providers/garmin/data", {
    data: { confirm: "PURGE_GARMIN" },
  });
  return response.data;
}
```

#### B1.5 UI dans `GarminExperimentalCard`
- Bouton "Supprimer mes données Garmin" en bas de la carte, style discret (button-outline-danger).
- Au clic : modale de confirmation avec texte explicite :
  > Toutes tes données Garmin (connexion, sommeil, HRV, FC repos, stress, Body Battery sur 180 jours) seront supprimées définitivement. Cette action est irréversible.
- Champ texte "Tape PURGE pour confirmer" comme verrou final.
- Au succès : refresh du statut Garmin (revient à "Non connecté").

### Acceptance B1
- L'utilisateur peut purger ses données Garmin depuis Admin.
- Toutes les tables `External*` sont vidées pour son `appUserId`.
- L'UI revient en état "Non connecté".
- Aucune autre donnée utilisateur n'est touchée.

---

## 4. Lot B2 — Logs sanitisés + métriques sync agrégées

### Objectif
1. Garantir qu'aucun secret (email Garmin, password, cookie de session) n'apparaît dans les logs.
2. Exposer un endpoint de métriques sync simple pour visualiser la santé du provider.

### Fichiers
- `backend/src/services/providers/garminProvider.service.js`
- `backend/src/services/providers/garminconnectBridge.service.js`
- `backend/src/services/providers/garminRecoveryBackfill.service.js`
- `backend/src/services/providers/garminRecoveryAutoSync.service.js`
- `backend/src/controllers/provider.controller.js` (nouveau endpoint metrics)
- `backend/src/routes/provider.routes.js`
- `frontend/src/components/GarminExperimentalCard.jsx` (afficher métriques)

### Sanitization des logs

#### B2.1 Helper de sanitization
Créer `backend/src/services/providers/loggerSanitization.js` :
```js
const SECRET_PATTERNS = [
  /password=[^&\s]+/gi,
  /[A-Za-z0-9-_]{20,}\.[A-Za-z0-9-_]{20,}\.[A-Za-z0-9-_]{20,}/g, // JWT-like
  /SESSION_[A-F0-9]+/gi,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // emails
];

export function sanitizeForLog(input) {
  if (!input) return "";
  let safe = String(input);
  for (const pattern of SECRET_PATTERNS) {
    safe = safe.replace(pattern, "[REDACTED]");
  }
  return safe.length > 500 ? `${safe.slice(0, 500)}…[truncated]` : safe;
}

export function sanitizeError(error) {
  return {
    message: sanitizeForLog(error?.message),
    code: error?.code || "UNKNOWN",
  };
}
```

#### B2.2 Audit des logs existants
Dans tous les fichiers de `backend/src/services/providers/`, remplacer :
- `console.error(error)` → `console.error(sanitizeError(error))`
- `console.log(payload)` → `console.log(sanitizeForLog(JSON.stringify(payload)))`
- `console.error(\`Garmin error: \${err.message}\`)` → `console.error(\`Garmin error: \${sanitizeForLog(err.message)}\`)`

Aucun log ne doit jamais contenir : email Garmin, password, cookie de session, header Authorization, payload brut complet.

### Métriques agrégées

#### B2.3 Service `getGarminSyncMetrics(appUserId)`
Dans `garminProvider.service.js` :
```js
export async function getGarminSyncMetrics(appUserId) {
  const since30d = new Date(Date.now() - 30 * 86400000);
  
  const [totalSnapshots, recentSnapshots, errorRows, lastSync] = await Promise.all([
    prisma.externalDailyRecoverySnapshot.count({
      where: { userId: appUserId, providerCode: "garminconnect_unofficial" },
    }),
    prisma.externalDailyRecoverySnapshot.count({
      where: {
        userId: appUserId,
        providerCode: "garminconnect_unofficial",
        syncedAt: { gte: since30d },
      },
    }),
    prisma.externalProviderRawData.count({
      where: {
        userId: appUserId,
        providerCode: "garminconnect_unofficial",
        status: "error",
        syncedAt: { gte: since30d },
      },
    }),
    prisma.externalProviderConnection.findFirst({
      where: { appUserId, providerCode: "garminconnect_unofficial" },
      select: { lastSyncAt: true, status: true, lastErrorCode: true },
    }),
  ]);
  
  return {
    totalSnapshots,
    snapshotsLast30Days: recentSnapshots,
    errorsLast30Days: errorRows,
    lastSyncAt: lastSync?.lastSyncAt || null,
    connectionStatus: lastSync?.status || "disconnected",
    lastErrorCode: lastSync?.lastErrorCode || null,
  };
}
```

#### B2.4 Endpoint
```
GET /providers/garmin/metrics
Auth : requireAuth
```

Controller minimal qui appelle le service et retourne JSON.

#### B2.5 Affichage frontend
Dans `GarminExperimentalCard`, ajouter une section "Diagnostic" repliée par défaut :
- Snapshots totaux : N
- Snapshots 30 derniers jours : N
- Erreurs 30 derniers jours : N
- Dernière sync : `<datetime>`
- État connexion : `connected` / `expired` / `error`

### Acceptance B2
- `grep -ri "password" /var/log/...` ou les logs Docker ne révèlent aucun secret.
- L'endpoint `/providers/garmin/metrics` retourne les 6 métriques.
- La carte Garmin Admin affiche les métriques de diagnostic.

---

## 5. Lot B3 — Backups Postgres off-site (Cloudflare R2)

### Objectif
Pousser les dumps quotidiens vers un bucket Cloudflare R2 (gratuit jusqu'à 10 Go) pour survivre à une perte de la VM.

### Fichiers
- `deployment/linux/scripts/backup-postgres.sh` (modifier)
- `/srv/runsee/env/runsee-backend-prod.env` (sur la VM, ajouter credentials R2)
- `deployment/linux/scripts/restore-postgres.sh` (CREER)
- `deployment/linux/README.md` (documenter)

### Prérequis (côté utilisateur)

L'utilisateur doit créer **une fois** un bucket R2 :
1. Cloudflare Dashboard → R2 → Create bucket → nom `runsee-backups`.
2. R2 → Manage R2 API tokens → Create token avec scope **Object Read & Write** sur ce bucket.
3. Récupérer : `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET=runsee-backups`.

### Backend (script de backup)

#### B3.1 Modifier `backup-postgres.sh`
```bash
#!/usr/bin/env bash
set -Eeuo pipefail

# ... (lecture variables env file existante)

BACKUP_DIR=/srv/runsee/backups
RETENTION_DAYS=14
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

cd /srv/runsee/repo
docker compose --env-file /srv/runsee/env/runsee-backend-prod.env \
  -f deployment/linux/docker-compose.prod.yml \
  exec -T postgres pg_dump -U runsee_app -d runsee_prod -Fc \
  > "$BACKUP_DIR/runsee_prod_${TIMESTAMP}.dump"

# Off-site upload vers R2 (via aws cli, S3-compatible)
if [ -n "${R2_ACCESS_KEY_ID:-}" ] && [ -n "${R2_SECRET_ACCESS_KEY:-}" ]; then
  AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
  AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
  aws s3 cp "$BACKUP_DIR/runsee_prod_${TIMESTAMP}.dump" \
    "s3://${R2_BUCKET}/postgres/runsee_prod_${TIMESTAMP}.dump" \
    --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
    --no-progress
  echo "[$(date)] Backup uploaded to R2: runsee_prod_${TIMESTAMP}.dump"
else
  echo "[$(date)] WARN R2 credentials missing, backup local only"
fi

# Retention locale
find "$BACKUP_DIR" -name 'runsee_prod_*.dump' -mtime +${RETENTION_DAYS} -delete
```

#### B3.2 Installer aws-cli sur la VM (une fois)
```
sudo apt install -y awscli
```

#### B3.3 Cron quotidien (sur la VM, en tant que `runsee`)
```
crontab -e
```
Ajouter :
```
0 4 * * * /srv/runsee/repo/deployment/linux/scripts/backup-postgres.sh >> /srv/runsee/backups/backup.log 2>&1
```

#### B3.4 Script de restore `restore-postgres.sh`
```bash
#!/usr/bin/env bash
set -Eeuo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <backup_file_or_r2_key>"
  exit 1
fi

INPUT="$1"
LOCAL_FILE=""

if [ -f "$INPUT" ]; then
  LOCAL_FILE="$INPUT"
else
  TMPDIR=$(mktemp -d)
  AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
  AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
  aws s3 cp "s3://${R2_BUCKET}/${INPUT}" "$TMPDIR/restore.dump" \
    --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
  LOCAL_FILE="$TMPDIR/restore.dump"
fi

cd /srv/runsee/repo
docker compose --env-file /srv/runsee/env/runsee-backend-prod.env \
  -f deployment/linux/docker-compose.prod.yml \
  exec -T postgres pg_restore -U runsee_app -d runsee_prod \
    --clean --if-exists --no-owner --jobs=2 \
  < "$LOCAL_FILE"

echo "Restore complete from $INPUT"
```

### Acceptance B3
- Lendemain de l'installation, un dump apparaît dans le bucket R2 sous `postgres/runsee_prod_<TS>.dump`.
- Le script `restore-postgres.sh` peut restaurer un dump R2 en local.
- Rétention 14 jours côté local fonctionne.

---

## 6. Lot B4 — Monitoring continu Uptime Kuma + alerting Telegram

### Objectif
Avoir un dashboard d'état permanent et recevoir une notification Telegram dès qu'un service tombe.

### Décision technique
- **Uptime Kuma** : self-hosted, ~50 Mo RAM, dashboard simple.
- Alerte via webhook Telegram (gratuit, instantané).

### Fichiers
- `deployment/linux/docker-compose.monitoring.yml` (CREER)
- `/srv/runsee/cloudflared/config.yml` (sur la VM, ajouter route monitoring optionnelle)

### Opérations

#### B4.1 Compose dédié monitoring
```yaml
name: runsee-monitoring

services:
  uptime-kuma:
    image: louislam/uptime-kuma:1
    container_name: runsee-uptime-kuma
    restart: unless-stopped
    ports:
      - "127.0.0.1:3001:3001"
    volumes:
      - uptime-kuma-data:/app/data
    deploy:
      resources:
        limits:
          memory: 200M

volumes:
  uptime-kuma-data:
    driver: local
```

#### B4.2 Démarrage
Sur la VM :
```
cd /srv/runsee/repo
docker compose -f deployment/linux/docker-compose.monitoring.yml up -d
```

Accéder via SSH tunnel local : `ssh -L 3001:127.0.0.1:3001 runsee@<vps>` puis navigateur sur `localhost:3001`.

#### B4.3 Configurer les checks dans Uptime Kuma
Une fois sur l'UI Uptime Kuma, créer 3 monitors :
1. **HTTP** `https://api.runnsee.net/health` — interval 60 s.
2. **HTTP** `https://api.runnsee.net/db/health` — interval 5 min.
3. **HTTP** `https://runsee.runnsee.net` — interval 60 s, retry 3.

#### B4.4 Setup Telegram
1. Créer un bot Telegram (`@BotFather` → `/newbot`) → récupérer le `BOT_TOKEN`.
2. Démarrer une conversation avec le bot, puis appeler `https://api.telegram.org/bot<TOKEN>/getUpdates` pour récupérer le `chat_id`.
3. Dans Uptime Kuma → Settings → Notifications → Add → Telegram → renseigner `BOT_TOKEN` + `chat_id`.
4. Activer la notif sur les 3 monitors.

### Acceptance B4
- Dashboard Uptime Kuma accessible (via tunnel SSH).
- Les 3 monitors sont verts.
- Couper volontairement le backend (`docker stop runsee-backend`) → notification Telegram en moins de 2 min.
- Relancer → notif "back up".

---

## 7. Lot B5 — Tests d'intégration Garmin

### Objectif
Vérifier qu'un flux Garmin complet (connexion, backfill, sync, purge) fonctionne sans casser.

### Procédure de test (manuelle, sur la prod ou un compte test)

| # | Étape | Attendu |
|---|---|---|
| 1 | Aller sur `/admin` (logged in) | Carte Garmin "Non connecté" |
| 2 | Saisir email + password Garmin | Connexion réussie OU MFA demandée |
| 3 | Si MFA : saisir code | Statut "connected" |
| 4 | Lancer "Récupération historique" | Status passe à "syncing" |
| 5 | Attendre 5-10 min | Snapshots progressivement remplis (vérif via `/providers/garmin/metrics`) |
| 6 | Aller sur `/` (Aujourd'hui) | Carte Décision affiche bloc "Récupération Garmin" |
| 7 | Cliquer "Sync récente" | Update last 4 jours |
| 8 | Cliquer "Supprimer mes données Garmin" → confirmer | Connexion revient à "Non connecté", snapshots = 0 |
| 9 | Aller sur `/` (Aujourd'hui) | Pas de bloc "Récupération Garmin" |

### Documentation
Créer `docs/RUNBOOK_GARMIN.md` avec :
- Comment tester le flux complet.
- Commandes SQL utiles (compter snapshots, vérifier état connexion).
- Procédure de déblocage si MFA bloqué (workflow `maintenance-reset-garmin.yml`).
- Liens vers les endpoints API.

### Acceptance B5
- Les 9 étapes du tableau passent sans erreur.
- Le runbook existe dans `docs/`.

---

## 8. Tests locaux à exécuter (Phase B)

```bash
# Backend
cd backend
npx eslint src/services/providers/ src/controllers/provider.controller.js src/routes/provider.routes.js --max-warnings 0
node --check src/services/providers/loggerSanitization.js

# Frontend
cd ../frontend
npx eslint src/services/externalProvider.service.js src/components/GarminExperimentalCard.jsx --max-warnings 0
npm test  # tests Vitest
npm run build

# Scripts
cd ../deployment/linux/scripts
shellcheck backup-postgres.sh restore-postgres.sh || true  # warning si shellcheck pas installé

# Test runtime sur la VM (par SSH)
ssh runsee@<vps> "cd /srv/runsee/repo && docker compose -f deployment/linux/docker-compose.prod.yml exec -T backend curl -fsS http://localhost:3003/providers/garmin/metrics" -H "Cookie: <session>"
```

---

## 9. Commit + push pour CI/CD

À la fin de chaque lot B1-B4 (ou en fin de Phase B selon ton choix), un commit dédié :

### Commit B1
```bash
git add backend/src/services/providers/garminProvider.service.js
git add backend/src/controllers/provider.controller.js
git add backend/src/routes/provider.routes.js
git add frontend/src/services/externalProvider.service.js
git add frontend/src/components/GarminExperimentalCard.jsx
git commit -m "Phase B1 : endpoint de purge utilisateur Garmin (RGPD droit a l'effacement)"
git push origin main
```

### Commit B2
```bash
git add backend/src/services/providers/loggerSanitization.js
git add backend/src/services/providers/  # tous les fichiers Garmin sanitizes
git add backend/src/controllers/provider.controller.js
git add backend/src/routes/provider.routes.js
git add frontend/src/components/GarminExperimentalCard.jsx
git commit -m "Phase B2 : logs Garmin sanitises + endpoint metrics + diagnostic UI"
git push origin main
```

### Commit B3
```bash
git add deployment/linux/scripts/backup-postgres.sh
git add deployment/linux/scripts/restore-postgres.sh
git add deployment/linux/README.md
git commit -m "Phase B3 : backups Postgres off-site Cloudflare R2 + script restore"
git push origin main
```

Note : le cron crontab et l'aws-cli s'installent **directement sur la VM** (pas via CI/CD), à faire en SSH.

### Commit B4
```bash
git add deployment/linux/docker-compose.monitoring.yml
git commit -m "Phase B4 : compose Uptime Kuma pour monitoring continu"
git push origin main
```

L'installation effective d'Uptime Kuma + la configuration des monitors et notifications Telegram se fait **manuellement sur la VM**, puisque c'est de la donnée d'instance (pas du code).

### Commit B5
```bash
git add docs/RUNBOOK_GARMIN.md
git commit -m "Phase B5 : runbook tests Garmin de bout en bout"
git push origin main
```

---

## 10. Acceptance globale Phase B

- [ ] Lot B1 : utilisateur peut purger ses données Garmin, RGPD respecté.
- [ ] Lot B2 : logs sanitisés, endpoint `/providers/garmin/metrics` actif, diagnostic UI dans Admin.
- [ ] Lot B3 : 1 dump quotidien envoyé sur Cloudflare R2, script restore fonctionnel.
- [ ] Lot B4 : Uptime Kuma actif, 3 monitors verts, notification Telegram opérationnelle.
- [ ] Lot B5 : runbook documenté, 9 étapes test validées.
- [ ] CI/CD verte sur `main` après chaque commit.
- [ ] Healthchecks publics OK.

---

## 11. Hors scope

- Pas de migration vers une DB managée externe.
- Pas d'observabilité avancée type Grafana / Prometheus / Loki (Uptime Kuma + cron suffisent).
- Pas de tests automatisés E2E.
- Pas de modification du backend Garmin sur la logique de sync (juste la sanitization et les métriques).
- Pas de purge des activités Strava (purge limitée aux données Garmin).
