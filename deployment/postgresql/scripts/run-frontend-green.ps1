$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "common.ps1")

$frontendDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\frontend")).Path
$envPath = (Resolve-Path (Join-Path $frontendDir ".env.postgresql.prod.local")).Path
$viteCli = (Resolve-Path (Join-Path $frontendDir "node_modules\vite\bin\vite.js")).Path

Import-DotEnvFile -Path $envPath
$frontendPort = if ($env:FRONTEND_PORT) { [int]$env:FRONTEND_PORT } else { 5174 }
$frontendHost = if ($env:FRONTEND_HOST) { $env:FRONTEND_HOST.Trim() } else { "127.0.0.1" }
if (-not $frontendHost) {
  $frontendHost = "127.0.0.1"
}

Push-Location $frontendDir

try {
  & node.exe $viteCli build
  if ($LASTEXITCODE -ne 0) {
    throw "Build frontend GREEN en echec."
  }

  & node.exe $viteCli preview --host $frontendHost --port $frontendPort --strictPort
  if ($LASTEXITCODE -ne 0) {
    throw "Demarrage frontend GREEN en preview en echec."
  }
} finally {
  Pop-Location
}
