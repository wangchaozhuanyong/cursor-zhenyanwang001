type ProductLike = {
  id?: string;
};

const DEFAULT_MAX_BLOCK_ITEMS = 24;

export function getHomeBatchListLimit(batchSize: number, maxItems = DEFAULT_MAX_BLOCK_ITEMS): number {
  const size = Math.max(1, Math.trunc(Number(batchSize) || 0));
  return Math.min(maxItems, size * 2);
}

export function preferNonOverlappingProducts<T extends ProductLike>(
  products: T[],
  excludedIds: Set<string>,
  minCount: number,
  maxCount: number,
): T[] {
  const preferred: T[] = [];
  const backfill: T[] = [];
  const seen = new Set<string>();
  const blocked = excludedIds instanceof Set ? excludedIds : new Set<string>();
  const targetMin = Math.max(0, Math.trunc(Number(minCount) || 0));
  const targetMax = Math.max(targetMin, Math.trunc(Number(maxCount) || targetMin));

  for (const product of Array.isArray(products) ? products : []) {
    const id = String(product?.id || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    if (blocked.has(id)) {
      backfill.push(product);
    } else {
      preferred.push(product);
    }
  }

  if (preferred.length >= targetMin) {
    return preferred.slice(0, targetMax);
  }

  return [...preferred, ...backfill].slice(0, Math.min(targetMax, targetMin));
}
