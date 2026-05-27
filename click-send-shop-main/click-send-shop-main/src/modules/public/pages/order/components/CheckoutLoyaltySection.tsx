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

function money(v: number) {
  return v.toFixed(2);
}

function PointsInfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--theme-bg)] px-3.5 py-3">
      <p className="text-[11px] leading-none text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-sm font-bold text-foreground">{value}</p>
    </div>
  );
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
  const redeemStep = Math.max(1, Math.floor(toNum(orderPreview?.redeem_step, 1)));
  const actualPointsUsed = Math.max(0, Math.floor(toNum(orderPreview?.points_used, pointsToUse)));
  const pointValue = toNum(orderPreview?.point_value_myr, 0.01);
  const pointsDiscount = toNum(orderPreview?.points_discount_amount, 0);
  const availablePointsDiscount = availablePoints * pointValue;
  const orderMaxPointsDiscount = maxPoints * pointValue;
  const disabledReason = orderPreview?.disabled_reason || (maxPoints <= 0 ? "当前订单暂无可用积分抵扣" : "");
  const availableReward = Math.max(0, toNum(orderPreview?.available_reward_balance));
  const maxReward = Math.max(0, toNum(orderPreview?.max_usable_reward_cash));
  const normalizePointsInput = (value: number) => {
    const clamped = Math.max(0, Math.min(maxPoints, Math.floor(value || 0)));
    return Math.floor(clamped / redeemStep) * redeemStep;
  };

  return (
    <section className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow space-y-4">
      <div className="mb-1 flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--theme-price)] text-xs font-bold text-white">4</span>
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">积分抵扣</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">使用积分直接抵扣订单金额，系统会按本单规则计算可抵扣上限</p>
        </div>
      </div>

      {pointsRedeemEnabled ? (
        <div className="rounded-2xl border border-[var(--theme-border)] p-3.5">
          <label className="flex items-center justify-between text-sm font-medium">
            <span>积分抵扣</span>
            <input type="checkbox" checked={usePoints} onChange={(e) => onUsePointsChange(e.target.checked)} />
          </label>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <PointsInfoItem label="你有积分" value={`${availablePoints} 积分`} />
            <PointsInfoItem label="最多可抵扣" value={`RM ${money(availablePointsDiscount)}`} />
            <PointsInfoItem label="本单最多可抵扣" value={`RM ${money(orderMaxPointsDiscount)}`} />
          </div>
          {disabledReason && maxPoints <= 0 ? <p className="mt-1 text-xs text-[var(--theme-danger)]">{disabledReason}</p> : null}
          {usePoints ? (
            <div className="mt-3 space-y-2">
              <input
                className="w-full"
                type="range"
                min={0}
                max={maxPoints}
                step={redeemStep}
                value={Math.max(0, Math.min(maxPoints, pointsToUse))}
                onChange={(e) => onPointsToUseChange(normalizePointsInput(Number(e.target.value || 0)))}
              />
              <div className="flex items-center gap-2">
                <input
                  className="w-full rounded-lg border border-[var(--theme-border)] bg-transparent px-3 py-2 text-sm"
                  type="number"
                  min={0}
                  max={maxPoints}
                  step={redeemStep}
                  value={pointsToUse}
                  onChange={(e) => onPointsToUseChange(normalizePointsInput(Number(e.target.value || 0)))}
                />
                <button type="button" className="rounded-lg border border-[var(--theme-border)] px-3 py-2 text-xs" onClick={() => onPointsToUseChange(maxPoints)}>
                  全部
                </button>
              </div>
              <p className="text-xs text-muted-foreground">本次将使用 {actualPointsUsed} 积分，抵扣 RM {money(pointsDiscount)}{orderPreview?.adjusted ? "（已按规则自动调整）" : ""}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {rewardCashRedeemEnabled ? (
        <div className="rounded-2xl border border-[var(--theme-border)] p-3.5">
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
