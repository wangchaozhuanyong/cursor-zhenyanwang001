import type { Order } from "@/types/order";
import { getOrderDiscountLines } from "@/utils/orderDiscount";

export function OrderDiscountLines({ order }: { order: Order }) {
  const lines = getOrderDiscountLines(order);
  if (!lines.length) return null;
  return (
    <>
      {lines.map((line) => (
        <div key={`${line.type}-${line.label}`} className="mt-2 flex justify-between text-sm">
          <span className="text-muted-foreground">{line.label}</span>
          <span className="font-medium text-[var(--theme-danger)]">-RM {line.amount}</span>
        </div>
      ))}
    </>
  );
}
