function Get-DefaultCloudflaredConfigPath {
  return Join-Path $env:USERPROFILE ".cloudflared\config.yml"
}

function Resolve-CloudflaredPath {
  $candidates = @(
    "cloudflared.exe",
    "C:\Program Files (x86)\cloudflared\cloudflared.exe",
    "C:\Program Files\cloudflared\cloudflared.exe"
  )

  foreach ($candidate in $candidates) {
    try {
      $command = Get-Command $candidate -ErrorAction Stop
      if ($command.Source) {
        return $command.Source
      }
    } catch {
    }
  }

  throw "cloudflared.exe introuvable."
}

function Get-CloudflaredConfigSummary {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Fichier cloudflared introuvable: $Path"
  }

  $summary = [ordered]@{
    path = (Resolve-Path $Path).Path
    tunnel = ""
    credentialsFile = ""
    logfile = ""
    loglevel = ""
    ingress = @()
    frontendHostname = ""
    backendHostname = ""
  }

  $currentRule = $null

  Get-Content -Path $summary.path | ForEach-Object {
    $line = $_

    if ($line -match '^\s*tunnel:\s*(.+?)\s*$') {
      $summary.tunnel = $Matches[1].Trim()
      return
    }

    if ($line -match '^\s*credentials-file:\s*(.+?)\s*$') {
      $summary.credentialsFile = $Matches[1].Trim()
      return
    }

    if ($line -match '^\s*logfile:\s*(.+?)\s*$') {
      $summary.logfile = $Matches[1].Trim()
      return
    }

    if ($line -match '^\s*loglevel:\s*(.+?)\s*$') {
      $summary.loglevel = $Matches[1].Trim()
      return
    }

    if ($line -match '^\s*-\s+hostname:\s*(.+?)\s*$') {
      $currentRule = [ordered]@{
        hostname = $Matches[1].Trim()
        service = ""
      }

      $summary.ingress += [pscustomobject]$currentRule
      return
    }

    if ($currentRule -and $line -match '^\s*service:\s*(.+?)\s*$') {
      $summary.ingress[-1].service = $Matches[1].Trim()
      $currentRule = $null
      return
    }

    if ($line -match '^\s*-\s+service:\s*(.+?)\s*$') {
      $summary.ingress += [pscustomobject]@{
        hostname = ""
        service = $Matches[1].Trim()
      }
      $currentRule = $null
    }
  }

  foreach ($rule in $summary.ingress) {
    if (-not $summary.frontendHostname -and $rule.hostname -match '^runsee\.') {
      $summary.frontendHostname = $rule.hostname
      continue
    }

    if (-not $summary.backendHostname -and $rule.hostname -match '^api\.') {
      $summary.backendHostname = $rule.hostname
    }
  }

  $hostRules = @($summary.ingress | Where-Object { $_.hostname })

  if (-not $summary.frontendHostname -and $hostRules.Count -ge 1) {
    $summary.frontendHostname = $hostRules[0].hostname
  }

  if (-not $summary.backendHostname -and $hostRules.Count -ge 2) {
    $summary.backendHostname = $hostRules[1].hostname
  }

  return [pscustomobject]$summary
}

function Get-CutoverPorts {
  param(
    [ValidateSet("Blue", "Green")]
    [string]$Mode
  )

  if ($Mode -eq "Green") {
    return [pscustomobject]@{
      FrontendPort = 5174
      BackendPort = 3001
    }
  }

  return [pscustomobject]@{
    FrontendPort = 5173
    BackendPort = 3000
  }
}

function New-CloudflaredCutoverConfig {
  param(
    [Parameter(Mandatory = $true)]
    [string]$SourceConfigPath,
    [ValidateSet("Blue", "Green")]
    [string]$Mode = "Green",
    [string]$OutputPath = "",
    [string]$FrontendHostname = "",
    [string]$BackendHostname = "",
    [int]$FrontendPort = 0,
    [int]$BackendPort = 0
  )

  $summary = Get-CloudflaredConfigSummary -Path $SourceConfigPath
  $ports = Get-CutoverPorts -Mode $Mode

  if (-not $OutputPath) {
    $OutputPath = Join-Path $env:TEMP "runsee-cloudflared-$($Mode.ToLowerInvariant()).yml"
  }

  if (-not $FrontendHostname) {
    $FrontendHostname = $summary.frontendHostname
  }

  if (-not $BackendHostname) {
    $BackendHostname = $summary.backendHostname
  }

  if (-not $FrontendHostname -or -not $BackendHostname) {
    throw "Impossible de detecter les hostnames frontend/backend dans $SourceConfigPath"
  }

  if ($FrontendPort -le 0) {
    $FrontendPort = $ports.FrontendPort
  }

  if ($BackendPort -le 0) {
    $BackendPort = $ports.BackendPort
  }

  $targetFrontendService = "http://127.0.0.1:$FrontendPort"
  $targetBackendService = "http://127.0.0.1:$BackendPort"
  $lines = Get-Content -Path $summary.path
  $currentHostname = ""
  $frontendReplaced = $false
  $backendReplaced = $false

  $updatedLines = foreach ($line in $lines) {
    if ($line -match '^\s*-\s+hostname:\s*(.+?)\s*$') {
      $currentHostname = $Matches[1].Trim()
      $line
      continue
    }

    if ($currentHostname -and $line -match '^\s*service:\s*(.+?)\s*$') {
      $indent = ($line -replace 'service:.*$', '')

      if ($currentHostname -eq $FrontendHostname) {
        $frontendReplaced = $true
        "$indent" + "service: $targetFrontendService"
        $currentHostname = ""
        continue
      }

      if ($currentHostname -eq $BackendHostname) {
        $backendReplaced = $true
        "$indent" + "service: $targetBackendService"
        $currentHostname = ""
        continue
      }

      $currentHostname = ""
      $line
      continue
    }

    if ($line -match '^\s*-\s+service:\s*(.+?)\s*$') {
      $currentHostname = ""
    }

    $line
  }

  if (-not $frontendReplaced -or -not $backendReplaced) {
    throw "Impossible de remplacer les services frontend/backend dans la configuration Cloudflare."
  }

  $outputDir = Split-Path -Parent $OutputPath
  if ($outputDir -and -not (Test-Path -LiteralPath $outputDir)) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
  }

  Set-Content -Path $OutputPath -Value $updatedLines -Encoding ascii

  return [pscustomobject]@{
    mode = $Mode
    sourceConfigPath = $summary.path
    outputPath = [System.IO.Path]::GetFullPath($OutputPath)
    tunnel = $summary.tunnel
    frontendHostname = $FrontendHostname
    backendHostname = $BackendHostname
    frontendService = $targetFrontendService
    backendService = $targetBackendService
  }
}

function Test-CloudflaredConfig {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ConfigPath
  )

  $cloudflaredPath = Resolve-CloudflaredPath
  & $cloudflaredPath tunnel --config $ConfigPath ingress validate

  if ($LASTEXITCODE -ne 0) {
    throw "Validation cloudflared invalide pour $ConfigPath"
  }
}

function Get-CloudflaredIngressRule {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ConfigPath,
    [Parameter(Mandatory = $true)]
    [string]$Url
  )

  $cloudflaredPath = Resolve-CloudflaredPath
  $output = & $cloudflaredPath tunnel --config $ConfigPath ingress rule $Url

  if ($LASTEXITCODE -ne 0) {
    throw "Impossible de verifier la regle cloudflared pour $Url"
  }

  return $output
}

function Get-CloudflaredRunningProcesses {
  return @(
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
      Where-Object {
        $_.Name -eq "cloudflared.exe" -and $_.CommandLine
      } |
      Select-Object ProcessId, CommandLine
  )
}

function Get-CloudflaredTunnelRunArgumentFromCommandLine {
  param(
    [string]$CommandLine
  )

  if (-not $CommandLine) {
    return ""
  }

  if ($CommandLine -match 'tunnel\s+run\s+"?([^"\s]+)"?') {
    return $Matches[1]
  }

  return ""
}

function Restart-CloudflaredTunnelProcess {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ConfigPath,
    [Parameter(Mandatory = $true)]
    [string]$TunnelName
  )

  $resolvedConfigPath = [System.IO.Path]::GetFullPath($ConfigPath)
  $escapedConfigPath = [regex]::Escape($resolvedConfigPath)
  $matchingProcesses = @(
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
      Where-Object {
        $_.Name -eq "cloudflared.exe" -and
        $_.CommandLine -match $escapedConfigPath
      }
  )

  $runArgument = $TunnelName

  foreach ($process in $matchingProcesses) {
    $detectedRunArgument = Get-CloudflaredTunnelRunArgumentFromCommandLine -CommandLine $process.CommandLine

    if ($detectedRunArgument) {
      $runArgument = $detectedRunArgument
      break
    }
  }

  $stoppedProcessIds = @()

  foreach ($process in $matchingProcesses) {
    $stoppedProcessIds += $process.ProcessId
    Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
  }

  $cloudflaredPath = Resolve-CloudflaredPath
  $newProcess = Start-Process -FilePath $cloudflaredPath -ArgumentList "--config", $resolvedConfigPath, "tunnel", "run", $runArgument -PassThru

  Start-Sleep -Seconds 5

  return [pscustomobject]@{
    tunnel = $TunnelName
    runArgument = $runArgument
    stoppedProcessIds = $stoppedProcessIds
    newProcessId = $newProcess.Id
  }
}
