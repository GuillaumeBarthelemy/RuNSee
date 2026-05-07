# Bascule de la PROD RuNSee vers PostgreSQL

## Objectif

Migrer l'application RuNSee actuellement exploitee sur SQLite vers PostgreSQL,
sans interruption visible pour les utilisateurs et sans casser l'environnement
de developpement ou la prod existante pendant la preparation.

## Constat de depart

- Le schema Prisma courant utilise `provider = "sqlite"`.
- L'historique de migrations courant est donc verrouille sur SQLite dans
  `backend/prisma/migrations/migration_lock.toml`.
- La prod actuelle doit continuer a fonctionner pendant la preparation de la
  future pile PostgreSQL.
- Le bootstrap runtime Prisma a ete rendu agnostique de SQLite dans
  `backend/src/config/prisma.js`, ce qui supprime un couplage technique
  inutile avant la vraie bascule.

## Principe retenu

Ne pas faire la bascule PostgreSQL directement dans l'environnement SQLite en
cours d'execution.

A la place:

1. preparer une pile PostgreSQL en parallele
2. rejouer une migration de donnees depuis SQLite vers PostgreSQL
3. valider l'application sur PostgreSQL hors trafic utilisateur
4. basculer le routage public de l'ancienne pile vers la nouvelle

## Topologie recommandee

### PROD actuelle

- frontend: instance publique actuelle
- backend: instance publique actuelle
- base: SQLite actuelle
- role: source de verite jusqu'au cutover

### DEV PostgreSQL

- frontend: ports dedies
- backend: ports dedies
- base: PostgreSQL dev dediee
- role: preparation schema, import, verification fonctionnelle

### PROD GREEN PostgreSQL

- frontend: instance parallele prete au demarrage
- backend: instance parallele prete au demarrage
- base: PostgreSQL prod cible
- role: cible du cutover

## Variables d'environnement a prevoir

### Backend PostgreSQL

Exemple:

```env
DATABASE_URL="postgresql://runsee_app:motdepasse@db-host:5432/runsee_prod?schema=public"
DIRECT_URL="postgresql://runsee_admin:motdepasse@db-host:5432/runsee_prod?schema=public"
SHADOW_DATABASE_URL="postgresql://runsee_admin:motdepasse@db-host:5432/runsee_shadow?schema=public"
NODE_ENV="production"
APP_HOST="127.0.0.1"
APP_PORT="3000"
LOCAL_APP_URL="http://localhost:5173"
LOCAL_API_URL="http://localhost:3000"
PUBLIC_APP_URL="https://runsee.<votre-domaine>"
PUBLIC_API_URL="https://api.<votre-domaine>"
FRONTEND_ALLOWED_ORIGINS="http://localhost:5173,https://runsee.<votre-domaine>"
STRAVA_REDIRECT_URI="https://api.<votre-domaine>/auth/strava/callback"
```

### Frontend PostgreSQL

Exemple:

```env
FRONTEND_HOST=127.0.0.1
FRONTEND_PORT=5173
VITE_APP_BASE_URL=https://runsee.<votre-domaine>
VITE_API_BASE_URL=https://api.<votre-domaine>
VITE_LOCAL_API_BASE_URL=http://localhost:3000
```

## Environnement DEV PostgreSQL recommande

Fichiers de reference ajoutes:

- `backend/.env.postgresql.dev.example`
- `backend/.env.postgresql.prod.example`
- `frontend/.env.postgresql.dev.example`
- `frontend/.env.postgresql.prod.example`
- `deployment/postgresql/docker-compose.dev.yml`

Copies locales recommandees:

```powershell
Copy-Item backend\.env.postgresql.dev.example backend\.env.postgresql.dev.local
Copy-Item frontend\.env.postgresql.dev.example frontend\.env.postgresql.dev.local
```

Ports retenus pour eviter tout conflit avec la pile actuelle:

- frontend SQLite actuel: `5173`
- backend SQLite actuel: `3000`
- frontend PostgreSQL dev: `5174`
- backend PostgreSQL dev: `3001`
- PostgreSQL dev: `55432`

## Demarrage local de PostgreSQL DEV

Scripts fournis:

- `deployment/postgresql/scripts/start-dev-db.ps1`
- `deployment/postgresql/scripts/stop-dev-db.ps1`
- `deployment/postgresql/scripts/ensure-postgresql-databases.ps1`
- `deployment/postgresql/scripts/preview-cloudflare-cutover.ps1`
- `deployment/postgresql/scripts/apply-cloudflare-cutover.ps1`
- `deployment/postgresql/scripts/import-current-sqlite-to-postgres.ps1`
- `deployment/postgresql/scripts/import-current-sqlite-to-dev-postgres.ps1`
- `deployment/postgresql/scripts/import-current-sqlite-to-green-postgres.ps1`
- `deployment/postgresql/scripts/run-backend-dev.ps1`
- `deployment/postgresql/scripts/run-frontend-dev.ps1`
- `deployment/postgresql/scripts/run-backend-green.ps1`
- `deployment/postgresql/scripts/run-frontend-green.ps1`
- `deployment/postgresql/scripts/start-green-stack.ps1`
- `deployment/postgresql/scripts/stop-green-stack.ps1`
- `deployment/postgresql/scripts/validate-green-stack.ps1`
- `deployment/postgresql/scripts/compare-current-sqlite-and-postgres.ps1`

Demarrer la base:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\postgresql\scripts\start-dev-db.ps1
```

Arreter la base:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\postgresql\scripts\stop-dev-db.ps1
```

Demarrer le backend PostgreSQL dev:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\postgresql\scripts\run-backend-dev.ps1
```

Demarrer le frontend PostgreSQL dev:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\postgresql\scripts\run-frontend-dev.ps1
```

## Ordre de migration recommande

### Etape 1. Creer le workspace PostgreSQL

- travailler dans un workspace dedie ou un git worktree dedie
- ne pas modifier le provider Prisma de l'instance SQLite en production
- preparer:
  - une base PostgreSQL de developpement
  - une base PostgreSQL de pre-production ou de repetition
  - une base PostgreSQL de production

## Commandes preparees dans le depot

Depuis `backend/`:

```powershell
npm run prisma:pg:validate
npm run prisma:pg:generate
npm run prisma:pg:migrate:deploy
```

Pour preparer automatiquement la base cible et la base shadow depuis un fichier
`.env` PostgreSQL:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\postgresql\scripts\ensure-postgresql-databases.ps1
```

Le script lit `DATABASE_URL` et `SHADOW_DATABASE_URL`, puis cree les bases si
elles n'existent pas encore. En local, cela evite de creer `runsee_prod` et
`runsee_shadow` a la main.

Export SQLite courant:

```powershell
npm run db:export:sqlite
```

Export SQLite vers un chemin explicite:

```powershell
npm run db:export:sqlite -- --output .tmp\prod-export.json
```

Verifier un dump sans se connecter a PostgreSQL:

```powershell
npm run db:import:postgres -- --input .tmp\prod-export.json --dry-run
```

Importer dans PostgreSQL:

```powershell
npm run db:import:postgres -- --input .tmp\prod-export.json
```

Important: l'import SQLite vers PostgreSQL est un import complet, pas une
synchronisation incrementale. Sur une base cible non vide, utiliser `--truncate`
pour un rafraichissement controle. L'option `--allow-append` n'est acceptee que
si toutes les tables cibles PostgreSQL sont vides.

Recharger une base PostgreSQL videe au prealable:

```powershell
npm run db:import:postgres -- --input .tmp\prod-export.json --truncate
```

Importer la base SQLite actuelle dans la base PostgreSQL dev:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\postgresql\scripts\import-current-sqlite-to-dev-postgres.ps1 -Truncate
```

Pour une repetition locale de la pile `GREEN`, creer les deux fichiers locaux
suivants depuis les exemples:

```powershell
Copy-Item backend\.env.postgresql.prod.example backend\.env.postgresql.prod.local
Copy-Item frontend\.env.postgresql.prod.example frontend\.env.postgresql.prod.local
```

Recommandation pour cette repetition locale:

- garder `APP_PORT=3001` et `FRONTEND_PORT=5174`
- utiliser des URLs `localhost` dans `PUBLIC_APP_URL`, `PUBLIC_API_URL`,
  `VITE_APP_BASE_URL` et `VITE_API_BASE_URL`
- remplacer ensuite ces valeurs par les vrais domaines publics juste avant le
  cutover Cloudflare

Comparer la base SQLite courante et une base PostgreSQL:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\postgresql\scripts\compare-current-sqlite-and-postgres.ps1
```

Le script compare:

- les compteurs bruts de tables
- l'athlete courant
- la derniere activite exploitable
- les anomalies de donnees connues sur `Activity` (`stravaActivityId` invalide, `startDate` nul)

Valider une pile PostgreSQL GREEN:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\postgresql\scripts\validate-green-stack.ps1
```

La pile `GREEN` sert maintenant le frontend via `vite build` puis
`vite preview`, ce qui evite d'exposer le serveur Vite de developpement sur le
trafic public.

Previsualiser une config Cloudflare `GREEN` a partir de la config active:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\postgresql\scripts\preview-cloudflare-cutover.ps1 -Mode Green
```

Appliquer une config Cloudflare `GREEN` avec backup du `config.yml` actif:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\postgresql\scripts\apply-cloudflare-cutover.ps1 -Mode Green
```

Le script peut aussi redemarrer le tunnel utilisateur local si `cloudflared`
tourne deja avec `--config <config.yml> tunnel run <nom-du-tunnel>`:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\postgresql\scripts\apply-cloudflare-cutover.ps1 -Mode Green -RestartExistingProcess
```

### Etape 2. Basculer Prisma vers PostgreSQL dans le workspace dedie

Dans ce workspace dedie:

- changer `provider = "sqlite"` vers `provider = "postgresql"`
- pointer `DATABASE_URL` vers PostgreSQL
- installer `@prisma/adapter-pg`
- regenerer Prisma Client
- creer un nouvel historique de migrations PostgreSQL ou un baseline propre

Important:

- ne pas reemployer tel quel les SQL de migration SQLite existants
- les migrations actuelles contiennent des instructions specifiques SQLite
  comme `PRAGMA` et des redefinitions de table qui ne sont pas valides pour
  PostgreSQL

### Etape 3. Construire la base PostgreSQL cible

Deux options valides:

- option A: creer un baseline PostgreSQL propre a partir du schema Prisma actuel
- option B: creer le schema via `prisma migrate` dans une base vide PostgreSQL

Recommendation:

- utiliser une base PostgreSQL vide
- appliquer un historique PostgreSQL propre
- verifier que toutes les tables et index attendus existent

### Etape 4. Migrer les donnees depuis SQLite

Ordre d'import recommande:

1. `AppUser`
2. `StravaConnection`
3. `Athlete`
4. `Activity`
5. `SyncJob`
6. `SyncCursor`

Regles:

- conserver strictement les identifiants existants
- conserver `createdAt` et `updatedAt`
- conserver les clefs etrangeres a l'identique
- ne transformer aucun token ni champ JSON pendant cette phase

### Etape 5. Repetition complete hors prod

Avant la vraie bascule:

- restaurer une copie recente de la SQLite prod
- rejouer l'import dans PostgreSQL de repetition
- demarrer une pile backend + frontend sur PostgreSQL
- verifier:
  - lecture athlete
  - lecture activites
  - enrichissement d'une activite
  - synchronisation historique
  - synchronisation incrementale
  - rafraichissement des tokens Strava

### Etape 6. Cutover prod

Le jour J:

1. demarrer la pile PostgreSQL `GREEN`
2. verifier en prive:
   - `/health`
   - `/db/health`
   - parcours fonctionnels critiques
3. geler les ecritures cote ancienne prod pendant le delta final
4. refaire un dernier export SQLite -> import PostgreSQL
5. basculer le routage public de `BLUE` vers `GREEN`
6. monitorer les logs backend, sync, et erreurs Strava

## Delta final sans perte de donnees

Comme l'application actuelle n'est pas tres ecrivante hors synchronisations et
liaison Strava, le plus simple est:

- annoncer une courte fenetre de maintenance technique
- stopper les actions de synchro au moment du delta final
- faire un dernier export SQLite
- reimporter dans PostgreSQL
- pointer le trafic vers la pile PostgreSQL

Cela reste la voie la plus sure avant l'arrivee du multi-utilisateur.

## Strategie de rollback

Garder l'ancienne pile SQLite intacte jusqu'a validation complete.

En cas de probleme:

1. repointer le trafic public vers la pile SQLite `BLUE`
2. couper la pile PostgreSQL `GREEN`
3. analyser les ecarts dans les logs et la base PostgreSQL

Le rollback est rapide car la prod historique n'est ni supprimee ni migree sur
place.

## Check-list de validation

- le backend demarre sur PostgreSQL
- `/health` retourne `OK`
- `/db/health` retourne `OK`
- l'athlete courant est lisible
- les activites historiques sont presentes
- un detail d'activite s'ouvre correctement
- la synchronisation incrementale fonctionne
- le refresh token Strava fonctionne
- les compteurs de jobs de sync sont coherents
- les index principaux existent
- les temps de reponse restent acceptables

## Decision recommandee avant implementation

Pour la tranche suivante, preparer d'abord:

- une branche ou worktree dedie PostgreSQL
- une instance PostgreSQL dev
- une copie de la base SQLite actuelle pour test d'import

Une fois ces trois elements disponibles, la prochaine etape consiste a creer
la variante Prisma/PostgreSQL du backend et a faire un premier import a blanc.
