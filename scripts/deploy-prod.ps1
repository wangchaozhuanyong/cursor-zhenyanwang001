param(
  [string]$ServerIp = "13.212.179.213",
  [string]$ServerUser = "ubuntu",
  [string]$SshKeyPath = "E:\yamaxunmishi\aws-key.pem",
  [string]$ReleaseBranch = "release/prod",
  [string]$RemoteProjectDir = "/var/www/click-send-shop",
  [switch]$SkipChecks
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

Run-Step "Sync $ReleaseBranch with origin/$ReleaseBranch" "git reset --hard origin/$ReleaseBranch" $RepoRoot
Run-Step "Push $ReleaseBranch" "git push origin $ReleaseBranch" $RepoRoot

$RemoteCmd = @"
set -e
export PROJECT_DIR='$RemoteProjectDir'
export PM2_APP='gc-api'
export GIT_BRANCH='$ReleaseBranch'
export AUTO_ROLLBACK='1'
cd '$RemoteProjectDir'
bash deploy/release-deploy.sh
"@

Run-Step "Remote deploy on $ServerIp" "ssh -o StrictHostKeyChecking=accept-new -i `"$SshKeyPath`" $ServerUser@$ServerIp `"$RemoteCmd`""

Write-Host ""
Write-Host "Done. Release branch deployed: $ReleaseBranch"
