param(
  [string]$ServerHost = "13.212.179.213",
  [string]$ServerUser = "ubuntu",
  [string]$KeyPath = "E:\yamaxunmishi\aws-key.pem",
  [int]$LocalPort = 3307,
  [string]$RemoteHost = "127.0.0.1",
  [int]$RemotePort = 3306,
  [int]$RetrySeconds = 5
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $KeyPath)) {
  throw "SSH key not found: $KeyPath"
}

Write-Host "Starting AWS DB tunnel keeper..."
Write-Host "Local: 127.0.0.1:${LocalPort} -> ${RemoteHost}:${RemotePort} via ${ServerUser}@${ServerHost}"

while ($true) {
  try {
    $args = @(
      "-N",
      "-L", "$LocalPort`:$RemoteHost`:$RemotePort",
      "-o", "ExitOnForwardFailure=yes",
      "-o", "ServerAliveInterval=30",
      "-o", "ServerAliveCountMax=3",
      "-o", "StrictHostKeyChecking=accept-new",
      "-i", $KeyPath,
      "$ServerUser@$ServerHost"
    )
    & ssh @args
    $code = $LASTEXITCODE
    Write-Host "Tunnel exited with code: $code"
  } catch {
    Write-Host "Tunnel error: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds $RetrySeconds
}

