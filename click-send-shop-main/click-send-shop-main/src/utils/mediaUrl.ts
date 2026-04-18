const UPLOADS_PREFIX = "/uploads/";

function getApiOrigin(baseUrl: string): string {
  try {
    const fallback =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    return new URL(baseUrl, fallback).origin;
  } catch {
    return "";
  }
}

function normalizeString(value: string, apiOrigin: string): string {
  if (!value.startsWith(UPLOADS_PREFIX)) return value;
  return apiOrigin ? `${apiOrigin}${value}` : value;
}

export function normalizeMediaUrls<T>(input: T, baseUrl: string): T {
  const apiOrigin = getApiOrigin(baseUrl);

  const walk = (node: unknown): unknown => {
    if (typeof node === "string") return normalizeString(node, apiOrigin);
    if (Array.isArray(node)) return node.map((item) => walk(item));
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node)) out[k] = walk(v);
      return out;
    }
    return node;
  };

  return walk(input) as T;
}
