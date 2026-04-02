param(
  [ValidateSet("Blue", "Green")]
  [string]$Mode = "Green",
  [string]$SourceConfigPath = "",
  [string]$OutputPath = "",
  [string]$FrontendHostname = "",
  [string]$BackendHostname = "",
  [int]$FrontendPort = 0,
  [int]$BackendPort = 0
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "cloudflare-cutover.common.ps1")

if (-not $SourceConfigPath) {
  $SourceConfigPath = Get-DefaultCloudflaredConfigPath
}

$currentSummary = Get-CloudflaredConfigSummary -Path $SourceConfigPath
$generated = New-CloudflaredCutoverConfig `
  -SourceConfigPath $SourceConfigPath `
  -Mode $Mode `
  -OutputPath $OutputPath `
  -FrontendHostname $FrontendHostname `
  -BackendHostname $BackendHostname `
  -FrontendPort $FrontendPort `
  -BackendPort $BackendPort

Test-CloudflaredConfig -ConfigPath $generated.outputPath
$frontendRule = Get-CloudflaredIngressRule -ConfigPath $generated.outputPath -Url "https://$($generated.frontendHostname)"
$backendRule = Get-CloudflaredIngressRule -ConfigPath $generated.outputPath -Url "https://$($generated.backendHostname)/health"

$currentFrontendRule = $currentSummary.ingress | Where-Object { $_.hostname -eq $generated.frontendHostname } | Select-Object -First 1
$currentBackendRule = $currentSummary.ingress | Where-Object { $_.hostname -eq $generated.backendHostname } | Select-Object -First 1

$result = [ordered]@{
  mode = $Mode
  activeConfigPath = $currentSummary.path
  generatedConfigPath = $generated.outputPath
  tunnel = $generated.tunnel
  frontendHostname = $generated.frontendHostname
  frontendServiceCurrent = $currentFrontendRule.service
  frontendServiceTarget = $generated.frontendService
  backendHostname = $generated.backendHostname
  backendServiceCurrent = $currentBackendRule.service
  backendServiceTarget = $generated.backendService
  runningProcesses = Get-CloudflaredRunningProcesses
  validation = "OK"
  frontendRuleCheck = $frontendRule
  backendRuleCheck = $backendRule
}

$result | ConvertTo-Json -Depth 6
