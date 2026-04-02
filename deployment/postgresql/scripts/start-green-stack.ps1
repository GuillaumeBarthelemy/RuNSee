$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "common.ps1")

$runtimeDir = Join-Path $PSScriptRoot "..\runtime"
$runtimeDir = (Resolve-Path $runtimeDir).Path
$backendDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\backend")).Path
$frontendDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\frontend")).Path
$viteCli = (Resolve-Path (Join-Path $frontendDir "node_modules\vite\bin\vite.js")).Path
$backendEnvPath = (Resolve-Path (Join-Path $backendDir ".env.postgresql.prod.local")).Path
$frontendEnvPath = (Resolve-Path (Join-Path $frontendDir ".env.postgresql.prod.local")).Path

$backendStdout = Join-Path $runtimeDir "backend-green-stdout.log"
$backendStderr = Join-Path $runtimeDir "backend-green-stderr.log"
$frontendBuildStdout = Join-Path $runtimeDir "frontend-green-build.log"
$frontendBuildStderr = Join-Path $runtimeDir "frontend-green-build.stderr.log"
$frontendStdout = Join-Path $runtimeDir "frontend-green-stdout.log"
$frontendStderr = Join-Path $runtimeDir "frontend-green-stderr.log"

function Get-LogContent {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return ""
  }

  return (Get-Content -LiteralPath $Path -Raw).Trim()
}

function Get-BackgroundProcessFailureMessage {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ProcessLabel,
    [Parameter(Mandatory = $true)]
    [string]$StdoutPath,
    [Parameter(Mandatory = $true)]
    [string]$StderrPath,
    [System.Diagnostics.Process]$Process
  )

  if ($null -ne $Process) {
    try {
      $Process.Refresh()
    } catch {
    }
  }

  $stderrContent = Get-LogContent -Path $StderrPath
  $stdoutContent = Get-LogContent -Path $StdoutPath
  $details = if ($stderrContent) {
    $stderrContent
  } elseif ($stdoutContent) {
    $stdoutContent
  } else {
    "Aucune sortie capturee."
  }

  if ($null -ne $Process -and $Process.HasExited) {
    return "$ProcessLabel s'est arrete trop tot (exit $($Process.ExitCode)). $details"
  }

  return "$ProcessLabel n'a pas demarre correctement. $details"
}

function Stop-ManagedProcess {
  param(
    [System.Diagnostics.Process]$Process
  )

  if ($null -eq $Process) {
    return
  }

  try {
    $Process.Refresh()
  } catch {
  }

  if ($Process.HasExited) {
    return
  }

  Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
  Wait-Process -Id $Process.Id -Timeout 10 -ErrorAction SilentlyContinue
}

function Wait-ListeningPortReleased {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port,
    [int]$MaxWaitSeconds = 15
  )

  $deadline = (Get-Date).AddSeconds($MaxWaitSeconds)

  while ((Get-Date) -lt $deadline) {
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

    if (-not $listener) {
      return
    }

    Start-Sleep -Milliseconds 500
  }

  throw "Le port $Port reste occupe apres l'arret du processus."
}

function Wait-HttpEndpoint {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [string]$ProcessLabel = "",
    [System.Diagnostics.Process]$Process,
    [string]$StdoutPath = "",
    [string]$StderrPath = "",
    [int]$MaxWaitSeconds = 30
  )

  $deadline = (Get-Date).AddSeconds($MaxWaitSeconds)

  while ((Get-Date) -lt $deadline) {
    if ($null -ne $Process) {
      try {
        $Process.Refresh()
      } catch {
      }

      if ($Process.HasExited) {
        throw (Get-BackgroundProcessFailureMessage -ProcessLabel $ProcessLabel -StdoutPath $StdoutPath -StderrPath $StderrPath -Process $Process)
      }
    }

    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5

      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        return
      }
    } catch {
    }

    Start-Sleep -Seconds 1
  }

  if ($ProcessLabel -and $StdoutPath -and $StderrPath) {
    $details = Get-BackgroundProcessFailureMessage -ProcessLabel $ProcessLabel -StdoutPath $StdoutPath -StderrPath $StderrPath -Process $Process
    throw "Endpoint indisponible apres $MaxWaitSeconds secondes: $Url. $details"
  }

  throw "Endpoint indisponible apres $MaxWaitSeconds secondes: $Url"
}

function Assert-BackgroundProcessStarted {
  param(
    [Parameter(Mandatory = $true)]
    [System.Diagnostics.Process]$Process,
    [Parameter(Mandatory = $true)]
    [string]$ProcessLabel,
    [Parameter(Mandatory = $true)]
    [string]$StdoutPath,
    [Parameter(Mandatory = $true)]
    [string]$StderrPath,
    [int]$WarmupMilliseconds = 1500
  )

  Start-Sleep -Milliseconds $WarmupMilliseconds
  $Process.Refresh()

  if (-not $Process.HasExited) {
    return
  }

  throw (Get-BackgroundProcessFailureMessage -ProcessLabel $ProcessLabel -StdoutPath $StdoutPath -StderrPath $StderrPath -Process $Process)
}

function Start-ManagedBackgroundProcess {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ProcessLabel,
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(Mandatory = $true)]
    [object[]]$ArgumentList,
    [Parameter(Mandatory = $true)]
    [string]$WorkingDirectory,
    [Parameter(Mandatory = $true)]
    [string]$StdoutPath,
    [Parameter(Mandatory = $true)]
    [string]$StderrPath
  )

  $process = Start-Process -FilePath $FilePath -ArgumentList $ArgumentList -WorkingDirectory $WorkingDirectory -RedirectStandardOutput $StdoutPath -RedirectStandardError $StderrPath -PassThru
  Assert-BackgroundProcessStarted -Process $process -ProcessLabel $ProcessLabel -StdoutPath $StdoutPath -StderrPath $StderrPath
  return $process
}

function Start-FrontendPreviewWithRetry {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(Mandatory = $true)]
    [object[]]$ArgumentList,
    [Parameter(Mandatory = $true)]
    [string]$WorkingDirectory,
    [Parameter(Mandatory = $true)]
    [string]$StdoutPath,
    [Parameter(Mandatory = $true)]
    [string]$StderrPath,
    [Parameter(Mandatory = $true)]
    [string]$FrontendUrl,
    [Parameter(Mandatory = $true)]
    [int]$FrontendPort,
    [int]$MaxAttempts = 3
  )

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    $process = $null

    try {
      $process = Start-ManagedBackgroundProcess `
        -ProcessLabel "Frontend GREEN" `
        -FilePath $FilePath `
        -ArgumentList $ArgumentList `
        -WorkingDirectory $WorkingDirectory `
        -StdoutPath $StdoutPath `
        -StderrPath $StderrPath

      Wait-HttpEndpoint `
        -Url $FrontendUrl `
        -ProcessLabel "Frontend GREEN" `
        -Process $process `
        -StdoutPath $StdoutPath `
        -StderrPath $StderrPath `
        -MaxWaitSeconds 30

      return $process
    } catch {
      Stop-ManagedProcess -Process $process
      Wait-ListeningPortReleased -Port $FrontendPort -MaxWaitSeconds 10

      if ($attempt -eq $MaxAttempts) {
        throw
      }

      Start-Sleep -Seconds 2
    }
  }
}

$backend = $null
$frontend = $null

try {
  Remove-Item -LiteralPath $backendStdout,$backendStderr,$frontendBuildStdout,$frontendBuildStderr,$frontendStdout,$frontendStderr -ErrorAction SilentlyContinue

  Import-DotEnvFile -Path $frontendEnvPath
  $frontendPort = if ($env:FRONTEND_PORT) { [int]$env:FRONTEND_PORT } else { 5174 }
  $frontendHost = if ($env:FRONTEND_HOST) { $env:FRONTEND_HOST.Trim() } else { "127.0.0.1" }
  if (-not $frontendHost) {
    $frontendHost = "127.0.0.1"
  }
  $frontendUrl = "http://127.0.0.1:$frontendPort/"

  Push-Location $frontendDir

  try {
    $buildProcess = Start-Process `
      -FilePath "node.exe" `
      -ArgumentList @($viteCli, "build") `
      -WorkingDirectory $frontendDir `
      -RedirectStandardOutput $frontendBuildStdout `
      -RedirectStandardError $frontendBuildStderr `
      -Wait `
      -PassThru

    if ($buildProcess.ExitCode -ne 0) {
      $buildStdout = Get-LogContent -Path $frontendBuildStdout
      $buildStderr = Get-LogContent -Path $frontendBuildStderr
      $buildDetails = if ($buildStderr) {
        $buildStderr
      } elseif ($buildStdout) {
        $buildStdout
      } else {
        "Aucune sortie capturee."
      }
      throw "Build frontend GREEN en echec. $buildDetails"
    }
  } finally {
    Pop-Location
  }

  & (Join-Path $PSScriptRoot "stop-green-stack.ps1") | Out-Null

  Import-DotEnvFile -Path $backendEnvPath
  $env:DOTENV_CONFIG_PATH = $backendEnvPath
  $backendPort = if ($env:APP_PORT) { [int]$env:APP_PORT } else { 3001 }
  $backendHealthUrl = "http://127.0.0.1:$backendPort/health"

  $backend = Start-ManagedBackgroundProcess `
    -ProcessLabel "Backend GREEN" `
    -FilePath "node.exe" `
    -ArgumentList @("src/server.js") `
    -WorkingDirectory $backendDir `
    -StdoutPath $backendStdout `
    -StderrPath $backendStderr

  Wait-HttpEndpoint `
    -Url $backendHealthUrl `
    -ProcessLabel "Backend GREEN" `
    -Process $backend `
    -StdoutPath $backendStdout `
    -StderrPath $backendStderr `
    -MaxWaitSeconds 30

  $frontend = Start-FrontendPreviewWithRetry `
    -FilePath "node.exe" `
    -ArgumentList @($viteCli, "preview", "--host", $frontendHost, "--port", $frontendPort.ToString(), "--strictPort") `
    -WorkingDirectory $frontendDir `
    -StdoutPath $frontendStdout `
    -StderrPath $frontendStderr `
    -FrontendUrl $frontendUrl `
    -FrontendPort $frontendPort `
    -MaxAttempts 3

  Write-Output "GREEN_STACK_STARTED"
  Write-Output "BackendPid: $($backend.Id)"
  Write-Output "FrontendPid: $($frontend.Id)"
} catch {
  Stop-ManagedProcess -Process $frontend
  Stop-ManagedProcess -Process $backend
  $message = if ($_.Exception) { $_.Exception.Message } else { $_.ToString() }
  Write-Output $message
  exit 1
}
