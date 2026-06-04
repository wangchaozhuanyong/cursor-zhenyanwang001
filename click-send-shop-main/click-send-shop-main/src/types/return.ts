import type { PaginationParams } from "@/types/common";

export type ReturnStatus =
  | "pending"
  | "need_evidence"
  | "approved"
  | "rejected"
  | "processing"
  | "waiting_return"
  | "return_in_transit"
  | "received"
  | "refund_pending"
  | "refunded"
  | "exchange_shipping"
  | "completed"
  | "cancelled";

export type ReturnType = "refund" | "return_refund" | "exchange" | "repair";

export interface ReturnRequest {
  id: string;
  order_id: string;
  order_no: string;
  order_item_id?: string | null;
  product_id?: string | null;
  variant_id?: string | null;
  sku_code?: string;
  quantity?: number;
  type: ReturnType;
  reason: string;
  description: string;
  images: string[];
  status: ReturnStatus;
  refund_amount?: number;
  admin_remark?: string;
  contact_phone?: string;
  product_name?: string;
  product_image?: string;
  variant_name?: string;
  purchased_qty?: number;
  unit_price?: number;
  item_info?: {
    product_name?: string;
    product_image?: string;
    variant_name?: string;
    sku_code?: string;
    purchased_qty?: number;
    request_qty?: number;
    unit_price?: number;
  };
  events?: ReturnEvent[];
  shipments?: ReturnShipment[];
  created_at: string;
  updated_at: string;
}

export interface CreateReturnParams {
  order_id: string;
  order_item_id: string;
  quantity: number;
  type: ReturnType;
  reason: string;
  description: string;
  images?: string[];
  proof_images?: string[];
  contact_phone?: string;
}

export interface ReturnEvent {
  id: string;
  return_id: string;
  user_id?: string | null;
  actor_type: "user" | "admin" | "system" | string;
  actor_id?: string | null;
  event_type: string;
  from_status?: ReturnStatus | string | null;
  to_status?: ReturnStatus | string | null;
  title: string;
  note?: string | null;
  payload?: Record<string, unknown> | string | null;
  created_at: string;
}

export interface ReturnShipment {
  id: string;
  return_id: string;
  direction: "buyer_return" | "merchant_exchange" | string;
  carrier: string;
  tracking_no: string;
  contact_phone?: string;
  note?: string | null;
  created_by_type?: string;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ReturnEvidenceParams {
  description?: string;
  images?: string[];
  proof_images?: string[];
}

export interface ReturnLogisticsParams {
  carrier: string;
  tracking_no: string;
  contact_phone?: string;
  note?: string;
}

export interface CancelReturnParams {
  reason?: string;
}

export interface ApproveReturnParams {
  refund_amount: number;
  admin_remark?: string;
  restore_inventory?: boolean;
  rollback_points_rewards?: boolean;
  refund_mode?: "none" | "manual" | "provider";
  restore_stock?: boolean;
  restore_coupon?: boolean;
  reverse_points?: boolean;
  reverse_rewards?: boolean;
}

export type ReturnListParams = Partial<PaginationParams> & {
  status?: ReturnStatus | string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
};

export interface ReturnRefundRecordRow {
  id: string;
  event_type: string;
  processing_result: string;
  created_at: string;
}

export interface ReturnInventoryRestoreRow {
  id: string;
  quantity_delta: number;
  created_at: string;
}

export interface ReturnOperationLogRow {
  id: string;
  summary?: string;
  result?: string;
  created_at: string;
}

/** 管理端售后详情（含关联订单/用户/商品与处理记录） */
export interface ReturnDetail extends ReturnRequest {
  user_info?: { name?: string; phone?: string };
  order_info?: {
    order_no?: string;
    total_amount?: number;
    payment_status?: string;
    status?: string;
  };
  item_info?: { product_name?: string; sku_code?: string; request_qty?: number };
  refund_records?: ReturnRefundRecordRow[];
  inventory_restore_records?: ReturnInventoryRestoreRow[];
  operation_logs?: ReturnOperationLogRow[];
  events?: ReturnEvent[];
  shipments?: ReturnShipment[];
}
