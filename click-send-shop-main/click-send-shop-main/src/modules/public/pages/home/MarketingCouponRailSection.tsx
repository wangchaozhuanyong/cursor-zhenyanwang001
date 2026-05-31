import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, ChevronRight, Gift, ShoppingBag, Ticket } from "lucide-react";
import PremiumCouponCard from "@/components/PremiumCouponCard";
import { ensureStoreSession } from "@/lib/ensureStoreSession";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCartStore } from "@/stores/useCartStore";
import { useCouponStore } from "@/stores/useCouponStore";
import { AnimatedSection } from "@/modules/micro-interactions";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import * as homeService from "@/services/homeService";
import * as marketingService from "@/services/marketingService";
import type { CouponCenterPayload, CouponZonePayload, NewUserGiftPayload } from "@/services/marketingService";
import { marketingCouponToPremiumDisplay } from "@/utils/couponDisplay";
import {
  buildHomeCouponCardItems,
  summarizeHomeCouponState,
  type HomeCouponCardItem,
} from "@/utils/homeCouponPresentation";
import {
  THEME_GIFT_BADGE_SHELL,
  THEME_INVITE_PROMO_CTA,
  THEME_INVITE_PROMO_MUTED,
  THEME_INVITE_PROMO_SHELL,
} from "@/utils/themeVisuals";

type CouponSource = "couponCenter" | "newUserGift" | "couponZone";
type CouponRailItem = HomeCouponCardItem & { source: CouponSource; railKey: string };

export default function MarketingCouponRailSection({
  delay = 0,
  showCouponCenter,
  showNewUserGift,
}: {
  delay?: number;
  showCouponCenter: boolean;
  showNewUserGift: boolean;
}) {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const coupons = useCouponStore((s) => s.coupons);
  const loadCoupons = useCouponStore((s) => s.loadCoupons);
  const claimCoupon = useCouponStore((s) => s.claimCoupon);
  const selectedCartCount = useCartStore((s) => s.getSelectedItems().length);
  const [couponCenter, setCouponCenter] = useState<CouponCenterPayload | null>(null);
  const [newUserGift, setNewUserGift] = useState<NewUserGiftPayload | null>(null);
  const [couponZone, setCouponZone] = useState<CouponZonePayload | null>(null);
  const [claimingKey, setClaimingKey] = useState<string | null>(null);
  const [couponStateReady, setCouponStateReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cached = homeService.getCachedHomeBootstrap();
    if ((showCouponCenter || showNewUserGift) && cached?.marketing?.couponZone) {
      setCouponZone(cached.marketing.couponZone as CouponZonePayload);
    }
    if (showCouponCenter && cached?.marketing?.couponCenter) {
      setCouponCenter(cached.marketing.couponCenter as CouponCenterPayload);
    }
    if (showNewUserGift && cached?.marketing?.newUserGift) {
      setNewUserGift(cached.marketing.newUserGift as NewUserGiftPayload);
    }

    void (async () => {
      const bootstrap = await homeService.fetchHomeBootstrap().catch(() => null);
      if (cancelled) return;

      const nextCouponZone = (showCouponCenter || showNewUserGift)
        ? (bootstrap?.marketing?.couponZone as CouponZonePayload | null) ?? await marketingService.fetchCouponZone().catch(() => null)
        : null;
      const nextCouponCenter = showCouponCenter && !nextCouponZone
        ? (bootstrap?.marketing?.couponCenter as CouponCenterPayload | null) ?? await marketingService.fetchCouponCenter().catch(() => null)
        : null;
      const nextNewUserGift = showNewUserGift && !nextCouponZone
        ? (bootstrap?.marketing?.newUserGift as NewUserGiftPayload | null) ?? await marketingService.fetchNewUserGift().catch(() => null)
        : null;

      if (cancelled) return;
      setCouponZone(nextCouponZone);
      setCouponCenter(nextCouponCenter);
      setNewUserGift(nextNewUserGift);
    })();

    return () => {
      cancelled = true;
    };
  }, [showCouponCenter, showNewUserGift]);

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

  const couponItems = useMemo<CouponRailItem[]>(() => {
    if (isAuthenticated && !couponStateReady) return [];
    const items: CouponRailItem[] = [];
    const seen = new Set<string>();
    if (couponZone?.campaigns?.length) {
      for (const campaign of couponZone.campaigns) {
        for (const item of buildHomeCouponCardItems(campaign.coupons || [], coupons, isAuthenticated)) {
          const key = item.coupon.id || item.coupon.code;
          if (seen.has(key)) continue;
          seen.add(key);
          items.push({
            ...item,
            source: campaign.campaign_type === "new_user_gift" ? "newUserGift" : "couponZone",
            railKey: `zone-${campaign.id}-${item.coupon.id}`,
          });
        }
      }
      return items;
    }
    if (couponZone?.coupons?.length) {
      items.push(...buildHomeCouponCardItems(couponZone.coupons, coupons, isAuthenticated).map((item) => ({
        ...item,
        source: "couponZone" as const,
        railKey: `zone-${item.coupon.id}`,
      })));
      return items;
    }
    if (couponCenter?.coupons?.length) {
      items.push(...buildHomeCouponCardItems(couponCenter.coupons, coupons, isAuthenticated).map((item) => ({
        ...item,
        source: "couponCenter" as const,
        railKey: `coupon-${item.coupon.id}`,
      })));
    }
    if (newUserGift?.coupons?.length) {
      items.push(...buildHomeCouponCardItems(newUserGift.coupons, coupons, isAuthenticated).map((item) => ({
        ...item,
        source: "newUserGift" as const,
        railKey: `gift-${item.coupon.id}`,
      })));
    }
    return items;
  }, [couponCenter?.coupons, couponStateReady, coupons, couponZone?.campaigns, couponZone?.coupons, isAuthenticated, newUserGift?.coupons]);

  const couponSummary = useMemo(() => summarizeHomeCouponState(coupons), [coupons]);
  const giftIntroPayload = useMemo<NewUserGiftPayload | null>(() => {
    const giftCampaign = couponZone?.campaigns?.find((campaign) => campaign.campaign_type === "new_user_gift");
    if (!giftCampaign) return newUserGift;
    return {
      activity: giftCampaign,
      coupons: giftCampaign.coupons || [],
      auto_issue_on_register: giftCampaign.issue_mode === "auto_register",
    };
  }, [couponZone?.campaigns, newUserGift]);
  const hasCouponZone = Boolean(couponZone?.coupons?.length || couponZone?.campaigns?.some((campaign) => campaign.coupons?.length));
  const hasCouponCenter = Boolean(couponCenter?.coupons?.length);
  const hasNewUserGift = Boolean(giftIntroPayload?.coupons?.length);
  const hasAnyMarketing = hasCouponZone || hasCouponCenter || hasNewUserGift;

  if (!hasAnyMarketing) return null;

  const openAllCoupons = () => {
    navigate("/coupons");
  };

  const goUseCoupon = async (item: CouponRailItem) => {
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

  const handleClaim = async (item: CouponRailItem) => {
    if (!isAuthenticated) {
      navigate(item.source === "newUserGift" ? "/register" : "/login", { state: { from: "/" } });
      return;
    }
    const ok = await ensureStoreSession();
    if (!ok) {
      navigate("/login", { state: { from: "/" } });
      return;
    }
    try {
      setClaimingKey(item.railKey);
      await claimCoupon(item.coupon.code || item.coupon.id, item.coupon.issue_activity_id);
      toast.success("领取成功，已放入你的券包", toastPresetQuickSuccess);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "领取失败");
    } finally {
      setClaimingKey(null);
    }
  };

  const handleCouponAction = (item: CouponRailItem) => {
    void (item.action === "claim" ? handleClaim(item) : goUseCoupon(item));
  };

  const sectionTitle = couponZone?.activity?.title || couponCenter?.activity?.title || "优惠券专区";
  const showFallback = isAuthenticated && couponStateReady && couponItems.length === 0;

  return (
    <AnimatedSection delay={delay}>
      <section className="w-full">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="store-section-title flex min-w-0 items-center gap-2 text-[var(--theme-text-on-surface)]">
            <Ticket className="h-5 w-5 shrink-0 text-[var(--theme-primary)]" />
            <span className="truncate">{sectionTitle}</span>
          </h2>
          <button
            type="button"
            onClick={openAllCoupons}
            className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-[var(--theme-primary)]"
          >
            全部优惠券
            <ChevronRight size={13} />
          </button>
        </div>

        {isAuthenticated && !couponStateReady ? (
          <div className="no-scrollbar -mx-[var(--store-page-x)] flex snap-x snap-mandatory gap-3 overflow-x-auto px-[var(--store-page-x)] pb-1 md:mx-0 md:px-0">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-[6.75rem] w-[min(78vw,300px)] shrink-0 snap-start animate-pulse rounded-xl bg-[var(--theme-surface)]/70 ring-1 ring-[var(--theme-border)]"
              />
            ))}
          </div>
        ) : (
          <div className="no-scrollbar -mx-[var(--store-page-x)] flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-[var(--store-page-x)] pb-1 md:mx-0 md:px-0">
            {hasNewUserGift ? (
              <GiftIntroCard
                payload={giftIntroPayload}
                isAuthenticated={isAuthenticated}
                onClick={() => navigate(isAuthenticated ? "/coupons" : "/register")}
              />
            ) : null}

            {showFallback ? (
              <FallbackCard
                usableCount={couponSummary.usableCount}
                onCoupons={() => navigate("/coupons")}
                onShopping={() => navigate("/categories")}
              />
            ) : couponItems.map((item) => {
              const display = marketingCouponToPremiumDisplay(item.coupon);
              const actionLabel = !isAuthenticated && item.source === "newUserGift" ? "注册领取" : item.actionLabel;
              return (
                <div key={item.railKey} className="relative w-[min(78vw,300px)] shrink-0 snap-start">
                  <PremiumCouponCard
                    colorScheme="invite"
                    layout="home"
                    title={display.title}
                    amountPrefix={display.amountPrefix}
                    amount={display.amount}
                    minSpendText={display.minSpendText}
                    expireText={display.expireText}
                    scopeText={item.source === "newUserGift" && !isAuthenticated ? "新人专享" : display.scopeText}
                    statusLabel={item.statusLabel}
                    actionLabel={actionLabel}
                    actionLoading={item.action === "claim" && claimingKey === item.railKey}
                    actionDisabled={item.action === "claim" && claimingKey === item.railKey}
                    onAction={() => handleCouponAction(item)}
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

function GiftIntroCard({
  payload,
  isAuthenticated,
  onClick,
}: {
  payload: NewUserGiftPayload | null;
  isAuthenticated: boolean;
  onClick: () => void;
}) {
  if (!payload) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[6.75rem] w-[min(78vw,300px)] shrink-0 snap-start items-center gap-3 rounded-xl border border-[var(--theme-border)] p-3 text-left ${THEME_INVITE_PROMO_SHELL}`}
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${THEME_GIFT_BADGE_SHELL}`}>
        <Gift size={23} className="text-[var(--theme-gift-badge-foreground)]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-[var(--theme-invite-promo-foreground)]">
          {payload.activity.title || "新人礼包"}
        </span>
        <span className={`mt-1 block line-clamp-2 text-xs leading-5 ${THEME_INVITE_PROMO_MUTED}`}>
          {payload.activity.subtitle || (!isAuthenticated ? `注册即领 ${payload.coupons.length} 张优惠券` : "新人礼权益已同步到你的券包")}
        </span>
        <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${THEME_INVITE_PROMO_CTA}`}>
          {isAuthenticated ? "查看券包" : "注册领取"}
          <ChevronRight size={13} />
        </span>
      </span>
    </button>
  );
}

function FallbackCard({
  usableCount,
  onCoupons,
  onShopping,
}: {
  usableCount: number;
  onCoupons: () => void;
  onShopping: () => void;
}) {
  return (
    <div className="flex min-h-[6.75rem] w-[min(78vw,300px)] shrink-0 snap-start items-start gap-3 rounded-xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)]/70 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--theme-primary)_14%,transparent)] text-[var(--theme-primary)]">
        <BadgeCheck size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--theme-text-on-surface)]">
          {usableCount > 0 ? `你有 ${usableCount} 张优惠券可用` : "当前可领优惠已处理完"}
        </p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--theme-text-muted)]">
          {usableCount > 0 ? "已领取的券可以下单时使用。" : "有新活动时这里会继续展示。"}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCoupons}
            className="rounded-full bg-[var(--theme-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-primary-foreground)]"
          >
            查看券包
          </button>
          <button
            type="button"
            onClick={onShopping}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-text-on-surface)]"
          >
            <ShoppingBag size={13} />
            去逛逛
          </button>
        </div>
      </div>
    </div>
  );
}
