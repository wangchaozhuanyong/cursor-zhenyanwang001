#!/usr/bin/env bash
set -euo pipefail

echo "🚀 开始部署..."

PROJECT_DIR="${PROJECT_DIR:-/var/www/click-send-shop}"
FRONTEND_SUB="${FRONTEND_SUB:-click-send-shop-main/click-send-shop-main}"
FRONTEND_DIR="$PROJECT_DIR/$FRONTEND_SUB"
BACKEND_DIR="$PROJECT_DIR/server"
LOG_FILE="${LOG_FILE:-$PROJECT_DIR/deploy.log}"
DEPLOY_LOCK_FILE="${DEPLOY_LOCK_FILE:-$PROJECT_DIR/.deploy.lock}"
HEALTH_PORT="${HEALTH_PORT:-3001}"
HEALTH_PATH="${HEALTH_PATH:-/api/health/live}"
HEALTH_RETRIES="${HEALTH_RETRIES:-20}"
HEALTH_INTERVAL_SECONDS="${HEALTH_INTERVAL_SECONDS:-3}"
PUBLIC_FRONTEND="${PUBLIC_FRONTEND:-/var/www/damatong/dist}"
ADMIN_PUBLIC_FRONTEND="${ADMIN_PUBLIC_FRONTEND:-/var/www/damatong/admin-dist}"
VITE_API_BASE_URL="${VITE_API_BASE_URL:-/api}"
SKIP_GIT="${SKIP_GIT:-0}"
GIT_BRANCH="${GIT_BRANCH:-main}"
GIT_COMMIT="${GIT_COMMIT:-${DEPLOY_TARGET_SHA:-}}"
DEPLOY_MODE="${DEPLOY_MODE:-release}"
ALLOW_OLD_DEPLOY="${ALLOW_OLD_DEPLOY:-${ALLOW_NON_FAST_FORWARD_DEPLOY:-0}}"
BUILD_FRONTEND_ON_SERVER="${BUILD_FRONTEND_ON_SERVER:-0}"
FRONTEND_BUILD_HEAP_MB="${FRONTEND_BUILD_HEAP_MB:-768}"
FAST_MODE="${FAST_MODE:-1}"
BACKUP_BEFORE_DEPLOY="${BACKUP_BEFORE_DEPLOY:-1}"
MIGRATION_TARGETS="${MIGRATION_TARGETS:-}"
CLEANUP_STATIC_AFTER_DEPLOY="${CLEANUP_STATIC_AFTER_DEPLOY:-1}"
DEPLOY_BASE="${DEPLOY_BASE:-/var/www/damatong}"
KEEP_RELEASES="${KEEP_RELEASES:-2}"
KEEP_ROLLBACKS="${KEEP_ROLLBACKS:-1}"
PRUNE_STALE_ASSET_CHUNKS="${PRUNE_STALE_ASSET_CHUNKS:-1}"
STALE_ASSET_DAYS="${STALE_ASSET_DAYS:-14}"
STATE_DIR="${PROJECT_DIR}/.deploy-state"

# /var/www/damatong 等目录常为 www-data 属主，普通 rsync -a 会因 chgrp 失败（exit 23）
sync_public_static() {
  local src_dir="$1"
  local dest_dir="$2"
  [[ -d "$src_dir" ]] || return 0
  local src="${src_dir%/}/"
  local dest="${dest_dir%/}"
  local rsync_flags=(-r --delete --exclude='/assets/' --exclude='/workbox-*.js')

  local needs_sudo=0
  if [[ "$dest" == /var/www/* ]] && { [[ ! -e "$dest" ]] || [[ ! -w "$dest" ]]; }; then
    needs_sudo=1
  fi

  if [[ "$needs_sudo" == "1" ]]; then
    sudo mkdir -p "$dest"
    if [[ -d "$src_dir/assets" ]]; then
      sudo mkdir -p "$dest/assets"
      sudo rsync -r "$src_dir/assets/" "$dest/assets/"
    fi
    for file in "$src_dir"/workbox-*.js; do
      [[ -f "$file" ]] && sudo cp -a "$file" "$dest/"
    done
    sudo rsync "${rsync_flags[@]}" "$src" "$dest/"
    if id www-data &>/dev/null; then
      sudo chown -R www-data:www-data "$dest"
    fi
  else
    mkdir -p "$dest"
    if command -v rsync >/dev/null 2>&1; then
      if [[ -d "$src_dir/assets" ]]; then
        mkdir -p "$dest/assets"
        rsync -r "$src_dir/assets/" "$dest/assets/"
      fi
      for file in "$src_dir"/workbox-*.js; do
        [[ -f "$file" ]] && cp -a "$file" "$dest/"
      done
      rsync "${rsync_flags[@]}" "$src" "$dest/"
    else
      if [[ -d "$src_dir/assets" ]]; then
        mkdir -p "$dest/assets"
        cp -a "$src_dir/assets/." "$dest/assets/"
      fi
      for file in "$src_dir"/workbox-*.js; do
        [[ -f "$file" ]] && cp -a "$file" "$dest/"
      done
      find "$dest" -mindepth 1 -maxdepth 1 ! -name assets ! -name 'workbox-*.js' -exec rm -rf {} +
      cp -a "$src." "$dest/"
    fi
  fi
}

touch "$DEPLOY_LOCK_FILE"
exec 9<>"$DEPLOY_LOCK_FILE"
if ! flock -n 9; then
  echo "[deploy] another deploy is running; lock=$DEPLOY_LOCK_FILE" | tee -a "$LOG_FILE"
  if [[ -s "$DEPLOY_LOCK_FILE" ]]; then
    sed 's/^/[deploy-lock] /' "$DEPLOY_LOCK_FILE" | tee -a "$LOG_FILE"
  fi
  exit 1
fi

mkdir -p "$STATE_DIR"

{
  echo "pid=$$"
  echo "started_at=$(date -Iseconds)"
  echo "branch=$GIT_BRANCH"
  echo "commit=${GIT_COMMIT:-branch-tip}"
} > "$DEPLOY_LOCK_FILE"

cleanup_deploy_lock() {
  local exit_code=$?
  rm -f "$DEPLOY_LOCK_FILE" 2>/dev/null || true
  exit "$exit_code"
}
trap cleanup_deploy_lock EXIT

hash_file() {
  local target="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$target" | awk '{print $1}'
  else
    shasum -a 256 "$target" | awk '{print $1}'
  fi
}

guard_target_commit() {
  local target="$1"
  [[ -n "$target" ]] || return 0

  if [[ "$DEPLOY_MODE" == "rollback" || "$ALLOW_OLD_DEPLOY" == "1" ]]; then
    echo "[deploy] old/divergent deploy guard bypassed: DEPLOY_MODE=$DEPLOY_MODE ALLOW_OLD_DEPLOY=$ALLOW_OLD_DEPLOY" | tee -a "$LOG_FILE"
    return 0
  fi

  local label baseline
  for label in "current:HEAD" "last_good:${STATE_DIR}/last_good_head"; do
    local kind="${label%%:*}"
    local source="${label#*:}"
    baseline=""
    if [[ "$kind" == "current" ]]; then
      baseline=$(git -C "$PROJECT_DIR" rev-parse HEAD 2>/dev/null || true)
    elif [[ -s "$source" ]]; then
      baseline=$(cat "$source")
    fi
    [[ -n "$baseline" ]] || continue
    baseline=$(git -C "$PROJECT_DIR" rev-parse "${baseline}^{commit}" 2>/dev/null || true)
    [[ -n "$baseline" ]] || continue
    [[ "$target" == "$baseline" ]] && continue

    if git -C "$PROJECT_DIR" merge-base --is-ancestor "$baseline" "$target"; then
      continue
    fi

    if git -C "$PROJECT_DIR" merge-base --is-ancestor "$target" "$baseline"; then
      echo "[deploy] refusing old deploy: target $(git -C "$PROJECT_DIR" rev-parse --short "$target") is older than $kind $(git -C "$PROJECT_DIR" rev-parse --short "$baseline"). Use deploy/rollback.sh or ALLOW_OLD_DEPLOY=1 for an intentional rollback." | tee -a "$LOG_FILE"
    else
      echo "[deploy] refusing divergent deploy: target $(git -C "$PROJECT_DIR" rev-parse --short "$target") does not contain $kind $(git -C "$PROJECT_DIR" rev-parse --short "$baseline"). Rebase/merge first, or set ALLOW_OLD_DEPLOY=1 only for a documented break-glass deploy." | tee -a "$LOG_FILE"
    fi
    exit 1
  done
}

maybe_install_backend_deps() {
  # FAST_MODE can only skip after the lockfile hash check below.
  if [[ "${LEGACY_FAST_SKIP_WITHOUT_HASH:-0}" == "1" && "$FAST_MODE" == "1" && -d "$BACKEND_DIR/node_modules" ]]; then
    echo "⚡ FAST_MODE=1 且后端 node_modules 已存在，跳过后端依赖安装" | tee -a "$LOG_FILE"
    return 0
  fi

  local marker="$STATE_DIR/backend-lock.sha256"
  local current=""
  local previous=""
  if [[ -f "$BACKEND_DIR/package-lock.json" ]]; then
    current="$(hash_file "$BACKEND_DIR/package-lock.json")"
  elif [[ -f "$BACKEND_DIR/package.json" ]]; then
    current="$(hash_file "$BACKEND_DIR/package.json")"
  fi
  if [[ -f "$marker" ]]; then
    previous="$(cat "$marker")"
  fi

  if [[ -n "$current" && -d "$BACKEND_DIR/node_modules" && "$current" == "$previous" ]]; then
    echo "⏭️  后端 lockfile 未变化，跳过依赖安装" | tee -a "$LOG_FILE"
    return 0
  fi

  echo "📝 安装后端依赖（生产模式）..." | tee -a "$LOG_FILE"
  if [[ -f package-lock.json ]]; then
    npm ci --omit=dev --no-audit --fund=false
  else
    npm install --omit=dev --no-audit --fund=false
  fi

  if [[ -n "$current" ]]; then
    echo "$current" > "$marker"
  fi
}

maybe_install_frontend_deps() {
  # FAST_MODE can only skip after the lockfile hash check below.
  if [[ "${LEGACY_FAST_SKIP_WITHOUT_HASH:-0}" == "1" && "$FAST_MODE" == "1" && -d "$FRONTEND_DIR/node_modules" ]]; then
    echo "⚡ FAST_MODE=1 且前端 node_modules 已存在，跳过前端依赖安装" | tee -a "$LOG_FILE"
    return 0
  fi

  local marker="$STATE_DIR/frontend-lock.sha256"
  local current=""
  local previous=""
  if [[ -f "$FRONTEND_DIR/package-lock.json" ]]; then
    current="$(hash_file "$FRONTEND_DIR/package-lock.json")"
  elif [[ -f "$FRONTEND_DIR/package.json" ]]; then
    current="$(hash_file "$FRONTEND_DIR/package.json")"
  fi
  if [[ -f "$marker" ]]; then
    previous="$(cat "$marker")"
  fi

  if [[ -n "$current" && -d "$FRONTEND_DIR/node_modules" && "$current" == "$previous" ]]; then
    echo "⏭️  前端 lockfile 未变化，跳过依赖安装" | tee -a "$LOG_FILE"
    return 0
  fi

  echo "📝 安装前端依赖..." | tee -a "$LOG_FILE"
  npm ci --no-audit --fund=false
  if [[ -n "$current" ]]; then
    echo "$current" > "$marker"
  fi
}

cd "$PROJECT_DIR" || exit 1

echo "📅 部署时间: $(date)" | tee -a "$LOG_FILE"

echo "🔍 部署前自检（preflight）..." | tee -a "$LOG_FILE"
bash "$PROJECT_DIR/deploy/preflight.sh" | tee -a "$LOG_FILE"

LOCAL_COMMIT=""
DEPLOY_SCRIPT_PATH="$PROJECT_DIR/deploy/production-deploy.sh"
DEPLOY_SCRIPT_HASH_BEFORE=""
if [[ -f "$DEPLOY_SCRIPT_PATH" ]]; then
  DEPLOY_SCRIPT_HASH_BEFORE="$(hash_file "$DEPLOY_SCRIPT_PATH" || true)"
fi

if [[ "$SKIP_GIT" != "1" ]]; then
  echo "📜 拉取最新代码（分支 $GIT_BRANCH）..." | tee -a "$LOG_FILE"
  bash "$PROJECT_DIR/deploy/ensure-github-ssh-remote.sh" | tee -a "$LOG_FILE"
  git -C "$PROJECT_DIR" fetch origin "+refs/heads/${GIT_BRANCH}:refs/remotes/origin/${GIT_BRANCH}"
  DEPLOY_REF="origin/$GIT_BRANCH"
  if [[ -n "$GIT_COMMIT" ]]; then
    if ! git -C "$PROJECT_DIR" cat-file -e "${GIT_COMMIT}^{commit}" 2>/dev/null; then
      git -C "$PROJECT_DIR" fetch origin "$GIT_COMMIT" || true
    fi
    if ! git -C "$PROJECT_DIR" cat-file -e "${GIT_COMMIT}^{commit}" 2>/dev/null; then
      echo "[deploy] target commit not found: $GIT_COMMIT" | tee -a "$LOG_FILE"
      exit 1
    fi
    if [[ "$DEPLOY_MODE" != "rollback" ]] && ! git -C "$PROJECT_DIR" merge-base --is-ancestor "$GIT_COMMIT" "origin/$GIT_BRANCH"; then
      echo "[deploy] target commit is not reachable from origin/$GIT_BRANCH: $GIT_COMMIT" | tee -a "$LOG_FILE"
      exit 1
    fi
    DEPLOY_REF="$GIT_COMMIT"
  fi
  TARGET_COMMIT=$(git -C "$PROJECT_DIR" rev-parse "${DEPLOY_REF}^{commit}")
  guard_target_commit "$TARGET_COMMIT"
  git -C "$PROJECT_DIR" reset --hard "$TARGET_COMMIT"
  if [[ "${DEPLOY_REEXEC_AFTER_GIT:-0}" != "1" && -n "$DEPLOY_SCRIPT_HASH_BEFORE" && -f "$DEPLOY_SCRIPT_PATH" ]]; then
    DEPLOY_SCRIPT_HASH_AFTER="$(hash_file "$DEPLOY_SCRIPT_PATH" || true)"
    if [[ -n "$DEPLOY_SCRIPT_HASH_AFTER" && "$DEPLOY_SCRIPT_HASH_AFTER" != "$DEPLOY_SCRIPT_HASH_BEFORE" ]]; then
      echo "[deploy] production-deploy.sh changed after checkout; re-exec with the checked-out script" | tee -a "$LOG_FILE"
      export DEPLOY_REEXEC_AFTER_GIT=1
      exec bash "$DEPLOY_SCRIPT_PATH"
    fi
  fi

  LOCAL_COMMIT=$(git -C "$PROJECT_DIR" rev-parse --short HEAD)
  REMOTE_COMMIT=$(git -C "$PROJECT_DIR" rev-parse --short "$TARGET_COMMIT")
  echo "🔄 本地版本: $LOCAL_COMMIT" | tee -a "$LOG_FILE"
  echo "🌐 远程版本: $REMOTE_COMMIT" | tee -a "$LOG_FILE"

  if [[ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]]; then
    echo "❌ HEAD 与 origin/$GIT_BRANCH 不一致" | tee -a "$LOG_FILE"
    exit 1
  fi
else
  if [[ "${ALLOW_SKIP_GIT_DEPLOY:-0}" != "1" && "$DEPLOY_MODE" != "rollback" ]]; then
    echo "[deploy] refusing SKIP_GIT=1 deploy. This path can overwrite newer code with local files. Use the git/SHA deploy path, or set ALLOW_SKIP_GIT_DEPLOY=1 for a documented break-glass run." | tee -a "$LOG_FILE"
    exit 1
  fi
  echo "⏭️  SKIP_GIT=1，跳过 git 拉取" | tee -a "$LOG_FILE"
  LOCAL_COMMIT=$(git -C "$PROJECT_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")
fi

cd "$BACKEND_DIR" || exit 1
maybe_install_backend_deps

if [[ "$BACKUP_BEFORE_DEPLOY" == "1" ]]; then
  echo "💾 部署前强制创建 MySQL 全量备份..." | tee -a "$LOG_FILE"
  BACKUP_KIND=pre_deploy BACKUP_TRIGGER_SOURCE=deploy BACKUP_REASON="before production deploy ${LOCAL_COMMIT}" npm run backup:full
  BACKUP_TRIGGER_SOURCE=deploy BACKUP_REASON="before production deploy ${LOCAL_COMMIT}" npm run backup:config || true
fi

echo "🧪 部署前数据库连通检查..." | tee -a "$LOG_FILE"
if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  echo "❌ 缺少后端 .env: $BACKEND_DIR/.env" | tee -a "$LOG_FILE"
  exit 1
fi
if ! node -e "require('dotenv').config({path:'$BACKEND_DIR/.env'});const mysql=require('mysql2/promise');(async()=>{const c=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME});await c.query('SELECT 1');await c.end();})().catch(e=>{console.error(e.message);process.exit(1);});"; then
  echo "❌ 数据库连接检查失败" | tee -a "$LOG_FILE"
  exit 1
fi

echo "🧩 执行数据库迁移..." | tee -a "$LOG_FILE"
if [[ -n "$MIGRATION_TARGETS" ]]; then
  echo "[deploy] running selected migrations only: $MIGRATION_TARGETS" | tee -a "$LOG_FILE"
  for migration in ${MIGRATION_TARGETS//,/ }; do
    [[ -n "$migration" ]] || continue
    BACKUP_BEFORE_MIGRATION=1 npm run migrate:one -- "$migration"
  done
else
  BACKUP_BEFORE_MIGRATION=1 npm run migrate
fi
npm run verify-schema

if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "❌ 找不到前端目录: $FRONTEND_DIR" | tee -a "$LOG_FILE"
  exit 1
fi

ADMIN_DIST_DIR="$FRONTEND_DIR/admin-dist"

if [[ "$BUILD_FRONTEND_ON_SERVER" != "1" ]]; then
  echo "⏭️  默认不在服务器构建前端（BUILD_FRONTEND_ON_SERVER=$BUILD_FRONTEND_ON_SERVER）" | tee -a "$LOG_FILE"
  if [[ ! -d "$FRONTEND_DIR/dist" && ! -d "$PUBLIC_FRONTEND" ]]; then
    echo "❌ 未找到前端 dist，请先在 CI/本地构建并上传，或设置 BUILD_FRONTEND_ON_SERVER=1 强制服务器构建。" | tee -a "$LOG_FILE"
    exit 1
  fi

  if [[ ! -f "$ADMIN_DIST_DIR/admin-index.html" ]]; then
    echo "[deploy] admin-dist/admin-index.html missing; building standalone admin UI ..." | tee -a "$LOG_FILE"
    cd "$FRONTEND_DIR" || exit 1
    maybe_install_frontend_deps
    export NODE_OPTIONS="--max-old-space-size=${FRONTEND_BUILD_HEAP_MB}"
    export VITE_API_BASE_URL
    npm run build:admin
  fi
else
  echo "🎨 BUILD_FRONTEND_ON_SERVER=1，执行服务器前端构建..." | tee -a "$LOG_FILE"
  if [[ -f /proc/meminfo ]]; then
    MEM_AVAILABLE_MB="$(awk '/MemAvailable:/ {printf "%d", $2/1024}' /proc/meminfo)"
    if [[ -n "$MEM_AVAILABLE_MB" && "$MEM_AVAILABLE_MB" -lt 1500 ]]; then
      echo "⚠️  可用内存仅 ${MEM_AVAILABLE_MB}MB，可能触发 OOM，建议改用 CI/本地构建 dist。" | tee -a "$LOG_FILE"
    fi
  fi

  cd "$FRONTEND_DIR" || exit 1
  maybe_install_frontend_deps
  export NODE_OPTIONS="--max-old-space-size=${FRONTEND_BUILD_HEAP_MB}"
  export VITE_LEGACY_BUILD="${VITE_LEGACY_BUILD:-0}"
  export VITE_API_BASE_URL
  npm run build:admin
  # Keep the public shop build last so dist/index.html cannot be removed by the admin/PWA build.
  npm run build
fi

if [[ -f "$FRONTEND_DIR/dist/index.html" ]]; then
  echo "📤 同步 dist → $PUBLIC_FRONTEND" | tee -a "$LOG_FILE"
  sync_public_static "$FRONTEND_DIR/dist" "$PUBLIC_FRONTEND"
elif [[ -d "$FRONTEND_DIR/dist" ]]; then
  echo "⚠️  跳过同步 dist：缺少 dist/index.html，避免发布半成品前台构建。" | tee -a "$LOG_FILE"
fi

if [[ -f "$ADMIN_DIST_DIR/admin-index.html" ]]; then
  echo "[deploy] Sync admin-dist -> $ADMIN_PUBLIC_FRONTEND" | tee -a "$LOG_FILE"
  sync_public_static "$ADMIN_DIST_DIR" "$ADMIN_PUBLIC_FRONTEND"
fi

if [[ ! -f "$ADMIN_PUBLIC_FRONTEND/admin-index.html" ]]; then
  echo "❌ admin-index.html missing after deploy: $ADMIN_PUBLIC_FRONTEND/admin-index.html" | tee -a "$LOG_FILE"
  exit 1
fi

PM2_APP="${PM2_APP:-gc-api}"
cd "$BACKEND_DIR" || exit 1
mkdir -p "$BACKEND_DIR/logs"
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  pm2 reload "$PM2_APP" --update-env
else
  pm2 start ecosystem.config.cjs --only "$PM2_APP" --env production
  pm2 restart "$PM2_APP" --update-env
fi
pm2 save 2>/dev/null || true

STATUS="000"
for ((i = 1; i <= HEALTH_RETRIES; i++)); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${HEALTH_PORT}${HEALTH_PATH}" 2>/dev/null || true)
  STATUS="${STATUS:-000}"
  if [[ "$STATUS" == "200" ]]; then
    echo "✅ 健康检查通过" | tee -a "$LOG_FILE"
    break
  fi
  echo "⚠️ 第 $i/${HEALTH_RETRIES} 次健康检查失败，HTTP=$STATUS" | tee -a "$LOG_FILE"
  sleep "$HEALTH_INTERVAL_SECONDS"
done

if [[ "$STATUS" != "200" ]]; then
  echo "❌ 健康检查失败，HTTP=$STATUS" | tee -a "$LOG_FILE"
  exit 1
fi

PM2_APP="$PM2_APP" HEALTH_PORT="$HEALTH_PORT" HEALTH_PATH="$HEALTH_PATH" \
  bash "$PROJECT_DIR/deploy/verify-pm2.sh" | tee -a "$LOG_FILE"

if [[ "$CLEANUP_STATIC_AFTER_DEPLOY" == "1" && -f "$PROJECT_DIR/deploy/cleanup-damatong-static.sh" ]]; then
  echo "🧹 清理旧静态发布目录（保留 release=${KEEP_RELEASES}, rollback=${KEEP_ROLLBACKS}）..." | tee -a "$LOG_FILE"
  DEPLOY_BASE="$DEPLOY_BASE" KEEP_RELEASES="$KEEP_RELEASES" KEEP_ROLLBACKS="$KEEP_ROLLBACKS" \
    PRUNE_STALE_ASSET_CHUNKS="$PRUNE_STALE_ASSET_CHUNKS" STALE_ASSET_DAYS="$STALE_ASSET_DAYS" \
    bash "$PROJECT_DIR/deploy/cleanup-damatong-static.sh" | tee -a "$LOG_FILE"
fi

echo "🎉 部署成功，版本 $LOCAL_COMMIT" | tee -a "$LOG_FILE"
