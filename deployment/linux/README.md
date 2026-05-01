# RunNSee - Deploiement Linux Ubuntu 24.04

## Objectif

Ce dossier contient les artefacts de production pour heberger RunNSee sur une VM Linux Ubuntu 24.04 avec Docker Compose et Cloudflare Tunnel.

Architecture cible :

- `postgres` : PostgreSQL 16, non expose publiquement.
- `backend` : API Express/Prisma sur le reseau Docker interne.
- `frontend` : build React/Vite servi par Nginx.
- `cloudflared` : tunnel sortant vers Cloudflare.

Routes publiques via tunnel :

- `https://runsee.runnsee.net` -> `frontend:80`
- `https://api.runnsee.net` -> `backend:3003`

Aucun port HTTP/HTTPS n'a besoin d'etre ouvert sur la VM.

## Arborescence attendue sur la VM

```text
/srv/runsee/
  repo/
  env/
    runsee-backend-prod.env
    runsee-frontend-prod.env
  cloudflared/
    config.yml
    8344dc0e-d423-45ff-90b0-3c38fd7df376.json
  backups/
```

Les fichiers sous `/srv/runsee/env` et `/srv/runsee/cloudflared/*.json` contiennent des secrets : ne les commit jamais.

## Commandes utiles

Depuis `/srv/runsee/repo` :

```bash
docker compose \
  --env-file /srv/runsee/env/runsee-backend-prod.env \
  --env-file /srv/runsee/env/runsee-frontend-prod.env \
  -f deployment/linux/docker-compose.prod.yml \
  up -d --build
```

Voir l'etat :

```bash
docker compose \
  --env-file /srv/runsee/env/runsee-backend-prod.env \
  --env-file /srv/runsee/env/runsee-frontend-prod.env \
  -f deployment/linux/docker-compose.prod.yml \
  ps
```

Voir les logs :

```bash
docker compose \
  --env-file /srv/runsee/env/runsee-backend-prod.env \
  --env-file /srv/runsee/env/runsee-frontend-prod.env \
  -f deployment/linux/docker-compose.prod.yml \
  logs --tail=100 backend
```

Arreter :

```bash
docker compose \
  --env-file /srv/runsee/env/runsee-backend-prod.env \
  --env-file /srv/runsee/env/runsee-frontend-prod.env \
  -f deployment/linux/docker-compose.prod.yml \
  down
```

## Validation technique

Sur la VM :

```bash
docker compose \
  --env-file /srv/runsee/env/runsee-backend-prod.env \
  --env-file /srv/runsee/env/runsee-frontend-prod.env \
  -f deployment/linux/docker-compose.prod.yml \
  exec backend curl -fsS http://localhost:3003/health
```

Depuis ton PC :

```powershell
curl https://api.runnsee.net/health
curl https://api.runnsee.net/db/health
```

## Backup

Copier le script sur la VM puis le rendre executable :

```bash
chmod +x /srv/runsee/repo/deployment/linux/scripts/backup-postgres.sh
```

Execution manuelle :

```bash
/srv/runsee/repo/deployment/linux/scripts/backup-postgres.sh
```

Cron quotidien recommande :

```cron
0 4 * * * /srv/runsee/repo/deployment/linux/scripts/backup-postgres.sh >> /srv/runsee/backups/backup.log 2>&1
```

## Healthcheck

```bash
chmod +x /srv/runsee/repo/deployment/linux/scripts/healthcheck.sh
/srv/runsee/repo/deployment/linux/scripts/healthcheck.sh
```

Cron toutes les 10 minutes :

```cron
*/10 * * * * /srv/runsee/repo/deployment/linux/scripts/healthcheck.sh >> /srv/runsee/backups/health-cron.log 2>&1
```

## Points de vigilance

- Les cles de chiffrement Strava doivent etre identiques a la prod Windows.
- Le callback Strava doit rester `https://api.runnsee.net/auth/strava/callback`.
- La base source de migration est `runsee_prod`.
- Ne coupe pas la stack Windows tant que la recette VM n'est pas validee.
