# Checklist de validation Cloudflare Tunnel pour RuNSee

## 1. Frontend accessible localement

- Lancer `cd frontend && npm run dev`
- Verifier que le frontend repond sur `http://127.0.0.1:5173` ou sur la valeur de `FRONTEND_PORT`

## 2. Backend accessible localement

- Lancer `cd backend && npm run dev`
- Verifier `http://127.0.0.1:3000/health`
- Verifier `http://127.0.0.1:3000/db/health`

## 3. Frontend appelle le backend local correctement

- Ouvrir le dashboard local
- Verifier dans l'onglet reseau que les appels API pointent vers `VITE_API_BASE_URL`
- Verifier l'absence d'appel vers un mauvais port

## 4. Variables d'environnement coherentes

- Executer:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\cloudflare\scripts\check-env.ps1
```

- Verifier les valeurs:
  - `VITE_APP_BASE_URL`
  - `VITE_API_BASE_URL`
  - `APP_PORT`
  - `PUBLIC_APP_URL`
  - `PUBLIC_API_URL`
  - `FRONTEND_ALLOWED_ORIGINS`
  - `STRAVA_REDIRECT_URI`

## 5. Tunnel Cloudflare lance

- Lancer `cloudflared tunnel run <nom-ou-uuid>`
- Verifier que le tunnel se connecte sans erreur
- Verifier `cloudflared tunnel info <nom-ou-uuid>`

## 6. Hostname public frontend accessible

- Ouvrir `https://runsee.<votre-domaine>`
- Verifier que le frontend charge sans page blanche

## 7. Hostname public backend accessible

- Ouvrir `https://api.<votre-domaine>/health`
- Verifier un JSON `status: OK`

## 8. Appels API OK via hostname public

- Depuis `https://runsee.<votre-domaine>`, verifier que les appels navigateur vont bien vers `https://api.<votre-domaine>`
- Verifier l'absence d'appel vers `localhost:3000`, `localhost:3001` ou un ancien port depuis le navigateur public

## 9. Dashboard OK

- Verifier chargement du dashboard
- Verifier KPI, tableau et graphiques

## 10. Detail activite OK

- Ouvrir une activite depuis le tableau
- Verifier le retour au dashboard
- Verifier carte et splits si disponibles

## 11. Administration OK

- Ouvrir `/admin`
- Verifier etat sync, actions et resume

## 12. Comparaison OK

- Verifier comparaison de periodes
- Verifier analyse mensuelle
- Verifier charge glissante

## 13. OAuth Strava coherent

- Verifier que le bouton de connexion Strava ouvre bien l'URL backend attendue
- Si tunnel actif, verifier que le callback revient sur le frontend public

## 14. Aucun appel API vers le mauvais port

- Verifier dans l'onglet reseau:
  - pas de `localhost:3001`
  - pas de `localhost:3000` dans le navigateur public
  - pas de mix entre hostname public frontend et ancien hostname API

## 15. Comportement attendu si tunnel arrete

- Arreter `cloudflared`
- Verifier:
  - les URLs publiques ne repondent plus
  - le frontend local continue a fonctionner localement
  - le backend local continue a fonctionner localement

## 16. Service Windows

- Si usage en service:
  - `Get-Service cloudflared`
  - verifier l'etat `Running`
  - verifier le fichier de log `C:\Cloudflared\cloudflared.log`
