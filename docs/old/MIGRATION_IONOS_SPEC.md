# Migration RunNSee vers IONOS VPS S+ — Specification CODEX

> **Audience** : agent CODEX sans contexte preliminaire de la conversation.
> **Objectif** : migrer l'application RunNSee (frontend React + backend Node/Prisma + PostgreSQL + tunnel Cloudflare) depuis un PC local Windows vers une infrastructure cloud peu couteuse et disponible 24/7.
> **Contraintes** : aucun changement scientifique sur les calculs ; reutilise la stack Docker existante autant que possible ; donnees Postgres a migrer sans perte ; downtime de bascule reduit a < 30 min.

---

## 1. Contexte technique actuel

- **Hardware actuel** : un PC Windows allume sur demande, qui coupe l'app a chaque arret.
- **Stack actuelle** :
  - Frontend React + Vite, sert sur `http://127.0.0.1:5174` (dev/prod local), supervise par `deployment/windows/scripts/run-frontend.ps1`.
  - Backend Node.js (Express + Prisma), sert sur `http://127.0.0.1:3003`, supervise par `deployment/windows/scripts/run-backend.ps1`.
  - PostgreSQL 16-alpine en Docker, conteneur `runsee-postgres-dev`, port hote `127.0.0.1:55532`. Compose dans `deployment/postgresql/docker-compose.dev.yml`.
  - Cloudflare Tunnel (`cloudflared`) deja configure pour exposer `https://api.runnsee.net` et `https://runsee.runnsee.net` vers les services locaux.
  - Script de demarrage global : `C:\Services\RunNSee_Startup.bat`.
- **Repo** : `C:\Services\RuNSee\` (git, deja sur GitHub).
- **Domaines** : `runnsee.net` gere par Cloudflare DNS (zone existante, registrar a confirmer).

## 2. Architecture cible

```
                       Internet
                          |
                  +-------+--------+
                  | Cloudflare DNS |
                  +-------+--------+
                          |
        +-----------------+-----------------+
        |                                   |
        v                                   v
+---------------------+         +-----------------------------+
| Cloudflare Pages    |         | Cloudflare Tunnel           |
| (frontend statique) |         | (sortant depuis VPS IONOS)  |
| runsee.runnsee.net  |         | api.runnsee.net             |
+---------------------+         +-----------------------------+
                                         |
                                         v
                            +------------+--------------+
                            |     VPS IONOS S+          |
                            |  Ubuntu 24.04 LTS         |
                            |  2 vCPU / 2 Go RAM        |
                            |  80 Go NVMe               |
                            |  Docker + Compose         |
                            +------------+--------------+
                                         |
                            +------------+--------------+
                            | docker compose:           |
                            |  - postgres:16-alpine     |
                            |  - runsee-backend (node)  |
                            |  - cloudflared            |
                            +---------------------------+
```

### Decisions d'architecture

- **Frontend** sur Cloudflare Pages (CDN gratuit, deploiement git).
- **Backend + Postgres + Cloudflared** sur la VPS IONOS, en 3 conteneurs Docker, orchestres par un `docker-compose.yml` dedie production.
- **Aucun port HTTP/HTTPS expose publiquement** sur la VPS. Tout le trafic public passe par le tunnel Cloudflare. Seul SSH (port 22) est expose, et restreint via firewall.
- **PostgreSQL bind sur la loopback du host** (`127.0.0.1:5432`) ou mieux : pas de port mappe vers l'hote, accessible uniquement par les autres conteneurs via le reseau Docker interne.
- **Restart automatique** : `restart: unless-stopped` sur tous les conteneurs.
- **Ressources** : 2 Go RAM est juste, on configure des limits dans le compose pour eviter les OOM.

## 3. Prerequis avant de demarrer

L'utilisateur doit avoir prepare :
- Une instance VPS IONOS S+ provisionnee avec **Ubuntu 24.04 LTS**.
- Une **cle SSH publique** ajoutee a la VPS (la cle privee reste sur le poste de travail).
- L'**adresse IP publique** de la VPS et les credentials initiaux (root + cle SSH).
- L'**acces a son compte Cloudflare** (zone DNS `runnsee.net`, tunnel cloudflared existant).
- L'**acces a son compte GitHub** ou le repo RunNSee est heberge.
- Un dump Postgres recent (sera produit pendant la migration).

CODEX doit **demander explicitement** ces informations avant de commencer le Lot 1 si elles ne sont pas fournies. Pour les operations sur la VPS, CODEX doit indiquer les commandes a executer mais **n'execute pas directement** : c'est l'utilisateur qui les lance via SSH puis communique le resultat.

---

## 4. Lots de migration

Decoupage en 7 lots independants. Chaque lot est livrable seul avec ses criteres d'acceptance.

| Lot | Objet | Effort estime | Risque |
|---|---|---|---|
| L1 | Preparation et durcissement du serveur | 1-2 h | Faible |
| L2 | Stack Docker prod (compose + Dockerfile backend) | 3-4 h | Moyen |
| L3 | Migration des donnees PostgreSQL | 1-2 h | Moyen (downtime) |
| L4 | Frontend sur Cloudflare Pages | 1-2 h | Faible |
| L5 | Reconfiguration Cloudflare Tunnel + DNS + Strava OAuth | 1-2 h | Moyen |
| L6 | Sauvegardes automatisees + monitoring minimal | 2-3 h | Faible |
| L7 | Bascule finale + extinction stack locale | 1 h | Faible |

**Effort total** : ~10-16 h de travail CODEX + utilisateur.

---

## 5. Lot 1 — Preparation et durcissement du serveur

### Objectif
Installer Ubuntu 24.04 prerequis : utilisateur non-root, SSH par cle uniquement, firewall UFW, fail2ban, Docker + Compose, swap si necessaire.

### Operations
A executer en SSH sur la VPS, avec mise a jour systeme initiale.

#### 1.1 Update + paquets de base
```
apt update && apt upgrade -y
apt install -y ufw fail2ban curl ca-certificates gnupg lsb-release htop ncdu jq unattended-upgrades
```

#### 1.2 Creer un utilisateur non-root pour les operations
```
adduser --disabled-password --gecos "" runsee
usermod -aG sudo runsee
mkdir -p /home/runsee/.ssh
cp /root/.ssh/authorized_keys /home/runsee/.ssh/
chown -R runsee:runsee /home/runsee/.ssh
chmod 700 /home/runsee/.ssh
chmod 600 /home/runsee/.ssh/authorized_keys
```
Verifier la connexion SSH avec ce nouvel utilisateur depuis un autre terminal **avant** de continuer.

#### 1.3 Durcir SSH
Editer `/etc/ssh/sshd_config` :
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```
Puis `systemctl restart ssh`.

#### 1.4 Firewall UFW
```
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw enable
ufw status verbose
```
Aucun port HTTP / HTTPS n'est expose : tout le trafic web passe par le tunnel Cloudflare sortant.

#### 1.5 fail2ban
```
systemctl enable --now fail2ban
fail2ban-client status sshd
```
Configuration par defaut suffit pour un VPS basique.

#### 1.6 Mises a jour automatiques de securite
```
dpkg-reconfigure --priority=low unattended-upgrades
```
Choix : `Yes` (auto-install des security updates).

#### 1.7 Swap (compense les 2 Go RAM)
```
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```
Et regler le swappiness pour preferer la RAM :
```
echo 'vm.swappiness=10' >> /etc/sysctl.conf
sysctl -p
```

#### 1.8 Installer Docker (depuis le repo officiel)
```
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
usermod -aG docker runsee
systemctl enable --now docker
```
Se reconnecter avec `runsee` apres pour que le groupe docker prenne effet.

### Acceptance
- Connexion SSH par cle uniquement, sur user `runsee`, root login refuse.
- `ufw status` : seul port 22 ouvert.
- `docker ps` repond sans sudo en tant que `runsee`.
- `swapon --show` montre 2 Go de swap actif.
- `unattended-upgrades --dry-run` repond OK.

---

## 6. Lot 2 — Stack Docker production (compose + Dockerfile backend)

### Objectif
Construire une stack Docker prod complete pour : Postgres, backend Node, cloudflared. Tout vit sur le serveur dans `/srv/runsee/`.

### Arborescence cible
```
/srv/runsee/
  ├── docker-compose.prod.yml
  ├── .env                            # secrets non versionnes
  ├── backend/
  │   ├── Dockerfile                  # build du backend
  │   └── (code source clone via git)
  ├── cloudflared/
  │   └── config.yml                  # config tunnel
  ├── postgres/
  │   └── (volume Docker, geree par compose)
  └── backups/
      └── (dumps quotidiens)
```

### Fichiers a creer

#### 6.1 `/srv/runsee/docker-compose.prod.yml` (CREER, sur la VPS)

```yaml
name: runsee-prod

services:
  postgres:
    image: postgres:16-alpine
    container_name: runsee-postgres-prod
    restart: unless-stopped
    environment:
      POSTGRES_DB: runsee_prod
      POSTGRES_USER: runsee_app
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U runsee_app -d runsee_prod"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 10s
    volumes:
      - runsee-postgres-prod-data:/var/lib/postgresql/data
    networks:
      - runsee-internal
    deploy:
      resources:
        limits:
          memory: 800M
    # Pas de ports: Postgres reste accessible uniquement aux autres conteneurs

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: runsee-backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://runsee_app:${POSTGRES_PASSWORD}@postgres:5432/runsee_prod?schema=public
      DIRECT_URL: postgresql://runsee_app:${POSTGRES_PASSWORD}@postgres:5432/runsee_prod?schema=public
      APP_HOST: 0.0.0.0
      APP_PORT: 3003
      LOCAL_API_URL: http://localhost:3003
      PUBLIC_API_URL: https://api.runnsee.net
      PUBLIC_APP_URL: https://runsee.runnsee.net
      FRONTEND_ALLOWED_ORIGINS: https://runsee.runnsee.net
      STRAVA_CLIENT_ID: ${STRAVA_CLIENT_ID}
      STRAVA_CLIENT_SECRET: ${STRAVA_CLIENT_SECRET}
      STRAVA_VERIFY_TOKEN: ${STRAVA_VERIFY_TOKEN}
      SESSION_SECRET: ${SESSION_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    networks:
      - runsee-internal
    deploy:
      resources:
        limits:
          memory: 600M
    # Pas de ports : le backend ne sort que via cloudflared

  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: runsee-cloudflared
    restart: unless-stopped
    depends_on:
      - backend
    command: tunnel --no-autoupdate run --token ${CLOUDFLARED_TUNNEL_TOKEN}
    networks:
      - runsee-internal
    deploy:
      resources:
        limits:
          memory: 200M

networks:
  runsee-internal:
    driver: bridge

volumes:
  runsee-postgres-prod-data:
    driver: local
```

#### 6.2 `/srv/runsee/.env` (CREER manuellement, NE PAS versionner)

```
POSTGRES_PASSWORD=<generer 32 chars random>
STRAVA_CLIENT_ID=<reprendre la valeur du backend local>
STRAVA_CLIENT_SECRET=<reprendre>
STRAVA_VERIFY_TOKEN=<reprendre>
SESSION_SECRET=<generer 64 chars>
ENCRYPTION_KEY=<reprendre exactement la meme valeur que sur le PC local pour garder les tokens chiffres lisibles>
CLOUDFLARED_TUNNEL_TOKEN=<recuperer dans Cloudflare Zero Trust>
```

Pour le `CLOUDFLARED_TUNNEL_TOKEN`, deux options :
- **Token mode (recommande)** : Cloudflare > Zero Trust > Networks > Tunnels > selectionne ton tunnel > onglet `Run a connector` > copie le token cote `docker run`.
- Si l'ancien tunnel a ete configure avec credentials JSON sur le PC, le mieux est de le **deplacer** : Zero Trust > Tunnel > Configure > Cloudflared > Generate new token, ce qui regenere un token utilisable sur la VPS sans casser le tunnel cote DNS. Les routes (api.runnsee.net) restent attachees au meme tunnel.

`ENCRYPTION_KEY` : si le backend chiffre des donnees Strava (tokens) avec une cle locale, **il faut reprendre exactement la meme cle** sinon les tokens stockes deviendront illisibles apres migration des donnees. Verifier dans `backend/src/config/env.js` ou `backend/src/services/encryption*` la cle attendue. Si elle est generee aleatoirement et stockee uniquement en `.env`, **bien la copier** depuis le `.env` local.

#### 6.3 `/srv/runsee/backend/Dockerfile` (CREER, dans le repo)

A versionner dans le repo Git, sous `backend/Dockerfile.prod` ou `Dockerfile` :

```dockerfile
# Stage 1 : install + prisma generate
FROM node:20-alpine AS builder

WORKDIR /app

# Copie manifestes
COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY prisma-postgresql ./prisma-postgresql
COPY prisma.postgresql.config.ts ./

# Installer dependences (incluant devDeps pour prisma generate)
RUN npm ci

# Copier le reste du code
COPY src ./src
COPY scripts ./scripts

# Generer le client Prisma postgres
RUN npx prisma generate --config prisma.postgresql.config.ts

# Stage 2 : runtime minimal
FROM node:20-alpine AS runtime

WORKDIR /app

# Outils utiles : pour pg_dump si on veut faire des backups in-container
RUN apk add --no-cache postgresql-client tini

# Copie depuis builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma-postgresql ./prisma-postgresql
COPY --from=builder /app/prisma.postgresql.config.ts ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
EXPOSE 3003

# tini comme PID 1 pour gerer les signaux
ENTRYPOINT ["/sbin/tini", "--"]

# Au demarrage : applique les migrations Prisma puis lance le serveur
CMD sh -c "npx prisma migrate deploy --config prisma.postgresql.config.ts && node src/server.js"
```

#### 6.4 Cloner le repo sur la VPS

```
sudo mkdir -p /srv/runsee
sudo chown runsee:runsee /srv/runsee
cd /srv/runsee
git clone https://github.com/<owner>/<repo>.git backend-source
ln -s backend-source/backend backend  # pour que le compose trouve ./backend/Dockerfile
```

Ou plus simple : cloner le repo entier dans `/srv/runsee/runsee` et adapter le `context: ./runsee/backend`.

### Operations de demarrage (a faire apres Lot 3)

```
cd /srv/runsee
docker compose -f docker-compose.prod.yml up -d --build
docker compose logs -f backend
```

### Acceptance
- `docker compose ps` montre `postgres` healthy et `backend` running.
- `docker compose logs backend` montre `Server running on port 3003`.
- `docker compose exec backend wget -qO- http://localhost:3003/health` repond OK.
- Aucun port n'est expose en `0.0.0.0` (verifier avec `ss -tlnp` sur la VPS : seul 22 ouvert hors tunnel).

---

## 7. Lot 3 — Migration des donnees PostgreSQL

### Objectif
Transferer la base `runsee_prod` (ou `runsee_dev` selon ce que tu utilises en local) du PC vers la VPS, sans perte. Inclut les donnees Strava synchronisees, l'utilisateur RunNSee, les courses objectifs, les RPE, les settings, etc.

### Pre-requis
- Backend prod NON encore demarre cote VPS (ou demarre puis arrete avant import).
- Stack locale fonctionnelle, base accessible sur `127.0.0.1:55532`.

### Sequence

#### 7.1 Sur le PC local : dump complet
```
docker exec runsee-postgres-dev pg_dump -U runsee_app -d runsee_prod -Fc -f /tmp/runsee_prod.dump
docker cp runsee-postgres-dev:/tmp/runsee_prod.dump ./runsee_prod.dump
```

Le format `-Fc` (custom) compresse et permet la restauration parallele.

#### 7.2 Transfert vers la VPS
```
scp ./runsee_prod.dump runsee@<vps-ip>:/srv/runsee/runsee_prod.dump
```

#### 7.3 Sur la VPS : preparer la base

```
cd /srv/runsee
docker compose -f docker-compose.prod.yml up -d postgres
sleep 15
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U runsee_app -d runsee_prod
```

#### 7.4 Restaurer
```
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U runsee_app -d runsee_prod --clean --if-exists --no-owner --jobs=2 \
  < runsee_prod.dump
```

Le flag `--clean --if-exists` purge les tables existantes avant restore (utile car la migration `prisma migrate deploy` au premier `up backend` aurait deja cree les tables vides).

#### 7.5 Verifier
```
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U runsee_app -d runsee_prod -c '\dt'
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U runsee_app -d runsee_prod -c 'SELECT COUNT(*) FROM "Activity";'
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U runsee_app -d runsee_prod -c 'SELECT migration_name FROM _prisma_migrations ORDER BY started_at;'
```

Compter les activites doit retourner le meme chiffre qu'en local.

#### 7.6 Demarrer le backend
```
docker compose -f docker-compose.prod.yml up -d backend
docker compose -f docker-compose.prod.yml logs -f backend
```

A noter : le backend lancera `prisma migrate deploy`. Si toutes les migrations sont deja appliquees (champ `_prisma_migrations`), aucune action. Sinon il appliquera les manquantes.

### Acceptance
- Le compteur `Activity`, `AppUser`, `UserSession`, `UserRaceObjective`, `UserTrainingAnalyticsSettings` corresponde au local.
- `_prisma_migrations` contient les memes lignes qu'en local.
- Backend log : `Server running on port 3003`, pas d'erreur Prisma.

---

## 8. Lot 4 — Frontend sur Cloudflare Pages

### Objectif
Servir le frontend statique React via Cloudflare Pages, branche au repo GitHub. Build automatique a chaque push.

### Operations

#### 8.1 Adapter `frontend/.env.production` (CREER ou modifier)
```
VITE_API_URL=https://api.runnsee.net
VITE_APP_URL=https://runsee.runnsee.net
VITE_STRAVA_REDIRECT_URI=https://api.runnsee.net/auth/strava/callback
```
Ces variables doivent matcher ce que le backend attend (cf. `FRONTEND_ALLOWED_ORIGINS` cote backend).

#### 8.2 Configurer Cloudflare Pages

Sur https://dash.cloudflare.com :
1. **Workers & Pages** -> Create -> Pages -> Connect to Git.
2. Selectionner le repo GitHub RunNSee.
3. **Project name** : `runsee-frontend` (ou autre).
4. **Production branch** : `main` (ou la branche prod).
5. **Build settings** :
   - Framework preset : Vite
   - Build command : `cd frontend && npm install && npm run build`
   - Build output directory : `frontend/dist`
   - Root directory : `/` (laisse vide)
6. **Environment variables (Production)** :
   - `VITE_API_URL=https://api.runnsee.net`
   - `VITE_APP_URL=https://runsee.runnsee.net`
   - autres `VITE_*` selon `frontend/.env.production`.
7. Lancer le premier deploiement.

#### 8.3 Custom domain
Une fois le premier deploy reussi (URL en `*.pages.dev`) :
1. Pages > project settings > Custom domains > Set up a custom domain > `runsee.runnsee.net`.
2. Cloudflare ajoute automatiquement le CNAME dans la zone DNS.
3. Le HTTPS est gere automatiquement.

### Acceptance
- `https://runsee.runnsee.net` charge le frontend.
- La console navigateur n'a aucune erreur de CORS apres le Lot 5.
- Les requetes XHR partent vers `https://api.runnsee.net`.

---

## 9. Lot 5 — Cloudflare Tunnel + DNS + Strava OAuth

### Objectif
Reattacher le tunnel cloudflared au backend de la VPS, mettre a jour les routes DNS et l'URL de callback Strava.

### 5.1 Tunnel cloudflared

Le tunnel existant a deux routes a basculer :
- `api.runnsee.net` -> backend.
- `runsee.runnsee.net` -> ce DNS est maintenant gere par Cloudflare Pages (Lot 4), plus par le tunnel. Retirer la route du tunnel.

#### Sur Cloudflare Zero Trust
1. **Networks > Tunnels > <ton tunnel>**.
2. Onglet **Public hostnames** :
   - Editer la route `api.runnsee.net` :
     - Service : `http://backend:3003`
     - (le hostname `backend` correspond au nom du conteneur backend dans le compose, accessible via le reseau Docker `runsee-internal`).
   - Supprimer la route `runsee.runnsee.net` (geree par Pages).
3. Onglet **Run a connector** > copier le token sous forme `eyJhI...`.
4. Coller dans `/srv/runsee/.env` -> `CLOUDFLARED_TUNNEL_TOKEN=...`.
5. Redemarrer cloudflared :
   ```
   cd /srv/runsee
   docker compose -f docker-compose.prod.yml up -d cloudflared
   docker compose -f docker-compose.prod.yml logs -f cloudflared
   ```
6. Verifier dans le dashboard Cloudflare Zero Trust que le connector est `Healthy`.

#### Sur la machine locale (PC)
- Arreter l'ancien `cloudflared` (Ctrl+C dans la fenetre cachee, ou `Stop-Process` sur le process).
- Quand un nouveau token a ete genere, l'ancien est revoque automatiquement.
- Le tunnel est maintenant heberge cote VPS.

### 5.2 DNS

Verifier dans Cloudflare DNS :
- `api.runnsee.net` -> CNAME `<tunnel-id>.cfargotunnel.com` (geree automatiquement par le tunnel).
- `runsee.runnsee.net` -> CNAME vers `<project>.pages.dev` (geree automatiquement par Pages).

### 5.3 Strava OAuth

Sur https://www.strava.com/settings/api :
- **Authorization Callback Domain** : `api.runnsee.net` (sans https://, sans path).
- Si tu utilises plusieurs apps (mode prod + dev), creer une app distincte pour la prod.

### Acceptance
- `curl https://api.runnsee.net/health` repond `{"status":"OK","environment":"production",...}`.
- Connexion Strava depuis `https://runsee.runnsee.net` fonctionne, redirection vers `https://api.runnsee.net/auth/strava/callback` reussie.
- Aucune erreur CORS.

---

## 10. Lot 6 — Sauvegardes automatisees + monitoring minimal

### Objectif
Eviter de perdre les donnees Strava synchronisees + avoir une visibilite minimale sur la sante de la stack.

### 10.1 Backups Postgres quotidiens

Ecrire un script `/srv/runsee/scripts/backup-postgres.sh` :
```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR=/srv/runsee/backups
RETENTION_DAYS=14
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

cd /srv/runsee
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U runsee_app -d runsee_prod -Fc \
  > "$BACKUP_DIR/runsee_prod_${TIMESTAMP}.dump"

# Retention : retirer les dumps de plus de N jours
find "$BACKUP_DIR" -name 'runsee_prod_*.dump' -mtime +${RETENTION_DAYS} -delete

# Optionnel : envoi vers un stockage externe (B2, R2, S3)
# aws s3 cp "$BACKUP_DIR/runsee_prod_${TIMESTAMP}.dump" s3://my-bucket/runsee/
```

Rendre executable : `chmod +x /srv/runsee/scripts/backup-postgres.sh`.

### 10.2 Cron quotidien
```
crontab -e -u runsee
```
Ajouter :
```
0 4 * * * /srv/runsee/scripts/backup-postgres.sh >> /srv/runsee/backups/backup.log 2>&1
```

### 10.3 Monitoring minimal

#### Healthcheck script `/srv/runsee/scripts/healthcheck.sh`
```bash
#!/usr/bin/env bash
HTTP_CODE=$(curl -o /dev/null -s -w '%{http_code}' https://api.runnsee.net/health || echo "000")
if [ "$HTTP_CODE" != "200" ]; then
  echo "[$(date)] Health check FAILED (HTTP $HTTP_CODE)" >> /srv/runsee/backups/health.log
  # Optionnel : webhook Telegram ou email
fi
```

Cron toutes les 10 min :
```
*/10 * * * * /srv/runsee/scripts/healthcheck.sh
```

#### Alerting (optionnel)
- Webhook Discord ou Telegram via `curl` dans le script healthcheck.
- Ou ne rien mettre et verifier manuellement de temps en temps.

### 10.4 Restore test (a faire 1 fois)
Verifier qu'un dump est restaurable :
```
cd /srv/runsee
docker run --rm -v $(pwd)/backups:/backups -v runsee-prod_runsee-postgres-prod-data:/dst alpine \
  echo "Test prepare uniquement, ne pas executer en prod"
```
Le test reel se fait en spinnant un Postgres temporaire et en y restaurant le dump le plus recent.

### Acceptance
- `ls /srv/runsee/backups/` montre 1 dump apres 24 h.
- Apres 14 jours, les vieux dumps sont supprimes automatiquement.
- Healthcheck cron tourne, aucun fichier `health.log` n'a de FAILED.

---

## 11. Lot 7 — Bascule finale + extinction stack locale

### Objectif
Retirer la stack locale du PC, rendre la VPS source de verite unique, eteindre les processus locaux.

### 11.1 Verification pre-bascule (a faire 1 fois sur la VPS deja en prod)
- Charger `https://runsee.runnsee.net` depuis 2 navigateurs distincts.
- Connexion Strava OK, sync incrementale OK, fiche activite OK.
- Saisir un RPE, creer une course objectif, verifier persistance.
- Verifier les logs backend : aucune erreur.

### 11.2 Eteindre la stack locale
Sur le PC :
- Desactiver la tache planifiee qui lance `RunNSee_Startup.bat` au demarrage.
- Couper les processus en cours :
  - Tuer le node backend (port 3003).
  - Tuer le frontend Vite (port 5174).
  - Stop le conteneur `runsee-postgres-dev` : `docker stop runsee-postgres-dev`.
  - Stop le tunnel cloudflared local s'il tourne encore.

### 11.3 Garder une trace
Renommer ou archiver `RunNSee_Startup.bat` :
```
mv C:\Services\RunNSee_Startup.bat C:\Services\RunNSee_Startup.bat.archive
```

Conserver le backup du dump `.\runsee_prod.dump` cote local pendant au moins 30 jours.

### 11.4 Documenter
Dans `docs/RUNBOOK.md` (a creer), noter :
- Adresse IP VPS, user SSH.
- Path `/srv/runsee/`.
- Commandes courantes : `docker compose ... logs`, `up -d`, `down`, restore d'un backup, etc.

### Acceptance
- `https://runsee.runnsee.net` reste accessible meme PC eteint.
- Aucun service RunNSee ne tourne sur le PC local.
- L'utilisateur peut allumer/eteindre son PC sans impact sur l'app.

---

## 12. Estimation des couts d'exploitation post-migration

| Poste | Cout mensuel |
|---|---|
| VPS IONOS S+ (mois 1-6) | 2,40 € TTC |
| VPS IONOS S+ (mois 7+) | A confirmer (probablement ~6 € TTC) |
| Cloudflare Pages | 0 € |
| Cloudflare Tunnel | 0 € |
| Domaine `runnsee.net` | hors scope (deja paye) |
| **Total (mois 1-6)** | **~2,40 €/mois** |
| **Total (mois 7+)** | **~6 €/mois** |

---

## 13. Hors scope

- Pas de modification des calculs scientifiques (`utils/loadEstimation.js`, etc.).
- Pas de migration des donnees vers une autre base (Postgres reste).
- Pas de mise en place de CI/CD avance (juste deploy continu Pages + redeploy manuel backend via `git pull && docker compose up -d --build`).
- Pas de monitoring full type Grafana/Prometheus (juste healthcheck cron).
- Pas de SSL Let's Encrypt direct sur la VPS (Cloudflare gere le SSL public).
- Pas de redondance / haute disponibilite (un seul VPS, single point of failure).

---

## 14. Conventions et qualite

- **Tutoiement** dans tous les nouveaux contenus utilisateur.
- **Aucun emoji** dans les fichiers de configuration ou scripts shell.
- **Scripts shell** : `#!/usr/bin/env bash`, `set -euo pipefail` en tete.
- **Compose** : noms de conteneur explicites, `restart: unless-stopped`, healthchecks ou Postgres a minima, limits memoire.
- **Secrets** : jamais commit dans git. Le `.env` reste local sur la VPS.
- **Versioning** : le `Dockerfile` backend et le `docker-compose.prod.yml` doivent etre versionnes dans le repo, sous `deployment/ionos/`.

---

## 15. Resume des fichiers crees / modifies

### Crees (cote repo GitHub, versionnes)
- `backend/Dockerfile.prod` (ou `backend/Dockerfile`, selon choix)
- `deployment/ionos/docker-compose.prod.yml`
- `deployment/ionos/scripts/backup-postgres.sh`
- `deployment/ionos/scripts/healthcheck.sh`
- `deployment/ionos/README.md` (instructions d'exploitation)
- `frontend/.env.production`
- `docs/RUNBOOK.md` (procedure d'exploitation post-migration)

### Crees (cote VPS, NON versionnes)
- `/srv/runsee/.env` (secrets)
- `/srv/runsee/backups/` (dumps quotidiens)

### Modifies
- `frontend/.env.production` (URL API publique).

### Aucun changement applicatif
- Pas de modification du code metier.
- Pas de modification des migrations Prisma deja appliquees.

---

## 16. Acceptance globale de la migration

A la fin du Lot 7 :
- `https://runsee.runnsee.net` accessible 24/7, meme PC eteint.
- `https://api.runnsee.net/health` repond 200 en prod.
- Donnees identiques au local (compteur activites, settings, RPE, courses).
- Backup automatique quotidien fonctionnel, retention 14 jours.
- Healthcheck cron actif.
- Stack locale desactivee.
- Cout mensuel ~2,40 € (les 6 premiers mois) puis ~6 €.

---

## 17. Ordre d'execution recommande

1. **L1** : Preparation serveur (1-2 h)
2. **L2** : Stack Docker (3-4 h)
3. **L3** : Migration Postgres (1-2 h, downtime accepte sur cette etape)
4. **L4** : Frontend Cloudflare Pages (1-2 h, en parallele de L2/L3 possible)
5. **L5** : Tunnel + DNS + Strava (1-2 h)
6. **Verification end-to-end** complete sur prod
7. **L6** : Backups + monitoring (2-3 h, post-bascule)
8. **L7** : Extinction stack locale (1 h)

Apres chaque lot, faire un point avec l'utilisateur avant de passer au suivant.
