# SSH to server: same entry as GitHub Actions — bash deploy/ci-deploy.sh
# (production-deploy + verify-pm2, deploy state / optional rollback hooks)
# Run from repo root:
#   powershell -ExecutionPolicy Bypass -File deploy/deploy-from-windows.ps1
# Optional env: EC2_HOST, EC2_USER, REMOTE_DIR, SSH_KEY_PATH, PM2_APP

[CmdletBinding()]
param(
    [string] $Ec2Host,
    [string] $Ec2User,
    [string] $RemoteDir,
    [string] $KeyPath,
    [string] $Pm2App
)

if (-not $Ec2Host) {
    if ($env:EC2_HOST) { $Ec2Host = $env:EC2_HOST }
    else { $Ec2Host = '' }
}
if (-not $Ec2User) {
    if ($env:EC2_USER) { $Ec2User = $env:EC2_USER }
    else { $Ec2User = 'ubuntu' }
}
if (-not $RemoteDir) {
    if ($env:REMOTE_DIR) { $RemoteDir = $env:REMOTE_DIR }
    else { $RemoteDir = '/var/www/click-send-shop' }
}
if (-not $KeyPath) {
    if ($env:SSH_KEY_PATH) { $KeyPath = $env:SSH_KEY_PATH }
    else { $KeyPath = '' }
}
if (-not $Pm2App) {
    if ($env:PM2_APP) { $Pm2App = $env:PM2_APP }
    else { $Pm2App = 'gc-api' }
}

if ([string]::IsNullOrWhiteSpace($Ec2Host)) {
    Write-Error "EC2 host is required. Provide -Ec2Host or set env:EC2_HOST."
    exit 1
}

if ([string]::IsNullOrWhiteSpace($KeyPath)) {
    Write-Error "SSH key path is required. Provide -KeyPath or set env:SSH_KEY_PATH."
    exit 1
}

if (-not (Test-Path -LiteralPath $KeyPath)) {
    Write-Error "Key not found: $KeyPath"
    exit 1
}

# Server resets to origin/main inside production-deploy.sh; ensure latest is pushed to GitHub first.
$remote = "export PROJECT_DIR='{0}' PM2_APP='{1}' && cd '{0}' && bash deploy/ci-deploy.sh" -f $RemoteDir, $Pm2App
$sshTarget = $Ec2User + '@' + $Ec2Host

Write-Host ('>>> SSH ' + $sshTarget) -ForegroundColor Cyan
Write-Host ('>>> ' + $remote) -ForegroundColor DarkGray

& ssh -i $KeyPath -o StrictHostKeyChecking=accept-new $sshTarget $remote

if ($LASTEXITCODE -ne 0) {
    Write-Error "Remote deploy failed, exit code: $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host '>>> Done.' -ForegroundColor Green
