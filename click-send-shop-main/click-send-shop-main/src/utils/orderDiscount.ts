import type { Order } from "@/types/order";
import type { OrderDiscountLine } from "@/types/orderPreview";

export function getOrderDiscountLines(order: Order): OrderDiscountLine[] {
  if (order.discount_lines?.length) return order.discount_lines;
  if ((order.discount_amount ?? 0) > 0) {
    return [
      {
        type: "coupon",
        label: order.coupon_title ? `优惠券（${order.coupon_title}）` : "优惠抵扣",
        amount: order.discount_amount,
      },
    ];
  }
  return [];
}

export function appendOrderDiscountTextLines(order: Order, lines: string[]) {
  for (const line of getOrderDiscountLines(order)) {
    lines.push(`${line.label}：-RM ${line.amount}`);
  }
}
