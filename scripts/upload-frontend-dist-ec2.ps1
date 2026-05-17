<#
.SYNOPSIS
  本地构建前端并上传到 EC2（避免小内存机 vite build OOM、缺 index.html）。

.EXAMPLE
  powershell -File scripts/upload-frontend-dist-ec2.ps1 -IdentityFile "E:\yamaxunmishi\aws-key.pem"
#>
param(
  [string]$ServerHost = "13.212.179.213",
  [string]$ServerUser = "ubuntu",
  [string]$RemoteProjectRoot = "/var/www/click-send-shop",
  [string]$IdentityFile = "E:\yamaxunmishi\aws-key.pem",
  [switch]$SkipBuild,
  [switch]$SyncPublicFrontend
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$FrontendDir = Join-Path $RepoRoot "click-send-shop-main\click-send-shop-main"
$DistDir = Join-Path $FrontendDir "dist"
$RemoteDist = "$RemoteProjectRoot/click-send-shop-main/click-send-shop-main/dist"
$RemotePublic = "$RemoteProjectRoot/public-frontend"

function Invoke-Native {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$ArgumentList
  )
  & $FilePath @ArgumentList
  if ($LASTEXITCODE -ne 0) {
    throw "$FilePath failed with exit code $LASTEXITCODE"
  }
}

$sshOpts = @(
  "-o", "StrictHostKeyChecking=accept-new",
  "-o", "BatchMode=yes",
  "-o", "ConnectTimeout=25",
  "-o", "ServerAliveInterval=15",
  "-o", "ServerAliveCountMax=4"
)
if ($IdentityFile -and (Test-Path $IdentityFile)) {
  $sshOpts += @("-i", $IdentityFile, "-o", "IdentitiesOnly=yes")
} else {
  Write-Warning "IdentityFile not found: $IdentityFile"
}

if (-not $SkipBuild) {
  Write-Host "[1/5] Local vite build (VITE_API_BASE_URL=/api) ..."
  Push-Location $FrontendDir
  try {
  $env:VITE_API_BASE_URL = "/api"
  Invoke-Native "npm.cmd" @("run", "build")
  } finally {
    Pop-Location
  }
} else {
  Write-Host "[1/5] Skip build (-SkipBuild)"
}

if (-not (Test-Path (Join-Path $DistDir "index.html"))) {
  throw "dist/index.html missing. Run build first."
}

Write-Host "[2/5] Verify dist assets ..."
Invoke-Native "node" @(
  (Join-Path $RepoRoot "scripts\verify_frontend_dist_assets.js"),
  $DistDir
)

$stamp = Get-Date -Format "yyyyMMddHHmmss"
$archivePath = Join-Path $env:TEMP "frontend_dist_$stamp.tgz"
$remoteArchive = "/tmp/frontend_dist_$stamp.tgz"

Write-Host "[3/5] Pack dist -> $archivePath ..."
if (Test-Path $archivePath) { Remove-Item $archivePath -Force }
Invoke-Native "tar" @("-czf", $archivePath, "-C", $FrontendDir, "dist")

Write-Host "[4/5] Upload & extract on $ServerUser@$ServerHost ..."
Invoke-Native scp ($sshOpts + @($archivePath, "${ServerUser}@${ServerHost}:${remoteArchive}"))

$extractCmd = @"
set -euo pipefail
mkdir -p '$RemoteDist'
tar -xzf '$remoteArchive' -C '$RemoteProjectRoot/click-send-shop-main/click-send-shop-main'
test -f '$RemoteDist/index.html'
rm -f '$remoteArchive'
ls -la '$RemoteDist/index.html'
"@
Invoke-Native ssh ($sshOpts + @("${ServerUser}@${ServerHost}", $extractCmd))

if ($SyncPublicFrontend) {
  Write-Host "[4b] Sync dist -> public-frontend ..."
  $syncCmd = "set -euo pipefail; mkdir -p '$RemotePublic'; rsync -a --delete '$RemoteDist/' '$RemotePublic/'; test -f '$RemotePublic/index.html'"
  Invoke-Native ssh ($sshOpts + @("${ServerUser}@${ServerHost}", $syncCmd))
}

Remove-Item $archivePath -Force -ErrorAction SilentlyContinue

Write-Host "[5/5] Health check ..."
Invoke-Native ssh ($sshOpts + @(
  "${ServerUser}@${ServerHost}",
  "curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/ | grep -q 200 && curl -sf http://127.0.0.1:3001/api/health/ready | head -c 120"
))

try {
  $prod = Invoke-WebRequest -Uri "https://flashcast.com.my/" -Method Head -TimeoutSec 20 -UseBasicParsing
  Write-Host "https://flashcast.com.my/ -> $($prod.StatusCode)"
} catch {
  Write-Warning "Public URL check failed: $($_.Exception.Message)"
}

Write-Host "[Done] Frontend dist deployed to $RemoteDist"
