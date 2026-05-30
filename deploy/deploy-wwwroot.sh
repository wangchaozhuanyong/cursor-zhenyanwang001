#!/usr/bin/env bash
#
# 在 EC2 上于项目目录执行，例如：
#   bash deploy/deploy-wwwroot.sh
#
# 可选环境变量：
#   PROJECT_DIR        默认 /var/www/click-send-shop
#   FRONTEND_DIR       显式指定前端目录（相对 PROJECT_DIR），否则自动探测
#   PUBLIC_FRONTEND    商城静态目录，默认 /var/www/damatong/dist（damatong.net）
#   ADMIN_PUBLIC_FRONTEND  管理端静态，默认 /var/www/damatong/admin-dist（console.damatong.net）
#   INSTALL_NGINX      设为 1 时安装 deploy/nginx/damatong.prod.conf（默认 0，避免覆盖生产）
#   PM2_APP            pm2 进程名，默认 gc-api
#   NPM_CI=1           若存在 package-lock.json 则用 npm ci 替代 npm install（根/前端/后端）
#
set -euo pipefail

npm_install_here() {
  if [[ "${NPM_CI:-}" == "1" ]] && [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
}

echo "🚀 开始部署..."

PROJECT_DIR="${PROJECT_DIR:-/var/www/click-send-shop}"
PM2_APP="${PM2_APP:-gc-api}"
LOG_FILE="$PROJECT_DIR/deploy.log"
INSTALL_NGINX="${INSTALL_NGINX:-0}"
PUBLIC_FRONTEND="${PUBLIC_FRONTEND:-/var/www/damatong/dist}"
ADMIN_PUBLIC_FRONTEND="${ADMIN_PUBLIC_FRONTEND:-/var/www/damatong/admin-dist}"

sync_public_static() {
  local src_dir="$1"
  local dest_dir="$2"
  [[ -d "$src_dir" ]] || return 0
  local src="${src_dir%/}/"
  local dest="${dest_dir%/}"
  local rsync_flags=(-r --delete)
  local asset_backup=""
  if [[ -d "$dest/assets" ]]; then
    asset_backup="$(mktemp -d)"
    cp -a "$dest/assets/." "$asset_backup/" 2>/dev/null || true
  fi

  local needs_sudo=0
  if [[ "$dest" == /var/www/* ]] && { [[ ! -e "$dest" ]] || [[ ! -w "$dest" ]]; }; then
    needs_sudo=1
  fi

  if [[ "$needs_sudo" == "1" ]]; then
    sudo mkdir -p "$dest"
    sudo rsync "${rsync_flags[@]}" "$src" "$dest/"
    if id www-data &>/dev/null; then
      sudo chown -R www-data:www-data "$dest"
    fi
  else
    mkdir -p "$dest"
    if command -v rsync >/dev/null 2>&1; then
      rsync "${rsync_flags[@]}" "$src" "$dest/"
    else
      rm -rf "${dest:?}/"*
      cp -a "$src." "$dest/"
    fi
  fi

  if [[ -n "$asset_backup" && -d "$asset_backup" ]]; then
    if [[ "$needs_sudo" == "1" ]]; then
      sudo mkdir -p "$dest/assets"
      sudo cp -an "$asset_backup/." "$dest/assets/" 2>/dev/null || true
      if id www-data &>/dev/null; then
        sudo chown -R www-data:www-data "$dest/assets"
      fi
    else
      mkdir -p "$dest/assets"
      cp -an "$asset_backup/." "$dest/assets/" 2>/dev/null || true
    fi
    rm -rf "$asset_backup"
  fi
}

cd "$PROJECT_DIR" || exit 1

echo "📅 部署时间: $(date)" | tee -a "$LOG_FILE"

echo "📥 拉取最新代码" | tee -a "$LOG_FILE"
git fetch origin main
git reset --hard origin/main

LOCAL_COMMIT=$(git rev-parse --short HEAD)
REMOTE_COMMIT=$(git rev-parse --short origin/main)

echo "🔖 本地版本: $LOCAL_COMMIT" | tee -a "$LOG_FILE"
echo "🌐 远程版本: $REMOTE_COMMIT" | tee -a "$LOG_FILE"

if [[ -f "$PROJECT_DIR/package.json" ]]; then
  echo "📦 安装仓库根目录依赖..." | tee -a "$LOG_FILE"
  npm_install_here
else
  echo "⏭ 跳过根目录 npm（无 package.json）" | tee -a "$LOG_FILE"
fi

# 解析前端目录：环境变量 > click-send-shop > 仓库默认嵌套路径
resolve_frontend_dir() {
  if [[ -n "${FRONTEND_DIR:-}" ]]; then
    if [[ -d "$PROJECT_DIR/$FRONTEND_DIR" ]]; then
      echo "$FRONTEND_DIR"
      return 0
    fi
    echo "❌ FRONTEND_DIR 已设置但目录不存在: $PROJECT_DIR/$FRONTEND_DIR" | tee -a "$LOG_FILE" >&2
    return 1
  fi
  if [[ -d "$PROJECT_DIR/click-send-shop" ]]; then
    echo "click-send-shop"
    return 0
  fi
  if [[ -d "$PROJECT_DIR/click-send-shop-main/click-send-shop-main" ]]; then
    echo "click-send-shop-main/click-send-shop-main"
    return 0
  fi
  echo ""
}

if ! FRONTEND_SUB=$(resolve_frontend_dir); then
  exit 1
fi

if [[ -n "$FRONTEND_SUB" ]]; then
  echo "🎨 构建前端 ($FRONTEND_SUB)..." | tee -a "$LOG_FILE"
  ASSET_BACKUP=""
  if [[ -d "$PUBLIC_FRONTEND/assets" ]]; then
    ASSET_BACKUP="$(mktemp -d)"
    cp -a "$PUBLIC_FRONTEND/assets/." "$ASSET_BACKUP/" 2>/dev/null || true
  fi
  cd "$PROJECT_DIR/$FRONTEND_SUB" || exit 1
  npm_install_here
  export VITE_API_BASE_URL="${VITE_API_BASE_URL:-/api}"
  npm run build
  npm run build:admin
  if [[ -n "$ASSET_BACKUP" && -d "$ASSET_BACKUP" ]]; then
    echo "🧩 保留上一版 hashed assets，避免已打开页面懒加载旧 chunk 404" | tee -a "$LOG_FILE"
    mkdir -p "$PROJECT_DIR/$FRONTEND_SUB/dist/assets"
    cp -an "$ASSET_BACKUP/." "$PROJECT_DIR/$FRONTEND_SUB/dist/assets/" 2>/dev/null || true
    rm -rf "$ASSET_BACKUP"
  fi
  echo "🔎 校验前端 dist 资源引用一致性..." | tee -a "$LOG_FILE"
  node "$PROJECT_DIR/scripts/verify_frontend_dist_assets.js" "$PROJECT_DIR/$FRONTEND_SUB/dist" | tee -a "$LOG_FILE"
  cd "$PROJECT_DIR" || exit 1

  echo "📤 同步构建产物 → $PUBLIC_FRONTEND" | tee -a "$LOG_FILE"
  sync_public_static "$PROJECT_DIR/$FRONTEND_SUB/dist" "$PUBLIC_FRONTEND"
  node "$PROJECT_DIR/scripts/verify_frontend_dist_assets.js" "$PUBLIC_FRONTEND" | tee -a "$LOG_FILE"
  if [[ -d "$PROJECT_DIR/$FRONTEND_SUB/admin-dist" ]]; then
    echo "📤 同步 admin-dist → $ADMIN_PUBLIC_FRONTEND" | tee -a "$LOG_FILE"
    sync_public_static "$PROJECT_DIR/$FRONTEND_SUB/admin-dist" "$ADMIN_PUBLIC_FRONTEND"
    node "$PROJECT_DIR/scripts/verify_frontend_dist_assets.js" "$ADMIN_PUBLIC_FRONTEND" | tee -a "$LOG_FILE"
  fi
else
  echo "⏭ 跳过前端构建（未找到 click-send-shop 或 click-send-shop-main/click-send-shop-main）" | tee -a "$LOG_FILE"
fi

echo "📦 安装后端依赖..." | tee -a "$LOG_FILE"
cd "$PROJECT_DIR/server" || exit 1
npm_install_here

echo "🗄 执行数据库迁移..." | tee -a "$LOG_FILE"
npm run migrate

if [[ "$INSTALL_NGINX" == "1" ]]; then
  echo "🌐 安装 damatong Nginx..." | tee -a "$LOG_FILE"
  bash "$PROJECT_DIR/deploy/nginx/install-damatong-nginx.sh" | tee -a "$LOG_FILE"
else
  echo "⏭ 跳过 Nginx（INSTALL_NGINX=0；生产请单独执行 deploy/nginx/install-damatong-nginx.sh）" | tee -a "$LOG_FILE"
fi

echo "🔁 (Re)启动后端（统一通过 ecosystem.config.cjs / $PM2_APP）..." | tee -a "$LOG_FILE"
cd "$PROJECT_DIR/server" || exit 1
mkdir -p "$PROJECT_DIR/server/logs"
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  pm2 reload "$PM2_APP" --update-env
else
  pm2 start ecosystem.config.cjs --only "$PM2_APP" --env production
fi
pm2 save 2>/dev/null || true

echo "🩺 健康检查..." | tee -a "$LOG_FILE"

STATUS="000"
for i in 1 2 3 4 5; do
  # 与 server 路由一致：挂载在 /api 下
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3001/api/health/live" || echo "000")

  if [[ "$STATUS" == "200" ]]; then
    echo "✅ 健康检查通过" | tee -a "$LOG_FILE"
    break
  else
    echo "⏳ 第 $i 次检测失败 (HTTP $STATUS)..." | tee -a "$LOG_FILE"
    sleep 2
  fi
done

if [[ "$STATUS" != "200" ]]; then
  echo "❌ 健康检查失败，状态码: $STATUS" | tee -a "$LOG_FILE"
  exit 1
fi

echo "🔎 强制执行 deploy/verify-pm2.sh（唯一验收标准）..." | tee -a "$LOG_FILE"
PM2_APP="$PM2_APP" bash "$PROJECT_DIR/deploy/verify-pm2.sh" | tee -a "$LOG_FILE"

echo "🎉 部署完成！版本: $LOCAL_COMMIT" | tee -a "$LOG_FILE"
