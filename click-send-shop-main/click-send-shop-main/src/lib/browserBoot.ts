/**
 * 国产浏览器 / 旧 WebView 启动兼容：在应用主包执行前安装 shim，避免首屏脚本抛错导致 React 未挂载。
 */
export function installBrowserCompatShims(): void {
  if (typeof window === "undefined") return;

  try {
    const meta = import.meta as ImportMeta & { resolve?: (specifier: string, parent?: string) => string };
    if (typeof meta.resolve !== "function") {
      meta.resolve = (specifier) => specifier;
    }
  } catch {
    // ignore
  }

  try {
    if (!("requestIdleCallback" in window)) {
      (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback = (cb) =>
        window.setTimeout(cb, 1);
      (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback = (id) =>
        window.clearTimeout(id);
    }
  } catch {
    // ignore
  }
}
