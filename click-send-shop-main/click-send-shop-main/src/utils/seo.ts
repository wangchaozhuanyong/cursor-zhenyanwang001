function trimTrailingSlash(input: string): string {
  return String(input || "").trim().replace(/\/+$/, "");
}

export function stripHtml(input: string): string {
  if (!input) return "";
  return String(input)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateText(input: string, max = 150): string {
  const text = String(input || "").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1)).trim()}…`;
}

export function getPublicSiteUrl(): string {
  const fromEnv = (import.meta.env.PUBLIC_APP_URL as string | undefined)
    || (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined);
  if (fromEnv && String(fromEnv).trim()) return trimTrailingSlash(fromEnv);
  if (typeof window !== "undefined" && window.location?.origin) return trimTrailingSlash(window.location.origin);
  return "";
}

export function toAbsoluteUrl(url?: string): string {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = getPublicSiteUrl();
  if (!base) return raw;
  return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
}

export function buildCanonical(pathname: string, search = "", options?: { keepParams?: string[] }): string {
  const base = getPublicSiteUrl();
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const keep = new Set((options?.keepParams || []).filter(Boolean));
  const current = new URLSearchParams(search || "");
  const next = new URLSearchParams();
  for (const [k, v] of current.entries()) {
    if (keep.has(k)) next.set(k, v);
  }
  const query = next.toString();
  return `${base}${path}${query ? `?${query}` : ""}`;
}

export function escapeForMeta(input: string): string {
  return String(input || "")
    .replace(/[<>"']/g, (ch) => ({
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    }[ch] as string))
    .trim();
}

function upsertMeta(selector: string, attr: "name" | "property", key: string, content: string): void {
  if (typeof document === "undefined") return;
  const value = escapeForMeta(content);
  if (!value) return;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

export function upsertMetaByName(name: string, content: string): void {
  upsertMeta(`meta[name="${name}"]`, "name", name, content);
}

export function upsertMetaByProperty(property: string, content: string): void {
  upsertMeta(`meta[property="${property}"]`, "property", property, content);
}

export function upsertLinkRel(rel: string, href: string): void {
  if (typeof document === "undefined") return;
  const url = String(href || "").trim();
  if (!url) return;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", url);
}

export function upsertJsonLd(id: string, data: object): void {
  if (typeof document === "undefined" || !id || !data) return;
  const selector = `script[type="application/ld+json"][data-seo-id="${id}"]`;
  let el = document.head.querySelector<HTMLScriptElement>(selector);
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-seo-id", id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function removeJsonLd(id: string): void {
  if (typeof document === "undefined" || !id) return;
  document.head.querySelector(`script[type="application/ld+json"][data-seo-id="${id}"]`)?.remove();
}
