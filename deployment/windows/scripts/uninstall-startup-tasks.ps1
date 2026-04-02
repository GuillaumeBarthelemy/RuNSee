param(
  [string]$TaskPrefix = "RuNSee"
)

$ErrorActionPreference = "Stop"

$taskNames = @(
  "$TaskPrefix Tunnel",
  "$TaskPrefix Backend",
  "$TaskPrefix Frontend"
)

foreach ($taskName in $taskNames) {
  $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

  if (-not $task) {
    Write-Host "Task absent: $taskName"
    continue
  }

  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  Write-Host "Task removed: $taskName"
}
