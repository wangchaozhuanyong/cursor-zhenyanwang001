type AdminNavDebugPayload = {
  stage: "start" | "blocked" | "success";
  from?: string;
  to?: string;
  currentTabId?: string;
  targetTabId?: string;
  dirty?: boolean;
  tabCount?: number;
  canOpenTab?: boolean;
  reason?: "dirty" | "tab_limit" | "permission" | "preload_failed" | "same_path";
  duration?: number;
};

type AdminSaveDebugPayload = {
  page: string;
  duration: number;
  success: boolean;
  dirtyCleared: boolean;
  savingReleased: boolean;
};

type PerformanceWindow = Window & {
  PerformanceObserver?: typeof PerformanceObserver;
};

function isAdminDebugEnabled() {
  if (import.meta.env.DEV) return true;
  try {
    return window.localStorage.getItem("admin_debug") === "1" || window.localStorage.getItem("admin_nav_debug") === "1";
  } catch {
    return false;
  }
}

export function adminNavDebug(payload: AdminNavDebugPayload) {
  if (!isAdminDebugEnabled()) return;
  console.debug("[admin-nav]", payload);
}

export function adminSaveDebug(payload: AdminSaveDebugPayload) {
  if (!isAdminDebugEnabled()) return;
  console.debug("[admin-save]", payload);
}

let longTaskObserverStarted = false;

export function observeAdminLongTasks() {
  if (longTaskObserverStarted || !isAdminDebugEnabled()) return;
  longTaskObserverStarted = true;

  const perfWindow = window as PerformanceWindow;
  if (typeof perfWindow.PerformanceObserver !== "function") return;

  try {
    const observer = new perfWindow.PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration < 50) continue;
        console.debug("[admin-longtask]", {
          name: entry.name,
          startTime: Math.round(entry.startTime),
          duration: Math.round(entry.duration),
        });
      }
    });
    observer.observe({ type: "longtask", buffered: true });
  } catch {
    longTaskObserverStarted = false;
  }
}
