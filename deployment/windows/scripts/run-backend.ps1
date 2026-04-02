param(
  [string]$RuntimeDir = "",
  [int]$RestartDelaySeconds = 10
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "common.ps1")

$repoRoot = Resolve-RunSeeRepoRoot
$backendDir = Join-Path $repoRoot "backend"
$runtimeDir = Get-RunSeeRuntimeDir -RuntimeDir $RuntimeDir
$logPath = New-RunSeeLogPath -RuntimeDir $runtimeDir -Name "backend"
$npmPath = Resolve-ExecutablePath -Candidates @("npm.cmd") -FriendlyName "npm.cmd"

Write-RunSeeLog -LogPath $logPath -Message "Backend dir: $backendDir"
Write-RunSeeLog -LogPath $logPath -Message "npm: $npmPath"

Push-Location $backendDir
try {
  Start-SupervisedCommand -Name "backend" -LogPath $logPath -RestartDelaySeconds $RestartDelaySeconds -Command {
    & $npmPath "run" "start"
  }
}
finally {
  Pop-Location
}
