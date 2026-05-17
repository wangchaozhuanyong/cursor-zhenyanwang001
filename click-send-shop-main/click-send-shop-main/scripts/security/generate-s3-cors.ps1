# Generate S3 CORS from server/.env CORS_ORIGINS (+ optional apply to bucket).
# Usage:
#   powershell -File scripts/security/generate-s3-cors.ps1
#   powershell -File scripts/security/generate-s3-cors.ps1 -Apply -Bucket my-bucket
param(
    [string] $EnvFile = "",
    [string] $Bucket = "",
    [switch] $Apply,
    [string] $EndpointUrl = $env:AWS_ENDPOINT_URL,
    [string] $OutFile = ""
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
if (-not $EnvFile) {
    $EnvFile = Join-Path $RepoRoot "server\.env"
}
if (-not $OutFile) {
    $OutFile = Join-Path $PSScriptRoot "..\..\docs\security\s3-cors-presigned-upload.generated.json"
}
$resolvedOut = Resolve-Path $OutFile -ErrorAction SilentlyContinue
if ($resolvedOut) {
    $OutFile = $resolvedOut.Path
} else {
    $outDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..\docs\security")).Path
    $OutFile = Join-Path $outDir "s3-cors-presigned-upload.generated.json"
}

function Read-DotEnvValue([string]$path, [string]$key) {
    if (-not (Test-Path $path)) { return "" }
    foreach ($line in Get-Content $path) {
        if ($line -match "^\s*$key\s*=\s*(.*)$") {
            return $matches[1].Trim()
        }
    }
    return ""
}

$corsRaw = Read-DotEnvValue $EnvFile "CORS_ORIGINS"
if (-not $Bucket) {
    $Bucket = Read-DotEnvValue $EnvFile "STORAGE_S3_BUCKET"
}

$origins = @()
foreach ($part in ($corsRaw -split ",")) {
    $o = $part.Trim()
    if (-not $o) { continue }
    if ($o -match '__SET_|CHANGE_ME|REPLACE_ME|YOUR_') { continue }
    if ($o -notmatch '^https?://') { continue }
    $origins += $o
}

if ($origins.Count -eq 0) {
    Write-Host "[WARN] No valid origins in CORS_ORIGINS. Add https://your-domain in server/.env" -ForegroundColor Yellow
    $origins = @("http://localhost:5173", "http://localhost:8080")
    Write-Host "       Using localhost defaults for generated file only." -ForegroundColor Yellow
}

$corsDoc = @{
    CORSRules = @(
        @{
            ID = "AllowBrowserPresignedUpload"
            AllowedHeaders = @(
                "Content-Type", "Content-Length",
                "x-amz-content-sha256", "x-amz-date", "x-amz-security-token",
                "x-amz-acl", "x-amz-server-side-encryption"
            )
            AllowedMethods = @("PUT", "GET", "HEAD")
            AllowedOrigins = $origins
            ExposeHeaders = @("ETag")
            MaxAgeSeconds = 3600
        }
    )
}

$json = $corsDoc | ConvertTo-Json -Depth 6
$outDir = Split-Path $OutFile -Parent
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
Set-Content -Path $OutFile -Value $json -Encoding UTF8

Write-Host "Generated: $OutFile" -ForegroundColor Green
Write-Host "AllowedOrigins:"
$origins | ForEach-Object { Write-Host "  - $_" }

if (-not $Apply) {
    Write-Host ""
    Write-Host "Next: configure AWS credentials, set STORAGE_S3_BUCKET in server/.env, then:" -ForegroundColor Cyan
    Write-Host "  powershell -File scripts/security/generate-s3-cors.ps1 -Apply" -ForegroundColor Cyan
    exit 0
}

if (-not $Bucket) {
    throw "Missing bucket: set STORAGE_S3_BUCKET in server/.env or pass -Bucket"
}

$applyArgs = @(
    "s3api", "put-bucket-cors",
    "--bucket", $Bucket,
    "--cors-configuration", "file://$OutFile"
)
if ($EndpointUrl) { $applyArgs += @("--endpoint-url", $EndpointUrl) }

Write-Host ""
Write-Host "Applying CORS to bucket: $Bucket" -ForegroundColor Cyan
& aws @applyArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "OK. Verify: aws s3api get-bucket-cors --bucket $Bucket" -ForegroundColor Green
