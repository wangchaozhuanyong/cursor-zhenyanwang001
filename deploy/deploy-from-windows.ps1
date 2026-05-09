# SSH to EC2: git pull + production-deploy.sh
# Run from repo root:
#   powershell -ExecutionPolicy Bypass -File deploy/deploy-from-windows.ps1

[CmdletBinding()]
param(
    [string] $Ec2Host,
    [string] $Ec2User,
    [string] $RemoteDir,
    [string] $KeyPath
)

if (-not $Ec2Host) {
    if ($env:EC2_HOST) { $Ec2Host = $env:EC2_HOST }
    else { $Ec2Host = '13.212.179.213' }
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
    else { $KeyPath = 'E:\yamaxunmishi\aws-key.pem' }
}

if ([string]::IsNullOrWhiteSpace($Ec2Host)) {
    Write-Error 'Ec2Host is required.'
    exit 1
}

if (-not (Test-Path -LiteralPath $KeyPath)) {
    Write-Error "Key not found: $KeyPath"
    exit 1
}

$remote = ('cd ''{0}'' && git pull origin main && bash deploy/production-deploy.sh') -f $RemoteDir
$sshTarget = $Ec2User + '@' + $Ec2Host

Write-Host ('>>> SSH ' + $sshTarget) -ForegroundColor Cyan
Write-Host ('>>> ' + $remote) -ForegroundColor DarkGray

& ssh -i $KeyPath -o StrictHostKeyChecking=accept-new $sshTarget $remote

if ($LASTEXITCODE -ne 0) {
    Write-Error "Remote deploy failed, exit code: $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host '>>> Done.' -ForegroundColor Green
