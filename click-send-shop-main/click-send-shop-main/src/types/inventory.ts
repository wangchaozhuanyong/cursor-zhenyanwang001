export type InventoryChangeType = "in" | "out" | "adjust" | "order_deduct" | "order_release";

export interface InventoryProduct {
  id: string;
  name: string;
  cover_image: string;
  category_name: string;
  stock: number;
  default_variant_id?: string | null;
  default_variant_stock?: number;
  stock_warning_threshold: number;
  low_stock: boolean;
  status: string;
  lifecycle_status?: number;
  updated_at?: string;
}

export interface InventoryStockRecord {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  variant_id?: string | null;
  change_type: InventoryChangeType;
  quantity_delta: number;
  before_stock: number;
  after_stock: number;
  reason: string;
  ref_type: string;
  ref_id: string;
  operator_id?: string | null;
  operator_name?: string;
  created_at: string;
}
