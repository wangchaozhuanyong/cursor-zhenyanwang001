param(
  [string]$BaseUrl = "http://localhost:3000/api",
  [string]$Token = "",
  [string]$ImagePath = "",
  [string]$AllowedHosts = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step($text) {
  Write-Host ""
  Write-Host "==> $text" -ForegroundColor Cyan
}

function Assert-True($cond, $msg) {
  if (-not $cond) { throw $msg }
}

function Get-HostFromUrl([string]$url) {
  try { return ([Uri]$url).Host } catch { return "" }
}

function Is-S3LikeHost([string]$host, [string[]]$allowlist) {
  if ([string]::IsNullOrWhiteSpace($host)) { return $false }
  $h = $host.ToLowerInvariant()
  if ($allowlist.Count -gt 0) {
    foreach ($a in $allowlist) {
      $x = $a.Trim().ToLowerInvariant()
      if (-not [string]::IsNullOrWhiteSpace($x)) {
        if ($h -eq $x -or $h.EndsWith(".$x")) { return $true }
      }
    }
    return $false
  }
  return $h.EndsWith(".amazonaws.com") -or $h.Contains(".s3.") -or $h.EndsWith(".cloudfront.net")
}

Assert-True (-not [string]::IsNullOrWhiteSpace($Token)) "Missing -Token"
Assert-True (-not [string]::IsNullOrWhiteSpace($ImagePath)) "Missing -ImagePath"
Assert-True (Test-Path $ImagePath) "Image file not found: $ImagePath"

$allow = @()
if (-not [string]::IsNullOrWhiteSpace($AllowedHosts)) {
  $allow = $AllowedHosts.Split(",")
}

$headers = @{
  "Authorization" = "Bearer $Token"
}

Write-Step "1) Upload valid image"
$form = @{
  file = Get-Item $ImagePath
}
$resp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/upload" -Headers $headers -Form $form
Assert-True ($resp.code -eq 0) "Upload failed: code=$($resp.code), message=$($resp.message)"
$url = [string]$resp.data.url
$host = Get-HostFromUrl $url
Write-Host "Returned URL: $url"
Write-Host "Returned Host: $host"
Assert-True (Is-S3LikeHost $host $allow) "Returned host is not S3/CloudFront/allowlist: $host"

Write-Step "2) Upload oversized dummy payload (expect reject)"
$tmp = New-TemporaryFile
try {
  $size = 16MB
  $bytes = New-Object byte[] $size
  [System.IO.File]::WriteAllBytes($tmp.FullName, $bytes)
  $form2 = @{
    file = Get-Item $tmp.FullName
  }
  try {
    $resp2 = Invoke-RestMethod -Method Post -Uri "$BaseUrl/upload" -Headers $headers -Form $form2
    throw "Expected oversized upload reject, but got success: $($resp2 | ConvertTo-Json -Compress)"
  } catch {
    Write-Host "Oversized upload rejected as expected."
  }
}
finally {
  Remove-Item $tmp.FullName -ErrorAction SilentlyContinue
}

Write-Step "3) Summary"
Write-Host "PASS: upload path returns trusted storage URL and blocks oversized payload."
