const STORE_SCROLL_RESTORE_MAX_ENTRIES = 40;
const STORE_SCROLL_RESTORE_STORAGE_KEY = "store_scroll_positions_v1";
const storeScrollPositions = new Map<string, number>();

export function getStoreScrollKey(pathname: string, search = "") {
  if (pathname === "/categories") return pathname;
  if (pathname === "/support-download") return pathname;
  return `${pathname}${search}`;
}

export function rememberStoreScrollPosition(key: string) {
  if (typeof window === "undefined") return;
  const y = Math.max(0, Math.round(window.scrollY || document.documentElement.scrollTop || 0));
  storeScrollPositions.delete(key);
  storeScrollPositions.set(key, y);
  while (storeScrollPositions.size > STORE_SCROLL_RESTORE_MAX_ENTRIES) {
    const oldestKey = storeScrollPositions.keys().next().value;
    if (!oldestKey) break;
    storeScrollPositions.delete(oldestKey);
  }
  try {
    window.sessionStorage.setItem(
      STORE_SCROLL_RESTORE_STORAGE_KEY,
      JSON.stringify(Array.from(storeScrollPositions.entries())),
    );
  } catch {
    // sessionStorage can be unavailable in private or embedded contexts.
  }
}

export function rememberCurrentStoreScrollPosition() {
  if (typeof window === "undefined") return;
  rememberStoreScrollPosition(getStoreScrollKey(window.location.pathname, window.location.search));
}

export function getRememberedStoreScrollPosition(key: string) {
  const memoryValue = storeScrollPositions.get(key);
  if (memoryValue !== undefined) return memoryValue;
  if (typeof window === "undefined") return undefined;
  try {
    const stored = window.sessionStorage.getItem(STORE_SCROLL_RESTORE_STORAGE_KEY);
    if (!stored) return undefined;
    const entries = JSON.parse(stored) as Array<[string, number]>;
    if (!Array.isArray(entries)) return undefined;
    storeScrollPositions.clear();
    entries.forEach(([storedKey, storedValue]) => {
      if (typeof storedKey === "string" && Number.isFinite(storedValue)) {
        storeScrollPositions.set(storedKey, storedValue);
      }
    });
    return storeScrollPositions.get(key);
  } catch {
    return undefined;
  }
}
