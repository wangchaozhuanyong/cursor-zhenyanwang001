param(
  [string]$BaseUrl = "http://localhost:3000/api",
  [string]$Token = "",
  [string]$ImagePath = "",
  [string]$AllowedHosts = "",
  [string]$LoginPhone = "",
  [string]$LoginUsername = "",
  [string]$LoginPassword = "",
  [switch]$UseAdminLogin
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-Token {
  param(
    [string]$BaseUrl,
    [string]$Token,
    [string]$Phone,
    [string]$Username,
    [string]$Password,
    [bool]$UseAdmin
  )

  if (-not [string]::IsNullOrWhiteSpace($Token)) {
    return $Token
  }

  if (-not [string]::IsNullOrWhiteSpace($env:UPLOAD_SMOKE_TOKEN)) {
    return $env:UPLOAD_SMOKE_TOKEN
  }

  if (-not [string]::IsNullOrWhiteSpace($Password) -and (
      -not [string]::IsNullOrWhiteSpace($Phone) -or
      -not [string]::IsNullOrWhiteSpace($Username)
    )) {
    $endpoint = if ($UseAdmin) { "/admin/login" } else { "/auth/login" }
    $body = @{
      password = $Password
    }
    if (-not [string]::IsNullOrWhiteSpace($Phone)) { $body.phone = $Phone }
    if (-not [string]::IsNullOrWhiteSpace($Username)) { $body.username = $Username }

    $resp = Invoke-RestMethod -Method Post -Uri "$BaseUrl$endpoint" -ContentType "application/json" -Body ($body | ConvertTo-Json)
    $accessToken = [string]$resp.data.accessToken
    if (-not [string]::IsNullOrWhiteSpace($accessToken)) {
      return $accessToken
    }
  }

  throw "Unable to resolve token. Use -Token, set UPLOAD_SMOKE_TOKEN, or provide login args."
}

if ([string]::IsNullOrWhiteSpace($ImagePath)) {
  throw "Missing required argument: -ImagePath"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$smokeScript = Join-Path $scriptDir "upload-security-smoke.ps1"
if (-not (Test-Path $smokeScript)) {
  throw "Smoke script not found: $smokeScript"
}

$resolvedToken = Resolve-Token `
  -BaseUrl $BaseUrl `
  -Token $Token `
  -Phone $LoginPhone `
  -Username $LoginUsername `
  -Password $LoginPassword `
  -UseAdmin $UseAdminLogin.IsPresent

Write-Host "Using token source: auto/manual resolved."

& powershell -ExecutionPolicy Bypass -File $smokeScript `
  -BaseUrl $BaseUrl `
  -Token $resolvedToken `
  -ImagePath $ImagePath `
  -AllowedHosts $AllowedHosts
