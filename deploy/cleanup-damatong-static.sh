#!/usr/bin/env bash
set -euo pipefail

# Safely clean stale Damatong static deployment directories.
#
# Defaults:
#   DEPLOY_BASE=/var/www/damatong
#   KEEP_RELEASES=2
#   KEEP_ROLLBACKS=1
#   PRUNE_STALE_ASSET_CHUNKS=1
#   STALE_ASSET_DAYS=14
#   DRY_RUN=0
#
# The script refuses to delete the active current/dist/admin-dist targets.
# Asset pruning only removes stale JS/CSS/map chunk files under active assets dirs.

DEPLOY_BASE="${DEPLOY_BASE:-/var/www/damatong}"
DEPLOY_BASE="${DEPLOY_BASE%/}"
KEEP_RELEASES="${KEEP_RELEASES:-2}"
KEEP_ROLLBACKS="${KEEP_ROLLBACKS:-1}"
PRUNE_STALE_ASSET_CHUNKS="${PRUNE_STALE_ASSET_CHUNKS:-1}"
STALE_ASSET_DAYS="${STALE_ASSET_DAYS:-14}"
DRY_RUN="${DRY_RUN:-0}"

releases_dir="${DEPLOY_BASE}/releases"
current_link="${DEPLOY_BASE}/current"
dist_link="${DEPLOY_BASE}/dist"
admin_dist_link="${DEPLOY_BASE}/admin-dist"

is_nonnegative_int() {
  [[ "$1" =~ ^[0-9]+$ ]]
}

canonical() {
  readlink -f "$1" 2>/dev/null || true
}

active_current="$(canonical "$current_link")"
active_dist="$(canonical "$dist_link")"
active_admin_dist="$(canonical "$admin_dist_link")"

is_active_path() {
  local target="$1"
  local active
  for active in "$active_current" "$active_dist" "$active_admin_dist"; do
    [[ -n "$active" ]] || continue
    if [[ "$active" == "$target" || "$active" == "$target"/* || "$target" == "$active"/* ]]; then
      return 0
    fi
  done
  return 1
}

remove_dir() {
  local path="$1"
  local real
  real="$(canonical "$path")"
  [[ -n "$real" && -d "$real" ]] || return 0

  case "$real" in
    "$DEPLOY_BASE"/releases/*|"$DEPLOY_BASE"/rollback-*) ;;
    *)
      echo "[cleanup] refuse unexpected path: $real" >&2
      return 1
      ;;
  esac

  if is_active_path "$real"; then
    echo "[cleanup] keep active path: $real"
    return 0
  fi

  du -sh "$real" 2>/dev/null | sed 's/^/[cleanup] remove size: /' || true
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[cleanup] dry-run remove: $real"
  elif [[ -w "$real" && -w "$(dirname "$real")" ]]; then
    rm -rf -- "$real"
    echo "[cleanup] removed: $real"
  else
    sudo rm -rf -- "$real"
    echo "[cleanup] removed: $real"
  fi
}

cleanup_dirs() {
  local label="$1"
  local keep="$2"
  shift 2
  local -a dirs=("$@")

  if ! is_nonnegative_int "$keep"; then
    echo "[cleanup] skip $label: keep value is not a non-negative integer: $keep"
    return 0
  fi

  if (( ${#dirs[@]} <= keep )); then
    echo "[cleanup] $label: ${#dirs[@]} found, keep $keep, nothing to remove"
    return 0
  fi

  local -a to_delete=("${dirs[@]:keep}")
  local d
  echo "[cleanup] $label: ${#dirs[@]} found, keep $keep, remove ${#to_delete[@]}"
  for d in "${to_delete[@]}"; do
    remove_dir "$d"
  done
}

delete_file() {
  local file="$1"
  case "$file" in
    "$active_dist"/assets/*|"$active_admin_dist"/assets/*) ;;
    *)
      echo "[cleanup] refuse unexpected asset path: $file" >&2
      return 1
      ;;
  esac

  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[cleanup] dry-run remove stale asset: $file"
  elif [[ -w "$file" && -w "$(dirname "$file")" ]]; then
    rm -f -- "$file"
    echo "[cleanup] removed stale asset: $file"
  else
    sudo rm -f -- "$file"
    echo "[cleanup] removed stale asset: $file"
  fi
}

prune_stale_asset_chunks() {
  local root="$1"
  local label="$2"

  [[ -n "$root" && -d "$root/assets" ]] || return 0
  if [[ "$PRUNE_STALE_ASSET_CHUNKS" != "1" ]]; then
    echo "[cleanup] stale asset pruning disabled for $label"
    return 0
  fi
  if ! is_nonnegative_int "$STALE_ASSET_DAYS"; then
    echo "[cleanup] skip stale asset pruning for $label: STALE_ASSET_DAYS is invalid: $STALE_ASSET_DAYS"
    return 0
  fi
  if ! command -v node >/dev/null 2>&1; then
    echo "[cleanup] skip stale asset pruning for $label: node is not available"
    return 0
  fi

  local candidates_file
  candidates_file="$(mktemp)"
  node - "$root" "$STALE_ASSET_DAYS" "$candidates_file" <<'NODE'
const fs = require('fs');
const path = require('path');

const [root, daysRaw, candidatesFile] = process.argv.slice(2);
const days = Number(daysRaw);
const assetsDir = path.join(root, 'assets');
const chunkExt = /\.(?:js|css|map)$/i;
const scanExt = /\.(?:html|js|css|webmanifest)$/i;
const maxScanBytes = 8 * 1024 * 1024;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function normalizeAssetRef(value) {
  return String(value || '')
    .replace(/^\/+/, '')
    .replace(/[?#].*$/, '');
}

function addFile(queue, seen, file) {
  if (!file || seen.has(file) || !fs.existsSync(file)) return;
  seen.add(file);
  const ext = path.extname(file).toLowerCase();
  if (scanExt.test(ext) || /(?:^|[\\/])workbox-[^\\/]+\.js$/i.test(file) || /(?:^|[\\/])sw\.js$/i.test(file)) {
    queue.push(file);
  }
}

if (!fs.existsSync(assetsDir)) {
  fs.writeFileSync(candidatesFile, '');
  process.exit(0);
}

const assetFiles = walk(assetsDir);
const byRel = new Map();
const byBase = new Map();
for (const file of assetFiles) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const base = path.basename(file);
  byRel.set(rel, file);
  if (!byBase.has(base)) byBase.set(base, []);
  byBase.get(base).push(file);
}

const protectedFiles = new Set();
const scanSeen = new Set();
const scanQueue = [];
function protectAsset(file) {
  if (!file || protectedFiles.has(file)) return;
  protectedFiles.add(file);
  addFile(scanQueue, scanSeen, file);
}

for (const name of fs.readdirSync(root)) {
  const full = path.join(root, name);
  if (!fs.statSync(full).isFile()) continue;
  if (scanExt.test(name) || /^workbox-[^/]+\.js$/i.test(name) || /^sw\.js$/i.test(name)) {
    addFile(scanQueue, scanSeen, full);
  }
}

const refPatterns = [
  /assets\/[^"'()<>\s\\]+/g,
  /\b[A-Za-z0-9_.~@+$,;=-]+-[A-Za-z0-9_-]{6,}\.(?:js|css|map)\b/g,
];

while (scanQueue.length > 0) {
  const file = scanQueue.shift();
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    continue;
  }
  if (stat.size > maxScanBytes) continue;
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  for (const pattern of refPatterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const ref = normalizeAssetRef(match[0]);
      if (byRel.has(ref)) {
        protectAsset(byRel.get(ref));
        continue;
      }
      const base = path.basename(ref);
      const matches = byBase.get(base);
      if (matches) {
        for (const candidate of matches) protectAsset(candidate);
      }
    }
  }
}

const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
const candidates = [];
for (const file of assetFiles) {
  if (!chunkExt.test(file)) continue;
  if (protectedFiles.has(file)) continue;
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    continue;
  }
  if (stat.mtimeMs < cutoff) candidates.push(file);
}

fs.writeFileSync(candidatesFile, candidates.join('\n') + (candidates.length ? '\n' : ''));
console.error(`[cleanup] ${path.basename(root)} protected chunk files: ${protectedFiles.size}`);
console.error(`[cleanup] ${path.basename(root)} stale chunk candidates: ${candidates.length}`);
NODE

  local count
  count="$(wc -l < "$candidates_file" | tr -d ' ')"
  if [[ "$count" == "0" ]]; then
    echo "[cleanup] stale asset chunks for $label: none older than ${STALE_ASSET_DAYS} days"
    rm -f "$candidates_file"
    return 0
  fi

  echo "[cleanup] stale asset chunks for $label: remove $count files older than ${STALE_ASSET_DAYS} days"
  local file
  while IFS= read -r file; do
    [[ -n "$file" ]] || continue
    delete_file "$file"
  done < "$candidates_file"
  rm -f "$candidates_file"
}

echo "[cleanup] DEPLOY_BASE=$DEPLOY_BASE"
echo "[cleanup] active_current=${active_current:-<none>}"
echo "[cleanup] active_dist=${active_dist:-<none>}"
echo "[cleanup] active_admin_dist=${active_admin_dist:-<none>}"

release_dirs=()
if [[ -d "$releases_dir" ]]; then
  mapfile -t release_dirs < <(find "$releases_dir" -mindepth 1 -maxdepth 1 -type d -printf '%f %p\n' 2>/dev/null | sort -r | awk '{ $1=""; sub(/^ /,""); print }')
fi
cleanup_dirs "releases" "$KEEP_RELEASES" "${release_dirs[@]}"

rollback_dirs=()
if [[ -d "$DEPLOY_BASE" ]]; then
  mapfile -t rollback_dirs < <(find "$DEPLOY_BASE" -maxdepth 1 -type d -name 'rollback-*' -printf '%f %p\n' 2>/dev/null | sort -r | awk '{ $1=""; sub(/^ /,""); print }')
fi
cleanup_dirs "rollback dirs" "$KEEP_ROLLBACKS" "${rollback_dirs[@]}"

prune_stale_asset_chunks "$active_dist" "storefront"
prune_stale_asset_chunks "$active_admin_dist" "admin"

df -h "$DEPLOY_BASE" 2>/dev/null | sed 's/^/[cleanup] df: /' || true
