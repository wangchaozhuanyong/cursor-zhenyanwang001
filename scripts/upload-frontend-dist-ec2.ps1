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
$RemoteStaticRoot = "/var/www/damatong"
$RemotePublicDist = "$RemoteStaticRoot/dist"
$RemotePublicAdminDist = "$RemoteStaticRoot/admin-dist"

function Invoke-Native {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$ArgumentList
  )
  & $FilePath @ArgumentList
  $exitCode = if ($null -ne $global:LASTEXITCODE) { $global:LASTEXITCODE } elseif ($?) { 0 } else { 1 }
  if ($exitCode -ne 0) {
    throw "$FilePath failed with exit code $exitCode"
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
  Write-Host "[1/5] Local vite build (admin first, shop last; VITE_API_BASE_URL=/api) ..."
  Push-Location $FrontendDir
  try {
  $env:VITE_API_BASE_URL = "/api"
  Invoke-Native "npm.cmd" @("run", "build:admin")
  # Keep the public shop build last. Some PWA/admin build steps can refresh files under dist.
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
tmp_assets="`$(mktemp -d)"
trap 'rm -rf "`$tmp_assets"' EXIT
preserve_assets_sync() {
  local src="`$1"
  local dest="`$2"
  local backup="`$3"
  sudo mkdir -p "`$dest"
  if [ -d "`$dest/assets" ]; then
    mkdir -p "`$backup"
    sudo cp -a "`$dest/assets/." "`$backup/" 2>/dev/null || true
  fi
  sudo rsync -a --delete "`$src/" "`$dest/"
  if [ -d "`$backup" ]; then
    sudo mkdir -p "`$dest/assets"
    sudo cp -an "`$backup/." "`$dest/assets/" 2>/dev/null || true
  fi
}
preserve_assets_sync '$RemoteDist' '$RemotePublicDist' "`$tmp_assets/store"
preserve_assets_sync '$RemoteAdminDist' '$RemotePublicAdminDist' "`$tmp_assets/admin"
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
  $checks = @(
    "https://damatong.net/",
    "https://damatong.net/zh",
    "https://damatong.net/en",
    "https://console.damatong.net/admin/login"
  )
  foreach ($url in $checks) {
    $resp = Invoke-WebRequest -Uri $url -Method Head -TimeoutSec 20 -UseBasicParsing
    $cache = $resp.Headers["Cache-Control"]
    Write-Host "$url -> $($resp.StatusCode) cache-control=$cache"
  }
} catch {
  Write-Warning "Public URL check failed: $($_.Exception.Message)"
}

Write-Host "[Done] Frontend dist deployed to $RemoteDist"
