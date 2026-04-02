param(
  [ValidateSet("Blue", "Green")]
  [string]$Mode = "Green",
  [string]$ActiveConfigPath = "",
  [string]$GeneratedConfigPath = "",
  [string]$BackupDirectory = "",
  [string]$FrontendHostname = "",
  [string]$BackendHostname = "",
  [int]$FrontendPort = 0,
  [int]$BackendPort = 0,
  [switch]$RestartExistingProcess
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "cloudflare-cutover.common.ps1")

if (-not $ActiveConfigPath) {
  $ActiveConfigPath = Get-DefaultCloudflaredConfigPath
}

$currentSummary = Get-CloudflaredConfigSummary -Path $ActiveConfigPath
$generated = New-CloudflaredCutoverConfig `
  -SourceConfigPath $ActiveConfigPath `
  -Mode $Mode `
  -OutputPath $GeneratedConfigPath `
  -FrontendHostname $FrontendHostname `
  -BackendHostname $BackendHostname `
  -FrontendPort $FrontendPort `
  -BackendPort $BackendPort

Test-CloudflaredConfig -ConfigPath $generated.outputPath

if (-not $BackupDirectory) {
  $BackupDirectory = Split-Path -Parent $currentSummary.path
}

if (-not (Test-Path -LiteralPath $BackupDirectory)) {
  New-Item -ItemType Directory -Force -Path $BackupDirectory | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$backupPath = Join-Path $BackupDirectory ("config.yml.bak-$timestamp")

Copy-Item -LiteralPath $currentSummary.path -Destination $backupPath -Force
Copy-Item -LiteralPath $generated.outputPath -Destination $currentSummary.path -Force

Test-CloudflaredConfig -ConfigPath $currentSummary.path

$result = [ordered]@{
  mode = $Mode
  activeConfigPath = $currentSummary.path
  backupPath = $backupPath
  tunnel = $generated.tunnel
  frontendHostname = $generated.frontendHostname
  frontendService = $generated.frontendService
  backendHostname = $generated.backendHostname
  backendService = $generated.backendService
  restart = "not_requested"
}

if ($RestartExistingProcess) {
  $restartInfo = Restart-CloudflaredTunnelProcess -ConfigPath $currentSummary.path -TunnelName $generated.tunnel
  $result.restart = $restartInfo
}

$result | ConvertTo-Json -Depth 6
