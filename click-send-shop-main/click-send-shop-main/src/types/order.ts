import type { CartItem } from "./cart";

export type OrderStatus =
  | "pending"
  | "paid"
  | "shipped"
  | "completed"
  | "cancelled"
  | "refunding"
  | "refunded";

/** 与后端 orders.payment_status 一致；报表支付口径优先用此字段 */
export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";

export interface Order {
  id: string;
  order_no: string;
  items: CartItem[];
  raw_amount: number;
  discount_amount: number;
  coupon_title: string;
  shipping_fee: number;
  shipping_name: string;
  total_amount: number;
  total_points: number;
  status: OrderStatus;
  /** 支付状态（与履约 status 分离）；旧数据可能缺省，按 pending 展示 */
  payment_status?: PaymentStatus;
  payment_time?: string | null;
  payment_channel?: string;
  payment_transaction_no?: string;
  note: string;
  created_at: string;
  contact_name: string;
  contact_phone: string;
  address: string;
  tracking_no?: string;
  carrier?: string;
  /** 下单时选择：whatsapp | online */
  payment_method?: string;
}

export interface SubmitOrderParams {
  items: { product_id: string; qty: number }[];
  contact_name: string;
  contact_phone: string;
  address: string;
  note?: string;
  coupon_id?: string;
  coupon_title?: string;
  shipping_template_id?: number;
  shipping_name?: string;
  payment_method?: string;
  /** 与前端运费估算一致：总重量 kg（按件数 × 默认单件重量） */
  estimated_weight_kg?: number;
}

export interface OrderListParams {
  status?: OrderStatus;
  /** 管理端：支付状态筛选 */
  paymentStatus?: PaymentStatus;
  /** 管理端：订单号 / 联系人模糊 */
  keyword?: string;
  page?: number;
  pageSize?: number;
}
