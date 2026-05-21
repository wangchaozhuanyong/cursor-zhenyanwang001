const DISMISS_KEY = "pwa-update-dismissed-token";

function swScriptPath() {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/?$/, "/")}sw.js`;
}

/** 用 sw.js 的 ETag / Last-Modified / 内容摘要识别「这一版」部署，避免仅路径相同却反复弹窗 */
export async function fetchSwVersionToken(): Promise<string> {
  try {
    const res = await fetch(swScriptPath(), {
      cache: "no-store",
      credentials: "same-origin",
    });
    const etag = res.headers.get("etag");
    if (etag) return etag.replace(/^"|"$/g, "");
    const lastModified = res.headers.get("last-modified");
    if (lastModified) return lastModified;
    const text = await res.text();
    const indexRevision = text.match(/\{url:"index\.html",revision:"([^"]+)"/)?.[1];
    if (indexRevision) return `index:${indexRevision}`;
    return `${text.length}:${text.slice(0, 96)}`;
  } catch {
    return "";
  }
}

export function getDismissedSwToken(): string | null {
  try {
    return sessionStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

export function setDismissedSwToken(token: string): void {
  if (!token) return;
  try {
    sessionStorage.setItem(DISMISS_KEY, token);
  } catch {
    // ignore quota / private mode
  }
}

export function clearDismissedSwToken(): void {
  try {
    sessionStorage.removeItem(DISMISS_KEY);
  } catch {
    // ignore
  }
}

export async function isCurrentUpdateDismissed(): Promise<boolean> {
  const dismissed = getDismissedSwToken();
  if (!dismissed) return false;
  const current = await fetchSwVersionToken();
  return Boolean(current) && dismissed === current;
}
