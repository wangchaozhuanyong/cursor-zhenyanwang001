import type { AdminOrderSummary } from "@/types/order";

export const initialSummary: AdminOrderSummary = {
  pending: 0,
  paid: 0,
  shipped: 0,
  completed: 0,
  cancelled: 0,
  refunding: 0,
  refunded: 0,
  order_count: 0,
  payable_amount: 0,
  paid_amount: 0,
  net_received_amount: 0,
  outstanding_amount: 0,
  refund_amount: 0,
  activity_discount_amount: 0,
  coupon_discount_amount: 0,
  points_discount_amount: 0,
  reward_cash_discount_amount: 0,
  shipping_discount_amount: 0,
  shipping_income_amount: 0,
  shipping_cost_amount: 0,
  gross_profit_amount: 0,
  net_profit_amount: 0,
};

export const paymentMethodOptions = [
  { value: "", label: "全部支付方式" },
  { value: "online", label: "Online" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "reward_wallet", label: "返现余额" },
];

export const shippingOptions = [
  { value: "", label: "全部配送方式" },
  { value: "J&T Express", label: "J&T Express" },
  { value: "DHL", label: "DHL" },
  { value: "Self Pickup", label: "自提" },
];
