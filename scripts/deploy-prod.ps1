param(
  [string]$ServerIp = "13.212.179.213",
  [string]$ServerUser = "ubuntu",
  [string]$SshKeyPath = "E:\yamaxunmishi\aws-key.pem",
  [string]$ReleaseBranch = "main",
  [string]$RemoteProjectDir = "/var/www/click-send-shop",
  [switch]$SkipChecks,
  [switch]$Force,
  [switch]$Quick,
  [switch]$SkipBackup
)

$ErrorActionPreference = "Stop"

function Run-Step([string]$Title, [string]$Command, [string]$WorkDir = "") {
  Write-Host "==> $Title"
  if ($WorkDir -ne "") {
    Push-Location $WorkDir
    try {
      Invoke-Expression $Command
    } finally {
      Pop-Location
    }
  } else {
    Invoke-Expression $Command
  }
  if ($LASTEXITCODE -ne 0) {
    throw "Step failed: $Title"
  }
}

$RepoRoot = (Resolve-Path "$PSScriptRoot\..").Path
$FrontendDir = Join-Path $RepoRoot "click-send-shop-main\click-send-shop-main"
$ServerDir = Join-Path $RepoRoot "server"

if (-not $SkipChecks) {
  Run-Step "Frontend typecheck" "npm.cmd run typecheck" $FrontendDir
  Run-Step "Server check:service-layer" "npm.cmd run check:service-layer" $ServerDir
  Run-Step "Server typecheck" "npm.cmd run typecheck" $ServerDir
}

Run-Step "Fetch remotes" "git fetch --all --prune" $RepoRoot

$CurrentBranch = (git -C $RepoRoot branch --show-current).Trim()
if ($CurrentBranch -ne $ReleaseBranch) {
  Run-Step "Switch to $ReleaseBranch" "git checkout $ReleaseBranch" $RepoRoot
}

Write-Host "==> Release diff preview"
$PendingLines = @()
& git -C $RepoRoot log --oneline "origin/$ReleaseBranch..$ReleaseBranch" | ForEach-Object { $PendingLines += $_ }
if ($PendingLines.Count -eq 0) {
  Write-Host "No pending commits. $ReleaseBranch is already same as origin/$ReleaseBranch"
} else {
  Write-Host "Commits to be released:"
  $PendingLines | ForEach-Object { Write-Host "  $_" }
}

if (-not $Force) {
  $confirm = Read-Host "Continue deploy with above commits? (y/N)"
  if ($confirm -ne "y" -and $confirm -ne "Y") {
    throw "Deployment cancelled by user."
  }
}

Run-Step "Push $ReleaseBranch" "git push origin $ReleaseBranch" $RepoRoot

if ($Quick) {
  $RemoteCmd = "set -e; export PROJECT_DIR='$RemoteProjectDir'; export PM2_APP='gc-api'; export GIT_BRANCH='$ReleaseBranch'; export AUTO_ROLLBACK='0'; export BACKUP_BEFORE_DEPLOY='0'; export BUILD_FRONTEND_ON_SERVER='0'; cd '$RemoteProjectDir'; bash deploy/release-deploy.sh"
} else {
  $backupFlag = if ($SkipBackup) { "0" } else { "1" }
  $RemoteCmd = "set -e; export PROJECT_DIR='$RemoteProjectDir'; export PM2_APP='gc-api'; export GIT_BRANCH='$ReleaseBranch'; export AUTO_ROLLBACK='1'; export BACKUP_BEFORE_DEPLOY='$backupFlag'; export BUILD_FRONTEND_ON_SERVER='0'; cd '$RemoteProjectDir'; bash deploy/release-deploy.sh"
}

Run-Step "Remote deploy on $ServerIp" "ssh -o StrictHostKeyChecking=accept-new -i `"$SshKeyPath`" $ServerUser@$ServerIp `"$RemoteCmd`""

Write-Host "==> Upload frontend dist (local build, avoids EC2 OOM)"
& (Join-Path $PSScriptRoot "upload-frontend-dist-ec2.ps1") `
  -ServerHost $ServerIp `
  -ServerUser $ServerUser `
  -RemoteProjectRoot $RemoteProjectDir `
  -IdentityFile $SshKeyPath `
  -SyncPublicFrontend

Write-Host ""
Write-Host "Done. Release branch deployed: $ReleaseBranch"
