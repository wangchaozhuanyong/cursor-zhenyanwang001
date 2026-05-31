import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, ShoppingBag, Ticket } from "lucide-react";
import PremiumCouponCard from "@/components/PremiumCouponCard";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCartStore } from "@/stores/useCartStore";
import { useCouponStore } from "@/stores/useCouponStore";
import { ensureStoreSession } from "@/lib/ensureStoreSession";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import * as marketingService from "@/services/marketingService";
import * as homeService from "@/services/homeService";
import { marketingCouponToPremiumDisplay } from "@/utils/couponDisplay";
import {
  buildHomeCouponCardItems,
  summarizeHomeCouponState,
  type HomeCouponCardItem,
} from "@/utils/homeCouponPresentation";

export default function MarketingCouponCenterSection({ delay: _delay = 0 }: { delay?: number }) {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const coupons = useCouponStore((s) => s.coupons);
  const loadCoupons = useCouponStore((s) => s.loadCoupons);
  const claimCoupon = useCouponStore((s) => s.claimCoupon);
  const selectedCartCount = useCartStore((s) => s.getSelectedItems().length);
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof marketingService.fetchCouponCenter>>>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [couponStateReady, setCouponStateReady] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) {
      setCouponStateReady(true);
      return () => {
        cancelled = true;
      };
    }

    setCouponStateReady(false);
    void (async () => {
      const ok = await ensureStoreSession();
      if (!ok) {
        if (!cancelled) setCouponStateReady(true);
        return;
      }
      try {
        await loadCoupons();
      } finally {
        if (!cancelled) setCouponStateReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loadCoupons]);

  const isCouponSyncing = isAuthenticated && !couponStateReady;
  const couponIdentityReady = !isAuthenticated || couponStateReady;
  const visibleItems = useMemo<HomeCouponCardItem[]>(() => {
    if (!payload?.coupons?.length) return [];
    return buildHomeCouponCardItems(payload.coupons, coupons, couponIdentityReady);
  }, [payload?.coupons, coupons, couponIdentityReady]);

  const couponSummary = useMemo(() => summarizeHomeCouponState(coupons), [coupons]);

  if (!payload?.coupons?.length) return null;

  const openAllCoupons = () => {
    navigate("/coupons");
  };

  const goUseCoupon = async (item: HomeCouponCardItem) => {
    if (!item.userCoupon) {
      navigate("/coupons");
      return;
    }
    const ok = await ensureStoreSession();
    if (!ok) {
      navigate("/login", { state: { from: "/" } });
      return;
    }
    if (item.action === "view") {
      navigate("/coupons");
      return;
    }
    if (selectedCartCount > 0) navigate(`/checkout?coupon_id=${item.userCoupon.id}`);
    else navigate("/cart", { state: { coupon_id: item.userCoupon.id } });
  };

  const handleClaim = async (item: HomeCouponCardItem) => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/" } });
      return;
    }
    const ok = await ensureStoreSession();
    if (!ok) {
      navigate("/login", { state: { from: "/" } });
      return;
    }
    try {
      setClaimingId(item.coupon.id);
      await claimCoupon(item.coupon.code || item.coupon.id);
      toast.success("领取成功，已放入你的券包", toastPresetQuickSuccess);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "领取失败");
    } finally {
      setClaimingId(null);
    }
  };

  const handleAction = (item: HomeCouponCardItem) => {
    void (item.action === "claim" ? handleClaim(item) : goUseCoupon(item));
  };

  const showFallback = isAuthenticated && couponStateReady && visibleItems.length === 0;

  return (
    <section className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="store-section-title flex items-center gap-2 text-[var(--theme-text-on-surface)]">
          <Ticket className="h-5 w-5 text-[var(--theme-primary)]" />
          {payload.activity.title || "领券中心"}
        </h2>
        <button type="button" onClick={openAllCoupons} className="text-xs font-semibold text-[var(--theme-primary)]">
          全部优惠券
        </button>
      </div>

      {isCouponSyncing && visibleItems.length === 0 ? (
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
          {Array.from({ length: Math.min(3, payload.coupons.length || 3) }).map((_, index) => (
            <div
              key={index}
              className="store-coupon-skeleton-card w-[min(88vw,320px)] shrink-0"
            />
          ))}
        </div>
      ) : showFallback ? (
        <div className="rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)]/70 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--theme-primary)_14%,transparent)] text-[var(--theme-primary)]">
              <BadgeCheck size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--theme-text-on-surface)]">
                {couponSummary.usableCount > 0 ? `你有 ${couponSummary.usableCount} 张优惠券可用` : "当前可领优惠已处理完"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text-muted)]">
                {couponSummary.usableCount > 0
                  ? "已领取的优惠券可以在下单时使用，也可以进券包查看有效期。"
                  : "有新活动时这里会继续展示领券入口，现在可以先去看看商品。"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/coupons")}
                  className="rounded-full bg-[var(--theme-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-primary-foreground)]"
                >
                  查看券包
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/categories")}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-text-on-surface)]"
                >
                  <ShoppingBag size={13} />
                  去逛逛
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="store-coupon-rail no-scrollbar flex gap-3 overflow-x-auto pb-1" data-syncing={isCouponSyncing ? "true" : undefined}>
          {visibleItems.map((item) => {
            const display = marketingCouponToPremiumDisplay(item.coupon);
            return (
              <div key={item.coupon.id} className="relative w-[min(88vw,320px)] shrink-0 snap-center">
                <PremiumCouponCard
                  colorScheme="invite"
                  layout="home"
                  title={display.title}
                  amountPrefix={display.amountPrefix}
                  amount={display.amount}
                  minSpendText={display.minSpendText}
                  expireText={display.expireText}
                  scopeText={display.scopeText}
                  statusLabel={item.statusLabel}
                  actionLabel={item.actionLabel}
                  actionLoading={item.action === "claim" && (claimingId === item.coupon.id || isCouponSyncing)}
                  actionDisabled={item.action === "claim" && (claimingId === item.coupon.id || isCouponSyncing)}
                  onAction={() => handleAction(item)}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
