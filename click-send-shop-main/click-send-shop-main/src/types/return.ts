export type ReturnStatus =
  | "pending"
  | "requested"
  | "needs_evidence"
  | "approved"
  | "rejected"
  | "processing"
  | "return_in_transit"
  | "received"
  | "refunded"
  | "completed";

export type ReturnType = "refund" | "exchange" | "repair";

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
  created_at: string;
  updated_at: string;
}

export interface CreateReturnParams {
  order_id: string;
  order_item_id?: string;
  quantity?: number;
  type: ReturnType;
  reason: string;
  description: string;
  images?: string[];
  proof_images?: string[];
}

export interface ReturnListParams {
  status?: ReturnStatus;
  page?: number;
  pageSize?: number;
}
