import { Clock3, ShieldCheck } from "lucide-react";
import StorefrontBadge from "../components/StorefrontBadge";
import { storefrontDisplayText, storefrontOptionalDisplayText } from "@/utils/storefrontCopySanitizer";
import type { ProductActiveActivity } from "@/types/product";

type ProductActivityPanelProps = {
  activity: ProductActiveActivity | null | undefined;
  className?: string;
};

export default function ProductActivityPanel({ activity, className = "" }: ProductActivityPanelProps) {
  if (!activity) return null;

  const isActivityPrice = activity.type === "flash_sale" || activity.type === "limited_time_discount";
  const badgeLabel = activity.type === "flash_sale"
    ? "秒杀"
    : activity.type === "limited_time_discount"
      ? "限时折扣"
        : activity.type === "member_price"
          ? "会员专享"
          : "满减";
  const fallbackTitle = activity.type === "flash_sale"
    ? "限时秒杀活动"
    : activity.type === "limited_time_discount"
      ? "限时折扣活动"
      : activity.type === "member_price"
        ? "会员专享优惠"
        : "下单享活动优惠";
  const displayTitle = storefrontDisplayText(activity.title, fallbackTitle);
  const displayDescription = storefrontOptionalDisplayText(activity.description);
  const remaining = Math.max(0, Number(activity.remaining_stock ?? 0));
  const soldCount = Math.max(0, Number(activity.sold_count ?? 0));
  const stockTotal = Math.max(0, Number(activity.activity_stock ?? 0) || remaining + soldCount);
  const limit = Number(activity.limit_per_user ?? 0);
  const threshold = Number(activity.threshold_amount ?? 0);
  const discount = Number(activity.discount_amount ?? 0);
  const progressPercent = activity.stock_progress_percent != null
    ? Math.max(0, Math.min(100, Math.round(Number(activity.stock_progress_percent || 0))))
    : stockTotal > 0
      ? Math.max(0, Math.min(100, Math.round((soldCount / stockTotal) * 100)))
      : null;
  const normalizedStatus = String(activity.status || "").toLowerCase();
  const displayStatusLabel = storefrontOptionalDisplayText(activity.status_label);
  const normalizedStatusLabel = String(displayStatusLabel || "").toLowerCase();
  const statusText = normalizedStatus === "scheduled"
    ? "未开始"
    : normalizedStatus === "ended"
      ? "已结束"
      : normalizedStatus === "paused"
        ? "已暂停"
        : displayStatusLabel && !["active", "scheduled", "ended", "paused"].includes(normalizedStatusLabel)
          ? displayStatusLabel
          : "进行中";

  return (
    <section
      className={`mt-3 rounded-2xl border border-[color-mix(in_srgb,var(--theme-price)_28%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-price)_8%,var(--theme-surface))] px-3 py-3 ${className}`}
      aria-label="商品活动"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StorefrontBadge tone="sale">{badgeLabel}</StorefrontBadge>
            <span className="sf-next-product-activity-status">{statusText}</span>
            <p className="min-w-0 text-sm font-bold leading-5 text-[var(--theme-text)]">{displayTitle}</p>
          </div>
          {displayDescription ? (
            <p className="mt-1 text-xs leading-5 text-[var(--theme-text-muted)]">{displayDescription}</p>
          ) : null}
        </div>
        <div className="shrink-0 text-right text-xs font-semibold text-[var(--theme-price)]">
          {isActivityPrice ? "活动价" : "优惠"}
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
            {isActivityPrice
              ? `剩余 ${remaining} 件${limit > 0 ? `，每人限购 ${limit} 件` : ""}`
              : threshold > 0 && discount > 0
                ? `满 RM ${money(threshold)} 减 RM ${money(discount)}`
                : "结算页按活动规则自动计算"}
          </span>
        </div>
      </div>

      {progressPercent != null ? (
        <div className="sf-next-product-activity-progress">
          <div className="sf-next-product-activity-progress__meta">
            <span>库存进度</span>
            <strong>{isActivityPrice ? `已抢 ${progressPercent}%` : `剩余 ${remaining} 件`}</strong>
          </div>
          <div className="sf-next-product-activity-progress__track" aria-hidden>
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <p>
            {stockTotal > 0 ? `活动库存 ${stockTotal} 件，已售 ${soldCount} 件，剩余 ${remaining} 件。` : `剩余 ${remaining} 件。`}
            {limit > 0 ? ` 每人限购 ${limit} 件。` : " 下单时确认限购数量。"}
          </p>
        </div>
      ) : null}

      <p className="sf-next-product-activity-safe-copy">
        活动价、限购、库存和优惠叠加会在结算页确认。
      </p>
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
