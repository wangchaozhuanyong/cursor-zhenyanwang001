import { getCartLinePrice } from "@/stores/useCartStore";
import type { Order } from "@/types/order";
import { formatDateTime } from "@/utils/formatDateTime";
import type { PaymentMethod } from "@/components/PaymentMethodPicker";
import { appendOrderDiscountTextLines } from "@/utils/orderDiscount";

export function generateOrderText(order: Order) {
  const itemsText = order.items
    .map((item, i) => `${i + 1}. ${item.product.name} x ${item.qty} - RM ${getCartLinePrice(item)}`)
    .join("\n");

  const lines = [
    `订单编号：${order.order_no}`,
    `------------------------`,
    `商品清单：`,
    itemsText,
    `------------------------`,
    `${order.tax_mode === "inclusive" ? "商品总额（含税）" : "商品总额"}：RM ${order.raw_amount}`,
  ];
  appendOrderDiscountTextLines(order, lines);
  if (
    order.tax_mode === "inclusive"
    && order.taxable_amount != null
    && order.tax_amount != null
    && order.tax_rate != null
  ) {
    const tl = order.tax_label || "SST";
    lines.push(`应税商品金额（含税）：RM ${order.taxable_amount}`);
    if (order.tax_exclusive_amount != null) {
      lines.push(`商品不含税净额：RM ${order.tax_exclusive_amount}`);
    }
    lines.push(`${tl}（${order.tax_rate}%）：RM ${order.tax_amount}`);
  }
  if (order.shipping_fee > 0) {
    lines.push(`运费（${order.shipping_name}，不计税）：RM ${order.shipping_fee}`);
  } else {
    lines.push(`运费：包邮（不计税）`);
  }
  lines.push(
    `应付金额：RM ${order.total_amount}`,
    `获得积分：${order.total_points}`,
    ``,
    `姓名：${order.contact_name}`,
    `电话：${order.contact_phone}`,
    `地址：${order.address}`,
    `备注：${order.note || "无"}`,
    `------------------------`,
    `下单时间：${formatDateTime(order.created_at)}`,
  );
  return lines.join("\n");
}

export function submitCtaLabel(method: PaymentMethod, submitting: boolean) {
  if (submitting) return "提交中…";
  if (method === "online") return "提交订单并去支付";
  if (method === "reward_wallet") return "提交订单并使用钱包";
  return "提交订单";
}
