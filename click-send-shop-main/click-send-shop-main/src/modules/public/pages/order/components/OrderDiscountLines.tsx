import type { Order } from "@/types/order";
import type { OrderDiscountLine } from "@/types/orderPreview";
import { getOrderDiscountLines } from "@/utils/orderDiscount";
import { usePublicLocale, type PublicLocale } from "@/i18n/publicLocale";

const DISCOUNT_LABELS: Record<PublicLocale, Record<string, string>> = {
  zh: {
    coupon: "优惠券",
    full_reduction: "满减",
    full_discount: "满折",
    flash_sale: "秒杀",
    limited_time_discount: "限时折扣",
    member_price: "会员价",
    points: "积分抵扣",
    reward_wallet: "返现抵扣",
    discount: "优惠抵扣",
  },
  en: {
    coupon: "Coupon",
    full_reduction: "Order reduction",
    full_discount: "Order discount",
    flash_sale: "Flash sale",
    limited_time_discount: "Limited-time discount",
    member_price: "Member price",
    points: "Points deduction",
    reward_wallet: "Reward cash deduction",
    discount: "Discount",
  },
};

function getDiscountLabel(line: OrderDiscountLine, locale: PublicLocale) {
  if (locale === "zh") return line.label;
  const labels = DISCOUNT_LABELS[locale] || DISCOUNT_LABELS.en;
  const couponMatch = /^优惠券（(.+)）$/.exec(line.label || "");
  if (couponMatch?.[1]) return `${labels.coupon} (${couponMatch[1]})`;
  if (line.label === "优惠抵扣") return labels.discount;
  return labels[line.type || ""] || line.label;
}

export function OrderDiscountLines({ order }: { order: Order }) {
  const { locale } = usePublicLocale();
  const lines = getOrderDiscountLines(order);
  if (!lines.length) return null;
  return (
    <>
      {lines.map((line) => (
        <div key={`${line.type}-${line.label}`} className="mt-2 flex justify-between text-sm">
          <span className="text-muted-foreground">{getDiscountLabel(line, locale)}</span>
          <span className="font-medium text-[var(--theme-danger)]">-RM {line.amount}</span>
        </div>
      ))}
    </>
  );
}
