/** 商品/库存 SKU 共用的库存上下限与预警字段解析 */

export type StockLimitFields = {
  stock_warning_threshold?: string | number | null;
  stock_lower_limit?: string | number | null;
  stock_upper_limit?: string | number | null;
};

export function stockFieldToFormString(value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  return String(value);
}

export function resolveStockLimitsFromProduct(data: {
  stock_warning_threshold?: number | null;
  stock_lower_limit?: number | null;
  stock_upper_limit?: number | null;
  default_variant?: StockLimitFields | null;
}): { warning: string; lower: string; upper: string } {
  const dv = data.default_variant;
  return {
    warning: stockFieldToFormString(
      data.stock_warning_threshold ?? dv?.stock_warning_threshold,
    ),
    lower: stockFieldToFormString(data.stock_lower_limit ?? dv?.stock_lower_limit),
    upper: stockFieldToFormString(data.stock_upper_limit ?? dv?.stock_upper_limit),
  };
}

export function parseStockLimitInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseInt(trimmed, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
