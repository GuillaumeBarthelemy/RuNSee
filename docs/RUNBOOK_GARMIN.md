# Runbook Garmin — RuNSee

## 1. Flux complet de test (9 étapes)

Exécuter sur un compte connecté à RuNSee, de préférence en non-production ou sur ton propre compte.

| # | Étape | Attendu |
|---|---|---|
| 1 | Aller sur `/admin` (connecté) | Carte Garmin affiche "Non connecté" |
| 2 | Saisir email + password Garmin, cocher le consentement, cliquer Connecter | Statut passe à "connected" OU demande MFA |
| 3 | Si MFA demandé : saisir le code reçu par email | Statut "connected" |
| 4 | Cliquer "Récupération historique" | Statut passe à "syncing", barre de progression s'anime |
| 5 | Attendre 5-15 min (180 jours = ~60 appels par batch de 3) | Snapshots progressivement remplis — vérifier via `/providers/garmin/metrics` |
| 6 | Aller sur `/` (Dashboard Aujourd'hui) | Carte Décision affiche un bloc "Récupération Garmin" avec label + confiance + facteurs |
| 7 | Retourner sur `/admin`, cliquer "Sync récente" | Bouton passe en "Syncing...", snapshots des 4 derniers jours mis à jour |
| 8 | Cliquer "Supprimer mes données Garmin" → saisir PURGE → Confirmer | Connexion revient à "Non connecté", métriques à 0 |
| 9 | Retourner sur `/` (Dashboard) | Pas de bloc "Récupération Garmin" (fallback charge-only) |

---

## 2. Requêtes SQL utiles (PostgreSQL prod)

Se connecter au conteneur :
```bash
docker exec -it runsee-postgres-prod psql -U runsee_app -d runsee_prod
```

### Compter les snapshots par utilisateur
```sql
SELECT "appUserId", COUNT(*) AS snapshots,
       MIN("snapshotDate") AS depuis,
       MAX("snapshotDate") AS jusqu_au
FROM "ExternalDailyRecoverySnapshot"
GROUP BY "appUserId"
ORDER BY snapshots DESC;
```

### Vérifier l'état des connexions Garmin
```sql
SELECT "appUserId", status, "lastSyncAt", "lastErrorCode", "lastErrorAt"
FROM "ExternalProviderConnection"
WHERE "providerCode" = 'garminconnect_unofficial'
ORDER BY "lastSyncAt" DESC NULLS LAST;
```

### Snapshots avec sleepScore nul (anomalie)
```sql
SELECT "snapshotDate", "sleepScore", "restingHr", "hrvAvgMs", "dataQuality"
FROM "ExternalDailyRecoverySnapshot"
WHERE "sleepScore" IS NULL OR "sleepScore" = 0
ORDER BY "snapshotDate" DESC
LIMIT 20;
```

### Erreurs raw data récentes
```sql
SELECT "providerResourceId", "providerDateKey", status, "syncedAt"
FROM "ExternalProviderRawData"
WHERE "providerCode" = 'garminconnect_unofficial'
  AND status = 'error'
ORDER BY "syncedAt" DESC
LIMIT 20;
```

---

## 3. Procédure de déblocage MFA bloqué

Si le statut Garmin reste bloqué sur `mfa_required` et qu'aucun code n'est plus valide :

**Option A — Reset via workflow GitHub Actions** :
1. Aller sur `https://github.com/GuillaumeBarthelemy/RuNSee/actions`
2. Workflow `Maintenance Reset Garmin` → Run workflow → token `RESET_GARMIN`
3. Le workflow supprime la session encryptée côté DB → statut repasse à "Non connecté"
4. Relancer une connexion depuis `/admin`

**Option B — Reset SQL direct** :
```sql
UPDATE "ExternalProviderConnection"
SET status = 'disconnected',
    "encryptedSession" = NULL,
    "lastErrorCode" = NULL,
    "lastErrorMessage" = NULL
WHERE "providerCode" = 'garminconnect_unofficial';
```

---

## 4. Backups PostgreSQL

### Lancer un backup manuel
```bash
/srv/runsee/repo/deployment/linux/scripts/backup-postgres.sh
```

### Lister les backups locaux
```bash
ls -lh /srv/runsee/backups/runsee_prod_*.dump
```

### Lister les backups R2
```bash
AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
aws s3 ls "s3://${R2_BUCKET}/postgres/" \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
```

### Restaurer depuis un fichier local
```bash
/srv/runsee/repo/deployment/linux/scripts/restore-postgres.sh \
  /srv/runsee/backups/runsee_prod_20260504_040001.dump
```

### Restaurer depuis R2
```bash
/srv/runsee/repo/deployment/linux/scripts/restore-postgres.sh \
  postgres/runsee_prod_20260504_040001.dump
```

### Configurer le cron quotidien (4h00, sur la VM)
```bash
crontab -e
# Ajouter :
0 4 * * * /srv/runsee/repo/deployment/linux/scripts/backup-postgres.sh >> /srv/runsee/backups/backup.log 2>&1
```

### Variables R2 à ajouter dans `/srv/runsee/env/runsee-backend-prod.env`
```
R2_ACCESS_KEY_ID=<depuis Cloudflare R2 API tokens>
R2_SECRET_ACCESS_KEY=<depuis Cloudflare R2 API tokens>
R2_ACCOUNT_ID=<ID de ton compte Cloudflare>
R2_BUCKET=runsee-backups
```

---

## 5. Monitoring Uptime Kuma

### Démarrer le stack monitoring
```bash
cd /srv/runsee/repo
docker compose -f deployment/linux/docker-compose.monitoring.yml up -d
```

### Accéder à l'UI (tunnel SSH)
```bash
ssh -L 3001:127.0.0.1:3001 <user>@<vps>
# Ouvrir http://localhost:3001 dans le navigateur
```

### Monitors à configurer dans l'UI
| Nom | URL | Intervalle |
|---|---|---|
| API health | `https://api.runnsee.net/health` | 60 s |
| DB health | `https://api.runnsee.net/db/health` | 5 min |
| Frontend | `https://runsee.runnsee.net` | 60 s |

### Setup notification Telegram
1. `@BotFather` sur Telegram → `/newbot` → noter `BOT_TOKEN`
2. Démarrer une conversation avec le bot
3. `https://api.telegram.org/bot<TOKEN>/getUpdates` → noter `chat_id`
4. Uptime Kuma → Settings → Notifications → Add → Telegram → renseigner `BOT_TOKEN` + `chat_id`
5. Activer la notification sur les 3 monitors

---

## 6. Endpoints API utiles

| Endpoint | Méthode | Auth | Description |
|---|---|---|---|
| `/health` | GET | Non | Healthcheck backend |
| `/db/health` | GET | Non | Healthcheck DB (retourne `database: "postgresql"`) |
| `/providers/garmin/status` | GET | Oui | Statut connexion + backfill |
| `/providers/garmin/metrics` | GET | Oui | Métriques sync 30 jours |
| `/providers/garmin/recovery/snapshots?days=N` | GET | Oui | Snapshots recovery |
| `/providers/garmin/recovery/backfill` | POST | Oui | Lancer backfill historique |
| `/providers/garmin/recovery/sync-recent` | POST | Oui | Sync 4 derniers jours |
| `/providers/garmin/recovery/renormalize` | POST | Oui | Re-normaliser depuis raw data |
| `/providers/garmin/data` | DELETE | Oui | Purger toutes les données Garmin |
