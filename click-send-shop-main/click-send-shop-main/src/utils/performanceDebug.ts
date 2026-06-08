type PerfExtra = Record<string, unknown>;

const DEBUG_STORAGE_KEY = "store_perf_debug";
const SLOW_API_MS = 300;

function isLocalDebugEnabled() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DEBUG_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isPerformanceDebugEnabled() {
  return import.meta.env.DEV || isLocalDebugEnabled();
}

export function markPerfStart() {
  if (typeof performance === "undefined") return Date.now();
  return performance.now();
}

export function getPerfDuration(start: number) {
  const now = typeof performance === "undefined" ? Date.now() : performance.now();
  return Math.round((now - start) * 10) / 10;
}

export function logPerf(label: string, data: PerfExtra = {}) {
  if (!isPerformanceDebugEnabled()) return;
  // Keep performance diagnostics easy to filter without affecting production users.
  console.info(`[perf] ${label}`, data);
}

export function logApiPerf(data: {
  method: string;
  url: string;
  status?: number;
  duration: number;
  retry?: boolean;
  tokenRefreshRetry?: boolean;
  timeout?: boolean;
  cache?: boolean;
}) {
  if (!isPerformanceDebugEnabled()) return;
  const level = data.timeout || data.duration >= SLOW_API_MS ? "warn" : "info";
  console[level]("[perf] api", data);
}

export function observeLongTasksAndLcp() {
  if (!isPerformanceDebugEnabled() || typeof window === "undefined" || typeof PerformanceObserver === "undefined") {
    return () => undefined;
  }

  const observers: PerformanceObserver[] = [];

  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.duration < 50) return;
        logPerf("longtask", {
          pathname: window.location.pathname,
          duration: Math.round(entry.duration * 10) / 10,
          startTime: Math.round(entry.startTime * 10) / 10,
        });
      });
    });
    longTaskObserver.observe({ entryTypes: ["longtask"] });
    observers.push(longTaskObserver);
  } catch {
    // Some browsers do not expose longtask in PerformanceObserver.
  }

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const latest = entries[entries.length - 1] as PerformanceEntry & {
        element?: Element;
        url?: string;
        size?: number;
      };
      if (!latest) return;
      const element = latest.element;
      const image = element instanceof HTMLImageElement ? element : null;
      logPerf("lcp", {
        pathname: window.location.pathname,
        startTime: Math.round(latest.startTime * 10) / 10,
        size: latest.size,
        element: element?.tagName?.toLowerCase(),
        src: image?.currentSrc || image?.src || latest.url,
        naturalWidth: image?.naturalWidth,
        naturalHeight: image?.naturalHeight,
        displayWidth: image?.clientWidth,
        displayHeight: image?.clientHeight,
      });
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    observers.push(lcpObserver);
  } catch {
    // Ignore unsupported LCP observer.
  }

  return () => observers.forEach((observer) => observer.disconnect());
}
