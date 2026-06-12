export type StableImageVariant = "thumb" | "small" | "medium" | "large" | "original";

export type StableImageSource = {
  id?: string | null;
  url?: string | null;
  publicUrl?: string | null;
  imageUrl?: string | null;
  thumbUrl?: string | null;
  smallUrl?: string | null;
  mediumUrl?: string | null;
  largeUrl?: string | null;
  updatedAt?: string | null;
  version?: string | number | null;
};

function appendStableVersion(url: string, version?: string | number | null) {
  const value = String(version ?? "").trim();
  if (!value || /[?&]v=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(value)}`;
}

export function resolveStableImageUrl(
  source: StableImageSource | string | null | undefined,
  variant: StableImageVariant = "original",
) {
  if (!source) return "";
  if (typeof source === "string") return source.trim();

  const baseUrl =
    variant === "thumb"
      ? source.thumbUrl || source.smallUrl || source.mediumUrl || source.largeUrl || source.publicUrl || source.imageUrl || source.url
      : variant === "small"
        ? source.smallUrl || source.mediumUrl || source.largeUrl || source.publicUrl || source.imageUrl || source.url
        : variant === "medium"
          ? source.mediumUrl || source.largeUrl || source.publicUrl || source.imageUrl || source.url
          : variant === "large"
            ? source.largeUrl || source.publicUrl || source.imageUrl || source.url
            : source.publicUrl || source.imageUrl || source.url;

  const resolved = String(baseUrl || "").trim();
  if (!resolved) return "";

  return appendStableVersion(resolved, source.version ?? source.updatedAt);
}
