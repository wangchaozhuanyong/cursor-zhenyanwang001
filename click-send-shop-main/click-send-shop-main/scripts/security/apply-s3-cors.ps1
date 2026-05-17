# Apply presigned-upload CORS rules to S3 / R2.
# Usage:
#   .\scripts\security\apply-s3-cors.ps1 -Bucket my-bucket
#   .\scripts\security\apply-s3-cors.ps1 -Bucket my-bucket -EndpointUrl https://xxx.r2.cloudflarestorage.com
param(
    [Parameter(Mandatory = $true)]
    [string] $Bucket,
    [string] $EndpointUrl = $env:AWS_ENDPOINT_URL
)

$ErrorActionPreference = "Stop"
$CorsFile = Join-Path $PSScriptRoot "..\..\docs\security\s3-cors-presigned-upload.json"
$CorsFile = (Resolve-Path $CorsFile).Path

if (-not (Test-Path $CorsFile)) {
    throw "CORS template not found: $CorsFile"
}

$raw = Get-Content $CorsFile -Raw
if ($raw -match 'YOUR_PRODUCTION_DOMAIN') {
    Write-Warning "Edit $CorsFile and replace YOUR_PRODUCTION_DOMAIN before production use."
}

$args = @(
    "s3api", "put-bucket-cors",
    "--bucket", $Bucket,
    "--cors-configuration", "file://$CorsFile"
)
if ($EndpointUrl) {
    $args += @("--endpoint-url", $EndpointUrl)
}

Write-Host "Applying CORS to bucket: $Bucket"
& aws @args
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "OK. Verify: aws s3api get-bucket-cors --bucket $Bucket"
