# Exposition de RuNSee via Cloudflare Tunnel

## Objectif

Cette configuration prepare RuNSee pour un hebergement local avec exposition via un tunnel nomme Cloudflare, sans ouvrir de ports entrants sur la machine locale.

Architecture retenue et implemente:

- `runsee.<votre-domaine>` -> frontend local
- `api.runsee.<votre-domaine>` -> backend local

Cette option est la plus simple a exploiter avec l'architecture actuelle.

## Audit de l'etat actuel

Etat du projet prepare dans ce lot:

- Frontend: Vite local sur `127.0.0.1:5173` par defaut, configurable via `FRONTEND_HOST` et `FRONTEND_PORT`
- Backend: API Node.js / Express locale sur `APP_PORT=3000` par defaut
- Client API frontend: centralise dans `frontend/src/services/api.js`
- URL API frontend: centralisee dans `frontend/src/config/env.js`
- URL publiques/backend redirects: centralisees dans `backend/src/config/env.js`

Ports locaux par defaut:

- Frontend local: `http://localhost:5173`
- Backend local: `http://localhost:3000`

## Variables d'environnement

### Frontend

Fichier de reference:

- `frontend/.env.example`
- `frontend/.env.local.example`

Variables utiles:

- `FRONTEND_HOST`: host d'ecoute Vite local
- `FRONTEND_PORT`: port d'ecoute Vite local
- `VITE_APP_BASE_URL`: URL publique du frontend
- `VITE_API_BASE_URL`: URL publique ou locale du backend appelee par le navigateur
- `VITE_LOCAL_API_BASE_URL`: URL locale prioritaire quand le frontend est ouvert sur `localhost`

Exemple local:

```env
FRONTEND_HOST=127.0.0.1
FRONTEND_PORT=5173
VITE_APP_BASE_URL=http://localhost:5173
VITE_API_BASE_URL=http://localhost:3000
VITE_LOCAL_API_BASE_URL=http://localhost:3000
```

Exemple derriere tunnel:

```env
FRONTEND_HOST=127.0.0.1
FRONTEND_PORT=5173
VITE_APP_BASE_URL=https://runsee.<votre-domaine>
VITE_API_BASE_URL=https://api.runsee.<votre-domaine>
VITE_LOCAL_API_BASE_URL=http://localhost:3000
```

### Backend

Fichier de reference:

- `backend/.env.example`

Variables utiles:

- `APP_HOST`: host d'ecoute backend local
- `APP_PORT`: port local du backend
- `FRONTEND_PORT`: port local du frontend
- `LOCAL_APP_URL`: URL locale du frontend
- `LOCAL_API_URL`: URL locale du backend
- `PUBLIC_APP_URL`: URL publique du frontend
- `PUBLIC_API_URL`: URL publique du backend
- `FRONTEND_ALLOWED_ORIGINS`: origines CORS autorisees
- `STRAVA_REDIRECT_URI`: callback OAuth Strava

Exemple local:

```env
APP_HOST=127.0.0.1
APP_PORT=3000
FRONTEND_PORT=5173
LOCAL_APP_URL=http://localhost:5173
LOCAL_API_URL=http://localhost:3000
PUBLIC_APP_URL=http://localhost:5173
PUBLIC_API_URL=http://localhost:3000
FRONTEND_ALLOWED_ORIGINS=http://localhost:5173
STRAVA_REDIRECT_URI=http://localhost:3000/auth/strava/callback
```

Exemple derriere tunnel:

```env
APP_HOST=127.0.0.1
APP_PORT=3000
FRONTEND_PORT=5173
LOCAL_APP_URL=http://localhost:5173
LOCAL_API_URL=http://localhost:3000
PUBLIC_APP_URL=https://runsee.<votre-domaine>
PUBLIC_API_URL=https://api.runsee.<votre-domaine>
FRONTEND_ALLOWED_ORIGINS=http://localhost:5173,https://runsee.<votre-domaine>
STRAVA_REDIRECT_URI=https://api.runsee.<votre-domaine>/auth/strava/callback
```

## Pourquoi 2 hostnames et pas un seul

L'alternative "un seul hostname public + `/api`" n'a pas ete retenue par defaut.

Raison:

- le backend RuNSee est aujourd'hui monte a la racine (`/auth`, `/activities`, `/sync`, etc.)
- un seul hostname avec `/api` demanderait soit:
  - un reverse proxy local supplementaire
  - soit un changement de prefixe backend
  - soit plusieurs regles de paths publiques plus complexes

Avec deux hostnames, on garde:

- aucune rearchitecture metier
- aucun prefixe d'API a rajouter
- un diagnostic plus simple

## Templates fournis

Fichiers ajoutes:

- `deployment/cloudflare/config.example.yml`

Ce template couvre le cas recommande:

- `runsee.<votre-domaine>` -> `http://127.0.0.1:5173`
- `api.runsee.<votre-domaine>` -> `http://127.0.0.1:3000`

## Installation Cloudflare Tunnel sous Windows

References officielles consultees:

- [Downloads](https://developers.cloudflare.com/tunnel/downloads/)
- [Create a locally-managed tunnel](https://developers.cloudflare.com/tunnel/advanced/local-management/create-local-tunnel/)
- [Configuration file](https://developers.cloudflare.com/tunnel/advanced/local-management/configuration-file/)
- [Run as a service on Windows](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/as-a-service/windows/)

### 1. Installer `cloudflared`

Option simple via `winget`:

```powershell
winget install --id Cloudflare.cloudflared
```

Verifier:

```powershell
cloudflared --version
```

Note officielle: sous Windows, `cloudflared` ne se met pas a jour automatiquement. Les mises a jour restent manuelles.

### 2. Authentifier `cloudflared`

```powershell
cloudflared tunnel login
```

Effet attendu:

- ouverture du navigateur
- connexion au compte Cloudflare
- selection de la zone DNS
- creation du fichier `cert.pem` dans votre dossier `~/.cloudflared`

### 3. Creer le tunnel nomme

```powershell
cloudflared tunnel create runsee-local
```

Noter:

- le nom du tunnel
- son UUID
- le chemin du fichier JSON de credentials genere

Verifier:

```powershell
cloudflared tunnel list
```

### 4. Preparer la configuration locale du tunnel

Copier le template:

- depuis `deployment/cloudflare/config.example.yml`
- vers `%USERPROFILE%\.cloudflared\config.yml` pour un lancement manuel

Remplacer:

- `<YOUR_TUNNEL_UUID>`
- `<your-domain>`
- les chemins Windows si necessaire

Par defaut avec ce projet:

- frontend local: `http://127.0.0.1:5173`
- backend local: `http://127.0.0.1:3000`

### 5. Declarer les hostnames publics

Creer les deux routes DNS Cloudflare:

```powershell
cloudflared tunnel route dns runsee-local runsee.<votre-domaine>
cloudflared tunnel route dns runsee-local api.runsee.<votre-domaine>
```

Effet attendu:

- creation de deux CNAME Cloudflare pointant vers `<UUID>.cfargotunnel.com`

### 6. Configurer RuNSee pour le tunnel

Frontend:

- partir de `frontend/.env.local.example`
- creer `frontend/.env.local`

Exemple:

```env
FRONTEND_HOST=127.0.0.1
FRONTEND_PORT=5173
VITE_APP_BASE_URL=https://runsee.<votre-domaine>
VITE_API_BASE_URL=https://api.runsee.<votre-domaine>
```

Backend:

- partir de `backend/.env.example`
- adapter votre `backend/.env`

Exemple tunnel:

```env
APP_HOST=127.0.0.1
APP_PORT=3000
FRONTEND_PORT=5173
LOCAL_APP_URL=http://localhost:5173
LOCAL_API_URL=http://localhost:3000
PUBLIC_APP_URL=https://runsee.<votre-domaine>
PUBLIC_API_URL=https://api.runsee.<votre-domaine>
FRONTEND_ALLOWED_ORIGINS=http://localhost:5173,https://runsee.<votre-domaine>
STRAVA_REDIRECT_URI=https://api.runsee.<votre-domaine>/auth/strava/callback
```

Important:

- `PUBLIC_APP_URL` sert aux redirections frontend du backend
- `PUBLIC_API_URL` documente l'URL publique de l'API
- `STRAVA_REDIRECT_URI` doit pointer vers le hostname public de l'API
- en local, le frontend RuNSee priorise `VITE_LOCAL_API_BASE_URL` lorsqu'il est ouvert sur `localhost`, ce qui permet de garder les URLs publiques du tunnel configurees sans casser le developpement local

### 7. Lancer RuNSee localement

Backend:

```powershell
cd backend
npm run dev
```

Frontend:

```powershell
cd frontend
npm run dev
```

Ou utiliser le script Windows fourni:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\cloudflare\scripts\start-local.ps1
```

### 8. Valider la config du tunnel

Depuis le dossier contenant votre `config.yml` actif:

```powershell
cloudflared tunnel ingress validate
```

Vous pouvez aussi tester une regle:

```powershell
cloudflared tunnel ingress rule https://runsee.<votre-domaine>
cloudflared tunnel ingress rule https://api.runsee.<votre-domaine>/health
```

### 9. Lancer le tunnel manuellement

Si `config.yml` est dans `%USERPROFILE%\.cloudflared\config.yml`:

```powershell
cloudflared tunnel run runsee-local
```

Si vous utilisez un chemin custom:

```powershell
cloudflared tunnel --config "C:\chemin\vers\config.yml" run runsee-local
```

Verifier:

```powershell
cloudflared tunnel info runsee-local
```

## Installation comme service Windows

Cette etape est utile pour une machine dediee ou un usage plus stable.

### 1. Installer le service

```powershell
cloudflared.exe service install
```

### 2. Preparer l'emplacement du service

D'apres la documentation officielle Windows, le service attend la configuration sous:

```text
C:\Windows\System32\config\systemprofile\.cloudflared\
```

Creer le dossier si besoin:

```powershell
New-Item -ItemType Directory -Force "C:\Windows\System32\config\systemprofile\.cloudflared" | Out-Null
New-Item -ItemType Directory -Force "C:\Cloudflared" | Out-Null
```

### 3. Copier les fichiers necessaires au service

Copier:

- le fichier de config finalise
- le fichier `<Tunnel-UUID>.json` du tunnel

Exemple:

```powershell
Copy-Item "$env:USERPROFILE\.cloudflared\config.yml" "C:\Windows\System32\config\systemprofile\.cloudflared\config.yml" -Force
Copy-Item "$env:USERPROFILE\.cloudflared\<Tunnel-UUID>.json" "C:\Windows\System32\config\systemprofile\.cloudflared\<Tunnel-UUID>.json" -Force
```

### 4. Demarrer / verifier le service

```powershell
Get-Service cloudflared
Start-Service cloudflared
Get-Service cloudflared
```

### 5. Logs et diagnostic de base

Si vous gardez le template propose:

- log service: `C:\Cloudflared\cloudflared.log`

Commandes utiles:

```powershell
Get-Content C:\Cloudflared\cloudflared.log -Tail 100
cloudflared tunnel list
cloudflared tunnel info runsee-local
```

## Scripts fournis

- `deployment/cloudflare/scripts/start-local.ps1`
  - ouvre un terminal backend et un terminal frontend
  - rappelle les URLs locales attendues

- `deployment/cloudflare/scripts/check-env.ps1`
  - lit les fichiers d'environnement presents
  - affiche les valeurs critiques local/public
  - aide a verifier la coherence avant de lancer le tunnel

Pour l'auto-demarrage Windows de la pile complete (tunnel + backend + frontend), voir aussi:

- `deployment/windows/README.md`

## Migration future vers une petite machine

Objectif: repliquer la meme logique avec un minimum de changements.

### Fichiers a copier

- le dossier `backend/`
- le dossier `frontend/`
- le dossier `deployment/cloudflare/`
- le fichier SQLite `backend/dev.db`
- votre `backend/.env`
- votre `frontend/.env.local`
- votre `config.yml` Cloudflare actif
- votre fichier credentials `<Tunnel-UUID>.json`

### Variables a adapter

- `PUBLIC_APP_URL`
- `PUBLIC_API_URL`
- `FRONTEND_ALLOWED_ORIGINS`
- `STRAVA_REDIRECT_URI`
- eventuellement `APP_HOST`, `APP_PORT`, `FRONTEND_HOST`, `FRONTEND_PORT`

### Services a demarrer

Au minimum:

- backend Node.js
- frontend Vite
- `cloudflared`

### Differences previsibles entre Windows et future machine

Windows maintenant:

- service Cloudflare via `cloudflared.exe service install`
- chemins typiques sous `C:\Windows\System32\config\systemprofile\.cloudflared`

Petite machine plus tard:

- souvent Linux
- service `cloudflared` gere par `systemd`
- chemins typiques sous `~/.cloudflared/` ou `/etc/cloudflared/`

Ce qui ne change pas:

- les hostnames publics
- l'UUID du tunnel
- la logique 2 hostnames
- les variables publiques/locales de RuNSee

## Risques et points manuels

Restent manuels car ils dependent de votre compte Cloudflare et de votre domaine:

- ajout du domaine dans Cloudflare
- delegation des nameservers vers Cloudflare
- authentification `cloudflared tunnel login`
- creation du tunnel nomme
- creation des routes DNS publiques
- choix du domaine final
- configuration du callback OAuth Strava correspondant a l'URL publique retenue

Ce depot ne contient volontairement:

- aucun token Cloudflare
- aucun `cert.pem`
- aucun fichier JSON de credentials du tunnel
- aucun nom de domaine invente
