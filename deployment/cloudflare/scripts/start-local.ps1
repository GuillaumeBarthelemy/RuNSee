param()

function Read-EnvValue {
  param(
    [string]$Path,
    [string]$Key
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }

  $line = Get-Content -Path $Path | Where-Object {
    $_ -match "^\s*$Key\s*="
  } | Select-Object -First 1

  if (-not $line) {
    return $null
  }

  return ($line.Split("=", 2)[1]).Trim().Trim('"').Trim("'")
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..\..\..")
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"

$frontendPort = Read-EnvValue -Path (Join-Path $frontendDir ".env.local") -Key "FRONTEND_PORT"
if (-not $frontendPort) {
  $frontendPort = Read-EnvValue -Path (Join-Path $frontendDir ".env") -Key "FRONTEND_PORT"
}
if (-not $frontendPort) {
  $frontendPort = "5173"
}

$appPort = Read-EnvValue -Path (Join-Path $backendDir ".env") -Key "APP_PORT"
if (-not $appPort) {
  $appPort = "3000"
}

Write-Host "RuNSee local stack"
Write-Host "Backend expected on:  http://127.0.0.1:$appPort"
Write-Host "Frontend expected on: http://127.0.0.1:$frontendPort"
Write-Host ""

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backendDir'; npm.cmd run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendDir'; npm.cmd run dev"

Write-Host "Two PowerShell windows have been opened:"
Write-Host "- backend: npm run dev"
Write-Host "- frontend: npm run dev"
