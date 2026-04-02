param(
  [ValidateSet("Logon", "Startup")]
  [string]$Mode = "Logon",
  [string]$TaskPrefix = "RuNSee",
  [string]$TunnelName = "runsee-local",
  [string]$CloudflaredPath = "",
  [string]$CloudflaredConfigPath = "",
  [string]$RuntimeDir = "",
  [int]$RestartDelaySeconds = 10,
  [switch]$StartNow
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "common.ps1")

function New-RunSeeTaskAction {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ScriptPath,
    [string[]]$ExtraArguments = @()
  )

  $powershellExe = Join-Path $PSHOME "powershell.exe"
  $wscriptExe = Join-Path $env:WINDIR "System32\wscript.exe"
  $wrapperScript = Join-Path $PSScriptRoot "run-hidden.vbs"
  $powershellArguments = @(
    "-NoProfile"
    "-ExecutionPolicy"
    "Bypass"
    "-File"
    ('"{0}"' -f $ScriptPath)
  ) + $ExtraArguments

  $commandLine = ('"{0}" {1}' -f $powershellExe, ($powershellArguments -join " "))
  $wscriptArguments = @(
    ('"{0}"' -f $wrapperScript)
    ('"{0}"' -f $commandLine.Replace('"', '""'))
  )

  return New-ScheduledTaskAction -Execute $wscriptExe -Argument ($wscriptArguments -join " ")
}

function Register-RunSeeTask {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$Description,
    [Parameter(Mandatory = $true)]
    [Microsoft.Management.Infrastructure.CimInstance]$Action,
    [Parameter(Mandatory = $true)]
    [Microsoft.Management.Infrastructure.CimInstance]$Trigger,
    [Parameter(Mandatory = $true)]
    [Microsoft.Management.Infrastructure.CimInstance]$Principal,
    [Parameter(Mandatory = $true)]
    [Microsoft.Management.Infrastructure.CimInstance]$Settings
  )

  Register-ScheduledTask -TaskName $Name -Description $Description -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Force | Out-Null
  Write-Host "Task installed: $Name"
}

function Test-PathUnderUserProfile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $resolvedPath = (Resolve-Path -LiteralPath $Path).Path
  return $resolvedPath.StartsWith($env:USERPROFILE, [System.StringComparison]::OrdinalIgnoreCase)
}

$repoRoot = Resolve-RunSeeRepoRoot
$runtimeDir = Get-RunSeeRuntimeDir -RuntimeDir $RuntimeDir
$cloudflaredConfigPath = if ($CloudflaredConfigPath) {
  $CloudflaredConfigPath
}
else {
  Join-Path $env:USERPROFILE ".cloudflared\config.yml"
}

if (-not (Test-Path -LiteralPath $cloudflaredConfigPath)) {
  throw "Fichier cloudflared introuvable: $cloudflaredConfigPath"
}

if ($Mode -eq "Startup") {
  if (Test-PathUnderUserProfile -Path $repoRoot) {
    throw "Le mode Startup n'est pas recommande avec un depot sous le profil utilisateur ou OneDrive. Deplace d'abord RuNSee vers un chemin systeme (ex. C:\Services\RuNSee), puis relance l'installation."
  }

  if (Test-PathUnderUserProfile -Path $cloudflaredConfigPath) {
    throw "Le mode Startup n'est pas recommande avec une config cloudflared sous le profil utilisateur. Deplace config.yml et le JSON du tunnel vers un chemin systeme."
  }
}

$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$trigger = if ($Mode -eq "Logon") {
  New-ScheduledTaskTrigger -AtLogOn -User $currentUser
}
else {
  New-ScheduledTaskTrigger -AtStartup
}

$principal = if ($Mode -eq "Logon") {
  New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Limited
}
else {
  New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
}

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances Ignore

$backendScript = Join-Path $PSScriptRoot "run-backend.ps1"
$frontendScript = Join-Path $PSScriptRoot "run-frontend.ps1"
$cloudflaredScript = Join-Path $PSScriptRoot "run-cloudflared.ps1"

$commonTaskArgs = @(
  "-RuntimeDir"
  ('"{0}"' -f $runtimeDir)
  "-RestartDelaySeconds"
  $RestartDelaySeconds
)

$backendAction = New-RunSeeTaskAction -ScriptPath $backendScript -ExtraArguments $commonTaskArgs
$frontendAction = New-RunSeeTaskAction -ScriptPath $frontendScript -ExtraArguments $commonTaskArgs
$cloudflaredAction = New-RunSeeTaskAction -ScriptPath $cloudflaredScript -ExtraArguments (
  @(
    "-TunnelName"
    ('"{0}"' -f $TunnelName)
    "-CloudflaredConfigPath"
    ('"{0}"' -f $cloudflaredConfigPath)
  ) +
  $(if ($CloudflaredPath) { @("-CloudflaredPath", ('"{0}"' -f $CloudflaredPath)) } else { @() }) +
  $commonTaskArgs
)

$tunnelTaskName = "$TaskPrefix Tunnel"
$backendTaskName = "$TaskPrefix Backend"
$frontendTaskName = "$TaskPrefix Frontend"

Register-RunSeeTask -Name $tunnelTaskName -Description "Demarre et supervise le tunnel Cloudflare RuNSee." -Action $cloudflaredAction -Trigger $trigger -Principal $principal -Settings $settings
Register-RunSeeTask -Name $backendTaskName -Description "Demarre et supervise le backend RuNSee." -Action $backendAction -Trigger $trigger -Principal $principal -Settings $settings
Register-RunSeeTask -Name $frontendTaskName -Description "Construit puis sert le frontend RuNSee." -Action $frontendAction -Trigger $trigger -Principal $principal -Settings $settings

if ($StartNow) {
  Start-ScheduledTask -TaskName $tunnelTaskName
  Start-ScheduledTask -TaskName $backendTaskName
  Start-ScheduledTask -TaskName $frontendTaskName
  Write-Host "Tasks started immediately."
}

Write-Host ""
Write-Host "Installation terminee."
Write-Host "Mode        : $Mode"
Write-Host "Utilisateur : $currentUser"
Write-Host "Runtime dir : $runtimeDir"
Write-Host "Tunnel conf : $cloudflaredConfigPath"
Write-Host ""
Write-Host "Verification rapide:"
Write-Host "Get-ScheduledTask -TaskName '$TaskPrefix*' | Get-ScheduledTaskInfo"
