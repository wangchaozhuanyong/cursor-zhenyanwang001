#!/usr/bin/env bash
set -euo pipefail

sudo mkdir -p /srv/projects/gift-system/{frontend,backend,logs,uploads,scripts}
sudo mkdir -p /srv/projects/renovation-site/{frontend,backend,logs,uploads,scripts}
sudo chown -R ubuntu:ubuntu /srv/projects

export DEBIAN_FRONTEND=noninteractive
echo 'debconf debconf/frontend select Noninteractive' | sudo debconf-set-selections
sudo apt-get update -qq
sudo apt-get install -y -o Dpkg::Options::='--force-confdef' -o Dpkg::Options::='--force-confold' \
  nginx git unzip curl ca-certificates

if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

sudo npm install -g pm2

BUNDLE="${1:-/tmp/ec2-isolated-bundle}"
if [[ -d "$BUNDLE" ]]; then
  sudo cp "$BUNDLE/nginx/"*.conf /etc/nginx/sites-available/
  sudo cp "$BUNDLE/DEPLOYMENT_STRUCTURE.md" /srv/projects/
  sudo cp "$BUNDLE/env/gift-system-backend.env.example" /srv/projects/gift-system/backend/.env.example
  sudo cp "$BUNDLE/env/renovation-site-backend.env.example" /srv/projects/renovation-site/backend/.env.example
  sudo cp "$BUNDLE/scripts/gift-system-ecosystem.config.cjs.example" /srv/projects/gift-system/scripts/ecosystem.config.cjs.example
  sudo cp "$BUNDLE/scripts/renovation-site-ecosystem.config.cjs.example" /srv/projects/renovation-site/scripts/ecosystem.config.cjs.example
  sudo cp "$BUNDLE/frontend-placeholder.html" /srv/projects/gift-system/frontend/index.html
  sudo cp "$BUNDLE/frontend-placeholder.html" /srv/projects/renovation-site/frontend/index.html
  sudo chown -R ubuntu:ubuntu /srv/projects
fi

# 启用站点（若已存在链接则跳过）
for c in gift-frontend gift-api renovation-frontend renovation-api; do
  if [[ ! -e "/etc/nginx/sites-enabled/${c}.conf" ]]; then
    sudo ln -sf "/etc/nginx/sites-available/${c}.conf" "/etc/nginx/sites-enabled/${c}.conf"
  fi
done

# 与模板冲突时关闭 default 站点（避免与占位 server 抢 default_server，可按需保留）
if [[ -L /etc/nginx/sites-enabled/default ]]; then
  sudo rm -f /etc/nginx/sites-enabled/default
fi

sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx

echo "=== INSTALL COMPLETE ==="
