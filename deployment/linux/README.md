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

## CI/CD GitHub Actions

Le workflow `.github/workflows/deploy-vm.yml` deploie automatiquement `main` vers la VM apres validation :

- `frontend npm ci`
- `frontend npm run lint -- --max-warnings 0`
- `frontend npm run build`
- `backend npm ci`
- `backend npm run prisma:pg:validate`

Le deploiement se fait ensuite par SSH sur la VM, depuis `/srv/runsee/repo`, avec le script :

```bash
/srv/runsee/repo/deployment/linux/scripts/deploy-vm.sh <commit>
```

Le script :

- refuse de deployer si le repo VM contient des changements non commit.
- checkout le commit exact valide par GitHub Actions.
- reconstruit `backend` et `frontend`.
- redemarre la stack Docker Compose.
- verifie PostgreSQL, backend, frontend, cloudflared et les endpoints publics.

Secrets GitHub Actions requis :

```text
RUNSEE_VM_HOST=82.165.109.160
RUNSEE_VM_USER=runsee
RUNSEE_VM_SSH_KEY=<cle privee SSH dediee au deploy>
RUNSEE_VM_PORT=22
```

La cle publique associee a `RUNSEE_VM_SSH_KEY` doit etre ajoutee dans :

```bash
/home/runsee/.ssh/authorized_keys
```

Les secrets applicatifs restent sur la VM dans `/srv/runsee/env` et `/srv/runsee/cloudflared`.
Ils ne doivent pas etre stockes dans GitHub Actions.

## Points de vigilance

- Les cles de chiffrement Strava doivent etre identiques a la prod Windows.
- Le callback Strava doit rester `https://api.runnsee.net/auth/strava/callback`.
- La base source de migration est `runsee_prod`.
- Ne coupe pas la stack Windows tant que la recette VM n'est pas validee.
