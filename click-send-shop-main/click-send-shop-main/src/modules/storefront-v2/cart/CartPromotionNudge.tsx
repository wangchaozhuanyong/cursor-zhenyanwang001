import { Gift, ShoppingBag } from "lucide-react";
import { buildCampaignProgress } from "../campaign/campaignNormalize";
import type { StorefrontCampaignVm } from "../campaign/campaignTypes";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type CartPromotionNudgeProps = {
  campaign: StorefrontCampaignVm | null;
  amount: number;
  className?: string;
  onBrowse?: () => void;
};

export default function CartPromotionNudge({ campaign, amount, className = "", onBrowse }: CartPromotionNudgeProps) {
  const progress = buildCampaignProgress(campaign, amount);
  if (!campaign || !progress) return null;

  const percent = Math.min(100, Math.round((Math.max(0, amount) / progress.thresholdAmount) * 100));

  return (
    <section
      className={`rounded-2xl border border-[color-mix(in_srgb,var(--theme-price)_22%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-price)_7%,var(--theme-surface))] px-3 py-3 ${className}`}
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
                ? `已满足满减门槛，预计可减 RM ${money(progress.discountAmount ?? 0)}`
                : `再买 RM ${money(progress.missingAmount)} 可参与${campaign.promoLabel ? `「${campaign.promoLabel}」` : "满减"}`}
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
    </section>
  );
}

function money(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}
