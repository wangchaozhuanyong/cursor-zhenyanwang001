const ADMIN_SCROLL_RESTORE_MAX_ENTRIES = 80;
const ADMIN_SCROLL_RESTORE_STORAGE_KEY = "admin_scroll_positions_v1";

const adminScrollPositions = new Map<string, number>();

function clampScrollTop(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function pruneScrollPositions() {
  while (adminScrollPositions.size > ADMIN_SCROLL_RESTORE_MAX_ENTRIES) {
    const oldestKey = adminScrollPositions.keys().next().value;
    if (!oldestKey) break;
    adminScrollPositions.delete(oldestKey);
  }
}

function persistScrollPositions() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      ADMIN_SCROLL_RESTORE_STORAGE_KEY,
      JSON.stringify(Array.from(adminScrollPositions.entries())),
    );
  } catch {
    // sessionStorage can be unavailable in private or embedded contexts.
  }
}

function hydrateScrollPositions() {
  if (typeof window === "undefined" || adminScrollPositions.size > 0) return;
  try {
    const stored = window.sessionStorage.getItem(ADMIN_SCROLL_RESTORE_STORAGE_KEY);
    if (!stored) return;
    const entries = JSON.parse(stored) as Array<[string, number]>;
    if (!Array.isArray(entries)) return;
    entries.forEach(([key, value]) => {
      if (typeof key === "string" && Number.isFinite(value)) {
        adminScrollPositions.set(key, clampScrollTop(value));
      }
    });
    pruneScrollPositions();
  } catch {
    // Ignore malformed or inaccessible storage.
  }
}

export function rememberAdminScrollPosition(key: string, element: HTMLElement | null | undefined) {
  if (!key || !element) return;
  const top = clampScrollTop(element.scrollTop);
  adminScrollPositions.delete(key);
  adminScrollPositions.set(key, top);
  pruneScrollPositions();
  persistScrollPositions();
}

export function getRememberedAdminScrollPosition(key: string) {
  if (!key) return undefined;
  hydrateScrollPositions();
  return adminScrollPositions.get(key);
}

export function clearRememberedAdminScrollPositions() {
  adminScrollPositions.clear();
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(ADMIN_SCROLL_RESTORE_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}
