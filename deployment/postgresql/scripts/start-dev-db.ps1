param(
  [int]$MaxWaitSeconds = 60
)

$ErrorActionPreference = "Stop"

$composePath = Join-Path $PSScriptRoot "..\docker-compose.dev.yml"
$composePath = (Resolve-Path $composePath).Path

function Invoke-DockerCompose {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
  )

  & docker-compose.exe -f $composePath @Args
  if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose command failed: docker-compose -f `"$composePath`" $($Args -join ' ')"
  }
}

try {
  & docker.exe version | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Docker daemon unavailable."
  }
} catch {
  throw "Docker Desktop ne semble pas demarre. Lance Docker Desktop puis relance ce script."
}

Invoke-DockerCompose up -d

$deadline = (Get-Date).AddSeconds($MaxWaitSeconds)
$isReady = $false

while ((Get-Date) -lt $deadline) {
  try {
    & docker-compose.exe -f $composePath exec -T postgres pg_isready -U runsee_app -d runsee_dev | Out-Null
    if ($LASTEXITCODE -eq 0) {
      $isReady = $true
      break
    }
  } catch {
  }

  Start-Sleep -Seconds 2
}

if (-not $isReady) {
  throw "PostgreSQL dev n'est pas pret apres $MaxWaitSeconds secondes."
}

Write-Output "POSTGRES_DEV_DB_READY"
Write-Output "Host: 127.0.0.1"
Write-Output "Port: 55432"
Write-Output "Database: runsee_dev"
Write-Output "User: runsee_app"
Write-Output "ConnectionString: postgresql://runsee_app:runsee_dev_password@127.0.0.1:55432/runsee_dev?schema=public"
