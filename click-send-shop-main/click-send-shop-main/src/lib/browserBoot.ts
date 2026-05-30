import { getChinaBrowserCompatHint, isLikelyLegacyChinaBrowserMode } from "@/utils/chinaBrowser";

const CHUNK_RECOVERY_STORAGE_KEY = "app:chunk-load-recovery";
const CHUNK_RECOVERY_AUTO_RELOAD_WINDOW_MS = 10 * 60 * 1000;

type ChunkRecoveryState = {
  app?: string;
  firstAt?: number;
  lastAt?: number;
  attempts?: number;
};

/**
 * 国产浏览器 / 旧 WebView 启动兼容：在应用主包执行前安装 shim，避免首屏脚本抛错导致 React 未挂载。
 */
export function installBrowserCompatShims(): void {
  if (typeof window === "undefined") return;

  polyfillGlobalThis();
  polyfillImportMetaResolve();
  polyfillRequestIdleCallback();
  polyfillObjectHasOwn();
  polyfillArrayAt();
  polyfillStringReplaceAll();
  polyfillStructuredClone();
  markBootOk();
  warnLegacyChinaBrowserMode();
}

/**
 * 捕获发布后旧页面继续运行时的动态分包 404/加载失败。
 * 这种错误通常发生在点击左侧导航或工作标签时：当前页已加载所以还能操作，
 * 但目标页面 chunk 已被发布清理，React 路由切换就会卡住。
 */
export function installChunkLoadRecovery(appName: string): void {
  if (typeof window === "undefined") return;

  const recover = (reason: unknown) => {
    if (!isChunkLoadFailure(reason)) return false;
    return recoverFromChunkLoadError(appName);
  };

  window.addEventListener(
    "error",
    (event) => {
      const target = event.target as HTMLElement | null;
      const resourceUrl =
        target instanceof HTMLScriptElement || target instanceof HTMLLinkElement
          ? target.src || target.href
          : "";
      const recovered = recover(event.error || event.message || { src: resourceUrl });
      if (recovered) event.preventDefault();
    },
    true,
  );
  window.addEventListener("unhandledrejection", (event) => {
    if (recover(event.reason)) event.preventDefault();
  });
  window.addEventListener("vite:preloadError", (event) => {
    const preloadEvent = event as Event & { payload?: unknown };
    if (recover(preloadEvent.payload || preloadEvent)) event.preventDefault();
  });
}

export function recoverFromChunkLoadError(appName = "app"): boolean {
  if (typeof window === "undefined") return false;

  try {
    const now = Date.now();
    const last = readChunkRecoveryState();
    const sameRecoveryWindow =
      typeof last.firstAt === "number" &&
      now - last.firstAt < CHUNK_RECOVERY_AUTO_RELOAD_WINDOW_MS;
    const attempts = sameRecoveryWindow ? Math.max(0, Number(last?.attempts || 0)) : 0;
    const firstAt = sameRecoveryWindow && typeof last?.firstAt === "number" ? last.firstAt : now;
    const waitForManualRefresh = attempts >= 1;

    writeChunkRecoveryState({
      app: appName,
      firstAt,
      lastAt: now,
      attempts: attempts + 1,
    });

    showChunkRecoveryNotice(waitForManualRefresh);
    if (waitForManualRefresh) return true;

    window.setTimeout(forceReloadWithCacheBuster, 300);
    return true;
  } catch {
    showChunkRecoveryNotice(true);
    return true;
  }
}

function readChunkRecoveryState(): ChunkRecoveryState | null {
  try {
    const raw = window.sessionStorage.getItem(CHUNK_RECOVERY_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ChunkRecoveryState;
  } catch {
    return null;
  }
}

function writeChunkRecoveryState(state: ChunkRecoveryState): void {
  try {
    window.sessionStorage.setItem(CHUNK_RECOVERY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function forceReloadWithCacheBuster(): void {
  try {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("__fresh", String(Date.now()));
    window.location.replace(nextUrl.toString());
  } catch {
    window.location.reload();
  }
}

export function isChunkLoadFailure(reason: unknown): boolean {
  const message = stringifyError(reason);
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk [\w.-]+ failed|ChunkLoadError|error loading dynamically imported module|Unable to preload CSS|dynamically imported module|\/assets\/[^"'\s)]+\.(?:js|mjs|css)/i.test(
    message,
  );
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

function showChunkRecoveryNotice(waitForManualRefresh: boolean): void {
  try {
    document.getElementById("chunk-load-recovery-notice")?.remove();

    const el = document.createElement("div");
    el.id = "chunk-load-recovery-notice";
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
        <div style="font-size:16px;font-weight:700;margin-bottom:8px">网站版本已更新</div>
        <div style="font-size:13px;line-height:1.7;color:#4b5563;margin-bottom:16px">
          ${waitForManualRefresh ? "自动刷新后仍未加载成功，请手动刷新页面。" : "正在刷新页面以加载最新版本。"}
        </div>
        <button type="button" style="min-height:40px;border:0;border-radius:999px;background:#f97316;color:#fff;padding:0 18px;font-weight:700;cursor:pointer">
          立即刷新
        </button>
      </div>
    `;
    el.querySelector("button")?.addEventListener("click", forceReloadWithCacheBuster);
    document.body.appendChild(el);
  } catch {
    // ignore
  }
}

function polyfillGlobalThis(): void {
  try {
    if (typeof globalThis !== "undefined") return;
    (window as Window & { globalThis?: typeof globalThis }).globalThis = window;
  } catch {
    // ignore
  }
}

function polyfillImportMetaResolve(): void {
  try {
    const meta = import.meta as ImportMeta & { resolve?: (specifier: string, parent?: string) => string };
    if (typeof meta.resolve !== "function") {
      meta.resolve = (specifier) => specifier;
    }
  } catch {
    // ignore
  }
}

function polyfillRequestIdleCallback(): void {
  try {
    if ("requestIdleCallback" in window) return;
    (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback = (cb) =>
      window.setTimeout(cb, 1);
    (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback = (id) =>
      window.clearTimeout(id);
  } catch {
    // ignore
  }
}

function polyfillObjectHasOwn(): void {
  try {
    if (Object.hasOwn) return;
    Object.hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  } catch {
    // ignore
  }
}

function polyfillArrayAt(): void {
  try {
    if (Array.prototype.at) return;
    Object.defineProperty(Array.prototype, "at", {
      value<T>(this: T[], index: number): T | undefined {
        const len = this.length;
        let n = Math.trunc(index) || 0;
        if (n < 0) n += len;
        if (n < 0 || n >= len) return undefined;
        return this[n];
      },
      writable: true,
      configurable: true,
    });
  } catch {
    // ignore
  }
}

function polyfillStringReplaceAll(): void {
  try {
    if (String.prototype.replaceAll) return;
    Object.defineProperty(String.prototype, "replaceAll", {
      value(
        this: string,
        search: string | RegExp,
        replacement: string | ((substring: string, ...args: string[]) => string),
      ): string {
        if (search instanceof RegExp) {
          if (!search.global) throw new TypeError("replaceAll requires a global RegExp");
          return this.replace(search, replacement as string);
        }
        return this.split(search).join(typeof replacement === "function" ? replacement(search) : replacement);
      },
      writable: true,
      configurable: true,
    });
  } catch {
    // ignore
  }
}

function polyfillStructuredClone(): void {
  try {
    if (typeof structuredClone === "function") return;
    (globalThis as typeof globalThis & { structuredClone?: typeof structuredClone }).structuredClone = <T>(
      value: T,
    ): T => JSON.parse(JSON.stringify(value)) as T;
  } catch {
    // ignore
  }
}

function markBootOk(): void {
  try {
    const root = document.getElementById("root");
    root?.setAttribute("data-boot-status", "ok");
    document.documentElement.setAttribute("data-app-boot", "ok");
  } catch {
    // ignore
  }
}

function warnLegacyChinaBrowserMode(): void {
  if (import.meta.env.PROD) return;
  try {
    if (!isLikelyLegacyChinaBrowserMode()) return;
    const hint = getChinaBrowserCompatHint();
    if (hint) console.warn("[browser-compat]", hint);
  } catch {
    // ignore
  }
}
