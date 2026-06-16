export type OrderDiscountLine = {
  type: string;
  label: string;
  amount: number;
};

export type OrderPointsBonusLine = {
  type: "points_bonus";
  label: string;
  multiplier_percent: number;
  activity_id?: string;
};

export type PromotionUnavailableReason = {
  promotion_id?: string | null;
  type: string;
  title?: string;
  reason: string;
  current_amount?: number;
  threshold_amount?: number;
  shortfall_amount?: number;
};

export type PromotionEvaluation = {
  engine_version: string;
  eligible: boolean;
  applied: Array<Record<string, unknown>>;
  unavailable_reasons: PromotionUnavailableReason[];
  discount_lines: OrderDiscountLine[];
  reward_lines: Array<Record<string, unknown>>;
  matched_items: Array<Record<string, unknown>>;
  stacking_result: Record<string, unknown>;
  order_snapshot: OrderPricingSnapshot;
};

export type OrderPricingSnapshot = {
  goods_amount?: number;
  activity_discount_amount?: number;
  coupon_discount_amount?: number;
  shipping_fee?: number;
  total_discount_amount?: number;
  final_amount?: number;
  coupon_id?: string | null;
  item_count?: number;
  items?: Array<Record<string, unknown>>;
};

export type OrderPreviewResult = {
  goods_amount: number;
  flash_sale_discount: number;
  full_reduction_discount: number;
  coupon_discount: number;
  discount_amount: number;
  shipping_fee: number;
  final_amount: number;
  total_points: number;
  earned_points?: number;
  available_points?: number;
  max_usable_points?: number;
  points_used?: number;
  points_discount_amount?: number;
  point_value_myr?: number;
  min_redeem_points?: number;
  redeem_step?: number;
  disabled_reason?: string;
  adjusted?: boolean;
  points_summary?: Record<string, unknown> | null;
  loyalty_meta?: Record<string, unknown> | null;
  available_reward_balance?: number;
  max_usable_reward_cash?: number;
  reward_cash_discount_amount?: number;
  discount_lines: OrderDiscountLine[];
  points_bonus_lines?: OrderPointsBonusLine[];
  promotion_evaluation?: PromotionEvaluation | null;
  promotion_engine_version?: string;
  pricing_engine_version?: string;
  pricing_engine_source?: string;
  order_snapshot?: OrderPricingSnapshot | null;
};
