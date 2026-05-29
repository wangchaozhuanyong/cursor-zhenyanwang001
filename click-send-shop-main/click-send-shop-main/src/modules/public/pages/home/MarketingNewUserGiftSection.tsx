import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, Gift, ShoppingBag } from "lucide-react";
import PremiumCouponCard from "@/components/PremiumCouponCard";
import { ensureStoreSession } from "@/lib/ensureStoreSession";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCartStore } from "@/stores/useCartStore";
import { useCouponStore } from "@/stores/useCouponStore";
import { marketingCouponToPremiumDisplay } from "@/utils/couponDisplay";
import {
  buildHomeCouponCardItems,
  summarizeHomeCouponState,
  type HomeCouponCardItem,
} from "@/utils/homeCouponPresentation";
import * as marketingService from "@/services/marketingService";
import * as homeService from "@/services/homeService";
import {
  THEME_GIFT_BADGE_SHELL,
  THEME_INVITE_PROMO_CTA,
  THEME_INVITE_PROMO_MUTED,
  THEME_INVITE_PROMO_SHELL,
} from "@/utils/themeVisuals";
import { AnimatedSection } from "@/modules/micro-interactions";

export default function MarketingNewUserGiftSection({ delay = 0 }: { delay?: number }) {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const coupons = useCouponStore((s) => s.coupons);
  const loadCoupons = useCouponStore((s) => s.loadCoupons);
  const claimCoupon = useCouponStore((s) => s.claimCoupon);
  const selectedCartCount = useCartStore((s) => s.getSelectedItems().length);
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof marketingService.fetchNewUserGift>>>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [couponStateReady, setCouponStateReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cached = homeService.getCachedHomeBootstrap();
    if (cached?.marketing?.newUserGift) {
      setPayload(cached.marketing.newUserGift as Awaited<ReturnType<typeof marketingService.fetchNewUserGift>>);
    }
    homeService.fetchHomeBootstrap().then((bootstrap) => {
      if (cancelled) return;
      if (bootstrap?.marketing?.newUserGift) {
        setPayload(bootstrap.marketing.newUserGift as Awaited<ReturnType<typeof marketingService.fetchNewUserGift>>);
        return;
      }
      return marketingService.fetchNewUserGift().then((data) => {
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

  const visibleItems = useMemo<HomeCouponCardItem[]>(() => {
    if (!payload?.coupons?.length) return [];
    if (isAuthenticated && !couponStateReady) return [];
    return buildHomeCouponCardItems(payload.coupons, coupons, isAuthenticated);
  }, [payload?.coupons, coupons, isAuthenticated, couponStateReady]);

  const couponSummary = useMemo(() => summarizeHomeCouponState(coupons), [coupons]);

  if (!payload?.coupons?.length) return null;

  const goUseCoupon = async (item: HomeCouponCardItem) => {
    if (!item.userCoupon || item.action === "view") {
      navigate("/coupons");
      return;
    }
    const ok = await ensureStoreSession();
    if (!ok) {
      navigate("/login", { state: { from: "/" } });
      return;
    }
    if (selectedCartCount > 0) navigate(`/checkout?coupon_id=${item.userCoupon.id}`);
    else navigate("/cart", { state: { coupon_id: item.userCoupon.id } });
  };

  const handleClaim = async (item: HomeCouponCardItem) => {
    const ok = await ensureStoreSession();
    if (!ok) {
      navigate("/login", { state: { from: "/" } });
      return;
    }
    try {
      setClaimingId(item.coupon.id);
      await claimCoupon(item.coupon.code || item.coupon.id);
    } finally {
      setClaimingId(null);
    }
  };

  const handleAction = (item: HomeCouponCardItem) => {
    void (item.action === "claim" ? handleClaim(item) : goUseCoupon(item));
  };

  const showFallback = isAuthenticated && couponStateReady && visibleItems.length === 0;

  return (
    <AnimatedSection delay={delay}>
      <section className="w-full">
        <div className={`mb-3 rounded-2xl p-4 ${THEME_INVITE_PROMO_SHELL}`}>
          <div className="flex items-start gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${THEME_GIFT_BADGE_SHELL}`}>
              <Gift size={22} className="text-[var(--theme-gift-badge-foreground)]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="store-section-title text-[var(--theme-invite-promo-foreground)]">
                {payload.activity.title || "新人礼包"}
              </h2>
              <p className={`mt-1 text-xs ${THEME_INVITE_PROMO_MUTED}`}>
                {payload.activity.subtitle || (!isAuthenticated ? `注册即领 ${payload.coupons.length} 张优惠券` : "新人礼权益已同步到你的券包")}
              </p>
              {!isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className={`mt-3 rounded-full px-4 py-2 ${THEME_INVITE_PROMO_CTA}`}
                >
                  注册领取礼包
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate("/coupons")}
                  className={`mt-3 rounded-full px-4 py-2 ${THEME_INVITE_PROMO_CTA}`}
                >
                  查看我的券包
                </button>
              )}
            </div>
          </div>
        </div>

        {isAuthenticated && !couponStateReady ? (
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
            {Array.from({ length: Math.min(3, payload.coupons.length || 3) }).map((_, index) => (
              <div
                key={index}
                className="h-[6.75rem] w-[min(88vw,320px)] shrink-0 animate-pulse rounded-xl bg-[var(--theme-surface)]/70 ring-1 ring-[var(--theme-border)]"
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
                  {couponSummary.usableCount > 0 ? "新人礼已放入券包" : "新人礼已处理完"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text-muted)]">
                  {couponSummary.usableCount > 0
                    ? "可用优惠券会在下单时参与抵扣，也可以进入券包查看。"
                    : "当前没有新的新人礼券可展示，可以先去看看商品。"}
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
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
            {visibleItems.map((item) => {
              const display = marketingCouponToPremiumDisplay(item.coupon);
              return (
                <div key={item.coupon.id} className="relative w-[min(88vw,320px)] shrink-0 snap-center">
                  {item.statusLabel ? (
                    <span className="absolute right-3 top-2 z-10 rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_16%,var(--theme-surface))] px-2 py-0.5 text-[10px] font-semibold text-[var(--theme-primary)]">
                      {item.statusLabel}
                    </span>
                  ) : null}
                  <PremiumCouponCard
                    colorScheme="invite"
                    layout="home"
                    title={display.title}
                    amountPrefix={display.amountPrefix}
                    amount={display.amount}
                    minSpendText={display.minSpendText}
                    expireText={display.expireText}
                    scopeText={!isAuthenticated ? "新人专享" : display.scopeText}
                    actionLabel={!isAuthenticated ? "注册领" : item.actionLabel}
                    actionLoading={item.action === "claim" && claimingId === item.coupon.id}
                    actionDisabled={item.action === "claim" && claimingId === item.coupon.id}
                    onAction={!isAuthenticated ? () => navigate("/register") : () => handleAction(item)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AnimatedSection>
  );
}
