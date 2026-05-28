#!/usr/bin/env bash
set -euo pipefail

# 在 Ubuntu 服务器上部署（适配“无法 git clone 私仓”的场景）：
# - 期望代码已解压到 /var/www/damatong/app（不要求 .git）
# - 生成 shared/server.env，启动 MySQL/Redis（容器），构建前后端，启动 PM2
#
# 用法（在服务器执行）：
#   bash /var/www/damatong/app/deploy/release/deploy-ip.sh
#
# 可覆盖的环境变量：
#   DEPLOY_BASE=/var/www/damatong
#   APP_DIR=/var/www/damatong/app
#   KEEP_RELEASES=5
#   PUBLIC_HOST=13.212.179.213

DEPLOY_BASE="${DEPLOY_BASE:-/var/www/damatong}"
APP_DIR="${APP_DIR:-${DEPLOY_BASE}/app}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
PUBLIC_HOST="${PUBLIC_HOST:-13.212.179.213}"

releases_dir="${DEPLOY_BASE}/releases"
shared_dir="${DEPLOY_BASE}/shared"
current_link="${DEPLOY_BASE}/current"
dist_link="${DEPLOY_BASE}/dist"
admin_dist_link="${DEPLOY_BASE}/admin-dist"

timestamp="$(date +%Y%m%d-%H%M%S)"
release_id="${timestamp}"
release_dir="${releases_dir}/${release_id}"

preserve_previous_build_artifacts() {
  local target_build_dir="$1"
  shift

  mkdir -p "${target_build_dir}/assets"
  for source_build_dir in "$@"; do
    if [[ -d "${source_build_dir}/assets" ]]; then
      rsync -a --ignore-existing "${source_build_dir}/assets/" "${target_build_dir}/assets/"
    fi

    local file
    for file in "${source_build_dir}"/workbox-*.js; do
      if [[ -f "${file}" ]]; then
        cp -n "${file}" "${target_build_dir}/"
      fi
    done
  done
}

collect_previous_build_dirs() {
  local build_dir="$1"
  local -n output_ref="$2"
  local relative_build_dir="${build_dir#${release_dir}/}"

  output_ref=()
  local release
  for release in "${releases_dir}"/*; do
    if [[ "${release}" == "${release_dir}" ]]; then
      continue
    fi
    if [[ -d "${release}/${relative_build_dir}" ]]; then
      output_ref+=("${release}/${relative_build_dir}")
    fi
  done
}

mkdir -p "${releases_dir}" "${shared_dir}"

if [[ ! -d "${APP_DIR}/server" || ! -d "${APP_DIR}/click-send-shop-main" ]]; then
  echo "[FATAL] APP_DIR 目录结构不符合预期：${APP_DIR}"
  exit 1
fi

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[FATAL] 缺少命令：$1"
    exit 1
  fi
}

need_cmd python3
need_cmd docker
need_cmd npm
need_cmd pm2
need_cmd nginx

DOCKER="sudo docker"
COMPOSE="sudo docker compose"

echo "[deploy] 确保 Docker 服务已启动"
sudo systemctl enable --now docker >/dev/null 2>&1 || true

echo "[deploy] DEPLOY_BASE=${DEPLOY_BASE}"
echo "[deploy] APP_DIR=${APP_DIR}"
echo "[deploy] release=${release_id}"

if [[ ! -f "${shared_dir}/server.env" ]]; then
  echo "[deploy] 生成 shared/server.env（首次部署）"

  JWT_SECRET="$(python3 - <<'PY'
import secrets
print(secrets.token_hex(48))
PY
)"
  DB_PASSWORD="$(python3 - <<'PY'
import secrets, string
alphabet = string.ascii_letters + string.digits
print(''.join(secrets.choice(alphabet) for _ in range(32)))
PY
)"

  cat > "${shared_dir}/server.env" <<EOF
PORT=3001
SITE_CODE=ipshop
SITE_NAME=IP部署示例
INSTANCE_ENV=production
PM2_APP=gc-api
NODE_ENV=production
TRUST_PROXY=1

PUBLIC_APP_URL=https://${PUBLIC_HOST}
ADMIN_PUBLIC_URL=https://${PUBLIC_HOST}
ADMIN_ALLOWED_ORIGINS=https://${PUBLIC_HOST}
CORS_ORIGINS=https://${PUBLIC_HOST}

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=gc_app
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=click_send_shop

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_KEY_PREFIX=ipshop
BULLMQ_PREFIX=ipshop:bull

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

AUTO_PROMOTE_FIRST_USER_TO_ADMIN=0
EXPOSE_OTP_CODE=0
EOF
fi

echo "[deploy] 确保 MySQL 可用（优先使用系统 mysql.service）"
DB_PASSWORD="$(grep '^DB_PASSWORD=' "${shared_dir}/server.env" | head -n 1 | cut -d= -f2-)"

if systemctl is-active --quiet mysql; then
  echo "[deploy] 使用系统 MySQL（mysql.service）"
  sudo mysql <<SQL
CREATE DATABASE IF NOT EXISTS click_send_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS "gc_app"@"%" IDENTIFIED BY "${DB_PASSWORD}";
GRANT ALL PRIVILEGES ON click_send_shop.* TO "gc_app"@"%";
FLUSH PRIVILEGES;
SQL
else
  echo "[deploy] 系统 MySQL 未运行，回退到 Docker MySQL（绑定 127.0.0.1:3307）"
  mysql_env_needs_init="0"
  if [[ ! -f "${APP_DIR}/.env" ]]; then
    mysql_env_needs_init="1"
  else
    existing_root_pwd="$(grep '^MYSQL_ROOT_PASSWORD=' "${APP_DIR}/.env" | head -n 1 | cut -d= -f2- || true)"
    if [[ -z "${existing_root_pwd}" ]]; then
      mysql_env_needs_init="1"
    fi
  fi

  if [[ "${mysql_env_needs_init}" == "1" ]]; then
    MYSQL_ROOT_PASSWORD="$(python3 - <<'PY'
import secrets, string
alphabet = string.ascii_letters + string.digits
print(''.join(secrets.choice(alphabet) for _ in range(32)))
PY
)"
    cat > "${APP_DIR}/.env" <<EOF
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
MYSQL_DATABASE=click_send_shop
MYSQL_BIND_HOST=127.0.0.1
MYSQL_PORT=3307
EOF
  fi

  pushd "${APP_DIR}" >/dev/null
  ${COMPOSE} up -d mysql
  popd >/dev/null

  MYSQL_ROOT_PASSWORD="$(grep '^MYSQL_ROOT_PASSWORD=' "${APP_DIR}/.env" | head -n 1 | cut -d= -f2-)"

  echo "[deploy] 等待 Docker MySQL 就绪并创建应用账号"
  for i in $(seq 1 30); do
    if ${DOCKER} exec click-send-mysql mysqladmin ping -p"${MYSQL_ROOT_PASSWORD}" --silent; then
      break
    fi
    sleep 2
    if [[ "${i}" == "30" ]]; then
      echo "[FATAL] MySQL 未就绪"
      exit 1
    fi
  done

  ${DOCKER} exec -i click-send-mysql mysql -p"${MYSQL_ROOT_PASSWORD}" <<SQL
CREATE USER IF NOT EXISTS "gc_app"@"%" IDENTIFIED BY "${DB_PASSWORD}";
GRANT ALL PRIVILEGES ON click_send_shop.* TO "gc_app"@"%";
FLUSH PRIVILEGES;
SQL
fi

echo "[deploy] Redis：优先使用本机 127.0.0.1:6379"
if redis-cli ping >/dev/null 2>&1; then
  echo "[deploy] Redis 已可用（跳过容器）"
else
  echo "[deploy] 本机 Redis 不可用，尝试使用容器（127.0.0.1:6379）"
  sudo systemctl disable --now redis-server >/dev/null 2>&1 || true
  ${DOCKER} rm -f click-send-redis >/dev/null 2>&1 || true
  ${DOCKER} run -d --name click-send-redis --restart unless-stopped -p 127.0.0.1:6379:6379 redis:7-alpine
fi

echo "[deploy] 创建 release 目录并复制代码"
mkdir -p "${release_dir}"
rsync -a --delete \
  --exclude node_modules \
  --exclude .git \
  "${APP_DIR}/" "${release_dir}/"

if [[ -f "${shared_dir}/server.env" && ! -f "${release_dir}/server/.env" ]]; then
  ln -sfn "${shared_dir}/server.env" "${release_dir}/server/.env"
fi

echo "[deploy] 构建前端（storefront + admin）"
pushd "${release_dir}/click-send-shop-main/click-send-shop-main" >/dev/null
npm ci
npm run build
npm run build:admin
popd >/dev/null

echo "[deploy] 安装后端依赖"
pushd "${release_dir}/server" >/dev/null
npm ci
popd >/dev/null

echo "[deploy] 保留旧版前端静态分包（避免发布中在线用户旧 JS 分包 404）"
storefront_build_dirs=()
admin_build_dirs=()
storefront_build_dir="${release_dir}/click-send-shop-main/click-send-shop-main/dist"
admin_build_dir="${release_dir}/click-send-shop-main/click-send-shop-main/admin-dist"
collect_previous_build_dirs "${storefront_build_dir}" storefront_build_dirs
collect_previous_build_dirs "${admin_build_dir}" admin_build_dirs
preserve_previous_build_artifacts "${storefront_build_dir}" "${storefront_build_dirs[@]}"
preserve_previous_build_artifacts "${admin_build_dir}" "${admin_build_dirs[@]}"

echo "[deploy] 校验前端入口 HTML 引用的 assets 是否存在（防止 index 引用旧 hash 导致 404 白屏）"
node "${release_dir}/deploy/release/verify-frontend-assets.mjs" "${storefront_build_dir}" "index.html"
node "${release_dir}/deploy/release/verify-frontend-assets.mjs" "${admin_build_dir}" "admin-index.html"

echo "[deploy] 软链切换（原子）"
ln -sfnT "${release_dir}" "${current_link}"
ln -sfnT "${release_dir}/click-send-shop-main/click-send-shop-main/dist" "${dist_link}"
ln -sfnT "${release_dir}/click-send-shop-main/click-send-shop-main/admin-dist" "${admin_dist_link}"

echo "[deploy] 启动/重启后端（PM2 gc-api）"
pushd "${release_dir}/server" >/dev/null
set -a
source "${release_dir}/server/.env"
set +a
pm2 delete "${PM2_APP}" >/dev/null 2>&1 || true
pm2 start ecosystem.config.cjs --only "${PM2_APP}" --env production
pm2 save
popd >/dev/null

echo "[deploy] Nginx：安装 IP 版站点配置（自签证书）"
sudo mkdir -p /etc/nginx/ssl
if [[ ! -f /etc/nginx/ssl/ipshop.crt ]]; then
  sudo openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
    -subj "/CN=${PUBLIC_HOST}" \
    -keyout /etc/nginx/ssl/ipshop.key \
    -out /etc/nginx/ssl/ipshop.crt
fi

sudo tee /etc/nginx/sites-available/ipshop.conf >/dev/null <<EOF
upstream shop_api {
    server 127.0.0.1:3001;
    keepalive 32;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${PUBLIC_HOST} _;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name ${PUBLIC_HOST} _;

    ssl_certificate     /etc/nginx/ssl/ipshop.crt;
    ssl_certificate_key /etc/nginx/ssl/ipshop.key;

    client_max_body_size 60m;

    # storefront 静态
    root ${dist_link};
    index index.html;

    location = /sw.js {
        add_header Cache-Control \"no-cache, no-store, must-revalidate\" always;
        add_header Service-Worker-Allowed \"/\" always;
        try_files \$uri =404;
    }

    location ~* ^/workbox-[a-z0-9]+\\.js$ {
        add_header Cache-Control \"no-cache, no-store, must-revalidate\" always;
        try_files \$uri =404;
    }

    location = /index.html {
        add_header Cache-Control \"no-cache, no-store, must-revalidate\" always;
        try_files \$uri =404;
    }

    location /api/ {
        proxy_pass http://shop_api;
        proxy_http_version 1.1;
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
        proxy_buffering off;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /uploads/ {
        proxy_pass http://shop_api;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location = /admin {
        return 302 /admin/login;
    }

    location = /admin/admin-index.html {
        alias ${admin_dist_link}/admin-index.html;
        add_header Cache-Control \"no-cache, no-store, must-revalidate\" always;
    }

    # admin：用独立构建产物覆盖 /admin 前缀
    location ^~ /admin/ {
        alias ${admin_dist_link}/;
        try_files \$uri \$uri/ /admin/admin-index.html;
    }

    location ~* ^/assets/.*\\.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?)$ {
        add_header Cache-Control \"public, max-age=31536000, immutable\" always;
        try_files \$uri @admin_assets;
    }

    location @admin_assets {
        root ${admin_dist_link};
        add_header Cache-Control \"public, max-age=31536000, immutable\" always;
        try_files \$uri =404;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

sudo ln -sfn /etc/nginx/sites-available/ipshop.conf /etc/nginx/sites-enabled/ipshop.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "[deploy] 健康检查"
bash "${release_dir}/deploy/release/healthcheck.sh" || true

echo "[deploy] 清理旧 release（保留 ${KEEP_RELEASES} 个）"
if [[ "${KEEP_RELEASES}" =~ ^[0-9]+$ ]] && (( KEEP_RELEASES > 0 )); then
  mapfile -t all_releases < <(ls -1dt "${releases_dir}"/* 2>/dev/null || true)
  if (( ${#all_releases[@]} > KEEP_RELEASES )); then
    to_delete=("${all_releases[@]:KEEP_RELEASES}")
    for d in "${to_delete[@]}"; do
      if [[ -L "${current_link}" ]] && [[ "$(readlink -f "${current_link}")" == "$(readlink -f "${d}")" ]]; then
        continue
      fi
      rm -rf "${d}"
    done
  fi
fi

echo "[deploy] 完成：${release_id}"

