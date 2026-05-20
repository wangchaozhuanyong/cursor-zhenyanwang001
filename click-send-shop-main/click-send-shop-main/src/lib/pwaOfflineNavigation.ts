const SPA_READY_KEY = "store-spa-ready";
const LAST_PATH_KEY = "store-last-path";
const OFFLINE_REDIRECT_DELAY_MS = 1500;
const CONNECTIVITY_TIMEOUT_MS = 2500;

function rememberCurrentPath() {
  try {
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (!current || current.startsWith("/offline.html")) return;
    sessionStorage.setItem(LAST_PATH_KEY, current);
  } catch {
    // ignore
  }
}

function readLastPath(): string {
  try {
    const saved = sessionStorage.getItem(LAST_PATH_KEY) || "/";
    if (!saved || saved.startsWith("/offline.html")) return "/";
    return saved;
  } catch {
    return "/";
  }
}

async function probeConnectivity(): Promise<boolean> {
  if (typeof window === "undefined") return true;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), CONNECTIVITY_TIMEOUT_MS);
  try {
    const response = await fetch(`/api/health/live?t=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

/** 标记 SPA 已成功挂载 */
export function markStoreSpaReady() {
  try {
    sessionStorage.setItem(SPA_READY_KEY, "1");
    rememberCurrentPath();
  } catch {
    // ignore
  }
}

/**
 * 仅在「真实不可达」时才跳转离线页，避免移动端瞬时误判离线。
 * 在线恢复后优先回到上一个业务页面。
 */
export function initPwaOfflineNavigation() {
  if (typeof window === "undefined") return;

  const path = window.location.pathname;
  const onOfflinePage = path === "/offline.html" || path.endsWith("/offline.html");

  if (!onOfflinePage) rememberCurrentPath();

  const goBackFromOffline = async () => {
    const isReachable = await probeConnectivity();
    if (!isReachable) return;
    window.location.replace(readLastPath());
  };

  window.addEventListener("online", () => {
    if (onOfflinePage) {
      void goBackFromOffline();
      return;
    }
    markStoreSpaReady();
  });

  if (onOfflinePage) {
    if (navigator.onLine) {
      void goBackFromOffline();
    }
    return;
  }

  if (navigator.onLine) {
    markStoreSpaReady();
    return;
  }

  let hasSpaReady = false;
  try {
    hasSpaReady = sessionStorage.getItem(SPA_READY_KEY) === "1";
  } catch {
    hasSpaReady = false;
  }
  if (hasSpaReady) return;

  window.setTimeout(async () => {
    const isReachable = await probeConnectivity();
    if (isReachable) {
      markStoreSpaReady();
      return;
    }
    const from = encodeURIComponent(readLastPath());
    window.location.replace(`/offline.html?from=${from}`);
  }, OFFLINE_REDIRECT_DELAY_MS);
}
