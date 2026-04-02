param()

function Read-EnvFile {
  param(
    [string]$Path
  )

  $values = @{}

  if (-not (Test-Path -LiteralPath $Path)) {
    return $values
  }

  Get-Content -Path $Path | ForEach-Object {
    $line = $_.Trim()

    if (-not $line) { return }
    if ($line.StartsWith("#")) { return }

    $separatorIndex = $line.IndexOf("=")
    if ($separatorIndex -lt 1) { return }

    $key = $line.Substring(0, $separatorIndex).Trim()
    $rawValue = $line.Substring($separatorIndex + 1).Trim()
    $value = $rawValue.Trim('"').Trim("'")

    if ($key) {
      $values[$key] = $value
    }
  }

  return $values
}

function Get-FirstValue {
  param(
    [hashtable[]]$Sources,
    [string]$Key,
    [string]$Fallback = ""
  )

  foreach ($source in $Sources) {
    if ($source.ContainsKey($Key) -and $source[$Key]) {
      return $source[$Key]
    }
  }

  return $Fallback
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..\..\..")

$frontendEnv = Read-EnvFile -Path (Join-Path $repoRoot "frontend\.env")
$frontendLocalEnv = Read-EnvFile -Path (Join-Path $repoRoot "frontend\.env.local")
$backendEnv = Read-EnvFile -Path (Join-Path $repoRoot "backend\.env")
$backendLocalEnv = Read-EnvFile -Path (Join-Path $repoRoot "backend\.env.local")

$frontendSources = @($frontendLocalEnv, $frontendEnv)
$backendSources = @($backendLocalEnv, $backendEnv)

$frontendPort = Get-FirstValue -Sources $frontendSources -Key "FRONTEND_PORT" -Fallback "5173"
$apiBaseUrl = Get-FirstValue -Sources $frontendSources -Key "VITE_API_BASE_URL" -Fallback "http://localhost:3000"
$appBaseUrl = Get-FirstValue -Sources $frontendSources -Key "VITE_APP_BASE_URL" -Fallback "http://localhost:$frontendPort"
$appPort = Get-FirstValue -Sources $backendSources -Key "APP_PORT" -Fallback "3000"
$publicAppUrl = Get-FirstValue -Sources $backendSources -Key "PUBLIC_APP_URL" -Fallback (Get-FirstValue -Sources $backendSources -Key "FRONTEND_URL" -Fallback "http://localhost:$frontendPort")
$publicApiUrl = Get-FirstValue -Sources $backendSources -Key "PUBLIC_API_URL" -Fallback (Get-FirstValue -Sources $backendSources -Key "APP_PUBLIC_URL" -Fallback "http://localhost:$appPort")
$allowedOrigins = Get-FirstValue -Sources $backendSources -Key "FRONTEND_ALLOWED_ORIGINS" -Fallback "http://localhost:$frontendPort"
$stravaRedirectUri = Get-FirstValue -Sources $backendSources -Key "STRAVA_REDIRECT_URI" -Fallback ""

Write-Host "RuNSee environment summary"
Write-Host "--------------------------"
Write-Host "Frontend port         : $frontendPort"
Write-Host "Frontend app base URL : $appBaseUrl"
Write-Host "Frontend API base URL : $apiBaseUrl"
Write-Host "Backend port          : $appPort"
Write-Host "Backend public app    : $publicAppUrl"
Write-Host "Backend public API    : $publicApiUrl"
Write-Host "Allowed origins       : $allowedOrigins"
Write-Host "Strava redirect URI   : $stravaRedirectUri"
Write-Host ""

if ($publicAppUrl -like "http://localhost:*" -or $publicApiUrl -like "http://localhost:*") {
  Write-Warning "Public URLs still point to localhost. This is fine for local-only usage, but not for a public Cloudflare Tunnel deployment."
}

if ($stravaRedirectUri -and $publicApiUrl -and -not $stravaRedirectUri.StartsWith($publicApiUrl)) {
  Write-Warning "STRAVA_REDIRECT_URI does not start with PUBLIC_API_URL. Verify the OAuth callback carefully before exposing the app."
}
