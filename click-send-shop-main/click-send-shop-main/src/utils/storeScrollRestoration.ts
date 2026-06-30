import { stripPublicLocaleFromPathname } from "@/i18n/publicLocale";

const STORE_SCROLL_RESTORE_MAX_ENTRIES = 40;
const STORE_SCROLL_RESTORE_STORAGE_KEY = "store_scroll_positions_v1";
const STORE_TAB_PATHS_STORAGE_KEY = "store_tab_paths_v1";
const MAIN_STORE_TAB_PATHS = new Set(["/", "/categories", "/promotions", "/cart", "/profile"]);
const STORE_TAB_PATH_ALIASES = new Map([
  ["/new-arrivals", "/categories"],
  ["/deals", "/promotions"],
]);
const storeScrollPositions = new Map<string, number>();
const storeTabPaths = new Map<string, string>();

type LocalStorePathParts = {
  pathname: string;
  search: string;
  hash: string;
};

function splitLocalStorePath(path: string): LocalStorePathParts {
  const hashIndex = path.indexOf("#");
  const beforeHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const searchIndex = beforeHash.indexOf("?");
  const pathname = searchIndex >= 0 ? beforeHash.slice(0, searchIndex) : beforeHash;
  const search = searchIndex >= 0 ? beforeHash.slice(searchIndex) : "";
  return { pathname: pathname || "/", search, hash };
}

function serializeLocalStorePath(pathname: string, search = "", hash = "") {
  return `${stripPublicLocaleFromPathname(pathname)}${search}${hash}`;
}

function hydrateRememberedStoreTabPaths() {
  if (storeTabPaths.size > 0 || typeof window === "undefined") return;
  try {
    const stored = window.sessionStorage.getItem(STORE_TAB_PATHS_STORAGE_KEY);
    if (!stored) return;
    const entries = JSON.parse(stored) as Array<[string, string]>;
    if (!Array.isArray(entries)) return;
    entries.forEach(([key, path]) => {
      if (typeof key === "string" && typeof path === "string" && getStoreTabPathKey(path) === key) {
        storeTabPaths.set(key, path);
      }
    });
  } catch {
    // sessionStorage can be unavailable in private or embedded contexts.
  }
}

function persistRememberedStoreTabPaths() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      STORE_TAB_PATHS_STORAGE_KEY,
      JSON.stringify(Array.from(storeTabPaths.entries())),
    );
  } catch {
    // sessionStorage can be unavailable in private or embedded contexts.
  }
}

export function getStoreScrollKey(pathname: string, search = "") {
  const canonicalPathname = stripPublicLocaleFromPathname(pathname);
  if (canonicalPathname === "/categories") return canonicalPathname;
  if (canonicalPathname === "/promotions") return canonicalPathname;
  if (canonicalPathname === "/support-download") return canonicalPathname;
  return `${pathname}${search}`;
}

export function getStoreTabPathKey(path: string) {
  const { pathname } = splitLocalStorePath(path);
  const canonicalPathname = stripPublicLocaleFromPathname(pathname);
  const aliasedPathname = STORE_TAB_PATH_ALIASES.get(canonicalPathname) ?? canonicalPathname;
  return MAIN_STORE_TAB_PATHS.has(aliasedPathname) ? aliasedPathname : null;
}

export function rememberStoreTabPath(pathname: string, search = "", hash = "") {
  const tabKey = getStoreTabPathKey(pathname);
  if (!tabKey) return;
  const path = serializeLocalStorePath(pathname, search, hash);
  storeTabPaths.set(tabKey, path);
  persistRememberedStoreTabPaths();
}

export function getRememberedStoreTabPath(path: string) {
  const tabKey = getStoreTabPathKey(path);
  if (!tabKey) return path;
  hydrateRememberedStoreTabPaths();
  const rememberedPath = storeTabPaths.get(tabKey);
  if (rememberedPath && getStoreTabPathKey(rememberedPath) === tabKey) {
    return rememberedPath;
  }
  const { pathname, search, hash } = splitLocalStorePath(path);
  return serializeLocalStorePath(pathname, search, hash);
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

export function clearRememberedStoreNavigationState() {
  storeScrollPositions.clear();
  storeTabPaths.clear();
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORE_SCROLL_RESTORE_STORAGE_KEY);
    window.sessionStorage.removeItem(STORE_TAB_PATHS_STORAGE_KEY);
  } catch {
    // sessionStorage can be unavailable in private or embedded contexts.
  }
}
