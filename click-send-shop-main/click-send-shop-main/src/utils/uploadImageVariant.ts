/** 与服务端 imageOptimize 生成的后缀一致 */
export type UploadImageVariant = "card" | "detail" | "full";

const VARIANT_SUFFIX: Record<Exclude<UploadImageVariant, "full">, string> = {
  card: "-card",
  detail: "-detail",
};

const HASH_WEBP_RE = /^(.*\/)([a-f0-9]{32})(?:-(card|detail))?(\.webp)(\?.*)?$/i;

/**
 * 由商品主图 URL（full）解析出列表/详情用的轻量地址；旧图无后缀时回退原 URL。
 */
export function pickUploadImageVariant(
  url: string | null | undefined,
  variant: UploadImageVariant = "full",
): string {
  const raw = String(url || "").trim();
  if (!raw || variant === "full") return raw;

  const match = raw.match(HASH_WEBP_RE);
  if (!match) return raw;

  const [, dir, id, , ext, query = ""] = match;
  const suffix = VARIANT_SUFFIX[variant];
  return `${dir}${id}${suffix}${ext}${query}`;
}

/** 列表/卡片场景默认用 card 档，减少首屏流量 */
export function productCoverForList(url: string | null | undefined): string {
  return pickUploadImageVariant(url, "card");
}

/** 详情页主图区域 */
export function productCoverForDetail(url: string | null | undefined): string {
  return pickUploadImageVariant(url, "detail");
}
