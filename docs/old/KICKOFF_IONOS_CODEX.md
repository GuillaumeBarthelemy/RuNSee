# Prompt d'amorçage CODEX — Migration RunNSee vers IONOS VPS S+

> Ce fichier contient **le message exact** à coller dans la première session CODEX
> pour piloter la migration. Le contenu après la ligne `===== DEBUT PROMPT =====`
> est autonome et n'a besoin d'aucun contexte préalable.

---

## Mode d'emploi

1. **Avant de lancer CODEX**, prépare les éléments suivants :
   - Ton VPS IONOS S+ provisionné avec **Ubuntu 24.04 LTS**.
   - L'**adresse IP publique** de la VPS.
   - Une **clé SSH** générée localement (`ssh-keygen -t ed25519`) avec la clé publique uploadée chez IONOS au moment du provisioning.
   - L'accès à ton compte **Cloudflare** (zone DNS `runnsee.net` + Zero Trust pour les tunnels).
   - L'accès à ton compte **GitHub** (repo RunNSee).
   - Un terminal capable d'ouvrir une session SSH (Windows Terminal, PowerShell, Git Bash, etc.).

2. Ouvre une nouvelle session CODEX dans le repo `C:\Services\RuNSee`.
3. Copie tout le bloc situé entre `===== DEBUT PROMPT =====` et `===== FIN PROMPT =====`.
4. Colle dans la conversation et envoie.
5. CODEX va lire `docs/MIGRATION_IONOS_SPEC.md`, valider sa compréhension et te demander les informations qui lui manquent (IP VPS, owner GitHub, etc.).

---

===== DEBUT PROMPT =====

Tu interviens sur **RunNSee**, une application web d'analyse de performance pour la course à pied actuellement hébergée sur un PC Windows local. Stack : React + Vite (frontend), Node.js + Express + Prisma (backend), PostgreSQL 16 en Docker, tunnel Cloudflare. Le repo est dans `C:\Services\RuNSee` et est aussi sur GitHub.

Ta mission : migrer toute l'application vers une infrastructure cloud peu coûteuse et disponible 24/7, en suivant strictement le dossier de spécification :

**`docs/MIGRATION_IONOS_SPEC.md`**

La cible : VPS IONOS S+ (Ubuntu 24.04, 2 vCPU, 2 Go RAM, 80 Go NVMe) pour le backend + Postgres + cloudflared, et Cloudflare Pages pour le frontend statique.

## Étape 1 — Lecture et confirmation

Commence par lire intégralement `docs/MIGRATION_IONOS_SPEC.md`. Puis :

1. Confirme en 5-7 lignes ce que tu as compris : architecture cible, les 7 lots de migration, les décisions clés (backend non exposé en HTTP public, tout passe par cloudflared sortant ; frontend séparé sur Pages ; secrets dans `.env` non versionné).
2. Liste les **informations qu'il te manque pour démarrer** : IP VPS, owner/repo GitHub, clé `ENCRYPTION_KEY` actuelle du backend, valeurs `STRAVA_CLIENT_ID/SECRET/VERIFY_TOKEN`, identifiant du tunnel Cloudflare existant.
3. **N'écris pas de code, ne lance aucune commande SSH** à ce stade. Attends mon GO et les valeurs manquantes.

## Workflow lot par lot

Une fois mon GO obtenu et les informations fournies :

- **Tu travailles un lot à la fois**, dans l'ordre fixé par le doc (L1 → L2 → L3 → L4 → L5 → L6 → L7).
- Pour chaque lot :
  1. Liste les opérations à effectuer.
  2. Pour les opérations qui se font sur la VPS via SSH : **donne-moi les commandes exactes à exécuter**, je les lancerai et te communiquerai le résultat. **Tu n'exécutes pas SSH directement.**
  3. Pour les opérations qui se font sur le repo Git ou les fichiers locaux Windows : tu peux modifier les fichiers directement et me les montrer.
  4. Pour les opérations qui se font dans une UI tierce (Cloudflare dashboard, IONOS dashboard, GitHub) : décris pas à pas le clic à faire et attends ma confirmation.
  5. À la fin du lot : récap court (fichiers créés, opérations faites côté VPS, points d'attention).
  6. **Attends mon OK explicite** avant de passer au lot suivant.

## Règles de qualité

- **Tutoiement systématique** dans toutes les communications et tous les nouveaux textes.
- **Pas d'emojis** dans les fichiers, scripts ou commits.
- **Pas de secret en clair dans le repo Git** : le `.env` cible (sur la VPS) reste local. Si je colle un secret dans la conversation, ne le réécris jamais en clair dans un fichier versionné.
- **Pas de commit git** sans validation explicite. Les fichiers ajoutés au repo (Dockerfile prod, compose prod, scripts) sont juste préparés ; je commit moi-même quand je suis prêt.
- **Pas de tests unitaires** créés.
- **Backward compat** : les modifications du repo doivent rester compatibles avec la stack locale tant que le Lot 7 n'est pas validé. Le local doit continuer à fonctionner pendant la migration.

## Règles techniques

- **Repo et working directory** : toutes les commandes locales se lancent depuis `C:\Services\RuNSee` ou un sous-dossier. Indique toujours le `cd` dans tes commandes.
- **Commandes SSH** : préfixe-les avec un commentaire indiquant qu'elles sont à exécuter sur la VPS. Format préféré :
  ```
  # Sur la VPS, en tant que runsee :
  cd /srv/runsee
  docker compose -f docker-compose.prod.yml up -d
  ```
- **Pas de tentative de SSH automatique** : je copie/colle les commandes dans mon terminal, je te donne la sortie.
- **Hors scope strict** :
  - Pas de modification du code métier (`backend/src/...` hors fichiers de config infra).
  - Pas de modification des calculs scientifiques (`frontend/src/utils/loadEstimation.js`, `trainingMetrics.js`, etc.).
  - Pas de modification des migrations Prisma déjà appliquées.
  - Pas d'ajout de dépendance npm sans validation explicite.
  - Pas de Let's Encrypt direct sur la VPS (Cloudflare gère le SSL public).
  - Pas de monitoring lourd type Grafana/Prometheus (juste healthcheck cron).

## Règles de communication

- Tes récaps de fin de lot doivent tenir en moins de 200 mots, format tableau ou bullet list.
- Si tu rencontres une zone grise (le doc est ambigu sur un point précis), pose une question courte et attends ma réponse avant de trancher.
- Si tu détectes pendant le travail un problème hors scope (bug pré-existant, secret accidentellement exposé, dette flagrante), signale-le brièvement à la fin du lot mais **ne corrige pas** sans validation.
- Si une opération est risquée (suppression de fichier, recréation de conteneur, drop de table), valide explicitement avant.

## Référence

Le contrat unique est `docs/MIGRATION_IONOS_SPEC.md`. Si quelque chose n'y figure pas explicitement, demande-moi avant d'inventer.

---

**Première action attendue de ta part** : lis le doc et fais le récap demandé à l'étape 1. Indique-moi quelles informations te manquent pour démarrer le Lot 1. **Pas de code, pas de commande SSH.**

===== FIN PROMPT =====

---

## Notes pour le pilote (toi)

### Avant le premier lancement de CODEX, prépare ces valeurs

Tu en auras besoin pour le `.env` final sur la VPS (Lot 2). Regroupe-les dans un coffre / gestionnaire de mots de passe :

| Variable | Source |
|---|---|
| `<vps-ip>` | Console IONOS, après provisioning |
| `<owner>/<repo>` GitHub | URL de ton repo |
| `ENCRYPTION_KEY` | Récupère depuis `C:\Services\RuNSee\backend\.env.postgresql.prod.local` ou équivalent. **Doit être identique** au local pour préserver les tokens chiffrés. |
| `STRAVA_CLIENT_ID` | Pareil |
| `STRAVA_CLIENT_SECRET` | Pareil |
| `STRAVA_VERIFY_TOKEN` | Pareil |
| `SESSION_SECRET` | Pareil ou regénéré (mais alors les sessions actives sont invalidées) |
| `POSTGRES_PASSWORD` | À regénérer côté VPS (32 chars random), n'a pas besoin d'être identique au local |
| `CLOUDFLARED_TUNNEL_TOKEN` | À récupérer dans Cloudflare Zero Trust > Networks > Tunnels > <ton tunnel> > Run a connector |

### À chaque fin de lot, ce que tu peux dire à CODEX

- ✅ Si tu valides : `OK pour le Lot LX. Passe au Lot LX+1.`
- 🔧 Si tu veux un ajustement : `Lot LX validé après ajustement : [...]. Passe au Lot LX+1.`
- ⏸ Si tu veux faire une pause : `Lot LX validé. On reprend plus tard.`
- 🛑 Si tu détectes un problème : `Pause sur le Lot LX. Problème : [...]. Corrige avant de continuer.`

### Si une session CODEX se ferme avant la fin

La spec est versionnée et autonome. Tu peux relancer une nouvelle session avec le même prompt d'amorçage. Demande à CODEX de reprendre au lot où vous étiez : `Reprends à partir du Lot LX (les Lots L1 à LX-1 sont déjà appliqués et validés).`

### Vérifications utiles à faire toi-même

| Lot | Vérification post-validation |
|---|---|
| L1 | `ssh runsee@<vps-ip> 'docker --version && ufw status'` doit répondre depuis ton poste. |
| L2 | `ssh runsee@<vps-ip> 'cd /srv/runsee && docker compose ps'` doit montrer `postgres`, `backend`, `cloudflared` running. |
| L3 | Sur la VPS : `docker compose exec postgres psql -U runsee_app -d runsee_prod -c 'SELECT COUNT(*) FROM "Activity";'` doit donner le même chiffre qu'en local. |
| L4 | `https://<project>.pages.dev` charge le frontend ; le custom domain `runsee.runnsee.net` peut prendre 5-10 min à se propager. |
| L5 | `curl https://api.runnsee.net/health` répond 200 et le payload contient `"environment":"production"`. |
| L6 | Après 24 h : `ls /srv/runsee/backups/*.dump` doit montrer au moins 1 fichier. |
| L7 | PC éteint, ouvre `https://runsee.runnsee.net` depuis ton mobile sur 4G : doit charger normalement. |

### Compteur de progression suggéré

| Lot | Statut | Validé le | Notes |
|---|---|---|---|
| L1 — Préparation serveur | ☐ | | |
| L2 — Stack Docker prod | ☐ | | |
| L3 — Migration Postgres | ☐ | | |
| L4 — Frontend Cloudflare Pages | ☐ | | |
| L5 — Tunnel + DNS + Strava | ☐ | | |
| L6 — Backups + monitoring | ☐ | | |
| L7 — Extinction stack locale | ☐ | | |

### Pré-vol — checklist le jour de la migration

À cocher avant de lancer la session CODEX :

- [ ] VPS IONOS provisionnée et IP publique reçue par mail.
- [ ] SSH ed25519 keypair généré, clé publique uploadée chez IONOS.
- [ ] Test de connexion SSH `ssh root@<vps-ip>` qui aboutit (avant durcissement).
- [ ] Compte Cloudflare ouvert dans un onglet, accès Zero Trust > Networks > Tunnels confirmé.
- [ ] Compte GitHub ouvert dans un autre onglet.
- [ ] Repo RunNSee à jour côté GitHub (`git push` récent).
- [ ] Stack locale fonctionnelle (test rapide `https://api.runnsee.net/health` répond, ancien tunnel encore actif).
- [ ] Coffre / gestionnaire de mots de passe ouvert avec les variables sensibles préparées.
- [ ] 3-4 h de disponibilité devant toi (les Lots 1-3 + 5 sont consécutifs avec downtime sur L3).

### Si pépin pendant la migration

- **Postgres restore échoue** : reprendre le dump local via `pg_dump`, transférer à nouveau, vérifier les permissions du fichier sur la VPS.
- **Backend ne démarre pas** : `docker compose logs backend` ; vérifier `DATABASE_URL`, vérifier que les migrations Prisma sont déjà appliquées (`SELECT * FROM _prisma_migrations`).
- **Cloudflared ne se connecte pas** : vérifier le token dans `.env`, vérifier dans Zero Trust que le connector apparaît, vérifier que le tunnel est actif côté Cloudflare.
- **Strava OAuth refuse la callback** : vérifier que le `Authorization Callback Domain` est exactement `api.runnsee.net` (sans https, sans path).
- **Frontend renvoie CORS error** : vérifier `FRONTEND_ALLOWED_ORIGINS` côté backend (`.env` VPS) et `VITE_API_URL` côté Pages.

### Plan de retour arrière (rollback)

Si un blocage majeur intervient avant la validation du Lot 7 :
1. Garder la stack locale active (elle l'est jusqu'au Lot 7).
2. Couper côté VPS : `docker compose -f docker-compose.prod.yml down`.
3. Restaurer le routage Cloudflare Tunnel sur le PC local : régénérer un token côté Zero Trust et relancer le cloudflared local.
4. Pages Cloudflare peut rester en place sans router le custom domain (le DNS Pages reste, mais le tunnel reprend la main sur `runsee.runnsee.net` si besoin).
5. Tu auras perdu peut-être quelques heures d'écriture côté VPS : `pg_dump` côté VPS et restore côté PC pour resynchroniser.

Tant que `docs/MIGRATION_IONOS_SPEC.md` est la source de vérité unique et que tu valides chaque lot, le risque est maîtrisé.
