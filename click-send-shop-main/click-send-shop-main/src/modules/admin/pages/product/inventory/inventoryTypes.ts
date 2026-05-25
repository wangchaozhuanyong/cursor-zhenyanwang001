import type {
  InventoryConversionOrder,
  InventoryPackRule,
  InventoryReplenishmentAlert,
  InventorySku,
  InventoryStockRecord,
  PurchaseOrder,
  SmartReplenishmentPreviewResult,
} from "@/types/inventory";
import type { InventoryChangeType } from "@/types/inventory";
import type { InventoryTabKey, SmartViewKey } from "@/modules/admin/pages/product/inventory/inventoryConstants";

export type { InventoryTabKey, SmartViewKey };

export type AdjustForm = {
  sku: InventorySku;
  change_type: "in" | "out" | "adjust";
  quantity: string;
  reason: string;
  remark: string;
  source_no: string;
  cost_price: string;
};

export type BatchAdjustForm = {
  change_type: "in" | "out" | "adjust";
  quantity: string;
  reason: string;
  remark: string;
  source_no: string;
  cost_price: string;
};

export const EMPTY_BATCH_ADJUST: BatchAdjustForm = {
  change_type: "in",
  quantity: "",
  reason: "",
  remark: "",
  source_no: "",
  cost_price: "",
};

export type BatchThresholdForm = { threshold: string };

export type SmartReplenishmentForm = {
  analysis_days: string;
  strategy: string;
  lead_time_days: string;
  safety_stock_days: string;
  target_cover_days: string;
  min_floor_stock: string;
  purchase_multiple: string;
};

export type SmartEditMap = Record<string, { lower: string; upper: string; qty: string }>;

export type RuleForm = Partial<InventoryPackRule> & { id?: string };

export type ConvertForm = {
  type: "unpack" | "assemble";
  rule: InventoryPackRule;
  parent_qty: string;
  remark: string;
};

export type PurchaseFromAlertForm = {
  alert: InventoryReplenishmentAlert;
  ordered_qty: string;
  unit_cost: string;
  expected_arrival_date: string;
  remark: string;
};

export type ReceivePurchaseOrderForm = {
  order: PurchaseOrder;
  remark: string;
  actual_arrival_date: string;
  items: Record<string, { received_qty: string; unit_cost: string }>;
};

export type InventoryLabels = {
  L: (zh: string) => string;
  tText: (zh: string) => string;
  changeLabel: (key: string) => string;
  conversionLabel: (key: string) => string;
};
