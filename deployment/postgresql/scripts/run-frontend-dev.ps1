$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "common.ps1")

$frontendDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\frontend")).Path
$envPath = (Resolve-Path (Join-Path $frontendDir ".env.postgresql.dev.local")).Path

Import-DotEnvFile -Path $envPath

Push-Location $frontendDir

try {
  & npm.cmd run dev
} finally {
  Pop-Location
}
