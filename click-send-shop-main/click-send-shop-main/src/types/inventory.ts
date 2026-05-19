export type InventoryChangeType = "in" | "out" | "adjust" | "order_deduct" | "order_release";

export interface InventorySummary {
  total_products: number;
  total_skus: number;
  total_stock: number;
  low_stock_skus: number;
  out_of_stock_skus: number;
  today_in_qty: number;
  today_out_qty: number;
  today_order_deduct_qty: number;
}

export interface InventorySku {
  product_id: string;
  product_name: string;
  cover_image: string;
  category_name: string;
  lifecycle_status: number;
  variant_id: string;
  variant_title: string;
  spec_text?: string;
  sku_code: string;
  barcode?: string;
  price?: number;
  cost_price?: number | null;
  enabled?: boolean;
  stock: number;
  reserved_stock: number;
  available_stock: number;
  stock_warning_threshold: number;
  low_stock: boolean;
  out_of_stock: boolean;
  updated_at?: string;
}

export interface InventoryStockRecord {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  variant_id?: string | null;
  variant_name?: string;
  sku_code?: string;
  change_type: InventoryChangeType;
  quantity_delta: number;
  before_stock: number;
  after_stock: number;
  reason: string;
  remark?: string;
  source_no?: string;
  ref_type: string;
  ref_id: string;
  order_no?: string;
  operator_id?: string | null;
  operator_name?: string;
  created_at: string;
}

