# Full release: verify, commit (optional), push main, remote sync, upload dist.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/release-once.ps1 -Force
#        powershell -ExecutionPolicy Bypass -File scripts/release-once.ps1 -Force -CommitMessage "fix: msg"
[CmdletBinding()]
param(
  [ValidateSet("standard", "full", "frontend")]
  [string]$Mode = "standard",
  [string]$ServerIp = "13.212.179.213",
  [string]$ServerUser = "ubuntu",
  [string]$SshKeyPath = "E:\yamaxunmishi\aws-key.pem",
  [string]$RemoteProjectDir = "/var/www/click-send-shop",
  [string]$ReleaseBranch = "main",
  [string]$CommitMessage = "",
  [switch]$Force,
  [switch]$SkipPush,
  [switch]$SkipUpload,
  [switch]$PreferNpmInstall
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$FrontendDir = Join-Path $RepoRoot "click-send-shop-main\click-send-shop-main"
$ServerDir = Join-Path $RepoRoot "server"

function Run-Step([string]$Title, [scriptblock]$Action) {
  Write-Host ""
  Write-Host "======== $Title ========" -ForegroundColor Cyan
  & $Action
}

function Test-GitHasPendingCommit([string]$Root, [string]$Branch) {
  $range = 'origin/{0}..{1}' -f $Branch, $Branch
  $lines = @(git -C $Root log --oneline $range 2>$null)
  return ($lines.Count -gt 0)
}

function Test-GitHasUncommitted([string]$Root) {
  $lines = @(git -C $Root status --porcelain | Where-Object { $_ -notmatch '^\?\?' })
  return ($lines.Count -gt 0)
}

function Get-RemoteBashCommand([string]$ModeName) {
  if ($ModeName -eq 'frontend') {
    return (
      "set -e; export PROJECT_DIR='$RemoteProjectDir'; export PM2_APP='gc-api'; " +
      "export GIT_BRANCH='$ReleaseBranch'; export AUTO_ROLLBACK='0'; export BACKUP_BEFORE_DEPLOY='0'; " +
      "export BUILD_FRONTEND_ON_SERVER='0'; cd '$RemoteProjectDir'; bash deploy/release-deploy.sh"
    )
  }
  if ($ModeName -eq 'full') {
    return (
      "set -e; export PROJECT_DIR='$RemoteProjectDir'; export PM2_APP='gc-api'; " +
      "export GIT_BRANCH='$ReleaseBranch'; export AUTO_ROLLBACK='1'; export BACKUP_BEFORE_DEPLOY='1'; " +
      "export BUILD_FRONTEND_ON_SERVER='0'; cd '$RemoteProjectDir'; bash deploy/release-deploy.sh"
    )
  }
  return (
    "set -e; export PROJECT_DIR='$RemoteProjectDir'; export PM2_APP='gc-api'; " +
    "export GIT_BRANCH='$ReleaseBranch'; export AUTO_ROLLBACK='0'; export BACKUP_BEFORE_DEPLOY='0'; " +
    "export BUILD_FRONTEND_ON_SERVER='0'; cd '$RemoteProjectDir'; bash deploy/release-deploy.sh"
  )
}

function Invoke-RemoteSsh([string]$BashOneLiner) {
  $target = '{0}@{1}' -f $ServerUser, $ServerIp
  & ssh -o StrictHostKeyChecking=accept-new -o BatchMode=yes -i $SshKeyPath $target $BashOneLiner
}

Run-Step '1/5 verify' {
  if ($Mode -eq 'full') {
    $verifyArgs = @('-ExecutionPolicy', 'Bypass', '-File', (Join-Path $RepoRoot 'scripts\verify-before-push.ps1'))
    if ($PreferNpmInstall) { $verifyArgs += '-PreferNpmInstall' }
    & powershell @verifyArgs
    if ($LASTEXITCODE -ne 0) { throw 'verify-before-push failed' }
  }
  elseif ($Mode -eq 'frontend') {
    Push-Location $FrontendDir
    try {
      npm.cmd run typecheck
      if ($LASTEXITCODE -ne 0) { throw 'frontend typecheck failed' }
    }
    finally { Pop-Location }
  }
  else {
    Push-Location $FrontendDir
    try {
      npm.cmd run typecheck
      if ($LASTEXITCODE -ne 0) { throw 'frontend typecheck failed' }
    }
    finally { Pop-Location }
    Push-Location $ServerDir
    try {
      npm.cmd run typecheck
      if ($LASTEXITCODE -ne 0) { throw 'server typecheck failed' }
    }
    finally { Pop-Location }
  }
}

Run-Step '2/5 git push' {
  git -C $RepoRoot fetch --all --prune | Out-Null
  $branch = (git -C $RepoRoot branch --show-current).Trim()
  if ($branch -ne $ReleaseBranch) {
    git -C $RepoRoot checkout $ReleaseBranch
    if ($LASTEXITCODE -ne 0) { throw ('checkout failed: ' + $ReleaseBranch) }
  }
  if (Test-GitHasUncommitted $RepoRoot) {
    if (-not $CommitMessage) { throw 'Uncommitted changes: pass -CommitMessage or commit manually.' }
    git -C $RepoRoot add -A
    git -C $RepoRoot commit -m $CommitMessage
    if ($LASTEXITCODE -ne 0) { throw 'git commit failed' }
  }
  $pending = Test-GitHasPendingCommit $RepoRoot $ReleaseBranch
  if ($pending) {
    Write-Host 'Commits to push:'
    $range = 'origin/{0}..{1}' -f $ReleaseBranch, $ReleaseBranch
    git -C $RepoRoot log --oneline $range
  }
  if (-not $SkipPush) {
    if ((-not $Force) -and $pending) {
      $confirm = Read-Host ('Push origin/' + $ReleaseBranch + ' and deploy? (y/N)')
      if (($confirm -ne 'y') -and ($confirm -ne 'Y')) { throw 'Cancelled' }
    }
    git -C $RepoRoot push origin $ReleaseBranch
    if ($LASTEXITCODE -ne 0) { throw 'git push failed' }
  }
}

Run-Step '3/5 remote sync' {
  Invoke-RemoteSsh (Get-RemoteBashCommand $Mode)
    if ($LASTEXITCODE -ne 0) {
      if ($Mode -eq 'standard') {
        throw 'remote deploy failed; fallback git+pm2 is disabled because it can bypass release guards'
      }
      else { throw 'remote deploy failed' }
    }
}

if (-not $SkipUpload) {
  Run-Step '4/5 upload dist' {
    & (Join-Path $PSScriptRoot 'upload-frontend-dist-ec2.ps1') `
      -ServerHost $ServerIp -ServerUser $ServerUser `
      -RemoteProjectRoot $RemoteProjectDir -IdentityFile $SshKeyPath
    if ($LASTEXITCODE -ne 0) { throw 'upload-frontend-dist failed' }
  }
}

Run-Step '5/5 verify' {
  $target = '{0}@{1}' -f $ServerUser, $ServerIp
  $head = ssh -o StrictHostKeyChecking=accept-new -o BatchMode=yes -i $SshKeyPath $target ('cd ' + $RemoteProjectDir + ' && git rev-parse --short HEAD')
  Write-Host ('Server HEAD: ' + $head)
  $health = ssh -o StrictHostKeyChecking=accept-new -o BatchMode=yes -i $SshKeyPath $target 'curl -sf http://127.0.0.1:3001/api/health/live || true'
  Write-Host ('API: ' + $health)
}

Write-Host ''
Write-Host ('Done. Mode=' + $Mode + ' branch=' + $ReleaseBranch + ' (all commits on main)') -ForegroundColor Green
