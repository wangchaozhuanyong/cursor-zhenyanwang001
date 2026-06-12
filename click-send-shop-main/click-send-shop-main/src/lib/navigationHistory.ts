import type { Location } from "react-router-dom";

const STORAGE_KEY = "damatong:navigation-history:v1";
const MAX_ENTRIES = 80;

type NavigationHistoryStore = {
  entries: Record<number, string>;
  lastIndex: number;
};

function createEmptyStore(): NavigationHistoryStore {
  return {
    entries: {},
    lastIndex: 0,
  };
}

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function readStore(): NavigationHistoryStore {
  if (!canUseSessionStorage()) {
    return createEmptyStore();
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return createEmptyStore();
    }

    const parsed = JSON.parse(raw) as Partial<NavigationHistoryStore>;

    return {
      entries: parsed.entries && typeof parsed.entries === "object" ? parsed.entries : {},
      lastIndex: typeof parsed.lastIndex === "number" ? parsed.lastIndex : 0,
    };
  } catch {
    return createEmptyStore();
  }
}

function writeStore(store: NavigationHistoryStore) {
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // sessionStorage is best-effort only.
  }
}

export function buildLocationPath(location: Pick<Location, "pathname" | "search" | "hash">) {
  return `${location.pathname}${location.search}${location.hash}`;
}

export function getCurrentHistoryIndex() {
  if (typeof window === "undefined") return 0;

  const state = window.history.state as { idx?: number } | null;

  return typeof state?.idx === "number" ? state.idx : 0;
}

export function recordNavigationPath(path: string) {
  const index = getCurrentHistoryIndex();
  const store = readStore();

  store.entries[index] = path;
  store.lastIndex = index;

  const indexes = Object.keys(store.entries)
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  while (indexes.length > MAX_ENTRIES) {
    const oldIndex = indexes.shift();

    if (typeof oldIndex === "number") {
      delete store.entries[oldIndex];
    }
  }

  writeStore(store);
}

export function getNavigationPathAt(index: number) {
  const store = readStore();

  return store.entries[index];
}

export function isSafeInternalPath(value?: string | null) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

export function isSamePath(a?: string | null, b?: string | null) {
  if (!a || !b) return false;

  return a === b;
}
