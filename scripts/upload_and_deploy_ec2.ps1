param(
  [string]$ServerHost = "13.212.179.213",
  [string]$ServerUser = "ubuntu",
  [string]$RemoteProjectRoot = "/var/www/click-send-shop",
  [string]$IdentityFile = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$archivePath = Join-Path $env:TEMP "shopping_full_upload.tgz"
$remoteArchive = "/tmp/shopping_full_upload.tgz"

$sshOpts = @(
  "-o", "StrictHostKeyChecking=accept-new",
  "-o", "ServerAliveInterval=30"
)
if ($IdentityFile -and (Test-Path $IdentityFile)) {
  $sshOpts += @("-i", $IdentityFile, "-o", "IdentitiesOnly=yes")
} else {
  Write-Host "[WARN] IdentityFile not found, will rely on default SSH agent/config: $IdentityFile"
}

Write-Host "[1/5] Creating archive from $repoRoot ..."
if (Test-Path $archivePath) { Remove-Item $archivePath -Force }

tar -czf $archivePath `
  --exclude=".git" `
  --exclude="**/node_modules" `
  --exclude="**/dist" `
  --exclude="**/.next" `
  --exclude="**/coverage" `
  --exclude="**/*.log" `
  -C (Split-Path $repoRoot -Parent) (Split-Path $repoRoot -Leaf)

Write-Host "[2/5] Uploading archive to $ServerUser@$ServerHost ..."
scp @sshOpts $archivePath "${ServerUser}@${ServerHost}:${remoteArchive}"

Write-Host "[3/5] Extracting project on server ..."
$remoteParent = ($RemoteProjectRoot.TrimEnd('/') -replace '/[^/]+$','')
ssh @sshOpts "${ServerUser}@${ServerHost}" "set -e; sudo mkdir -p '${RemoteProjectRoot}' && sudo chown -R ${ServerUser}:${ServerUser} '${remoteParent}'; rm -rf /tmp/click-send-shop.assets.bak; if [ -f '${RemoteProjectRoot}/server/.env' ]; then cp '${RemoteProjectRoot}/server/.env' /tmp/click-send-shop.server.env.bak; fi; if [ -d '${RemoteProjectRoot}/click-send-shop-main/click-send-shop-main/dist/assets' ]; then mkdir -p /tmp/click-send-shop.assets.bak && cp -a '${RemoteProjectRoot}/click-send-shop-main/click-send-shop-main/dist/assets/.' /tmp/click-send-shop.assets.bak/; fi; rm -rf '${RemoteProjectRoot}'/* && tar -xzf '${remoteArchive}' -C '${RemoteProjectRoot}' --strip-components=1; if [ -f /tmp/click-send-shop.server.env.bak ]; then mkdir -p '${RemoteProjectRoot}/server' && cp /tmp/click-send-shop.server.env.bak '${RemoteProjectRoot}/server/.env'; fi"

Write-Host "[4/5] Running server deploy script ..."
# Run deploy as SSH user so PM2 touches the same daemon as production (avoid root vs ubuntu mismatch).
ssh @sshOpts "${ServerUser}@${ServerHost}" "chmod +x '${RemoteProjectRoot}/scripts/deploy_ec2.sh' && bash '${RemoteProjectRoot}/scripts/deploy_ec2.sh'"

Write-Host "[5/5] Done."
Write-Host "Project path on server: ${RemoteProjectRoot}"
