param(
  [string]$BackendBaseUrl = "http://127.0.0.1:3001",
  [string]$FrontendBaseUrl = "http://127.0.0.1:5174",
  [string]$ExpectedDatabase = "postgresql",
  [string]$SessionCookie = ""
)

$ErrorActionPreference = "Stop"

function Get-JsonResponse {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [hashtable]$Headers = @{}
  )

  $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -Headers $Headers
  return $response.Content | ConvertFrom-Json
}

$health = Get-JsonResponse -Url "$BackendBaseUrl/health"
$dbHealth = Get-JsonResponse -Url "$BackendBaseUrl/db/health"
$frontendResponse = Invoke-WebRequest -UseBasicParsing -Uri $FrontendBaseUrl
$authenticatedChecks = "SKIPPED"
$athlete = $null
$summary = $null

if ($health.status -ne "OK") {
  throw "Backend healthcheck invalide."
}

if ($dbHealth.status -ne "OK") {
  throw "DB healthcheck invalide."
}

if ($dbHealth.database -ne $ExpectedDatabase) {
  throw "Provider DB inattendu: $($dbHealth.database)"
}

if ($SessionCookie.Trim()) {
  $authHeaders = @{
    Cookie = $SessionCookie.Trim()
  }
  $athlete = Get-JsonResponse -Url "$BackendBaseUrl/athlete/me" -Headers $authHeaders
  $summary = Get-JsonResponse -Url "$BackendBaseUrl/sync/summary" -Headers $authHeaders

  if (-not $athlete.stravaAthleteId) {
    throw "Athlete courant introuvable sur la pile GREEN."
  }

  $authenticatedChecks = "OK"
}

if (-not ($frontendResponse.Content -match "<!doctype html>|<!DOCTYPE html>")) {
  throw "Le frontend GREEN ne semble pas servir du HTML valide."
}

if ($frontendResponse.Content -match "/@vite/client" -or $frontendResponse.Content -match "/src/main.jsx") {
  throw "Le frontend GREEN sert encore des modules Vite de developpement."
}

if (-not ($frontendResponse.Content -match "/assets/")) {
  throw "Le frontend GREEN ne semble pas servir le build statique attendu."
}

$result = [ordered]@{
  publicChecks = "OK"
  authenticatedChecks = $authenticatedChecks
  backendStatus = $health.status
  database = $dbHealth.database
  athleteId = if ($athlete) { $athlete.stravaAthleteId } else { $null }
  totalActivities = if ($summary) { $summary.totalActivities } else { $null }
  frontendStatusCode = $frontendResponse.StatusCode
  frontendMode = "preview"
}

$result | ConvertTo-Json -Depth 4
Write-Output "GREEN_STACK_VALIDATION_OK"
