/** 商品销量展示（列表卡、详情等共用） */
export function formatProductSales(n: number): string {
  const value = Math.max(0, Number(n) || 0);
  if (value >= 10000) return `${(value / 10000).toFixed(1).replace(/\.0$/, "")}w+`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k+`;
  return String(value);
}

export function productSalesLabel(n: number): string {
  return `销量 ${formatProductSales(n)}`;
}
