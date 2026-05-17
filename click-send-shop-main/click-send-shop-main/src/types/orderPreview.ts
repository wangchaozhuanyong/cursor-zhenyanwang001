export type OrderDiscountLine = {
  type: "flash_sale" | "full_reduction" | "coupon" | "points" | "reward_cash";
  label: string;
  amount: number;
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
  points_discount_amount?: number;
  available_reward_balance?: number;
  max_usable_reward_cash?: number;
  reward_cash_discount_amount?: number;
  discount_lines: OrderDiscountLine[];
};
