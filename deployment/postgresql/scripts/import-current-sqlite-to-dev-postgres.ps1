param(
  [string]$SqliteEnvPath = "..\..\..\backend\.env",
  [string]$PostgresEnvPath = "..\..\..\backend\.env.postgresql.dev.local",
  [string]$DumpPath = "..\..\..\backend\.tmp\dev-postgres-import.json",
  [switch]$Truncate,
  [switch]$KeepDump
)

$scriptPath = Join-Path $PSScriptRoot "import-current-sqlite-to-postgres.ps1"

& $scriptPath `
  -SqliteEnvPath $SqliteEnvPath `
  -PostgresEnvPath $PostgresEnvPath `
  -DumpPath $DumpPath `
  -Truncate:$Truncate `
  -KeepDump:$KeepDump
