import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket } from "lucide-react";
import PremiumCouponCard from "@/components/PremiumCouponCard";
import { useCouponStore } from "@/stores/useCouponStore";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import * as marketingService from "@/services/marketingService";
import * as homeService from "@/services/homeService";
import { marketingCouponToPremiumDisplay } from "@/utils/couponDisplay";
import { AnimatedSection } from "@/modules/micro-interactions";

export default function MarketingCouponCenterSection({ delay = 0 }: { delay?: number }) {
  const navigate = useNavigate();
  const claimCoupon = useCouponStore((s) => s.claimCoupon);
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof marketingService.fetchCouponCenter>>>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cached = homeService.getCachedHomeBootstrap();
    if (cached?.marketing?.couponCenter) {
      setPayload(cached.marketing.couponCenter as Awaited<ReturnType<typeof marketingService.fetchCouponCenter>>);
    }
    homeService.fetchHomeBootstrap().then((bootstrap) => {
      if (cancelled) return;
      if (bootstrap?.marketing?.couponCenter) {
        setPayload(bootstrap.marketing.couponCenter as Awaited<ReturnType<typeof marketingService.fetchCouponCenter>>);
        return;
      }
      return marketingService.fetchCouponCenter().then((data) => {
        if (!cancelled) setPayload(data);
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!payload?.coupons?.length) return null;

  return (
    <AnimatedSection delay={delay}>
    <section className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="store-section-title flex items-center gap-2 text-[var(--theme-text-on-surface)]">
          <Ticket className="h-5 w-5 text-[var(--theme-primary)]" />
          {payload.activity.title || "领券中心"}
        </h2>
        <button type="button" onClick={() => navigate("/coupons")} className="text-xs font-semibold text-[var(--theme-primary)]">
          全部优惠券
        </button>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {payload.coupons.map((c) => {
          const display = marketingCouponToPremiumDisplay(c);
          return (
            <div key={c.id} className="w-[min(88vw,320px)] shrink-0 snap-center">
              <PremiumCouponCard
                colorScheme="invite"
                layout="home"
                title={display.title}
                amountPrefix={display.amountPrefix}
                amount={display.amount}
                minSpendText={display.minSpendText}
                expireText={display.expireText}
                scopeText={display.scopeText}
                actionLabel="领取"
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
    </AnimatedSection>
  );
}
