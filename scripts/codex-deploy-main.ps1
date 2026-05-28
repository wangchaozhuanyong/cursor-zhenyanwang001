# 兼容旧命令；推荐：scripts/release-once.ps1 -Force
param(
  [string]$ServerIp = "13.212.179.213",
  [string]$ServerUser = "ubuntu",
  [string]$SshKeyPath = "E:\yamaxunmishi\aws-key.pem",
  [string]$RemoteProjectDir = "/var/www/click-send-shop",
  [switch]$SkipChecks
)

$ErrorActionPreference = "Stop"

$args = @{
  ServerIp          = $ServerIp
  ServerUser        = $ServerUser
  SshKeyPath        = $SshKeyPath
  RemoteProjectDir  = $RemoteProjectDir
  Mode              = "standard"
  Force             = $true
}
if ($SkipChecks) {
  # release-once 默认已跳过 service-layer；保留参数仅为兼容
}

& (Join-Path $PSScriptRoot "release-once.ps1") @args
