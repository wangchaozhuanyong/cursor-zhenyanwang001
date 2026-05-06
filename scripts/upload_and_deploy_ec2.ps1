param(
  [string]$ServerHost = "13.212.179.213",
  [string]$ServerUser = "ubuntu",
  [string]$RemoteProjectRoot = "/var/www/click-send-shop/full-project",
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
ssh @sshOpts "${ServerUser}@${ServerHost}" "sudo mkdir -p '${RemoteProjectRoot}' && sudo chown -R ${ServerUser}:${ServerUser} '${remoteParent}' && rm -rf '${RemoteProjectRoot}'/* && tar -xzf '${remoteArchive}' -C '${RemoteProjectRoot}' --strip-components=1"

Write-Host "[4/5] Running server deploy script ..."
ssh @sshOpts "${ServerUser}@${ServerHost}" "chmod +x '${RemoteProjectRoot}/scripts/deploy_ec2.sh' && sudo '${RemoteProjectRoot}/scripts/deploy_ec2.sh'"

Write-Host "[5/5] Done."
Write-Host "Project path on server: ${RemoteProjectRoot}"
