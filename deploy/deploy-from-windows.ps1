# 从 Windows 本机 SSH 到 EC2，拉代码并执行 deploy/production-deploy.sh
#
# 默认使用本仓库约定的 EC2 公网 IP 与密钥路径；可用参数或环境变量覆盖。
#   powershell -ExecutionPolicy Bypass -File deploy/deploy-from-windows.ps1
#   powershell -ExecutionPolicy Bypass -File deploy/deploy-from-windows.ps1 -Ec2Host "其它IP"
#
# 不要把 aws-key.pem 提交到 Git。

[CmdletBinding()]
param(
    [string] $Ec2Host = $(if ($env:EC2_HOST) { $env:EC2_HOST } else { "13.212.179.213" }),
    [string] $Ec2User = $(if ($env:EC2_USER) { $env:EC2_USER } else { "ec2-user" }),
    [string] $RemoteDir = $(if ($env:REMOTE_DIR) { $env:REMOTE_DIR } else { "/var/www/click-send-shop" }),
    [string] $KeyPath = $(if ($env:SSH_KEY_PATH) { $env:SSH_KEY_PATH } else { "E:\yamaxunmishi\aws-key.pem" })
)

if ([string]::IsNullOrWhiteSpace($Ec2Host)) {
    Write-Error "缺少 EC2 地址。请传 -Ec2Host 或设置 `$env:EC2_HOST"
    exit 1
}

if (-not (Test-Path -LiteralPath $KeyPath)) {
    Write-Error "找不到密钥: $KeyPath（可用 -KeyPath 或环境变量 SSH_KEY_PATH 指定）"
    exit 1
}

# PowerShell 5.x 对含 "&&" 的双引号串解析易出错，用 -f 单引号格式串
$remote = ('cd ''{0}'' && git pull origin main && bash deploy/production-deploy.sh') -f $RemoteDir

Write-Host ">>> SSH ${Ec2User}@${Ec2Host}" -ForegroundColor Cyan
Write-Host ">>> $remote" -ForegroundColor DarkGray

& ssh -i $KeyPath -o StrictHostKeyChecking=accept-new "${Ec2User}@${Ec2Host}" $remote

if ($LASTEXITCODE -ne 0) {
    Write-Error "远程部署失败，退出码: $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host ">>> 完成。" -ForegroundColor Green
