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

export type OrderTab =
  | "all"
  | "pending_payment"
  | "paid"
  | "shipped"
  | "pending_review"
  | "completed"
  | "after_sale"
  | "cancelled";

export interface Order {
  id: string;
  order_no: string;
  items: CartItem[];
  raw_amount: number;
  discount_amount: number;
  goods_original_amount?: number;
  goods_sale_amount?: number;
  goods_net_sales_amount?: number;
  activity_discount_amount?: number;
  coupon_discount_amount?: number;
  shipping_original_fee?: number;
  shipping_discount_amount?: number;
  total_discount_amount?: number;
  payable_amount?: number;
  paid_amount?: number;
  net_received_amount?: number;
  outstanding_amount?: number;
  amount_snapshot?: Record<string, unknown> | null;
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
  user_nickname?: string;
  user_email?: string;
  user_phone_masked?: string;
  member_level_name?: string;
  contact_phone_masked?: string;
  shipping_phone_masked?: string;
  user_order_count?: number;
  user_total_paid_amount?: number;
  items_count?: number;
  sku_count?: number;
  items_summary?: string;
  refund_amount?: number;
  refund_status?: string;
  goods_cost_amount?: number;
  gross_profit_amount?: number;
  shipping_cost_amount?: number;
  payment_fee_amount?: number;
  net_profit_amount?: number;
  gross_margin?: number;
  missing_cost_item_count?: number;
  cost_snapshot_source?: string;
  risk_badges?: string[];
  after_sale_status?: "none" | "active" | "refunded" | "partial_refunded";
  status: OrderStatus;
  /** 支付状态（与履约 status 分离）；旧数据可能缺省，按 pending 展示 */
  payment_status?: PaymentStatus;
  payment_time?: string | null;
  paid_at?: string | null;
  payment_channel?: string;
  payment_transaction_no?: string;
  note: string;
  created_at: string;
  shipped_at?: string | null;
  cancelled_at?: string | null;
  completed_at?: string | null;
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
  /** 订单类型：normal | points_gift */
  order_type?: string;
  /** 下单/支付方式：whatsapp | online | reward_wallet | points_gift | points_plus_cash */
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
  auto_confirm_receive_enabled?: boolean;
  auto_confirm_receive_days?: number | null;
  auto_confirm_receive_deadline_at?: string | null;
  auto_confirm_receive_ttl_seconds?: number | null;
  /** 关联售后单数量（列表/详情接口返回） */
  return_request_count?: number;
  /** 进行中售后单数量 */
  active_return_count?: number;
  has_shortage_adjustment?: boolean;
  shortage_notice?: string;
  adjustments?: OrderAdjustment[];
}

export interface OrderAdjustmentItem {
  id: string;
  adjustment_id: string;
  order_id: string;
  order_item_id: string;
  product_id: string;
  variant_id?: string | null;
  sku_code?: string;
  product_name_snapshot: string;
  variant_name_snapshot?: string;
  before_qty: number;
  after_qty: number;
  removed_qty: number;
  unit_price: number;
  line_refund_amount: number;
  shortage_reason?: string;
  created_at?: string;
}

export interface OrderAdjustment {
  id: string;
  order_id: string;
  order_no: string;
  adjustment_no: string;
  adjustment_type: string;
  reason: string;
  customer_confirmed: boolean;
  customer_confirm_method?: string;
  customer_confirm_note?: string;
  before_amount?: Record<string, unknown>;
  after_amount?: Record<string, unknown>;
  refund_amount: number;
  stock_handling: string;
  status: string;
  operator_id?: string | null;
  created_at: string;
  items: OrderAdjustmentItem[];
}

export interface ShortageAdjustmentRequestItem {
  order_item_id: string;
  after_qty: number;
  shortage_reason?: string;
  correct_stock_zero?: boolean;
}

export interface ShortageAdjustmentRequest {
  reason: string;
  customer_confirmed: boolean;
  customer_confirm_method?: string;
  customer_confirm_note?: string;
  stock_handling?: "no_restore" | "correct_zero";
  items: ShortageAdjustmentRequestItem[];
}

export interface ShortageAdjustmentPreviewItem extends ShortageAdjustmentRequestItem {
  product_id: string;
  variant_id?: string;
  sku_code?: string;
  product_name_snapshot: string;
  variant_name_snapshot?: string;
  before_qty: number;
  removed_qty: number;
  unit_price: number;
  before_subtotal: number;
  after_subtotal: number;
  line_refund_amount: number;
  current_stock: number;
}

export interface ShortageAdjustmentPreview {
  order_id: string;
  order_no: string;
  before_amount: Record<string, number | string>;
  after_amount: Record<string, number | string>;
  refund_amount: number;
  refundable_amount: number;
  stock_handling: string;
  items: ShortageAdjustmentPreviewItem[];
  notice: string;
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
  shipping_template_id?: string;
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
  /** 搜索归因关键词，用于搜索分析统计下单和销售转化 */
  search_keyword?: string;
}

export interface OrderListParams {
  tab?: OrderTab;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  payment_method?: string;
  payment_channel?: string;
  shipping_name?: string;
  returnStatus?: "none" | "active" | "any" | "";
  refundStatus?: string;
  hasNote?: "1" | "0" | "";
  costStatus?: "normal" | "missing" | "";
  overduePayment?: "1" | "0" | "";
  overdueShipment?: "1" | "0" | "";
  buyerType?: "new" | "repeat" | "";
  amountMin?: number;
  amountMax?: number;
  ids?: string[];
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

export type CheckoutAbandonmentDisplayType = "order" | "checkout";
export type CheckoutAbandonmentActionType = "view_order" | "view_checkout";

export interface CheckoutAbandonment {
  id: string;
  group_key?: string;
  display_id: string;
  display_type: CheckoutAbandonmentDisplayType;
  action_type: CheckoutAbandonmentActionType;
  user_id?: string;
  status: CheckoutAbandonmentStatus;
  order_id?: string | null;
  order_no?: string;
  snapshot_count: number;
  has_duplicates: boolean;
  items_count: number;
  items_summary: CheckoutAbandonmentItem[];
  items_preview: string;
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
  order_count?: number;
  payable_amount?: number;
  paid_amount?: number;
  net_received_amount?: number;
  outstanding_amount?: number;
  refund_amount?: number;
  activity_discount_amount?: number;
  coupon_discount_amount?: number;
  points_discount_amount?: number;
  reward_cash_discount_amount?: number;
  shipping_discount_amount?: number;
  shipping_income_amount?: number;
  shipping_cost_amount?: number;
  gross_profit_amount?: number;
  net_profit_amount?: number;
  discount_amount?: number;
  today_order_count?: number;
  today_paid_order_count?: number;
  today_paid_amount?: number;
  today_refund_amount?: number;
  today_gross_profit_amount?: number;
  today_net_profit_amount?: number;
  pending_payment_amount?: number;
  pending_shipment_count?: number;
  pending_shipment_amount?: number;
  active_return_count?: number;
  overdue_unpaid_count?: number;
  overdue_shipment_count?: number;
}

export interface OrderSummary {
  total?: number;
  pending_payment: number;
  paid?: number;
  pending_ship: number;
  shipped?: number;
  pending_receive: number;
  pending_review: number;
  after_sale: number;
  completed: number;
  cancelled: number;
}
