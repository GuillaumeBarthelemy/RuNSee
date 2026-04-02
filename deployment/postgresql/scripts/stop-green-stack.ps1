$ErrorActionPreference = "Stop"

$ports = 3001, 5174

function Get-ListeningConnectionsForPorts {
  param(
    [int[]]$TargetPorts
  )

  $listeners = @()

  foreach ($targetPort in $TargetPorts) {
    $listeners += @(
      Get-NetTCPConnection -LocalPort $targetPort -State Listen -ErrorAction SilentlyContinue
    )
  }

  return @($listeners | Where-Object { $_.OwningProcess -gt 0 })
}

function Wait-PortsReleased {
  param(
    [int[]]$TargetPorts,
    [int]$MaxWaitSeconds = 15
  )

  $deadline = (Get-Date).AddSeconds($MaxWaitSeconds)

  while ((Get-Date) -lt $deadline) {
    $remainingListeners = Get-ListeningConnectionsForPorts -TargetPorts $TargetPorts

    if (-not $remainingListeners -or $remainingListeners.Count -eq 0) {
      return
    }

    Start-Sleep -Milliseconds 500
  }

  $remainingPorts = @(
    Get-ListeningConnectionsForPorts -TargetPorts $TargetPorts |
      Select-Object -ExpandProperty LocalPort -Unique
  ) -join ", "

  throw "Les ports GREEN restent occupes apres arret: $remainingPorts"
}

$processIds = @(
  Get-ListeningConnectionsForPorts -TargetPorts $ports |
    Select-Object -ExpandProperty OwningProcess -Unique
)

foreach ($processId in $processIds) {
  try {
    Stop-Process -Id $processId -Force -ErrorAction Stop
  } catch {
  }
}

Wait-PortsReleased -TargetPorts $ports

Write-Output "GREEN_STACK_STOPPED"
