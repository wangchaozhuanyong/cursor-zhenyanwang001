# 从 Windows 本机 SSH 到 EC2，拉代码并执行 deploy/production-deploy.sh
#
# 用法（二选一）：
#   powershell -ExecutionPolicy Bypass -File deploy/deploy-from-windows.ps1 -Ec2Host "ec2-xxx.compute.amazonaws.com"
#   $env:EC2_HOST="1.2.3.4"; powershell -ExecutionPolicy Bypass -File deploy/deploy-from-windows.ps1
#
# 不要把 aws-key.pem 提交到 Git。

[CmdletBinding()]
param(
    [string] $Ec2Host = $env:EC2_HOST,
    [string] $Ec2User = $(if ($env:EC2_USER) { $env:EC2_USER } else { "ec2-user" }),
    [string] $RemoteDir = $(if ($env:REMOTE_DIR) { $env:REMOTE_DIR } else { "/var/www/click-send-shop" }),
    [string] $KeyPath = $(if ($env:SSH_KEY_PATH) { $env:SSH_KEY_PATH } else { "E:\yamaxunmishi\aws-key.pem" })
)

if ([string]::IsNullOrWhiteSpace($Ec2Host)) {
    Write-Error "缺少 EC2 地址。示例: -Ec2Host `"你的公网 DNS 或 IP`" 或先设置 `$env:EC2_HOST"
    exit 1
}

if (-not (Test-Path -LiteralPath $KeyPath)) {
    Write-Error "找不到密钥: $KeyPath（可用 -KeyPath 或环境变量 SSH_KEY_PATH 指定）"
    exit 1
}

$remote = "cd '$RemoteDir' && git pull origin main && bash deploy/production-deploy.sh"

Write-Host ">>> SSH ${Ec2User}@${Ec2Host}" -ForegroundColor Cyan
Write-Host ">>> $remote" -ForegroundColor DarkGray

& ssh -i $KeyPath -o StrictHostKeyChecking=accept-new "${Ec2User}@${Ec2Host}" $remote

if ($LASTEXITCODE -ne 0) {
    Write-Error "远程部署失败，退出码: $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host ">>> 完成。" -ForegroundColor Green
