# Export local MySQL + zip source tree for copying to another PC.
# Run from repo root: .\scripts\打包迁移到另一台电脑.ps1
# See repo root: 迁移到另一台电脑.md

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

$envFile = Join-Path $Root "server\.env"
if (-not (Test-Path $envFile)) {
  Write-Host "Missing server\.env. Copy server\.env.example to server\.env and set DB_* for local MySQL." -ForegroundColor Yellow
  exit 1
}

Write-Host "Dumping MySQL using server\.env ..." -ForegroundColor Cyan
& (Join-Path $PSScriptRoot "backup-mysql.ps1") -EnvFile $envFile -OutDir (Join-Path $Root "backups")

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Work = Join-Path $env:TEMP "shop-migrate-$Stamp"
if (Test-Path $Work) { Remove-Item -Recurse -Force $Work }
New-Item -ItemType Directory -Force -Path $Work | Out-Null

Write-Host "Copying project (excluding node_modules, dist, ...) ..." -ForegroundColor Cyan
$excludeDirs = @(
  "node_modules", "dist", ".next", ".turbo", "coverage", ".cache"
)
$xd = @()
foreach ($d in $excludeDirs) { $xd += "/XD"; $xd += $d }

$robolog = Join-Path $env:TEMP "robocopy-migrate-$Stamp.log"
$robocopyArgs = @($Root, $Work, "/E", "/NFL", "/NDL", "/NJH", "/NJS") + $xd + @("/LOG:$robolog")
$rc = Start-Process -FilePath "robocopy.exe" -ArgumentList $robocopyArgs -Wait -PassThru -NoNewWindow
if ($rc.ExitCode -gt 7) {
  throw "Robocopy failed exit $($rc.ExitCode). See $robolog"
}

$zipName = "shop-migrate-$Stamp.zip"
$zipPath = Join-Path ([Environment]::GetFolderPath("Desktop")) $zipName

if (Test-Path $zipPath) { Remove-Item -Force $zipPath }

Write-Host "Zipping to Desktop: $zipName ..." -ForegroundColor Cyan
Compress-Archive -Path $Work -DestinationPath $zipPath -CompressionLevel Optimal

Remove-Item -Recurse -Force $Work

Write-Host ""
Write-Host "Done. Copy this file to the other computer:" -ForegroundColor Green
Write-Host $zipPath
Write-Host ""
Write-Host "After unzip, read MIGRATE-TO-ANOTHER-PC.md in repo root (Chinese instructions)." -ForegroundColor Green
