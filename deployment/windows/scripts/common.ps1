Set-StrictMode -Version Latest

$script:RunSeeWindowsScriptsDir = if ($PSScriptRoot) {
  $PSScriptRoot
}
elseif ($PSCommandPath) {
  Split-Path -Parent $PSCommandPath
}
else {
  (Get-Location).Path
}

function Resolve-RunSeeRepoRoot {
  return (Resolve-Path (Join-Path $script:RunSeeWindowsScriptsDir "..\..\..")).Path
}

function Ensure-Directory {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
  }

  return (Resolve-Path -LiteralPath $Path).Path
}

function Get-RunSeeRuntimeDir {
  param(
    [string]$RuntimeDir = ""
  )

  if ($RuntimeDir) {
    return Ensure-Directory -Path $RuntimeDir
  }

  $repoRoot = Resolve-RunSeeRepoRoot
  return Ensure-Directory -Path (Join-Path $repoRoot "deployment\windows\runtime")
}

function New-RunSeeLogPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RuntimeDir,
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  $safeRuntimeDir = Ensure-Directory -Path $RuntimeDir
  return Join-Path $safeRuntimeDir "$Name.log"
}

function Write-RunSeeLog {
  param(
    [Parameter(Mandatory = $true)]
    [string]$LogPath,
    [Parameter(Mandatory = $true)]
    [string]$Message,
    [ValidateSet("INFO", "WARN", "ERROR")]
    [string]$Level = "INFO"
  )

  $line = "[{0}] [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Level, $Message
  Write-Host $line
  Add-Content -Path $LogPath -Value $line
}

function Write-RunSeeProcessLine {
  param(
    [Parameter(Mandatory = $true)]
    [string]$LogPath,
    [Parameter(ValueFromPipeline = $true)]
    $InputObject
  )

  process {
    if ($null -eq $InputObject) {
      return
    }

    $message = if ($InputObject -is [System.Management.Automation.ErrorRecord]) {
      $InputObject.ToString()
    }
    else {
      [string]$InputObject
    }

    if (-not $message) {
      return
    }

    Write-Host $message
    Add-Content -Path $LogPath -Value $message
  }
}

function Resolve-ExecutablePath {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Candidates,
    [Parameter(Mandatory = $true)]
    [string]$FriendlyName
  )

  foreach ($candidate in $Candidates) {
    if (-not $candidate) {
      continue
    }

    if (Test-Path -LiteralPath $candidate) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }

    try {
      $command = Get-Command $candidate -ErrorAction Stop
      if ($command.Source) {
        return $command.Source
      }

      return $command.Path
    }
    catch {
      continue
    }
  }

  throw "Impossible de trouver $FriendlyName."
}

function Start-SupervisedCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [scriptblock]$Command,
    [Parameter(Mandatory = $true)]
    [string]$LogPath,
    [int]$RestartDelaySeconds = 10
  )

  while ($true) {
    Write-RunSeeLog -LogPath $LogPath -Message "${Name}: demarrage."

    $previousErrorActionPreference = $ErrorActionPreference
    $previousNativeCommandPreference = $null
    $hasNativeCommandPreference = Test-Path variable:PSNativeCommandUseErrorActionPreference

    if ($hasNativeCommandPreference) {
      $previousNativeCommandPreference = $PSNativeCommandUseErrorActionPreference
      $PSNativeCommandUseErrorActionPreference = $false
    }

    $ErrorActionPreference = "Continue"

    try {
      & $Command 2>&1 | Write-RunSeeProcessLine -LogPath $LogPath

      $exitCode = 0
      if ($null -ne $global:LASTEXITCODE) {
        $exitCode = $global:LASTEXITCODE
      }

      $exitLevel = if ($exitCode -eq 0) { "WARN" } else { "ERROR" }
      Write-RunSeeLog -LogPath $LogPath -Message "${Name}: arret detecte (code $exitCode)." -Level $exitLevel
    }
    catch {
      if ($_.Exception -is [System.Management.Automation.PipelineStoppedException]) {
        Write-RunSeeLog -LogPath $LogPath -Message "${Name}: supervision arretee." -Level "WARN"
        break
      }

      Write-RunSeeLog -LogPath $LogPath -Message "${Name}: erreur $($_.Exception.Message)" -Level "ERROR"
    }
    finally {
      $ErrorActionPreference = $previousErrorActionPreference

      if ($hasNativeCommandPreference) {
        $PSNativeCommandUseErrorActionPreference = $previousNativeCommandPreference
      }
    }

    Write-RunSeeLog -LogPath $LogPath -Message "${Name}: redemarrage dans $RestartDelaySeconds s."
    Start-Sleep -Seconds $RestartDelaySeconds
  }
}
