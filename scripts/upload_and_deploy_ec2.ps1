param(
  [string]$ServerHost = "13.212.179.213",
  [string]$ServerUser = "ubuntu",
  [string]$RemoteProjectRoot = "/var/www/click-send-shop",
  [string]$IdentityFile = "",
  [switch]$UploadArchive
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Invoke-Native {
  param(
    [Parameter(Mandatory = $true, Position = 0)][string]$FilePath,
    [Parameter(Mandatory = $true, Position = 1)][string[]]$ArgumentList
  )
  # 必须整组传入 ArgumentList；若用 ValueFromRemainingArguments + 外层 @() 展开，
  # PowerShell 会把 -o 等误绑到其它形参，导致 ssh 报 “stricthostkeychecking extra arguments”。
  & $FilePath @ArgumentList
  if ($LASTEXITCODE -ne 0) {
    throw "$FilePath failed with exit code $LASTEXITCODE"
  }
}

$sshOpts = @(
  "-o", "StrictHostKeyChecking=accept-new",
  "-o", "BatchMode=yes",
  "-o", "ConnectTimeout=20",
  "-o", "ServerAliveInterval=15",
  "-o", "ServerAliveCountMax=4"
)
if ($IdentityFile -and (Test-Path $IdentityFile)) {
  $sshOpts += @("-i", $IdentityFile, "-o", "IdentitiesOnly=yes")
} else {
  Write-Host "[WARN] IdentityFile not found, will rely on default SSH agent/config: $IdentityFile"
}

Write-Host "[1/3] Preflight SSH and project checks ..."
Invoke-Native ssh ($sshOpts + @(
  "${ServerUser}@${ServerHost}",
  "set -euo pipefail; echo ssh_ok; test -d '${RemoteProjectRoot}'; test -d '${RemoteProjectRoot}/.git'; test -f '${RemoteProjectRoot}/deploy/ci-deploy.sh'"
))

if (-not $UploadArchive) {
  Write-Host "[2/3] Running safe server-side deploy (git + ci-deploy.sh) ..."
  Invoke-Native ssh ($sshOpts + @(
    "${ServerUser}@${ServerHost}",
    "set -euo pipefail; cd '${RemoteProjectRoot}'; export PROJECT_DIR='${RemoteProjectRoot}'; export PM2_APP='gc-api'; export AUTO_ROLLBACK='1'; git fetch origin main; bash deploy/ci-deploy.sh"
  ))

  Write-Host "[3/3] Done."
  Write-Host "Project path on server: ${RemoteProjectRoot}"
  exit 0
}

Write-Host "[WARN] -UploadArchive is a break-glass path. Prefer the default git + ci-deploy flow."

$stamp = Get-Date -Format "yyyyMMddHHmmss"
$archivePath = Join-Path $env:TEMP "shopping_full_upload_$stamp.tgz"
$remoteArchive = "/tmp/shopping_full_upload_$stamp.tgz"
$remoteStaging = "/tmp/click-send-shop-upload-$stamp"

Write-Host "[2/5] Creating archive from $repoRoot ..."
if (Test-Path $archivePath) { Remove-Item $archivePath -Force }

$tarArgs = @(
  "-czf", $archivePath,
  "--exclude=.git",
  "--exclude=**/node_modules",
  "--exclude=**/dist",
  "--exclude=**/.next",
  "--exclude=**/coverage",
  "--exclude=**/*.log",
  "-C", (Split-Path $repoRoot -Parent),
  (Split-Path $repoRoot -Leaf)
)
Invoke-Native tar $tarArgs

Write-Host "[3/5] Uploading archive to $ServerUser@$ServerHost ..."
Invoke-Native scp ($sshOpts + @($archivePath, "${ServerUser}@${ServerHost}:${remoteArchive}"))

Write-Host "[4/5] Extracting archive to staging directory on server ..."
Invoke-Native ssh ($sshOpts + @(
  "${ServerUser}@${ServerHost}",
  "set -euo pipefail; rm -rf '${remoteStaging}'; mkdir -p '${remoteStaging}'; tar -xzf '${remoteArchive}' -C '${remoteStaging}' --strip-components=1; test -f '${remoteStaging}/scripts/deploy_ec2.sh'; if [ -f '${RemoteProjectRoot}/server/.env' ]; then mkdir -p '${remoteStaging}/server' && cp '${RemoteProjectRoot}/server/.env' '${remoteStaging}/server/.env'; fi; rsync -a --delete --exclude='.git/' --exclude='server/.env' '${remoteStaging}/' '${RemoteProjectRoot}/'; rm -rf '${remoteStaging}' '${remoteArchive}'"
))

Write-Host "[5/5] Running safe CI deploy script ..."
# Run deploy as SSH user so PM2 touches the same daemon as production (avoid root vs ubuntu mismatch).
Invoke-Native ssh ($sshOpts + @(
  "${ServerUser}@${ServerHost}",
  "set -euo pipefail; cd '${RemoteProjectRoot}'; chmod +x deploy/ci-deploy.sh; PROJECT_DIR='${RemoteProjectRoot}' PM2_APP='gc-api' AUTO_ROLLBACK='1' bash deploy/ci-deploy.sh"
))

Write-Host "[Done] Deployment completed."
Write-Host "Project path on server: ${RemoteProjectRoot}"
