param(
  [string]$ServerIp = "13.212.179.213",
  [string]$ServerUser = "ubuntu",
  [string]$SshKeyPath = "E:\yamaxunmishi\aws-key.pem",
  [string]$RemoteProjectDir = "/var/www/click-send-shop",
  [switch]$SkipChecks
)

$ErrorActionPreference = "Stop"

& (Join-Path $PSScriptRoot "deploy-prod.ps1") `
  -ServerIp $ServerIp `
  -ServerUser $ServerUser `
  -SshKeyPath $SshKeyPath `
  -RemoteProjectDir $RemoteProjectDir `
  -ReleaseBranch "main" `
  -Force `
  -SkipChecks:$SkipChecks
