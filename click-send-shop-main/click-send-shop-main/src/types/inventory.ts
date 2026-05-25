export type InventoryChangeType =
  | "in"
  | "out"
  | "adjust"
  | "order_deduct"
  | "order_release"
  | "unpack_parent_out"
  | "unpack_child_in"
  | "assemble_child_out"
  | "assemble_parent_in"
  | "auto_unpack_parent_out"
  | "auto_unpack_child_in";

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
  unit_name: string;
  reserved_stock: number;
  available_stock: number;
  stock_warning_threshold: number;
  low_stock: boolean;
  out_of_stock: boolean;
  updated_at?: string;
}

export interface InventoryPackRule {
  id: string;
  parent_product_id: string;
  parent_variant_id: string;
  child_product_id: string;
  child_variant_id: string;
  parent_qty: number;
  child_qty: number;
  auto_unpack_enabled: boolean;
  manual_unpack_enabled: boolean;
  manual_assemble_enabled: boolean;
  enabled: boolean;
  remark?: string;
  parent_product_name: string;
  parent_variant_name: string;
  parent_sku_code: string;
  parent_unit_name: string;
  parent_stock: number;
  child_product_name: string;
  child_variant_name: string;
  child_sku_code: string;
  child_unit_name: string;
  child_stock: number;
  updated_by_name?: string;
  created_at?: string;
  updated_at?: string;
}

export type InventoryConversionType = "unpack" | "assemble" | "auto_unpack";

export interface InventoryConversionOrder {
  id: string;
  order_no: string;
  type: InventoryConversionType;
  rule_id: string;
  parent_product_id: string;
  parent_variant_id: string;
  parent_qty: number;
  child_product_id: string;
  child_variant_id: string;
  rule_parent_qty: number;
  child_qty_per_parent: number;
  child_total_qty: number;
  parent_before_stock: number;
  parent_after_stock: number;
  child_before_stock: number;
  child_after_stock: number;
  parent_product_name_snapshot: string;
  parent_variant_name_snapshot: string;
  parent_sku_code_snapshot: string;
  parent_unit_name_snapshot: string;
  child_product_name_snapshot: string;
  child_variant_name_snapshot: string;
  child_sku_code_snapshot: string;
  child_unit_name_snapshot: string;
  source_type: string;
  source_order_id?: string | null;
  source_order_no?: string;
  operator_id?: string | null;
  operator_name?: string;
  remark?: string;
  created_at: string;
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

export type ReplenishmentAlertStatus =
  | "pending"
  | "suggested"
  | "ordered"
  | "in_transit"
  | "partial_received"
  | "resolved"
  | "cancelled"
  | "overdue"
  | "ignored"
  | "snoozed";

export interface InventoryReplenishmentAlert {
  id: string;
  variant_id: string;
  product_id: string;
  product_name: string;
  cover_image?: string;
  variant_title: string;
  sku_code?: string;
  unit_name: string;
  alert_status: ReplenishmentAlertStatus;
  current_stock: number;
  available_stock: number;
  warning_stock: number;
  lower_limit?: number | null;
  upper_limit?: number | null;
  suggested_qty: number;
  ordered_qty: number;
  received_qty: number;
  in_transit_qty: number;
  expected_available_stock: number;
  purchase_order_id?: string | null;
  suggestion_type?: "purchase" | "unpack" | "assemble" | "clearance" | "watch" | string;
  strategy_snapshot?: Record<string, unknown> | null;
  purchase_order_no?: string;
  purchase_order_status?: string;
  expected_arrival_date?: string | null;
  reason?: string;
  remark?: string;
  last_alert_at?: string | null;
  snoozed_until?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SmartReplenishmentRunItem {
  id: string;
  run_id: string;
  variant_id: string;
  old_lower_limit?: number | null;
  old_upper_limit?: number | null;
  suggested_lower_limit: number;
  suggested_upper_limit: number;
  current_stock: number;
  available_stock: number;
  in_transit_qty: number;
  sales_qty: number;
  saleable_days: number;
  avg_daily_sales: number;
  suggested_replenishment_qty: number;
  confidence_score: number;
  reason?: string | null;
  apply_status: "pending" | "applied" | "skipped" | string;
  created_at?: string;
}

export interface SmartReplenishmentPreviewResult {
  id: string;
  status: string;
  params: Record<string, unknown>;
  items: SmartReplenishmentRunItem[];
}

export type PurchaseOrderStatus = "draft" | "ordered" | "in_transit" | "partial_received" | "received" | "cancelled" | "overdue";

export interface PurchaseOrder {
  id: string;
  order_no: string;
  supplier_id?: string | null;
  status: PurchaseOrderStatus;
  expected_arrival_date?: string | null;
  actual_arrival_date?: string | null;
  total_amount: number;
  remark?: string;
  item_count: number;
  ordered_qty: number;
  received_qty: number;
  in_transit_qty: number;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  variant_id: string;
  product_id: string;
  product_name: string;
  variant_title: string;
  sku_code?: string;
  unit_name: string;
  ordered_qty: number;
  received_qty: number;
  remaining_qty: number;
  unit_cost?: number | null;
  batch_no?: string;
  production_date?: string | null;
  shelf_life_days?: number | null;
  expiry_date?: string | null;
  supplier_sku?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseOrderDetail extends PurchaseOrder {
  items: PurchaseOrderItem[];
}
