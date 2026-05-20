import type { OrderPreviewResult } from "@/types/orderPreview";

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
  const actualPointsUsed = Math.max(0, Math.floor(toNum(orderPreview?.points_used, pointsToUse)));
  const pointValue = toNum(orderPreview?.point_value_myr, 0.01);
  const pointsDiscount = toNum(orderPreview?.points_discount_amount, 0);
  const disabledReason = orderPreview?.disabled_reason || (maxPoints <= 0 ? "当前订单暂无可用积分抵扣" : "");
  const availableReward = Math.max(0, toNum(orderPreview?.available_reward_balance));
  const maxReward = Math.max(0, toNum(orderPreview?.max_usable_reward_cash));

  return (
    <section className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow space-y-4">
      <h3 className="text-base font-semibold text-foreground">优惠与抵扣</h3>

      {pointsRedeemEnabled ? (
        <div className="rounded-xl border border-[var(--theme-border)] p-3">
          <label className="flex items-center justify-between text-sm font-medium">
            <span>积分抵扣</span>
            <input type="checkbox" checked={usePoints} onChange={(e) => onUsePointsChange(e.target.checked)} />
          </label>
          <p className="mt-1 text-xs text-muted-foreground">可用 {availablePoints}，兑换比例：1 积分 = RM {pointValue.toFixed(2)}，本单最多 {maxPoints}</p>
          {disabledReason && maxPoints <= 0 ? <p className="mt-1 text-xs text-[var(--theme-danger)]">{disabledReason}</p> : null}
          {usePoints ? (
            <div className="mt-2 space-y-2">
              <input
                className="w-full"
                type="range"
                min={0}
                max={maxPoints}
                step={1}
                value={Math.max(0, Math.min(maxPoints, pointsToUse))}
                onChange={(e) => onPointsToUseChange(Math.max(0, Math.min(maxPoints, Number(e.target.value || 0))))}
              />
              <div className="flex items-center gap-2">
                <input
                  className="w-full rounded-lg border border-[var(--theme-border)] bg-transparent px-3 py-2 text-sm"
                  type="number"
                  min={0}
                  max={maxPoints}
                  value={pointsToUse}
                  onChange={(e) => onPointsToUseChange(Math.max(0, Math.min(maxPoints, Number(e.target.value || 0))))}
                />
                <button type="button" className="rounded-lg border border-[var(--theme-border)] px-3 py-2 text-xs" onClick={() => onPointsToUseChange(maxPoints)}>
                  全部
                </button>
              </div>
              <p className="text-xs text-muted-foreground">实际使用 {actualPointsUsed} 积分，可抵扣 RM {pointsDiscount.toFixed(2)}{orderPreview?.adjusted ? "（已按步长自动调整）" : ""}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {rewardCashRedeemEnabled ? (
        <div className="rounded-xl border border-[var(--theme-border)] p-3">
          <label className="flex items-center justify-between text-sm font-medium">
            <span>返现余额抵扣</span>
            <input type="checkbox" checked={useRewardCash} onChange={(e) => onUseRewardCashChange(e.target.checked)} />
          </label>
          <p className="mt-1 text-xs text-muted-foreground">可用 RM {availableReward.toFixed(2)}，本单最多 RM {maxReward.toFixed(2)}</p>
          {useRewardCash ? (
            <div className="mt-2 space-y-2">
              <input
                className="w-full"
                type="range"
                min={0}
                max={maxReward}
                step="0.01"
                value={Math.max(0, Math.min(maxReward, rewardCashAmount))}
                onChange={(e) => onRewardCashAmountChange(Math.max(0, Math.min(maxReward, Number(e.target.value || 0))))}
              />
              <div className="flex items-center gap-2">
                <input
                  className="w-full rounded-lg border border-[var(--theme-border)] bg-transparent px-3 py-2 text-sm"
                  type="number"
                  min={0}
                  max={maxReward}
                  step="0.01"
                  value={rewardCashAmount}
                  onChange={(e) => onRewardCashAmountChange(Math.max(0, Math.min(maxReward, Number(e.target.value || 0))))}
                />
                <button type="button" className="rounded-lg border border-[var(--theme-border)] px-3 py-2 text-xs" onClick={() => onRewardCashAmountChange(maxReward)}>
                  全部
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
