export type OrderDiscountLine = {
  type: "flash_sale" | "full_reduction" | "coupon" | "points" | "reward_cash";
  label: string;
  amount: number;
};

export type OrderPointsBonusLine = {
  type: "points_bonus";
  label: string;
  multiplier_percent: number;
  activity_id?: string;
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
};
