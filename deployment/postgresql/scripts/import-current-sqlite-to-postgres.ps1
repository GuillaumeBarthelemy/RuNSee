param(
  [string]$SqliteEnvPath,
  [string]$PostgresEnvPath,
  [string]$DumpPath = "..\..\..\backend\.tmp\postgres-import.json",
  [switch]$Truncate,
  [switch]$KeepDump
)

$ErrorActionPreference = "Stop"

$backendDir = Join-Path $PSScriptRoot "..\..\..\backend"
$backendDir = (Resolve-Path $backendDir).Path
$sqliteEnvPath = (Resolve-Path (Join-Path $PSScriptRoot $SqliteEnvPath)).Path
$postgresEnvCandidate = Join-Path $PSScriptRoot $PostgresEnvPath

if (-not (Test-Path $postgresEnvCandidate)) {
  throw "Fichier d'environnement PostgreSQL introuvable: $postgresEnvCandidate"
}

$postgresEnvPath = (Resolve-Path $postgresEnvCandidate).Path
$dumpPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot $DumpPath))
$dumpDir = Split-Path -Parent $dumpPath

if (-not (Test-Path $dumpDir)) {
  New-Item -ItemType Directory -Force -Path $dumpDir | Out-Null
}

$previousDotenvPath = $env:DOTENV_CONFIG_PATH

function Invoke-NpmScript {
  param(
    [string]$DotenvPath,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
  )

  $env:DOTENV_CONFIG_PATH = $DotenvPath
  & npm.cmd @Args

  if ($LASTEXITCODE -ne 0) {
    throw "npm command failed: npm.cmd $($Args -join ' ')"
  }
}

Push-Location $backendDir

try {
  Invoke-NpmScript $sqliteEnvPath run db:export:sqlite -- $dumpPath
  Invoke-NpmScript $postgresEnvPath run db:ensure:postgres
  Invoke-NpmScript $postgresEnvPath run prisma:pg:migrate:deploy

  $importArgs = @("run", "db:import:postgres", "--", $dumpPath)

  if ($Truncate) {
    $importArgs += "--truncate"
  }

  Invoke-NpmScript $postgresEnvPath @importArgs
} finally {
  Pop-Location
  $env:DOTENV_CONFIG_PATH = $previousDotenvPath
}

if ((-not $KeepDump) -and (Test-Path $dumpPath)) {
  Remove-Item -LiteralPath $dumpPath -Force
}

Write-Output "SQLITE_TO_POSTGRES_IMPORT_OK"
Write-Output "SQLiteEnv: $sqliteEnvPath"
Write-Output "PostgresEnv: $postgresEnvPath"
