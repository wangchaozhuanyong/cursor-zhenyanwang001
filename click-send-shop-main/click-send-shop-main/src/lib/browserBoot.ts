import { getChinaBrowserCompatHint, isLikelyLegacyChinaBrowserMode } from "@/utils/chinaBrowser";

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
