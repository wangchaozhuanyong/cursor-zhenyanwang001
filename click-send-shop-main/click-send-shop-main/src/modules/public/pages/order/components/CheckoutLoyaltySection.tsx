import type { OrderPreviewResult } from "@/types/orderPreview";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type Props = {
  pointsRedeemEnabled: boolean;
  rewardCashRedeemEnabled: boolean;
  orderPreview: OrderPreviewResult | null;
  usePoints: boolean;
  onUsePointsChange: (v: boolean) => void;
  pointsToUse: number;
  onPointsToUseChange: (v: number) => void;
  useRewardCash: boolean;
  onUseRewardCashChange: (v: boolean) => void;
  rewardCashAmount: number;
  onRewardCashAmountChange: (v: number) => void;
};

function toNum(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function money(v: number) {
  return v.toFixed(2);
}

const REDEEM_CARD_CLASS =
  "sf-next-checkout-redeem-card rounded-2xl border border-[color-mix(in_srgb,var(--theme-primary)_18%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-primary)_5%,var(--theme-surface))] p-3.5 shadow-sm";

const REDEEM_TOGGLE_CLASS =
  "sf-next-checkout-redeem-toggle grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--theme-border)_74%,transparent)] bg-[var(--theme-surface)] px-3.5 py-3";

const REDEEM_INPUT_ROW_CLASS =
  "sf-next-checkout-redeem-input-row grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2";

const FORM_CONTROL_CLASS =
  "w-full min-w-0 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2.5 text-base text-foreground outline-none focus:ring-2 focus:ring-[var(--theme-primary)]";

export function CheckoutLoyaltySection({
  pointsRedeemEnabled,
  rewardCashRedeemEnabled,
  orderPreview,
  usePoints,
  onUsePointsChange,
  pointsToUse,
  onPointsToUseChange,
  useRewardCash,
  onUseRewardCashChange,
  rewardCashAmount,
  onRewardCashAmountChange,
}: Props) {
  if (!pointsRedeemEnabled && !rewardCashRedeemEnabled) return null;

  const availablePoints = Math.max(0, Math.floor(toNum(orderPreview?.available_points)));
  const maxPoints = Math.max(0, Math.floor(toNum(orderPreview?.max_usable_points)));
  const redeemStep = Math.max(1, Math.floor(toNum(orderPreview?.redeem_step, 1)));
  const actualPointsUsed = Math.max(0, Math.floor(toNum(orderPreview?.points_used, pointsToUse)));
  const pointValue = toNum(orderPreview?.point_value_myr, 0.01);
  const pointsDiscount = toNum(orderPreview?.points_discount_amount, 0);
  const availablePointsDiscount = availablePoints * pointValue;
  const orderMaxPointsDiscount = maxPoints * pointValue;
  const displayRedeemPoints = usePoints ? actualPointsUsed : maxPoints;
  const disabledReason = orderPreview?.disabled_reason || (maxPoints <= 0 ? "当前订单暂无可用积分抵扣" : "");
  const availableReward = Math.max(0, toNum(orderPreview?.available_reward_balance));
  const maxReward = Math.max(0, toNum(orderPreview?.max_usable_reward_cash));
  const normalizePointsInput = (value: number) => {
    const clamped = Math.max(0, Math.min(maxPoints, Math.floor(value || 0)));
    return Math.floor(clamped / redeemStep) * redeemStep;
  };

  return (
    <section className="sf-next-checkout-card sf-next-checkout-loyalty-section sf-next-theme-radius space-y-4 border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 sf-next-theme-shadow">
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-foreground">积分与返现抵扣</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">可用额度按当前订单实时计算，提交前会再次以后端金额为准</p>
      </div>

      {pointsRedeemEnabled ? (
        <div className={REDEEM_CARD_CLASS}>
          <label className={REDEEM_TOGGLE_CLASS}>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">抵扣积分</span>
              <span className="mt-1 flex min-w-0 flex-wrap items-end gap-x-1 gap-y-0.5 text-foreground">
                <strong className="text-xl leading-none">{displayRedeemPoints}</strong>
                <span className="text-xs font-semibold">积分</span>
              </span>
              <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">
                你的积分可抵扣 RM {money(availablePointsDiscount)}，本单最多可抵扣 RM {money(orderMaxPointsDiscount)}
              </span>
            </span>
            <input
              className="sf-next-checkout-redeem-checkbox"
              type="checkbox"
              checked={usePoints}
              disabled={maxPoints <= 0}
              onChange={(e) => onUsePointsChange(e.target.checked)}
            />
          </label>
          {disabledReason && maxPoints <= 0 ? <p className="mt-2 text-xs text-[var(--theme-danger)]">{disabledReason}</p> : null}
          {usePoints ? (
            <div className="mt-3 space-y-2">
              <input
                className="w-full"
                type="range"
                min={0}
                max={maxPoints}
                step={redeemStep}
                disabled={maxPoints <= 0}
                value={Math.max(0, Math.min(maxPoints, pointsToUse))}
                onChange={(e) => onPointsToUseChange(normalizePointsInput(Number(e.target.value || 0)))}
              />
              <div className={REDEEM_INPUT_ROW_CLASS}>
                <input
                  className={FORM_CONTROL_CLASS}
                  type="number"
                  min={0}
                  max={maxPoints}
                  step={redeemStep}
                  value={pointsToUse}
                  onChange={(e) => onPointsToUseChange(normalizePointsInput(Number(e.target.value || 0)))}
                />
                <UnifiedButton type="button" className="sf-next-checkout-redeem-all-button rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2.5 text-xs font-semibold text-foreground" onClick={() => onPointsToUseChange(maxPoints)}>
                  全部
                </UnifiedButton>
              </div>
              <p className="text-xs text-muted-foreground">本次将使用 {actualPointsUsed} 积分，抵扣 RM {money(pointsDiscount)}{orderPreview?.adjusted ? "（已按规则自动调整）" : ""}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {rewardCashRedeemEnabled ? (
        <div className={REDEEM_CARD_CLASS}>
          <label className={REDEEM_TOGGLE_CLASS}>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">返现余额抵扣</span>
              <span className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground">
                可用 RM {availableReward.toFixed(2)}，本单最多 RM {maxReward.toFixed(2)}
              </span>
            </span>
            <input
              className="sf-next-checkout-redeem-checkbox"
              type="checkbox"
              checked={useRewardCash}
              disabled={maxReward <= 0}
              onChange={(e) => onUseRewardCashChange(e.target.checked)}
            />
          </label>
          {useRewardCash ? (
            <div className="mt-3 space-y-2">
              <input
                className="w-full"
                type="range"
                min={0}
                max={maxReward}
                step="0.01"
                disabled={maxReward <= 0}
                value={Math.max(0, Math.min(maxReward, rewardCashAmount))}
                onChange={(e) => onRewardCashAmountChange(Math.max(0, Math.min(maxReward, Number(e.target.value || 0))))}
              />
              <div className={REDEEM_INPUT_ROW_CLASS}>
                <input
                  className={FORM_CONTROL_CLASS}
                  type="number"
                  min={0}
                  max={maxReward}
                  step="0.01"
                  value={rewardCashAmount}
                  onChange={(e) => onRewardCashAmountChange(Math.max(0, Math.min(maxReward, Number(e.target.value || 0))))}
                />
                <UnifiedButton type="button" className="sf-next-checkout-redeem-all-button rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2.5 text-xs font-semibold text-foreground" onClick={() => onRewardCashAmountChange(maxReward)}>
                  全部
                </UnifiedButton>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
