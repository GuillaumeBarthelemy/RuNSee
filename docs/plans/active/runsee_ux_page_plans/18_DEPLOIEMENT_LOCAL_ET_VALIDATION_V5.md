# RunNSee — Déploiement local et validation V5

## 1. Objectif

Sécuriser la mise en place locale après développement pour éviter qu'une livraison UX validée casse le démarrage RunNSee.

## 2. Préconditions

- Recette transverse passée.
- Build frontend OK.
- Backend non cassé.
- `.env` non modifié sans justification.
- Aucune migration DB non documentée.

## 3. Contrôles repo

Avant démarrage :

```bash
git status
```

Claude doit documenter :

- fichiers modifiés ;
- fichiers créés ;
- fichiers supprimés ;
- fichiers non suivis ;
- fichiers à ne pas commiter.

## 4. Nettoyage dépendances

Ne pas supprimer `node_modules` automatiquement sans demande.

Si erreur dépendance native type Rolldown / Vite :

```bash
cd frontend
npm install
npm run build
```

Si besoin seulement :

```bash
rm -rf node_modules package-lock.json
npm install
```

Sur Windows, préférer PowerShell :

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
npm run build
```

## 5. Démarrage local

À adapter aux scripts existants du repo.

Exemples à vérifier :

```powershell
C:\Services\RuNSee\deployment\windows\scripts\run-backend.ps1
C:\Services\RuNSee\deployment\windows\scripts\run-frontend.ps1
```

ou :

```bash
cd backend
npm run dev

cd frontend
npm run dev
```

## 6. Contrôle base de données

Si PostgreSQL / Prisma impliqué :

- ne pas lancer de migration destructrice ;
- vérifier le statut des migrations ;
- documenter toute migration ;
- vérifier que les activités existantes restent accessibles ;
- vérifier que les enrichissements Garmin existants ne sont pas perdus.

## 7. Contrôle Cloudflare Tunnel

Si exposition locale via Cloudflare :

- ne pas modifier la configuration tunnel sans demande ;
- vérifier que le frontend et le backend répondent localement avant tunnel ;
- vérifier l'URL publique seulement après validation locale.

## 8. Smoke test final

| Contrôle | Résultat |
|---|---|
| Frontend démarre | |
| Backend démarre | |
| PostgreSQL accessible | |
| Page Accueil OK | |
| Page Activités OK | |
| Page Analyse OK | |
| Page Performance OK | |
| Page Progression OK | |
| Page Réglages OK | |
| Page Glossaire OK | |
| Login / auth si applicable | |
| Sync Strava non régressée | |
| Garmin non régressé | |

## 9. Rollback

Avant livraison finale :

```bash
git diff > docs/quality/last_ux_chantier_diff.patch
```

ou a minima :

- noter le dernier commit stable ;
- noter les fichiers modifiés ;
- ne pas mélanger ce chantier avec d'autres évolutions.

## 10. Critère GO déploiement

GO si :

- app démarre localement ;
- routes principales OK ;
- aucune erreur console bloquante ;
- aucune erreur backend bloquante ;
- pas de migration non maîtrisée ;
- rollback possible.
