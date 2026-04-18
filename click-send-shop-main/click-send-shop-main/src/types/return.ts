export type ReturnStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "processing"
  | "completed";

export type ReturnType = "refund" | "exchange" | "repair";

export interface ReturnRequest {
  id: string;
  order_id: string;
  order_no: string;
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
  type: ReturnType;
  reason: string;
  description: string;
  images?: string[];
}

export interface ReturnListParams {
  status?: ReturnStatus;
  page?: number;
  pageSize?: number;
}
