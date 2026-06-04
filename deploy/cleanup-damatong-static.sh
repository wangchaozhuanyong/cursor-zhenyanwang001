#!/usr/bin/env bash
set -euo pipefail

# Safely clean stale Damatong static deployment directories.
#
# Defaults:
#   DEPLOY_BASE=/var/www/damatong
#   KEEP_RELEASES=2
#   KEEP_ROLLBACKS=1
#   DRY_RUN=0
#
# The script refuses to delete the active current/dist/admin-dist targets.

DEPLOY_BASE="${DEPLOY_BASE:-/var/www/damatong}"
DEPLOY_BASE="${DEPLOY_BASE%/}"
KEEP_RELEASES="${KEEP_RELEASES:-2}"
KEEP_ROLLBACKS="${KEEP_ROLLBACKS:-1}"
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

df -h "$DEPLOY_BASE" 2>/dev/null | sed 's/^/[cleanup] df: /' || true
