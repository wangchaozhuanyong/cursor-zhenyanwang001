import type { Order } from "@/types/order";

type TaxFields = Pick<
  Order,
  "tax_mode" | "tax_rate" | "tax_label" | "taxable_amount" | "tax_amount" | "tax_exclusive_amount"
>;

/** 订单已落库的 SST 拆分（历史订单无快照则不渲染） */
export function OrderSstLines({ order }: { order: TaxFields }) {
  if (
    order.tax_mode !== "inclusive"
    || order.tax_amount == null
    || order.tax_rate == null
    || order.taxable_amount == null
  ) {
    return null;
  }
  const label = order.tax_label || "SST";
  const rateStr = Number.isInteger(order.tax_rate) ? String(order.tax_rate) : String(order.tax_rate);
  return (
    <>
      <div className="mt-2 flex justify-between text-sm">
        <span className="text-muted-foreground">应税商品金额（含税）</span>
        <span className="font-medium text-foreground">RM {order.taxable_amount}</span>
      </div>
      {order.tax_exclusive_amount != null && (
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>其中商品不含税净额</span>
          <span>RM {order.tax_exclusive_amount}</span>
        </div>
      )}
      <div className="mt-1 flex justify-between text-sm">
        <span className="text-muted-foreground">
          含 {label}（{rateStr}%）
        </span>
        <span className="font-medium text-foreground">RM {order.tax_amount}</span>
      </div>
    </>
  );
}
