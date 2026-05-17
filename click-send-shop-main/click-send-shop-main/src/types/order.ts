import type { CartItem } from "./cart";
import type { OrderDiscountLine } from "./orderPreview";

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
  discount_meta?: Record<string, unknown> | null;
  discount_lines?: OrderDiscountLine[];
  flash_sale_discount?: number;
  full_reduction_discount?: number;
  coupon_discount?: number;
  coupon_title: string;
  shipping_fee: number;
  shipping_name: string;
  total_amount: number;
  /** SST 快照；历史订单可能为空 */
  tax_mode?: string | null;
  tax_rate?: number | null;
  tax_label?: string | null;
  taxable_amount?: number | null;
  tax_amount?: number | null;
  tax_exclusive_amount?: number | null;
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
  /** 管理端：收货联系电话（兼容旧订单可为空，后端会回退到 contact_phone） */
  shipping_phone?: string;
  address: string;
  tracking_no?: string;
  carrier?: string;
  logistics_provider?: {
    carrier: string;
    carrier_code: string;
    tracking_no: string;
    tracking_url: string;
  } | null;
  logistics_timeline?: {
    id: string;
    order_id: string;
    tracking_no: string;
    carrier: string;
    carrier_code: string;
    status: string;
    title: string;
    description: string;
    location: string;
    event_time: string;
    source: string;
  }[];
  /** 下单/支付方式：whatsapp | online | reward_wallet */
  payment_method?: string;
  points_used?: number;
  points_discount_amount?: number;
  reward_cash_used?: number;
  reward_cash_discount_amount?: number;
  loyalty_meta?: Record<string, unknown> | null;
  /** 未支付自动关单：是否启用（与站点设置一致） */
  payment_timeout_enabled?: boolean;
  /** 超时分钟数（启用时） */
  payment_timeout_minutes?: number | null;
  /** 付款截止时间 ISO（仅待支付在线订单） */
  payment_deadline_at?: string | null;
  /** 距截止剩余秒数（接口返回时快照，前端以 payment_deadline_at 为准倒计时） */
  payment_ttl_seconds?: number | null;
}

export interface SubmitOrderParams {
  items: { product_id: string; variant_id?: string; sku_code?: string; qty: number }[];
  contact_name: string;
  contact_phone: string;
  address: string | {
    recipient_name?: string;
    phone?: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postcode: string;
    country: "MY";
  };
  note?: string;
  coupon_id?: string;
  coupon_title?: string;
  shipping_template_id?: number;
  shipping_name?: string;
  payment_method?: string;
  /** 与前端运费估算一致：总重量 kg（按件数 × 默认单件重量） */
  estimated_weight_kg?: number;
  /** 结算页快照 ID，用于将未完成结算与正式订单关联 */
  checkout_abandonment_id?: string;
  use_points?: boolean;
  points_to_use?: number;
  use_reward_cash?: boolean;
  reward_cash_amount?: number;
}

export interface OrderListParams {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  payment_method?: string;
  payment_channel?: string;
  shipping_name?: string;
  amountMin?: number;
  amountMax?: number;
  page?: number;
  pageSize?: number;
}

export type CheckoutAbandonmentStatus = "open" | "ordered" | "paid" | "closed";

export interface CheckoutAbandonmentItem {
  product_id: string;
  name?: string;
  image?: string;
  qty: number;
  price?: number;
}

export interface CheckoutAbandonment {
  id: string;
  user_id: string;
  status: CheckoutAbandonmentStatus;
  order_id?: string | null;
  order_no?: string;
  items_count: number;
  items_summary: CheckoutAbandonmentItem[];
  raw_amount: number;
  discount_amount: number;
  shipping_fee: number;
  total_amount: number;
  payment_method: string;
  contact_name: string;
  contact_phone_masked: string;
  created_at: string;
  updated_at: string;
}

export interface CheckoutAbandonmentPayload {
  checkout_abandonment_id?: string;
  items: CheckoutAbandonmentItem[];
  raw_amount?: number;
  discount_amount?: number;
  shipping_fee?: number;
  total_amount?: number;
  payment_method?: string;
  contact_name?: string;
  contact_phone?: string;
}


export interface AdminOrderSummary {
  pending: number;
  paid: number;
  shipped: number;
  completed: number;
  cancelled: number;
  refunding: number;
  refunded: number;
}

export interface OrderSummary {
  pending_payment: number;
  pending_ship: number;
  pending_receive: number;
  pending_review: number;
  after_sale: number;
  completed: number;
  cancelled: number;
}
