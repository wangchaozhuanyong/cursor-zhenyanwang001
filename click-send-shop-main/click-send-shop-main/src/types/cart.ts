import type { Product } from "./product";
import type { OrderDiscountLine, OrderPricingSnapshot, PromotionEvaluation } from "./orderPreview";

export interface CartItem {
  id?: string;
  order_item_id?: string;
  product: Product;
  variant_id?: string;
  sku_code?: string;
  variant_name?: string;
  unit_price?: number;
  subtotal?: number;
  qty: number;
  line_status?: string;
  original_qty?: number | null;
  adjusted_reason?: string;
  review_id?: string | null;
  review_status?: string | null;
  is_reviewed?: boolean;
  can_review?: boolean;
}

export interface CartSummary {
  totalAmount: number;
  totalPoints: number;
  totalItems: number;
}

export interface CartPromotionPreview {
  items: CartItem[];
  goods_amount: number;
  flash_sale_discount?: number;
  full_reduction_discount?: number;
  coupon_discount?: number;
  discount_amount: number;
  shipping_fee: number;
  final_amount: number;
  discount_lines: OrderDiscountLine[];
  reward_lines?: Array<Record<string, unknown>>;
  promotion_evaluation?: PromotionEvaluation | null;
  promotion_engine_version?: string;
  pricing_engine_version?: string;
  pricing_engine_source?: string;
  order_snapshot?: OrderPricingSnapshot | null;
  promotion_error?: string;
}
