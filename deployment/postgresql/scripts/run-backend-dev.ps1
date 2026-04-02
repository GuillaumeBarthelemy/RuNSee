$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "common.ps1")

$backendDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\backend")).Path
$envPath = (Resolve-Path (Join-Path $backendDir ".env.postgresql.dev.local")).Path

Import-DotEnvFile -Path $envPath
$env:DOTENV_CONFIG_PATH = $envPath

Push-Location $backendDir

try {
  & node.exe src/server.js
} finally {
  Pop-Location
}
