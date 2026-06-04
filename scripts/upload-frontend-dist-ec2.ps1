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
  [int]$KeepReleases = 2,
  [int]$KeepRollbacks = 1,
  [int]$StaleAssetDays = 14,
  [switch]$SkipBuild,
  [switch]$SyncPublicFrontend,
  [switch]$AllowOutOfDateLocalBuild
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

function Assert-FileExists {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Message
  )

  for ($i = 0; $i -lt 10; $i++) {
    if (Test-Path $Path) { return }
    Start-Sleep -Milliseconds 500
  }

  throw $Message
}

function Get-GitScalar {
  param([Parameter(Mandatory = $true)][string[]]$ArgumentList)
  $output = & git @ArgumentList
  $exitCode = if ($null -ne $global:LASTEXITCODE) { $global:LASTEXITCODE } elseif ($?) { 0 } else { 1 }
  if ($exitCode -ne 0) {
    throw "git $($ArgumentList -join ' ') failed with exit code $exitCode"
  }
  return (($output | Select-Object -First 1) -as [string]).Trim()
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

if (-not $AllowOutOfDateLocalBuild) {
  Write-Host "[0/5] Guard local frontend build is current with origin/main and server HEAD ..."
  Invoke-Native "git" @("-C", $RepoRoot, "fetch", "origin", "main")
  $localHead = Get-GitScalar -ArgumentList @("-C", $RepoRoot, "rev-parse", "HEAD")
  $originHead = Get-GitScalar -ArgumentList @("-C", $RepoRoot, "rev-parse", "origin/main")
  if ($localHead -ne $originHead) {
    throw "Local HEAD is not origin/main. local=$localHead origin/main=$originHead. Push/pull first, or pass -AllowOutOfDateLocalBuild only for a documented break-glass run."
  }

  $frontendDirty = @(git -C $RepoRoot status --porcelain -- "click-send-shop-main/click-send-shop-main")
  if ($frontendDirty.Count -gt 0) {
    throw "Frontend worktree has uncommitted changes. Commit/push them before uploading dist, or pass -AllowOutOfDateLocalBuild only for a documented break-glass run."
  }

  $remoteHead = (& ssh @($sshOpts + @("${ServerUser}@${ServerHost}", "cd '$RemoteProjectRoot' && git rev-parse HEAD"))).Trim()
  if ($LASTEXITCODE -ne 0) {
    throw "failed to read server HEAD"
  }
  if ($remoteHead -ne $originHead) {
    throw "Server HEAD is not origin/main. server=$remoteHead origin/main=$originHead. Run the standard deploy first, then upload dist if still needed."
  }
} else {
  Write-Warning "AllowOutOfDateLocalBuild enabled: local dist upload may overwrite newer frontend code."
}

if (-not $SkipBuild) {
  Write-Host "[1/5] Local vite build (admin first, shop last; VITE_API_BASE_URL=/api) ..."
  Push-Location $FrontendDir
  try {
  $env:VITE_API_BASE_URL = "/api"
  # Keep the public shop build last so dist/index.html and dist/assets stay in sync.
  Invoke-Native "npm.cmd" @("run", "build:admin")
  Invoke-Native "npm.cmd" @("run", "build")
  } finally {
    Pop-Location
  }
} else {
  Write-Host "[1/5] Skip build (-SkipBuild)"
}

Assert-FileExists (Join-Path $DistDir "index.html") "dist/index.html missing. Run build first."
Assert-FileExists (Join-Path $AdminDistDir "admin-index.html") "admin-dist/admin-index.html missing. Run build:admin first."

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
preserve_assets_sync() {
  local src="`$1"
  local dest="`$2"
  sudo mkdir -p "`$dest"
  if [ -d "`$src/assets" ]; then
    sudo mkdir -p "`$dest/assets"
    sudo rsync -a "`$src/assets/" "`$dest/assets/"
  fi
  for file in "`$src"/workbox-*.js; do
    [ -f "`$file" ] && sudo cp -a "`$file" "`$dest/"
  done
  sudo rsync -a --delete --exclude='/assets/' --exclude='/workbox-*.js' "`$src/" "`$dest/"
}
preserve_assets_sync '$RemoteDist' '$RemotePublicDist'
preserve_assets_sync '$RemoteAdminDist' '$RemotePublicAdminDist'
test -f '$RemotePublicDist/index.html'
test -f '$RemotePublicAdminDist/admin-index.html'
if [ -f '$RemoteProjectRoot/deploy/cleanup-damatong-static.sh' ]; then
  DEPLOY_BASE='$RemoteStaticRoot' KEEP_RELEASES='$KeepReleases' KEEP_ROLLBACKS='$KeepRollbacks' STALE_ASSET_DAYS='$StaleAssetDays' bash '$RemoteProjectRoot/deploy/cleanup-damatong-static.sh'
fi
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
