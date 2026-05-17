export type OrderDiscountLine = {
  type: "flash_sale" | "full_reduction" | "coupon";
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
  discount_lines: OrderDiscountLine[];
};
