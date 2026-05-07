param(
  [string]$OutputPath = "runsee-source.zip"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Push-Location $repoRoot

try {
  $status = git status --porcelain
  if ($status) {
    throw "Refus de creer l'archive source : le depot Git n'est pas propre."
  }

  $resolvedOutput = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
    $OutputPath
  } else {
    Join-Path $repoRoot $OutputPath
  }

  if (Test-Path -LiteralPath $resolvedOutput) {
    Remove-Item -LiteralPath $resolvedOutput -Force
  }

  $outputDir = Split-Path -Parent $resolvedOutput
  if ($outputDir -and !(Test-Path -LiteralPath $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
  }

  git archive --format=zip --output $resolvedOutput HEAD
  if ($LASTEXITCODE -ne 0) {
    throw "git archive a echoue avec le code $LASTEXITCODE."
  }

  function Test-ForbiddenEntry {
    param([string]$EntryName)

    $normalized = $EntryName.Replace("\", "/")
    $leaf = Split-Path -Leaf $normalized

    if ($normalized -match "(^|/)(node_modules|dist|generated|runtime|\.tmp)/") {
      return $true
    }

    if ($leaf -match "^\.env" -and $leaf -notmatch "\.example$") {
      return $true
    }

    return $leaf -match "\.(log|pid|db|sqlite|sqlite3|zip)$"
  }

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [System.IO.Compression.ZipFile]::OpenRead($resolvedOutput)
  try {
    $forbiddenEntry = $archive.Entries | Where-Object {
      Test-ForbiddenEntry -EntryName $_.FullName
    } | Select-Object -First 1

    if ($forbiddenEntry) {
      throw "Archive invalide : entree interdite detectee ($($forbiddenEntry.FullName))."
    }
  } finally {
    $archive.Dispose()
  }

  Write-Output "RUNSEE_SOURCE_ARCHIVE_OK $resolvedOutput"
} finally {
  Pop-Location
}
