/** 与服务端 imageOptimize 生成的后缀一致 */
export type UploadImageVariant = "card" | "detail" | "full";

const VARIANT_SUFFIX: Record<Exclude<UploadImageVariant, "full">, string> = {
  card: "-card",
  detail: "-detail",
};

const HASH_WEBP_RE = /^(.*\/)([a-f0-9]{32})(?:-(card|detail))?(\.webp)(\?.*)?$/i;

/** 将 card/detail 变体 URL 还原为 full（无后缀）地址，供加载失败时回退 */
export function toFullUploadImageUrl(url: string | null | undefined): string {
  const raw = String(url || "").trim();
  if (!raw) return raw;
  return raw.replace(/-(card|detail)(\.webp)(\?.*)?$/i, "$2$3");
}

/**
 * 由商品主图 URL（full）解析出列表/详情用的轻量地址。
 * 历史数据可能仅有 full 文件、无 -card/-detail，展示层需配合 ProgressiveImage 回退。
 */
export function pickUploadImageVariant(
  url: string | null | undefined,
  variant: UploadImageVariant = "full",
): string {
  const raw = String(url || "").trim();
  if (!raw || variant === "full") return raw;

  const match = raw.match(HASH_WEBP_RE);
  if (!match) return raw;

  const [, dir, id, existingSuffix, ext, query = ""] = match;
  if (existingSuffix === variant) return raw;

  const suffix = VARIANT_SUFFIX[variant];
  return `${dir}${id}${suffix}${ext}${query}`;
}

export function resolveProductImageSrc(
  url: string | null | undefined,
  variant: UploadImageVariant = "card",
): { src: string; fallbackSrc?: string } {
  const full = toFullUploadImageUrl(url) || String(url || "").trim();
  const preferred = pickUploadImageVariant(url, variant) || full;
  if (!preferred) return { src: "" };
  if (preferred === full) return { src: preferred };
  return { src: preferred, fallbackSrc: full };
}

/** 列表/卡片场景默认用 card 档，减少首屏流量 */
export function productCoverForList(url: string | null | undefined): string {
  return pickUploadImageVariant(url, "card");
}

/** 详情页主图区域 */
export function productCoverForDetail(url: string | null | undefined): string {
  return pickUploadImageVariant(url, "detail");
}

/** 用于普通 <img>：card/detail 404 时回退 full */
export function onUploadVariantImageError(img: HTMLImageElement, attemptedSrc: string): void {
  const full = toFullUploadImageUrl(attemptedSrc);
  if (!full || img.src === full) return;
  img.src = full;
}
