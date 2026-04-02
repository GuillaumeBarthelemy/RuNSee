$ErrorActionPreference = "Stop"

$composePath = Join-Path $PSScriptRoot "..\docker-compose.dev.yml"
$composePath = (Resolve-Path $composePath).Path

& docker-compose.exe -f $composePath down

if ($LASTEXITCODE -ne 0) {
  throw "Docker Compose command failed while stopping the PostgreSQL dev database."
}

Write-Output "POSTGRES_DEV_DB_STOPPED"
