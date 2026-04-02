# Cutover SQLite -> PostgreSQL

## But

Basculer la production RuNSee de la pile SQLite `BLUE` vers la pile
PostgreSQL `GREEN`, en gardant un rollback rapide.

## Hypotheses retenues

- pile actuelle `BLUE`
  - frontend local: `5173`
  - backend local: `3000`
  - base: SQLite
- pile cible `GREEN`
  - frontend local: `5174`
  - backend local: `3001`
  - base: PostgreSQL
- exposition publique via Cloudflare Tunnel:
  - `runsee.<votre-domaine>`
  - `api.<votre-domaine>`

## Fichiers utiles

- `deployment/postgresql/cloudflare-config.green.example.yml`
- `deployment/postgresql/scripts/run-backend-green.ps1`
- `deployment/postgresql/scripts/run-frontend-green.ps1`
- `deployment/postgresql/scripts/start-green-stack.ps1`
- `deployment/postgresql/scripts/stop-green-stack.ps1`
- `deployment/postgresql/scripts/validate-green-stack.ps1`
- `deployment/postgresql/scripts/compare-current-sqlite-and-postgres.ps1`

## M-60 a M-30

- verifier que la pile `BLUE` est stable
- verifier que Docker Desktop est demarre
- verifier que PostgreSQL `GREEN` repond
- verifier que les fichiers:
  - `backend/.env.postgresql.prod.local`
  - `frontend/.env.postgresql.prod.local`
  existent et sont corrects
- si la base cible n'existe pas encore, preparer automatiquement les bases
  `runsee_prod` et `runsee_shadow` avec:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\postgresql\scripts\ensure-postgresql-databases.ps1
```

- demarrer la pile `GREEN`
- lancer:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\postgresql\scripts\validate-green-stack.ps1
```

- la pile `GREEN` doit servir un frontend build statique sur `5174`, pas le
  serveur Vite de developpement

- verifier localement:
  - `http://127.0.0.1:3001/health`
  - `http://127.0.0.1:3001/db/health`
  - `http://127.0.0.1:5174`

## M-30 a M-15

- comparer la SQLite courante et PostgreSQL:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\postgresql\scripts\compare-current-sqlite-and-postgres.ps1 -PostgresEnvPath ..\..\..\backend\.env.postgresql.prod.local
```

- confirmer que:
  - les compteurs de tables sont identiques
  - l'athlete courant est identique
  - la derniere activite exploitable est identique
  - les anomalies de donnees `Activity` sont identiques

## M-10

- informer qu'une courte fenetre technique commence
- ne plus lancer de synchro manuelle sur la pile `BLUE`
- garder la pile `BLUE` demarree pour rollback

## M-5

- relancer un import final SQLite -> PostgreSQL:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\postgresql\scripts\import-current-sqlite-to-green-postgres.ps1 -Truncate
```

- rerun la comparaison:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\postgresql\scripts\compare-current-sqlite-and-postgres.ps1 -PostgresEnvPath ..\..\..\backend\.env.postgresql.prod.local
```

## M-2

- preparer la config Cloudflare `GREEN`
- verifier le diff principal:
  - frontend `5173 -> 5174`
  - backend `3000 -> 3001`
- generer et valider une variante `GREEN` a partir de la config active:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\postgresql\scripts\preview-cloudflare-cutover.ps1 -Mode Green
```

## M0

- remplacer la config active de `cloudflared` par la variante `GREEN`:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\postgresql\scripts\apply-cloudflare-cutover.ps1 -Mode Green
```

- si le tunnel tourne comme processus utilisateur local, reappliquer puis redemarrer le processus:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\postgresql\scripts\apply-cloudflare-cutover.ps1 -Mode Green -RestartExistingProcess
```

- si le tunnel tourne comme service Windows, reappliquer puis redemarrer `cloudflared`
- verifier:
  - `https://api.<votre-domaine>/health`
  - `https://api.<votre-domaine>/db/health`
  - `https://runsee.<votre-domaine>`

## M+5

- ouvrir le dashboard public
- verifier les appels API
- verifier `/admin`
- verifier `/athlete/me`
- verifier `sync/summary`

## M+15

- monitorer:
  - logs backend `GREEN`
  - logs frontend `GREEN`
  - logs `cloudflared`

- si tout est bon:
  - garder `BLUE` eteinte mais intacte

## Rollback

Si probleme:

1. remettre la config `cloudflared` `BLUE`:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\postgresql\scripts\apply-cloudflare-cutover.ps1 -Mode Blue
```

2. redemarrer `cloudflared`
3. couper la pile `GREEN`
4. revalider les endpoints publics `BLUE`

Le rollback doit rester purement infra tant que tu n'as pas modifie la SQLite
historique.
