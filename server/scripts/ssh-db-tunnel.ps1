# 将本机 3307 转发到 EC2 上的 MySQL（127.0.0.1:3306）
# 用法：在 server 目录执行 .\scripts\ssh-db-tunnel.ps1
# 保持此窗口运行；另开终端执行 npm run dev

$key = "E:\yamaxunmishi\aws-key.pem"
$host_ = "ubuntu@13.212.179.213"

if (-not (Test-Path $key)) {
  Write-Error "找不到密钥: $key"
  exit 1
}

Write-Host "SSH 隧道: localhost:3307 -> ${host_}:3306 (Ctrl+C 结束)"
ssh -o StrictHostKeyChecking=accept-new -o BatchMode=yes -i $key -o IdentitiesOnly=yes -N -L 3307:127.0.0.1:3306 $host_
