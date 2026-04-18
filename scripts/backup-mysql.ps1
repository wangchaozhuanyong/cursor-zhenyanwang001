# MySQL 逻辑备份（需本机 PATH 中有 mysqldump，或改 $MysqldumpExe）
param(
  [string]$EnvFile = (Join-Path $PSScriptRoot "..\server\.env"),
  [string]$OutDir = (Join-Path $PSScriptRoot "..\backups")
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path $EnvFile)) { throw "未找到环境文件: $EnvFile" }

$cfg = @{}
Get-Content $EnvFile -Encoding UTF8 | ForEach-Object {
  if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
    $cfg[$matches[1]] = $matches[2].Trim()
  }
}

$h = if ($cfg.DB_HOST) { $cfg.DB_HOST } else { "localhost" }
$p = if ($cfg.DB_PORT) { $cfg.DB_PORT } else { "3306" }
$u = if ($cfg.DB_USER) { $cfg.DB_USER } else { "root" }
$pw = if ($null -ne $cfg.DB_PASSWORD) { $cfg.DB_PASSWORD } else { "" }
$db = if ($cfg.DB_NAME) { $cfg.DB_NAME } else { "click_send_shop" }

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$fn = Join-Path $OutDir ("click_send_shop_" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".sql")

$exe = "mysqldump"
$custom = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
if (Test-Path $custom) { $exe = $custom }

if ($pw) {
  & $exe "-h$h" "-P$p" "-u$u" "-p$pw" "--single-transaction" "--routines" "--triggers" $db |
    Set-Content -Encoding utf8 $fn
} else {
  & $exe "-h$h" "-P$p" "-u$u" "--single-transaction" "--routines" "--triggers" $db |
    Set-Content -Encoding utf8 $fn
}

Write-Host "备份完成: $fn"
