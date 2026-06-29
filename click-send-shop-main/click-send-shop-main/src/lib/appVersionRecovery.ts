const LEGACY_CHUNK_RECOVERY_STORAGE_KEY = "app:chunk-load-recovery";
const RECOVERY_STORAGE_PREFIX = "app:version-recovery:";
const RECOVERY_AUTO_RELOAD_WINDOW_MS = 10 * 60 * 1000;
const AUTO_RELOAD_ATTEMPT_LIMIT = 1;
const CLEANUP_TIMEOUT_MS = 4_000;
const FRESH_QUERY_PARAM = "__fresh";
const RECOVERY_NOTICE_ID = "chunk-load-recovery-notice";
const GLOBAL_RECOVERY_FLAG = "__appVersionRecoveryInProgress__";
const GLOBAL_RECOVERY_SUPPRESSED_UNTIL_FLAG = "__appVersionRecoverySuppressedUntil__";
const FRONTEND_CACHE_EVENT_TYPE = "frontend_chunk_load_failed";
const FRONTEND_CACHE_EVENT_MODULE = "frontend_cache";

const ASSET_URL_RE = /\/assets\/[^"'\s)]+\.(?:js|mjs|css)/i;
const CHUNK_LOAD_ERROR_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk [\w.-]+ failed|ChunkLoadError|error loading dynamically imported module|Unable to preload CSS|dynamically imported module|Importing module from .* was blocked|module script failed|Expected a JavaScript module script|disallowed MIME type|MIME type ["']?text\/html|404(?: \(Not Found\))?.*\/assets\/|\/assets\/[^"'\s)]+\.(?:js|mjs|css)/i;
const APP_CACHE_RE = /workbox|precache|vite|pwa|app-shell|chunk/i;

export type AppVersionRecoveryState = {
  app: string;
  firstAt: number;
  lastAt: number;
  attempts: number;
  reason?: string;
  assetUrl?: string;
};

export type AppVersionRecoveryPlan = {
  state: AppVersionRecoveryState;
  shouldAutoReload: boolean;
  isRepeatedFailure: boolean;
};

export type AppVersionRecoveryEventPayload = {
  event_type: typeof FRONTEND_CACHE_EVENT_TYPE;
  module: typeof FRONTEND_CACHE_EVENT_MODULE;
  page: string;
  path: string;
  url: string;
  title: string;
  keyword?: string;
  dedupe_key: string;
  traffic_source: "auto_recovery" | "manual_recovery";
  browser_language?: string;
  screen_width?: number;
  screen_height?: number;
  viewport_width?: number;
  viewport_height?: number;
};

declare global {
  interface Window {
    __appVersionRecoveryInProgress__?: boolean;
    __appVersionRecoverySuppressedUntil__?: number;
  }
}

export function installAppVersionRecovery(appName: string): () => void {
  if (typeof window === "undefined") return () => undefined;

  const recover = (reason: unknown) => {
    if (!isChunkLoadFailure(reason)) return false;
    if (isAppVersionRecoverySuppressed()) return false;
    return recoverFromAppVersionLoadFailure(appName, reason);
  };

  const onError = (event: ErrorEvent | Event) => {
    const target = event.target;
    const resourceUrl =
      target instanceof HTMLScriptElement || target instanceof HTMLLinkElement
        ? target.src || target.href
        : "";
    const errorEvent = event as ErrorEvent;
    const recovered = recover(errorEvent.error || errorEvent.message || { src: resourceUrl });
    if (recovered && "preventDefault" in event) event.preventDefault();
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (recover(event.reason)) event.preventDefault();
  };

  const onPreloadError = (event: Event) => {
    const preloadEvent = event as Event & { payload?: unknown };
    if (recover(preloadEvent.payload || preloadEvent)) event.preventDefault();
  };

  window.addEventListener("error", onError, true);
  window.addEventListener("unhandledrejection", onUnhandledRejection);
  window.addEventListener("vite:preloadError", onPreloadError);

  return () => {
    window.removeEventListener("error", onError, true);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
    window.removeEventListener("vite:preloadError", onPreloadError);
  };
}

export function recoverFromAppVersionLoadFailure(appName = "app", reason?: unknown): boolean {
  if (typeof window === "undefined") return false;
  if (window[GLOBAL_RECOVERY_FLAG]) return true;

  window[GLOBAL_RECOVERY_FLAG] = true;
  void runRecovery(appName, reason);
  return true;
}

export function retryAppVersionRecovery(appName = "app"): void {
  if (typeof window === "undefined") return;
  if (window[GLOBAL_RECOVERY_FLAG]) return;

  window[GLOBAL_RECOVERY_FLAG] = true;
  showRecoveryNotice(appName, true);
  void withTimeout(clearAppVersionRuntimeCaches({ hardResetServiceWorker: true }), CLEANUP_TIMEOUT_MS)
    .then(forceReloadWithCacheBuster)
    .catch(() => {
      window[GLOBAL_RECOVERY_FLAG] = false;
      showRecoveryNotice(appName, true);
    });
}

export function markAppVersionReady(appName = "app"): void {
  if (typeof window === "undefined") return;

  clearAppVersionRecoveryState(appName);
  window[GLOBAL_RECOVERY_FLAG] = false;
  removeRecoveryNotice();
  removeFreshQueryParam();
}

export function clearAppVersionRecoveryState(_appName = "app"): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(LEGACY_CHUNK_RECOVERY_STORAGE_KEY);
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (key?.startsWith(RECOVERY_STORAGE_PREFIX)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // ignore
  }
}

export function isChunkLoadFailure(reason: unknown): boolean {
  return CHUNK_LOAD_ERROR_RE.test(stringifyError(reason));
}

export function suppressAppVersionRecovery(ms = 2_500): void {
  if (typeof window === "undefined") return;

  const nextUntil = Date.now() + Math.max(0, ms);
  const currentUntil = Number(window[GLOBAL_RECOVERY_SUPPRESSED_UNTIL_FLAG] || 0);
  window[GLOBAL_RECOVERY_SUPPRESSED_UNTIL_FLAG] = Math.max(currentUntil, nextUntil);
}

export function isAppVersionRecoverySuppressed(now = Date.now()): boolean {
  if (typeof window === "undefined") return false;
  return Number(window[GLOBAL_RECOVERY_SUPPRESSED_UNTIL_FLAG] || 0) > now;
}

export function getAppVersionRecoveryStorageKey(appName = "app"): string {
  return `${RECOVERY_STORAGE_PREFIX}${normalizeAppName(appName)}`;
}

export function resolveAppVersionRecoveryPlan(
  previous: AppVersionRecoveryState | null,
  now = Date.now(),
  appName = "app",
  reason?: unknown,
): AppVersionRecoveryPlan {
  const sameRecoveryWindow =
    typeof previous?.firstAt === "number" && now - previous.firstAt < RECOVERY_AUTO_RELOAD_WINDOW_MS;
  const attempts = sameRecoveryWindow ? Math.max(0, Number(previous?.attempts || 0)) : 0;
  const firstAt = sameRecoveryWindow && typeof previous?.firstAt === "number" ? previous.firstAt : now;
  const shouldAutoReload = attempts < AUTO_RELOAD_ATTEMPT_LIMIT;
  const reasonText = stringifyError(reason).slice(0, 500);
  const assetUrl = extractAssetUrl(reason);

  return {
    shouldAutoReload,
    isRepeatedFailure: !shouldAutoReload,
    state: {
      app: normalizeAppName(appName),
      firstAt,
      lastAt: now,
      attempts: attempts + 1,
      ...(reasonText ? { reason: reasonText } : {}),
      ...(assetUrl ? { assetUrl } : {}),
    },
  };
}

async function runRecovery(appName: string, reason?: unknown): Promise<void> {
  const normalizedAppName = normalizeAppName(appName);

  try {
    const plan = resolveAppVersionRecoveryPlan(
      readAppVersionRecoveryState(normalizedAppName),
      Date.now(),
      normalizedAppName,
      reason,
    );

    const shouldAutoReload = plan.shouldAutoReload && !hasFreshQueryParam();
    const waitForManualRefresh = plan.isRepeatedFailure || !shouldAutoReload;

    writeAppVersionRecoveryState(normalizedAppName, plan.state);
    reportAppVersionRecovery(normalizedAppName, plan.state, waitForManualRefresh);
    showRecoveryNotice(normalizedAppName, waitForManualRefresh);

    await withTimeout(
      clearAppVersionRuntimeCaches({
        hardResetServiceWorker: plan.isRepeatedFailure,
      }),
      CLEANUP_TIMEOUT_MS,
    );

    if (shouldAutoReload) {
      forceReloadWithCacheBuster();
      return;
    }

    window[GLOBAL_RECOVERY_FLAG] = false;
  } catch {
    window[GLOBAL_RECOVERY_FLAG] = false;
    showRecoveryNotice(normalizedAppName, true);
  }
}

export function buildAppVersionRecoveryEventPayload(
  appName: string,
  state: AppVersionRecoveryState,
  isRepeatedFailure: boolean,
): AppVersionRecoveryEventPayload | null {
  if (typeof window === "undefined") return null;

  const path = window.location.pathname || "/";
  const assetOrReason = (state.assetUrl || state.reason || "chunk_load_failed").slice(0, 100);

  return {
    event_type: FRONTEND_CACHE_EVENT_TYPE,
    module: FRONTEND_CACHE_EVENT_MODULE,
    page: path,
    path,
    url: window.location.href,
    title: "前端缓存不一致：chunk 加载失败",
    keyword: assetOrReason,
    dedupe_key: [
      FRONTEND_CACHE_EVENT_TYPE,
      normalizeAppName(appName),
      Math.floor(Number(state.firstAt || Date.now()) / 60_000),
      assetOrReason,
    ].join(":").slice(0, 128),
    traffic_source: isRepeatedFailure ? "manual_recovery" : "auto_recovery",
    browser_language: navigator.language,
    screen_width: window.screen?.width,
    screen_height: window.screen?.height,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
  };
}

function reportAppVersionRecovery(
  appName: string,
  state: AppVersionRecoveryState,
  isRepeatedFailure: boolean,
): void {
  const payload = buildAppVersionRecoveryEventPayload(appName, state, isRepeatedFailure);
  if (!payload || typeof navigator === "undefined") return;

  const body = JSON.stringify(payload);
  const endpoint = `${getApiBaseUrl()}/analytics/events`;

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(endpoint, blob)) return;
    }
  } catch {
    // ignore
  }

  try {
    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      credentials: "include",
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // ignore
  }
}

function readAppVersionRecoveryState(appName: string): AppVersionRecoveryState | null {
  try {
    const scoped = window.sessionStorage.getItem(getAppVersionRecoveryStorageKey(appName));
    const raw = scoped || window.sessionStorage.getItem(LEGACY_CHUNK_RECOVERY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppVersionRecoveryState>;
    if (typeof parsed !== "object" || !parsed) return null;
    return {
      app: normalizeAppName(parsed.app || appName),
      firstAt: Number(parsed.firstAt || 0),
      lastAt: Number(parsed.lastAt || 0),
      attempts: Number(parsed.attempts || 0),
      ...(parsed.reason ? { reason: String(parsed.reason) } : {}),
      ...(parsed.assetUrl ? { assetUrl: String(parsed.assetUrl) } : {}),
    };
  } catch {
    return null;
  }
}

function writeAppVersionRecoveryState(appName: string, state: AppVersionRecoveryState): void {
  try {
    window.sessionStorage.setItem(getAppVersionRecoveryStorageKey(appName), JSON.stringify(state));
    window.sessionStorage.removeItem(LEGACY_CHUNK_RECOVERY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

async function clearAppVersionRuntimeCaches(options: { hardResetServiceWorker?: boolean } = {}): Promise<void> {
  const jobs: Promise<unknown>[] = [];

  try {
    if ("caches" in window) {
      jobs.push(
        window.caches
          .keys()
          .then((keys) =>
            Promise.all(
              keys.filter((key) => APP_CACHE_RE.test(key)).map((key) => window.caches.delete(key)),
            ),
          ),
      );
    }
  } catch {
    // ignore
  }

  try {
    if ("serviceWorker" in navigator) {
      jobs.push(
        navigator.serviceWorker.getRegistrations().then((registrations) =>
          Promise.all(
            registrations.map(async (registration) => {
              try {
                await registration.update();
              } catch {
                // ignore
              }

              try {
                registration.waiting?.postMessage({ type: "SKIP_WAITING" });
              } catch {
                // ignore
              }

              if (options.hardResetServiceWorker) {
                try {
                  await registration.unregister();
                } catch {
                  // ignore
                }
              }
            }),
          ),
        ),
      );
    }
  } catch {
    // ignore
  }

  await Promise.allSettled(jobs);
}

function showRecoveryNotice(appName: string, waitForManualRefresh: boolean): void {
  try {
    removeRecoveryNotice();

    const el = document.createElement("div");
    el.id = RECOVERY_NOTICE_ID;
    el.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:99999",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "background:rgba(15,23,42,.52)",
      "backdrop-filter:blur(3px)",
      "font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif",
    ].join(";");
    el.innerHTML = `
      <div style="max-width:360px;margin:16px;padding:20px;border-radius:18px;background:#fff;color:#111827;text-align:center;box-shadow:0 20px 45px rgba(15,23,42,.24)">
        <div style="font-size:16px;font-weight:700;margin-bottom:8px">${
          waitForManualRefresh ? "需要重新加载最新版" : "正在修复网站版本"
        }</div>
        <div style="font-size:13px;line-height:1.7;color:#4b5563;margin-bottom:16px">
          ${
            waitForManualRefresh
              ? "自动修复后仍未成功，请点击下方按钮清理旧缓存并重新加载。"
              : "正在清理旧缓存，稍后会自动重新加载页面。"
          }
        </div>
        <button type="button" style="min-height:40px;border:0;border-radius:999px;background:#f97316;color:#fff;padding:0 18px;font-weight:700;cursor:pointer">
          重新加载
        </button>
      </div>
    `;
    const card = el.firstElementChild;
    const titleEl = card?.children.item(0);
    const descriptionEl = card?.children.item(1);
    const buttonEl = el.querySelector("button");
    if (titleEl) {
      titleEl.textContent = waitForManualRefresh ? "需要重新加载最新版本" : "正在修复网站版本";
    }
    if (descriptionEl) {
      descriptionEl.textContent = waitForManualRefresh
        ? "自动修复后仍未成功，请点击下方按钮清理旧缓存并重新加载。"
        : "正在清理旧缓存，稍后会自动重新加载页面。";
    }
    if (buttonEl) buttonEl.textContent = "重新加载";
    buttonEl?.addEventListener("click", () => retryAppVersionRecovery(appName));
    (document.body || document.documentElement).appendChild(el);
  } catch {
    // ignore
  }
}

function removeRecoveryNotice(): void {
  try {
    document.getElementById(RECOVERY_NOTICE_ID)?.remove();
  } catch {
    // ignore
  }
}

function forceReloadWithCacheBuster(): void {
  try {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set(FRESH_QUERY_PARAM, String(Date.now()));
    window.location.replace(nextUrl.toString());
  } catch {
    window.location.reload();
  }
}

function hasFreshQueryParam(): boolean {
  try {
    return new URL(window.location.href).searchParams.has(FRESH_QUERY_PARAM);
  } catch {
    return false;
  }
}

function removeFreshQueryParam(): void {
  try {
    const currentUrl = new URL(window.location.href);
    if (!currentUrl.searchParams.has(FRESH_QUERY_PARAM)) return;
    currentUrl.searchParams.delete(FRESH_QUERY_PARAM);
    window.history.replaceState(window.history.state, document.title, currentUrl.toString());
  } catch {
    // ignore
  }
}

function normalizeAppName(appName: string): string {
  const normalized = String(appName || "app").trim().toLowerCase();
  return normalized.replace(/[^a-z0-9_-]+/g, "-") || "app";
}

function withTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T | undefined> {
  if (typeof window === "undefined") return task;

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => resolve(undefined), timeoutMs);
    task
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
    });
  });
}

function getApiBaseUrl(): string {
  const base = String(import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
  return base || "/api";
}

function stringifyError(reason: unknown): string {
  if (typeof reason === "string") return reason;
  if (reason instanceof Error) return `${reason.name}: ${reason.message}\n${reason.stack || ""}`;
  if (reason && typeof reason === "object") {
    const record = reason as Record<string, unknown>;
    const target = record.target as Record<string, unknown> | undefined;
    return [
      record.name,
      record.message,
      record.reason,
      record.type,
      record.src,
      record.href,
      record.url,
      record.filename,
      target?.src,
      target?.href,
      record.payload && record.payload !== reason ? stringifyError(record.payload) : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function extractAssetUrl(reason: unknown): string | undefined {
  const text = stringifyError(reason);
  return text.match(ASSET_URL_RE)?.[0];
}
