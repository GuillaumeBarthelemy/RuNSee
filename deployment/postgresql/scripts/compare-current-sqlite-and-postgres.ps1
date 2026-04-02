param(
  [string]$SqliteEnvPath = "..\..\..\backend\.env",
  [string]$PostgresEnvPath = "..\..\..\backend\.env.postgresql.dev.local"
)

$ErrorActionPreference = "Stop"

$backendDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\backend")).Path
$sqliteEnvPath = (Resolve-Path (Join-Path $PSScriptRoot $SqliteEnvPath)).Path
$postgresEnvPath = (Resolve-Path (Join-Path $PSScriptRoot $PostgresEnvPath)).Path

function Get-DbSnapshot {
  param(
    [string]$EnvPath
  )

  Push-Location $backendDir

  try {
    $raw = & node.exe --env-file=$EnvPath scripts/db/report-database-snapshot.js --compact

    if ($LASTEXITCODE -ne 0) {
      throw "Impossible de generer le snapshot pour $EnvPath"
    }

    return $raw | ConvertFrom-Json
  }
  finally {
    Pop-Location
  }
}

$sqlite = Get-DbSnapshot -EnvPath $sqliteEnvPath
$postgres = Get-DbSnapshot -EnvPath $postgresEnvPath

$differences = @()

foreach ($name in @("appUsers", "stravaConnections", "athletes", "activities", "syncJobs", "syncCursors")) {
  if ($sqlite.counts.$name -ne $postgres.counts.$name) {
    $differences += "Count mismatch for ${name}: sqlite=$($sqlite.counts.$name), postgres=$($postgres.counts.$name)"
  }
}

if ($sqlite.currentAthlete.stravaAthleteId -ne $postgres.currentAthlete.stravaAthleteId) {
  $differences += "Current athlete mismatch."
}

if ($sqlite.latestActivity.stravaActivityId -ne $postgres.latestActivity.stravaActivityId) {
  $differences += "Latest activity mismatch."
}

foreach ($name in @("invalidStravaActivityIds", "nullStartDates")) {
  if ($sqlite.activityIntegrity.$name -ne $postgres.activityIntegrity.$name) {
    $differences += "Activity integrity mismatch for ${name}: sqlite=$($sqlite.activityIntegrity.$name), postgres=$($postgres.activityIntegrity.$name)"
  }
}

$result = [ordered]@{
  sqlite = $sqlite
  postgres = $postgres
  differences = $differences
}

$result | ConvertTo-Json -Depth 8

if ($differences.Count -gt 0) {
  throw "SQLITE_POSTGRES_COMPARE_FAILED"
}

Write-Output "SQLITE_POSTGRES_COMPARE_OK"
