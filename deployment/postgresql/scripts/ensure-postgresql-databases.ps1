param(
  [string]$PostgresEnvPath = "..\..\..\backend\.env.postgresql.prod.local"
)

$ErrorActionPreference = "Stop"

$backendDir = Join-Path $PSScriptRoot "..\..\..\backend"
$backendDir = (Resolve-Path $backendDir).Path
$postgresEnvCandidate = Join-Path $PSScriptRoot $PostgresEnvPath

if (-not (Test-Path $postgresEnvCandidate)) {
  throw "Fichier d'environnement PostgreSQL introuvable: $postgresEnvCandidate"
}

$postgresEnvPath = (Resolve-Path $postgresEnvCandidate).Path
$previousDotenvPath = $env:DOTENV_CONFIG_PATH

Push-Location $backendDir

try {
  $env:DOTENV_CONFIG_PATH = $postgresEnvPath
  & npm.cmd run db:ensure:postgres

  if ($LASTEXITCODE -ne 0) {
    throw "npm command failed: npm.cmd run db:ensure:postgres"
  }
}
finally {
  Pop-Location
  $env:DOTENV_CONFIG_PATH = $previousDotenvPath
}

Write-Output "POSTGRES_DATABASES_READY_FROM_ENV"
Write-Output "PostgresEnv: $postgresEnvPath"
