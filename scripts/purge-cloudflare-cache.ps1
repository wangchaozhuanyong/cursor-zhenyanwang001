param(
  [string]$ServerHost = "13.212.179.213",
  [string]$ServerUser = "ubuntu",
  [string]$IdentityFile = "E:\yamaxunmishi\aws-key.pem",
  [ValidateSet("everything", "urls")]
  [string]$Mode = "urls",
  [string]$PurgeUrls = @(
    "https://damatong.net/favicon.ico",
    "https://damatong.net/favicon.webp",
    "https://damatong.net/favicon-32x32.png",
    "https://damatong.net/favicon.svg",
    "https://damatong.net/apple-touch-icon.png",
    "https://www.damatong.net/favicon.ico"
  ) -join ","
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$sshArgs = @(
  "-o", "StrictHostKeyChecking=accept-new",
  "-o", "BatchMode=yes",
  "-o", "ConnectTimeout=20"
)
if ($IdentityFile -and (Test-Path $IdentityFile)) {
  $sshArgs += @("-i", $IdentityFile, "-o", "IdentitiesOnly=yes")
}

$remote = @"
set -euo pipefail
cd /var/www/click-send-shop
export CF_PURGE_MODE='$Mode'
export CF_PURGE_URLS='$PurgeUrls'
bash deploy/purge-cloudflare-cache.sh
"@

Write-Host "[cf-purge] Running on $ServerHost (mode=$Mode) ..."
& ssh @sshArgs "${ServerUser}@${ServerHost}" $remote
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "[cf-purge] Done."
