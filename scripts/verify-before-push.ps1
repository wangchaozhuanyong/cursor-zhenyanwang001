# Pre-push checks on Windows (npm ci or npm install, typecheck, frontend build).
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File scripts/verify-before-push.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/verify-before-push.ps1 -WithDbTests
#   powershell -ExecutionPolicy Bypass -File scripts/verify-before-push.ps1 -PreferNpmInstall
# Requires: Node 20+, npm. WithDbTests needs server/.env with working MySQL.
# -PreferNpmInstall: use "npm install --no-audit --no-fund" instead of "npm ci" when native
#   addons under node_modules are locked (EPERM on Windows). Differs from CI (npm ci).

[CmdletBinding()]
param(
    [switch] $WithDbTests,
    [switch] $PreferNpmInstall
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $RepoRoot

function Assert-LastExitCode($step) {
    if ($LASTEXITCODE -ne 0) {
        throw "Step failed ($step), exit code $LASTEXITCODE"
    }
}

function Install-Deps($label) {
    if ($PreferNpmInstall) {
        Write-Host "  (PreferNpmInstall: npm install --no-audit --no-fund; not identical to CI npm ci)" -ForegroundColor DarkYellow
        npm install --no-audit --no-fund
    } else {
        npm ci
    }
    Assert-LastExitCode "$label deps"
}

Write-Host "== verify-before-push: repo root = $RepoRoot" -ForegroundColor Cyan

Write-Host "`n--- server: deps + typecheck ---" -ForegroundColor DarkCyan
Set-Location (Join-Path $RepoRoot "server")
Install-Deps "server"
npm run typecheck
Assert-LastExitCode "server typecheck"

if ($WithDbTests) {
    Write-Host "`n--- server: npm run test:all (needs DB in server/.env) ---" -ForegroundColor DarkCyan
    npm run test:all
    Assert-LastExitCode "server test:all"
} else {
    Write-Host "`n--- skip integration tests (pass -WithDbTests for npm run test:all) ---" -ForegroundColor DarkGray
}

Write-Host "`n--- frontend: deps + typecheck + build (VITE_API_BASE_URL=/api) ---" -ForegroundColor DarkCyan
$fe = Join-Path $RepoRoot "click-send-shop-main\click-send-shop-main"
Set-Location $fe
Install-Deps "frontend"
npm run typecheck
Assert-LastExitCode "frontend typecheck"
$env:VITE_API_BASE_URL = "/api"
npm run build
Assert-LastExitCode "frontend build"

Set-Location $RepoRoot
Write-Host "`nOK: verify-before-push finished. Safe to git commit / push." -ForegroundColor Green
