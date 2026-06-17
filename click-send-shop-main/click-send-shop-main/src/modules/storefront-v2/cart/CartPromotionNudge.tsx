import { Gift, ShoppingBag } from "lucide-react";
import { buildCampaignProgress } from "../campaign/campaignNormalize";
import type { StorefrontCampaignVm } from "../campaign/campaignTypes";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import type { PromotionEvaluation, PromotionUnavailableReason } from "@/types/orderPreview";

type CartPromotionNudgeProps = {
  campaign: StorefrontCampaignVm | null;
  amount: number;
  evaluation?: PromotionEvaluation | null;
  className?: string;
  onBrowse?: () => void;
};

export default function CartPromotionNudge({ campaign, amount, evaluation, className = "", onBrowse }: CartPromotionNudgeProps) {
  const engineMessage = buildEngineMessage(evaluation);
  if (engineMessage) {
    return (
      <section
        className={`store-cart-v12-promotion-nudge rounded-2xl border border-[color-mix(in_srgb,var(--theme-price)_22%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-price)_7%,var(--theme-surface))] px-3 py-3 ${className}`}
        aria-label="购物车活动提示"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-2.5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-price)_14%,var(--theme-surface))] text-[var(--theme-price)]">
              <Gift size={17} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-5 text-[var(--theme-text)]">{engineMessage.title}</p>
              <p className="mt-0.5 text-xs leading-5 text-[var(--theme-text-muted)]">{engineMessage.description}</p>
            </div>
          </div>
          {engineMessage.showBrowse && onBrowse ? (
            <UnifiedButton
              type="button"
              onClick={onBrowse}
              className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full bg-[var(--theme-price)] px-3 text-xs font-bold text-[var(--theme-price-foreground)]"
            >
              <ShoppingBag size={13} aria-hidden />
              凑单
            </UnifiedButton>
          ) : null}
        </div>
        {engineMessage.percent != null ? (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--theme-price)_14%,var(--theme-border))]">
            <div
              className="h-full rounded-full bg-[var(--theme-price)] transition-[width]"
              style={{ width: `${engineMessage.percent}%` }}
            />
          </div>
        ) : null}
        {evaluation.unavailable_reasons?.length ? (
          <div className="store-cart-v12-promotion-nudge__reasons">
            {evaluation.unavailable_reasons.slice(0, 3).map((reason) => (
              <span key={`${reason.promotion_id || reason.type}-${reason.title || reason.reason}`}>
                {reason.title || reason.type}：{reason.shortfall_amount
                  ? `还差 RM ${formatMoney(reason.shortfall_amount)}`
                  : reason.reason}
              </span>
            ))}
          </div>
        ) : null}
        <p className="store-cart-v12-promotion-nudge__safe-copy">
          优惠资格、叠加关系和库存会在结算页再次由后端校验。
        </p>
      </section>
    );
  }

  const progress = buildCampaignProgress(campaign, amount);
  if (!campaign || !progress) return null;

  const percent = Math.min(100, Math.round((Math.max(0, amount) / progress.thresholdAmount) * 100));
  const campaignLabel = campaign.type === "full_discount" ? "满折" : "满减";

  return (
    <section
      className={`store-cart-v12-promotion-nudge rounded-2xl border border-[color-mix(in_srgb,var(--theme-price)_22%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-price)_7%,var(--theme-surface))] px-3 py-3 ${className}`}
      aria-label="购物车活动提示"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-2.5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-price)_14%,var(--theme-surface))] text-[var(--theme-price)]">
            <Gift size={17} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-5 text-[var(--theme-text)]">{campaign.title}</p>
            <p className="mt-0.5 text-xs leading-5 text-[var(--theme-text-muted)]">
              {progress.reached
                ? campaign.type === "full_discount"
                  ? `已满足满折门槛，预计可享 ${money((progress.discountPercent ?? 0) / 10)} 折`
                  : `已满足满减门槛，预计可减 RM ${money(progress.discountAmount ?? 0)}`
                : `再买 RM ${money(progress.missingAmount)} 可参与${campaign.promoLabel ? `「${campaign.promoLabel}」` : campaignLabel}`}
            </p>
          </div>
        </div>
        {!progress.reached && onBrowse ? (
          <UnifiedButton
            type="button"
            onClick={onBrowse}
            className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full bg-[var(--theme-price)] px-3 text-xs font-bold text-[var(--theme-price-foreground)]"
          >
            <ShoppingBag size={13} aria-hidden />
            凑单
          </UnifiedButton>
        ) : null}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--theme-price)_14%,var(--theme-border))]">
        <div
          className="h-full rounded-full bg-[var(--theme-price)] transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="store-cart-v12-promotion-nudge__safe-copy">
        这里只展示活动预览，最终优惠和不可用原因以结算页后端预览为准。
      </p>
    </section>
  );
}

function money(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

function formatMoney(value: unknown) {
  const n = Number(value || 0);
  return money(Number.isFinite(n) ? n : 0);
}

function firstShortfallReason(reasons: PromotionUnavailableReason[]) {
  return reasons.find((reason) => Number(reason.shortfall_amount || 0) > 0) || null;
}

function firstBlockingReason(reasons: PromotionUnavailableReason[]) {
  return reasons.find((reason) => reason.blocking) || reasons[0] || null;
}

function buildEngineMessage(evaluation?: PromotionEvaluation | null) {
  if (!evaluation) return null;
  if (evaluation.eligible === false) {
    const reason = firstBlockingReason(evaluation.unavailable_reasons || []);
    if (reason) {
      return {
        title: reason.title ? `活动「${reason.title}」不可用` : "活动优惠暂不可用",
        description: reason.shortfall_amount
          ? `还差 RM ${formatMoney(reason.shortfall_amount)} 才能参与该活动。`
          : reason.reason || "活动规则已变化，请在结算页重新校验。",
        showBrowse: false,
        percent: undefined,
      };
    }
    return {
      title: "活动优惠暂不可用",
      description: "活动规则已变化，请在结算页重新校验。",
      showBrowse: false,
      percent: undefined,
    };
  }

  const discountTotal = (evaluation.discount_lines || []).reduce((sum, line) => sum + Number(line.amount || 0), 0);
  if (discountTotal > 0) {
    const labels = (evaluation.discount_lines || [])
      .filter((line) => Number(line.amount || 0) > 0)
      .slice(0, 2)
      .map((line) => line.label)
      .filter(Boolean);
    return {
      title: labels.length ? labels.join("、") : "已命中活动优惠",
      description: `后端活动引擎已计算优惠 RM ${formatMoney(discountTotal)}，结算页会再次校验最终金额。`,
      showBrowse: false,
      percent: 100,
    };
  }

  const shortfall = firstShortfallReason(evaluation.unavailable_reasons || []);
  if (shortfall) {
    const threshold = Number(shortfall.threshold_amount || 0);
    const current = Number(shortfall.current_amount || 0);
    const percent = threshold > 0 ? Math.min(100, Math.round((Math.max(0, current) / threshold) * 100)) : undefined;
    return {
      title: shortfall.title || "活动还差一点可用",
      description: `再买 RM ${formatMoney(shortfall.shortfall_amount)} 可参与${shortfall.type === "full_reduction" ? "满减" : shortfall.type === "full_discount" ? "满折" : "该活动"}。`,
      showBrowse: true,
      percent,
    };
  }

  const reward = (evaluation.reward_lines || []).find((line) => Number(line.points || 0) > 0 || Number(line.multiplier_percent || 0) > 100);
  if (reward) {
    const multiplier = Number(reward.multiplier_percent || 0);
    return {
      title: String(reward.label || "积分奖励"),
      description: multiplier > 100 ? `当前购物车预计可享 ${money(multiplier / 100)} 倍积分。` : "当前购物车预计可获得积分奖励。",
      showBrowse: false,
      percent: undefined,
    };
  }

  return null;
}
