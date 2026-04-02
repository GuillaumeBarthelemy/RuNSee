param(
  [string]$TunnelName = "runsee-local",
  [string]$CloudflaredPath = "",
  [string]$CloudflaredConfigPath = "",
  [string]$RuntimeDir = "",
  [int]$RestartDelaySeconds = 10
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "common.ps1")

$runtimeDir = Get-RunSeeRuntimeDir -RuntimeDir $RuntimeDir
$logPath = New-RunSeeLogPath -RuntimeDir $runtimeDir -Name "cloudflared"
$defaultConfigPath = Join-Path $env:USERPROFILE ".cloudflared\config.yml"
$resolvedConfigPath = if ($CloudflaredConfigPath) { $CloudflaredConfigPath } else { $defaultConfigPath }

if (-not (Test-Path -LiteralPath $resolvedConfigPath)) {
  throw "Fichier cloudflared introuvable: $resolvedConfigPath"
}

$resolvedCloudflaredPath = Resolve-ExecutablePath -Candidates @(
  $CloudflaredPath,
  "cloudflared.exe",
  "C:\Program Files (x86)\cloudflared\cloudflared.exe",
  "C:\Program Files\cloudflared\cloudflared.exe"
) -FriendlyName "cloudflared.exe"

Write-RunSeeLog -LogPath $logPath -Message "Tunnel: $TunnelName"
Write-RunSeeLog -LogPath $logPath -Message "cloudflared: $resolvedCloudflaredPath"
Write-RunSeeLog -LogPath $logPath -Message "config: $resolvedConfigPath"

Start-SupervisedCommand -Name "cloudflared" -LogPath $logPath -RestartDelaySeconds $RestartDelaySeconds -Command {
  & $resolvedCloudflaredPath "--config" $resolvedConfigPath "tunnel" "run" $TunnelName
}
