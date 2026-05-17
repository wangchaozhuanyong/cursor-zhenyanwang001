/** 商品销量展示（列表卡、详情等共用；与库存/售罄状态无关） */
export function getProductSalesCount(salesCount?: number | null): number {
  return Math.max(0, Number(salesCount) || 0);
}

export function hasProductSales(salesCount?: number | null): boolean {
  return getProductSalesCount(salesCount) > 0;
}

export function formatProductSales(n: number): string {
  const value = getProductSalesCount(n);
  if (value >= 10000) return `${(value / 10000).toFixed(1).replace(/\.0$/, "")}w+`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k+`;
  return String(value);
}

/** 列表卡等紧凑场景 */
export function productSalesLabel(n: number): string {
  return `销量 ${formatProductSales(n)}`;
}

/** 详情页价格行 */
export function productSalesDetailLabel(n: number): string {
  return `已售 ${getProductSalesCount(n).toLocaleString()} 件`;
}
