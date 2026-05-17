import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket } from "lucide-react";
import PremiumCouponCard from "@/components/PremiumCouponCard";
import { useCouponStore } from "@/stores/useCouponStore";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import * as marketingService from "@/services/marketingService";
import type { MarketingCouponPublic } from "@/services/marketingService";
import { formatCouponExpireText } from "@/utils/couponDisplay";

function couponDisplay(c: MarketingCouponPublic) {
  if (c.type === "percent") return { amount: `${c.value}%`, prefix: "" };
  if (c.type === "shipping" && c.value <= 0) return { amount: "免运", prefix: "" };
  return { amount: `RM ${c.value}`, prefix: "" };
}

export default function MarketingCouponCenterSection() {
  const navigate = useNavigate();
  const claimCoupon = useCouponStore((s) => s.claimCoupon);
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof marketingService.fetchCouponCenter>>>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    marketingService.fetchCouponCenter().then((data) => {
      if (!cancelled) setPayload(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!payload?.coupons?.length) return null;

  return (
    <section className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-[var(--theme-text-on-surface)]">
          <Ticket className="h-5 w-5 text-[var(--theme-primary)]" />
          {payload.activity.title || "领券中心"}
        </h2>
        <button type="button" onClick={() => navigate("/coupons")} className="text-xs font-semibold text-[var(--theme-primary)]">
          全部优惠券
        </button>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {payload.coupons.map((c) => {
          const { amount, prefix } = couponDisplay(c);
          return (
            <div key={c.id} className="w-[min(88vw,320px)] shrink-0 snap-center">
              <PremiumCouponCard
                homeCompact
                title={c.title}
                amountPrefix={prefix}
                amount={amount}
                minSpendText={c.min_amount > 0 ? `满 RM ${c.min_amount} 可用` : "无门槛"}
                expireText={formatCouponExpireText(c.end_date)}
                actionLabel="立即领取"
                actionLoading={claimingId === c.id}
                onAction={() => {
                  void (async () => {
                    try {
                      setClaimingId(c.id);
                      await claimCoupon(c.code);
                      toast.success("领取成功", toastPresetQuickSuccess);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "领取失败");
                    } finally {
                      setClaimingId(null);
                    }
                  })();
                }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
