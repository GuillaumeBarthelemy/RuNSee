# Checklist de validation Windows

## Avant installation

1. `cloudflared tunnel info runsee-local` repond localement
2. `backend/.env` contient les URLs attendues
3. `frontend/.env` ou `frontend/.env.local` contient les URLs attendues
4. `http://127.0.0.1:3000/health` repond
5. `http://localhost:5173` fonctionne si le frontend est lance manuellement

## Apres installation des taches

1. `Get-ScheduledTask -TaskName "RuNSee*"` liste 3 taches
2. `Get-ScheduledTask -TaskName "RuNSee*" | Get-ScheduledTaskInfo` montre un dernier lancement sans erreur bloquante
3. `deployment/windows/runtime/cloudflared.log` existe
4. `deployment/windows/runtime/backend.log` existe
5. `deployment/windows/runtime/frontend.log` existe

## Verification fonctionnelle locale

1. `curl http://127.0.0.1:3000/health` repond
2. `http://localhost:5173` charge le dashboard
3. le dashboard ne remonte pas `Network Error`
4. l'administration s'ouvre
5. le detail d'activite s'ouvre
6. la comparaison de periodes s'affiche

## Verification apres reboot

1. redemarrer le PC
2. ouvrir la session Windows
3. attendre 10 a 30 secondes
4. verifier `Get-ScheduledTask -TaskName "RuNSee*" | Format-Table TaskName,State`
5. verifier `http://localhost:5173`
6. verifier `http://127.0.0.1:3000/health`

## Verification tunnel public

Cette partie n'est valable que quand la zone DNS Cloudflare est active.

1. `nslookup runnsee.fr 1.1.1.1` ne doit plus renvoyer `NXDOMAIN`
2. `nslookup runsee.runnsee.fr 1.1.1.1` doit resoudre
3. `nslookup api.runsee.runnsee.fr 1.1.1.1` doit resoudre
4. `https://runsee.runnsee.fr` doit charger le frontend
5. `https://api.runsee.runnsee.fr/health` doit repondre

## En cas d'echec

1. lire `deployment/windows/runtime/cloudflared.log`
2. lire `deployment/windows/runtime/backend.log`
3. lire `deployment/windows/runtime/frontend.log`
4. verifier l'etat des taches planifiees
5. verifier si `runnsee.fr` est encore en `Invalid nameservers` dans Cloudflare
