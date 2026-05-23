import type { ProductSortType } from "@/types/product";

export type ProductSortColumn =
  | "name"
  | "category"
  | "sku"
  | "price"
  | "cost"
  | "margin"
  | "stock"
  | "sales_7d"
  | "sales_30d"
  | "sales_amount_30d"
  | "gross_profit_30d";

export const PRODUCT_SORT_COLUMN_LABELS: Record<ProductSortColumn, string> = {
  name: "商品",
  category: "分类",
  sku: "SKU",
  price: "售价",
  cost: "成本",
  margin: "毛利率",
  stock: "库存",
  sales_7d: "近7天销量",
  sales_30d: "近30天销量",
  sales_amount_30d: "近30天销售额",
  gross_profit_30d: "近30天毛利",
};

const COLUMN_SORT: Record<ProductSortColumn, { asc: ProductSortType; desc: ProductSortType }> = {
  name: { asc: "name_asc", desc: "name_desc" },
  category: { asc: "category_asc", desc: "category_desc" },
  sku: { asc: "sku_asc", desc: "sku_desc" },
  price: { asc: "price_asc", desc: "price_desc" },
  cost: { asc: "cost_asc", desc: "cost_desc" },
  margin: { asc: "margin_asc", desc: "margin_desc" },
  stock: { asc: "stock_asc", desc: "stock_desc" },
  sales_7d: { asc: "sales_7d_asc", desc: "sales_7d_desc" },
  sales_30d: { asc: "sales_30d_asc", desc: "sales_30d_desc" },
  sales_amount_30d: { asc: "sales_amount_30d_asc", desc: "sales_amount_30d_desc" },
  gross_profit_30d: { asc: "gross_profit_30d_asc", desc: "gross_profit_30d_desc" },
};

export const DEFAULT_PRODUCT_LIST_SORT: ProductSortType = "created_desc";

export function cycleProductColumnSort(current: ProductSortType, column: ProductSortColumn): ProductSortType {
  const { asc, desc } = COLUMN_SORT[column];
  if (current === desc) return asc;
  if (current === asc) return DEFAULT_PRODUCT_LIST_SORT;
  return desc;
}

export function getProductSortDirection(
  current: ProductSortType,
  column: ProductSortColumn,
): "asc" | "desc" | null {
  const { asc, desc } = COLUMN_SORT[column];
  if (current === asc) return "asc";
  if (current === desc) return "desc";
  return null;
}

export function isProductSortColumnActive(current: ProductSortType, column: ProductSortColumn): boolean {
  return getProductSortDirection(current, column) !== null;
}

export const PRODUCT_SORT_LABELS: Record<ProductSortType, string> = {
  default: "默认排序",
  sales: "销量优先",
  newest: "最新商品",
  "price-asc": "价格从低到高",
  "price-desc": "价格从高到低",
  created_desc: "最新创建",
  created_asc: "最早创建",
  name_asc: "商品名 A→Z",
  name_desc: "商品名 Z→A",
  category_asc: "分类 A→Z",
  category_desc: "分类 Z→A",
  sku_asc: "SKU 编码 A→Z",
  sku_desc: "SKU 编码 Z→A",
  price_asc: "售价从低到高",
  price_desc: "售价从高到低",
  cost_asc: "成本从低到高",
  cost_desc: "成本从高到低",
  sales_7d_asc: "近7天销量从低到高",
  sales_7d_desc: "近7天销量从高到低",
  sales_30d_asc: "近30天销量从低到高",
  sales_30d_desc: "近30天销量从高到低",
  sales_amount_30d_asc: "近30天销售额从低到高",
  sales_amount_30d_desc: "近30天销售额从高到低",
  gross_profit_30d_asc: "近30天毛利从低到高",
  gross_profit_30d_desc: "近30天毛利从高到低",
  stock_asc: "库存从低到高",
  stock_desc: "库存从高到低",
  margin_asc: "毛利率从低到高",
  margin_desc: "毛利率从高到低",
};
