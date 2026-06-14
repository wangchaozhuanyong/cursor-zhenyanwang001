export const THEME_PREVIEW_PARAM_NAMES = ["skin", "client_skin", "theme_skin"] as const;

export function readThemePreviewSkinId(search = typeof window !== "undefined" ? window.location.search : ""): string | null {
  if (!search) return null;
  const params = new URLSearchParams(search);
  for (const name of THEME_PREVIEW_PARAM_NAMES) {
    const value = params.get(name)?.trim();
    if (value) return value;
  }
  return null;
}

export function appendThemePreviewParams(path: string, search = typeof window !== "undefined" ? window.location.search : "") {
  if (!path || /^https?:\/\//i.test(path) || path.startsWith("mailto:") || path.startsWith("tel:")) {
    return path;
  }

  const current = new URLSearchParams(search);
  const entries = THEME_PREVIEW_PARAM_NAMES
    .map((name) => [name, current.get(name)] as const)
    .filter((entry): entry is readonly [typeof THEME_PREVIEW_PARAM_NAMES[number], string] => Boolean(entry[1]?.trim()));

  if (entries.length === 0) return path;

  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const next = new URL(path, base);
    entries.forEach(([name, value]) => {
      if (!next.searchParams.has(name)) next.searchParams.set(name, value.trim());
    });
    return `${next.pathname}${next.search}${next.hash}`;
  } catch {
    return path;
  }
}
