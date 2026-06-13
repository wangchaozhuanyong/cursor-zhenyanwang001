import { Clock3, ShieldCheck } from "lucide-react";
import StorefrontBadge from "../components/StorefrontBadge";
import type { ProductActiveActivity } from "@/types/product";

type ProductActivityPanelProps = {
  activity: ProductActiveActivity | null | undefined;
  className?: string;
};

export default function ProductActivityPanel({ activity, className = "" }: ProductActivityPanelProps) {
  if (!activity) return null;

  const isFlashSale = activity.type === "flash_sale";
  const remaining = Math.max(0, Number(activity.remaining_stock ?? 0));
  const limit = Number(activity.limit_per_user ?? 0);
  const threshold = Number(activity.threshold_amount ?? 0);
  const discount = Number(activity.discount_amount ?? 0);

  return (
    <section
      className={`mt-3 rounded-2xl border border-[color-mix(in_srgb,var(--theme-price)_28%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-price)_8%,var(--theme-surface))] px-3 py-3 ${className}`}
      aria-label="商品活动"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StorefrontBadge tone="sale">{isFlashSale ? "秒杀" : "满减"}</StorefrontBadge>
            <p className="min-w-0 text-sm font-bold leading-5 text-[var(--theme-text)]">{activity.title}</p>
          </div>
          {activity.description ? (
            <p className="mt-1 text-xs leading-5 text-[var(--theme-text-muted)]">{activity.description}</p>
          ) : null}
        </div>
        <div className="shrink-0 text-right text-xs font-semibold text-[var(--theme-price)]">
          {isFlashSale ? "活动价" : "优惠"}
        </div>
      </div>

      <div className="mt-2 grid gap-2 text-xs text-[var(--theme-text-muted)] sm:grid-cols-2">
        <div className="flex items-center gap-1.5">
          <Clock3 size={14} aria-hidden />
          <span>
            {formatDateTime(activity.start_at)} - {formatDateTime(activity.end_at)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={14} aria-hidden />
          <span>
            {isFlashSale
              ? `剩余 ${remaining} 件${limit > 0 ? `，每人限购 ${limit} 件` : ""}`
              : threshold > 0 && discount > 0
                ? `满 RM ${money(threshold)} 减 RM ${money(discount)}`
                : "结算页按活动规则自动计算"}
          </span>
        </div>
      </div>
    </section>
  );
}

function money(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
