import { BadgeCheck, Tag } from "lucide-react";
import { buildCampaignProgress } from "../campaign/campaignNormalize";
import type { StorefrontCampaignVm } from "../campaign/campaignTypes";
import type { OrderPricingSnapshot, PromotionEvaluation } from "@/types/orderPreview";

type DiscountLine = {
  type: string;
  label: string;
  amount: number;
};

type PointsBonusLine = {
  type: string;
  label: string;
  multiplier_percent?: number;
};

type CheckoutPromotionExplanationProps = {
  discountLines?: DiscountLine[];
  pointsBonusLines?: PointsBonusLine[];
  promotionEvaluation?: PromotionEvaluation | null;
  orderSnapshot?: OrderPricingSnapshot | null;
  fullReductionCampaign?: StorefrontCampaignVm | null;
  currentAmount?: number;
  className?: string;
};

export default function CheckoutPromotionExplanation({
  discountLines = [],
  pointsBonusLines = [],
  promotionEvaluation = null,
  orderSnapshot = null,
  fullReductionCampaign = null,
  currentAmount = 0,
  className = "",
}: CheckoutPromotionExplanationProps) {
  const progress = buildCampaignProgress(fullReductionCampaign, currentAmount);
  const unavailableReasons = promotionEvaluation?.unavailable_reasons || [];
  if (!discountLines.length && !pointsBonusLines.length && !progress && !unavailableReasons.length) return null;
  const progressPercent = progress
    ? Math.max(0, Math.min(100, (Number(currentAmount || 0) / progress.thresholdAmount) * 100))
    : 0;

  return (
    <section
      className={`rounded-2xl border border-[color-mix(in_srgb,var(--theme-success)_24%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-success)_8%,var(--theme-surface))] px-3 py-3 ${className}`}
      aria-label="优惠说明"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-success)_14%,var(--theme-surface))] text-[var(--theme-success)]">
          <BadgeCheck size={16} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--theme-text)]">已按当前订单自动匹配优惠</p>
          <div className="mt-1 space-y-1 text-xs leading-5 text-[var(--theme-text-muted)]">
            {progress ? (
              <div className="rounded-xl border border-[color-mix(in_srgb,var(--theme-success)_20%,var(--theme-border))] bg-[var(--theme-surface)]/70 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-[var(--theme-text)]">
                    <Tag size={13} />
                    <span className="truncate">{fullReductionCampaign?.promoLabel || fullReductionCampaign?.title || "满减活动"}</span>
                  </span>
                  <span className="shrink-0 font-bold text-[var(--theme-success)]">
                    {progress.reached ? "已达成" : `差 RM ${money(progress.missingAmount)}`}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--theme-border)_72%,transparent)]">
                  <div
                    className="h-full rounded-full bg-[var(--theme-success)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="mt-1.5">
                  满 RM {money(progress.thresholdAmount)}
                  {progress.discountAmount ? ` 减 RM ${money(progress.discountAmount)}` : ""}
                  {progress.reached ? "，当前订单已满足活动门槛。" : "，继续凑单可享活动优惠。"}
                </p>
              </div>
            ) : null}
            {discountLines.map((line) => (
              <p key={`${line.type}-${line.label}`}>{line.label}：已减 RM {money(line.amount)}</p>
            ))}
            {pointsBonusLines.map((line) => (
              <p key={`${line.type}-${line.label}`}>{line.label}</p>
            ))}
            {orderSnapshot?.final_amount != null ? (
              <p>后端结算应付：RM {money(toNumber(orderSnapshot.final_amount))}</p>
            ) : null}
            {unavailableReasons.map((item) => (
              <p key={`${item.promotion_id || item.type}-${item.title || item.reason}`} className="text-[var(--theme-price)]">
                {item.title || "活动"}：{item.shortfall_amount
                  ? `还差 RM ${money(item.shortfall_amount)} 可参与`
                  : item.reason}
              </p>
            ))}
            {discountLines.length || pointsBonusLines.length ? (
              <p>满减、优惠券和积分按订单预览结果自动计算，最终优惠以后端结算为准。</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function money(value: number) {
  return Number(value || 0).toFixed(2).replace(/\.00$/, "");
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
