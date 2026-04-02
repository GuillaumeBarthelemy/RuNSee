# Demarrage automatique Windows pour RuNSee

## Objectif

Demarrer automatiquement RuNSee au lancement de Windows, sans changer l'architecture actuelle:

- tunnel Cloudflare local
- backend Node.js local
- frontend local

## Choix retenu

Pour l'etat actuel du projet, le mecanisme le plus simple et le plus stable est:

- 3 taches planifiees Windows
- 1 script de supervision par composant
- redemarrage automatique si un processus se coupe
- logs locaux dedies

Pourquoi pas un "vrai" service Windows unique pour tout?

- `cloudflared` sait fonctionner comme service Windows
- mais le backend Node.js et le frontend Vite demanderaient un wrapper de service supplementaire
- pour limiter les risques et ne pas ajouter de dependance externe, le depot fournit un auto-demarrage Windows base sur le Planificateur de taches

En pratique, tu obtiens bien un demarrage automatique fiable de la pile complete.

## Mode recommande maintenant

Sur cette machine, le depot est dans:

- `C:\Users\barth\OneDrive\Bureau\RuNSee`

Dans ce contexte, le mode recommande est:

- `Logon`

Ce mode demarre RuNSee a l'ouverture de ta session Windows. C'est le bon choix tant que:

- le projet reste dans ton profil utilisateur / OneDrive
- la config `cloudflared` reste dans `%USERPROFILE%\.cloudflared`

## Mode futur pour une petite machine

Le mode:

- `Startup`

est prevu pour plus tard, apres deplacement du projet et de la config tunnel vers un chemin systeme, par exemple:

- `C:\Services\RuNSee`
- `C:\ProgramData\cloudflared\config.yml`

Le script d'installation bloque volontairement ce mode si les chemins restent sous le profil utilisateur, pour eviter un faux service instable.

## Fichiers ajoutes

- `deployment/windows/scripts/common.ps1`
- `deployment/windows/scripts/run-cloudflared.ps1`
- `deployment/windows/scripts/run-backend.ps1`
- `deployment/windows/scripts/run-frontend.ps1`
- `deployment/windows/scripts/install-startup-tasks.ps1`
- `deployment/windows/scripts/uninstall-startup-tasks.ps1`

Les logs sont ecrits ici:

- `deployment/windows/runtime/cloudflared.log`
- `deployment/windows/runtime/backend.log`
- `deployment/windows/runtime/frontend.log`

Les taches utilisent aussi:

- `deployment/windows/scripts/run-hidden.vbs`

Ce wrapper lance PowerShell sans faire apparaitre de fenetre console visible.

## Prerequis

- `cloudflared` installe localement
- tunnel nomme deja cree
- fichier `config.yml` cloudflared deja pret
- dependances `frontend` et `backend` deja installees
- `backend/.env` coherent
- `frontend/.env` ou `frontend/.env.local` coherent

Rappels utiles:

- backend local par defaut: `http://localhost:3000`
- frontend local par defaut: `http://localhost:5173`

## Installation recommandee maintenant

Depuis la racine du depot:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\windows\scripts\install-startup-tasks.ps1 `
  -Mode Logon `
  -TunnelName runsee-local `
  -CloudflaredPath "C:\Program Files (x86)\cloudflared\cloudflared.exe" `
  -CloudflaredConfigPath "$env:USERPROFILE\.cloudflared\config.yml" `
  -StartNow
```

Effet:

- cree `RuNSee Tunnel`
- cree `RuNSee Backend`
- cree `RuNSee Frontend`
- lance tout de suite les 3 taches

## Verification immediate

Etat des taches:

```powershell
Get-ScheduledTask -TaskName "RuNSee*" | Get-ScheduledTaskInfo
```

Logs:

```powershell
Get-Content .\deployment\windows\runtime\cloudflared.log -Tail 50
Get-Content .\deployment\windows\runtime\backend.log -Tail 50
Get-Content .\deployment\windows\runtime\frontend.log -Tail 50
```

Verification locale:

```powershell
curl http://127.0.0.1:3000/health
```

Puis dans le navigateur:

- `http://localhost:5173`

Si tu avais deja installe les taches avant l'ajout du mode cache, pense a les recreer:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\windows\scripts\uninstall-startup-tasks.ps1
powershell -ExecutionPolicy Bypass -File .\deployment\windows\scripts\install-startup-tasks.ps1 `
  -Mode Logon `
  -TunnelName runsee-local `
  -CloudflaredPath "C:\Program Files (x86)\cloudflared\cloudflared.exe" `
  -CloudflaredConfigPath "$env:USERPROFILE\.cloudflared\config.yml" `
  -StartNow
```

## Redemarrage du PC

Apres un reboot:

1. ouvre ta session Windows
2. attends 10 a 30 secondes
3. verifie les taches et les logs
4. ouvre `http://localhost:5173`

Si le DNS Cloudflare n'est pas encore actif, le local doit continuer a fonctionner normalement.

## Arret / suppression

Pour supprimer les taches:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\windows\scripts\uninstall-startup-tasks.ps1
```

Pour stopper ponctuellement une tache sans la supprimer:

```powershell
Stop-ScheduledTask -TaskName "RuNSee Tunnel"
Stop-ScheduledTask -TaskName "RuNSee Backend"
Stop-ScheduledTask -TaskName "RuNSee Frontend"
```

## Mode Startup plus tard

Quand tu auras deplace le projet hors OneDrive et hors profil utilisateur:

1. copie RuNSee vers un chemin systeme stable
2. deplace `config.yml` et le JSON du tunnel vers un chemin systeme
3. relance l'installation avec `-Mode Startup`

Exemple cible plus tard:

```powershell
powershell -ExecutionPolicy Bypass -File .\deployment\windows\scripts\install-startup-tasks.ps1 `
  -Mode Startup `
  -TunnelName runsee-local `
  -CloudflaredConfigPath "C:\ProgramData\cloudflared\config.yml" `
  -CloudflaredPath "C:\Program Files (x86)\cloudflared\cloudflared.exe" `
  -StartNow
```

## Points d'attention

- Le frontend est servi en `vite preview`, pas en `vite dev`
- Le script frontend relance un `build` a chaque redemarrage du service
- Si le build frontend casse, la tache frontend continuera de reessayer apres delai
- Si le tunnel Cloudflare est coupe ou mal configure, le local continue a tourner, mais pas l'acces public
- Tant que la zone `runnsee.net` n'est pas `Active` ou que les enregistrements du tunnel ne sont pas crees, les URLs publiques resteront indisponibles

## Diagnostic rapide

Verifier le tunnel:

```powershell
Get-Content .\deployment\windows\runtime\cloudflared.log -Tail 100
```

Verifier le backend:

```powershell
Get-Content .\deployment\windows\runtime\backend.log -Tail 100
curl http://127.0.0.1:3000/health
```

Verifier le frontend:

```powershell
Get-Content .\deployment\windows\runtime\frontend.log -Tail 100
```

Verifier les taches:

```powershell
Get-ScheduledTask -TaskName "RuNSee*" | Format-Table TaskName,State
```
