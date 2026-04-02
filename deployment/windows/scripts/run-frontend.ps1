param(
  [string]$RuntimeDir = "",
  [int]$RestartDelaySeconds = 10
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "common.ps1")

$repoRoot = Resolve-RunSeeRepoRoot
$frontendDir = Join-Path $repoRoot "frontend"
$runtimeDir = Get-RunSeeRuntimeDir -RuntimeDir $RuntimeDir
$logPath = New-RunSeeLogPath -RuntimeDir $runtimeDir -Name "frontend"
$npmPath = Resolve-ExecutablePath -Candidates @("npm.cmd") -FriendlyName "npm.cmd"

Write-RunSeeLog -LogPath $logPath -Message "Frontend dir: $frontendDir"
Write-RunSeeLog -LogPath $logPath -Message "npm: $npmPath"

Push-Location $frontendDir
try {
  Start-SupervisedCommand -Name "frontend" -LogPath $logPath -RestartDelaySeconds $RestartDelaySeconds -Command {
    & $npmPath "run" "build"
    $buildExitCode = if ($null -ne $global:LASTEXITCODE) { $global:LASTEXITCODE } else { 0 }

    if ($buildExitCode -ne 0) {
      throw "Le build frontend a echoue avec le code $buildExitCode."
    }

    & $npmPath "run" "preview"
  }
}
finally {
  Pop-Location
}
