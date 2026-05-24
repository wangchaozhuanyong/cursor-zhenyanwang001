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
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$FrontendDir = Join-Path $RepoRoot "click-send-shop-main\click-send-shop-main"
$DistDir = Join-Path $FrontendDir "dist"
$AdminDistDir = Join-Path $FrontendDir "admin-dist"
$RemoteDist = "$RemoteProjectRoot/click-send-shop-main/click-send-shop-main/dist"
$RemoteAdminDist = "$RemoteProjectRoot/click-send-shop-main/click-send-shop-main/admin-dist"
# 生产静态根（与 deploy/nginx/damatong.prod.conf 一致）
$RemoteStaticRoot = "/var/www/flashcast"
$RemotePublicDist = "$RemoteStaticRoot/dist"
$RemotePublicAdminDist = "$RemoteStaticRoot/admin-dist"

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
  Invoke-Native "npm.cmd" @("run", "build:admin")
  } finally {
    Pop-Location
  }
} else {
  Write-Host "[1/5] Skip build (-SkipBuild)"
}

if (-not (Test-Path (Join-Path $DistDir "index.html"))) {
  throw "dist/index.html missing. Run build first."
}
if (-not (Test-Path (Join-Path $AdminDistDir "admin-index.html"))) {
  throw "admin-dist/admin-index.html missing. Run build:admin first."
}

Write-Host "[2/5] Verify dist assets ..."
Invoke-Native "node" @(
  (Join-Path $RepoRoot "scripts\verify_frontend_dist_assets.js"),
  $DistDir
)
Invoke-Native "node" @(
  (Join-Path $RepoRoot "scripts\verify_frontend_dist_assets.js"),
  $AdminDistDir
)

$stamp = Get-Date -Format "yyyyMMddHHmmss"
$archivePath = Join-Path $env:TEMP "frontend_dist_$stamp.tgz"
$remoteArchive = "/tmp/frontend_dist_$stamp.tgz"

Write-Host "[3/5] Pack dist -> $archivePath ..."
if (Test-Path $archivePath) { Remove-Item $archivePath -Force }
Invoke-Native "tar" @("-czf", $archivePath, "-C", $FrontendDir, "dist", "admin-dist")

Write-Host "[4/5] Upload & extract on $ServerUser@$ServerHost ..."
Invoke-Native scp ($sshOpts + @($archivePath, "${ServerUser}@${ServerHost}:${remoteArchive}"))

$extractCmd = @"
set -euo pipefail
mkdir -p '$RemoteDist'
mkdir -p '$RemoteAdminDist'
tar -xzf '$remoteArchive' -C '$RemoteProjectRoot/click-send-shop-main/click-send-shop-main'
test -f '$RemoteDist/index.html'
test -f '$RemoteAdminDist/admin-index.html'
rm -f '$remoteArchive'
ls -la '$RemoteDist/index.html'
ls -la '$RemoteAdminDist/admin-index.html'
"@
Invoke-Native ssh ($sshOpts + @("${ServerUser}@${ServerHost}", $extractCmd))

Write-Host "[4b] Sync dist/admin-dist -> $RemoteStaticRoot ..."
$syncCmd = @"
set -euo pipefail
sudo mkdir -p '$RemotePublicDist' '$RemotePublicAdminDist'
sudo rsync -a --delete '$RemoteDist/' '$RemotePublicDist/'
sudo rsync -a --delete '$RemoteAdminDist/' '$RemotePublicAdminDist/'
test -f '$RemotePublicDist/index.html'
test -f '$RemotePublicAdminDist/admin-index.html'
"@
Invoke-Native ssh ($sshOpts + @("${ServerUser}@${ServerHost}", $syncCmd))

Remove-Item $archivePath -Force -ErrorAction SilentlyContinue

Write-Host "[5/5] Health check ..."
Invoke-Native ssh ($sshOpts + @(
  "${ServerUser}@${ServerHost}",
  "curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/ | grep -q 200 && curl -sf http://127.0.0.1:3001/api/health/ready | head -c 120"
))

try {
  $prod = Invoke-WebRequest -Uri "https://damatong.net/" -Method Head -TimeoutSec 20 -UseBasicParsing
  Write-Host "https://damatong.net/ -> $($prod.StatusCode)"
  $admin = Invoke-WebRequest -Uri "https://console.damatong.net/admin/login" -Method Head -TimeoutSec 20 -UseBasicParsing
  Write-Host "https://console.damatong.net/admin/login -> $($admin.StatusCode)"
} catch {
  Write-Warning "Public URL check failed: $($_.Exception.Message)"
}

Write-Host "[Done] Frontend dist deployed to $RemoteDist"
