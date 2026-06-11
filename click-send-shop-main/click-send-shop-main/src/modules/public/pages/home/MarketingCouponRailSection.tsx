import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, ChevronRight, ShoppingBag, Ticket } from "lucide-react";
import PremiumCouponCard from "@/components/PremiumCouponCard";
import { ensureStoreSession } from "@/lib/ensureStoreSession";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCouponStore } from "@/stores/useCouponStore";
import { useCouponAction } from "@/features/coupon/useCouponAction";
import * as homeService from "@/services/homeService";
import * as marketingService from "@/services/marketingService";
import type { CouponCenterPayload, CouponZonePayload, NewUserGiftPayload } from "@/services/marketingService";
import { marketingCouponToPremiumDisplay } from "@/utils/couponDisplay";
import {
  buildVisibleHomeCouponCardItems,
  summarizeHomeCouponState,
  type HomeCouponCardItem,
} from "@/utils/homeCouponPresentation";
import { hasHomeCouponMarketingPayload } from "@/utils/homeCouponMarketing";
import { STORE_COPY } from "@/constants/storeCopy";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type CouponSource = "couponCenter" | "newUserGift" | "couponZone";
type CouponRailItem = HomeCouponCardItem & { source: CouponSource; railKey: string };

type CouponMarketingState = {
  couponCenter: CouponCenterPayload | null;
  newUserGift: NewUserGiftPayload | null;
  couponZone: CouponZonePayload | null;
  ready: boolean;
};

const EMPTY_COUPON_MARKETING_STATE: CouponMarketingState = {
  couponCenter: null,
  newUserGift: null,
  couponZone: null,
  ready: false,
};

function buildCouponMarketingState(
  marketing: ReturnType<typeof homeService.getCachedHomeMarketing>,
  showCouponCenter: boolean,
  showNewUserGift: boolean,
): CouponMarketingState {
  return {
    couponZone: (showCouponCenter || showNewUserGift)
      ? (marketing?.couponZone as CouponZonePayload | null) ?? null
      : null,
    couponCenter: showCouponCenter
      ? (marketing?.couponCenter as CouponCenterPayload | null) ?? null
      : null,
    newUserGift: showNewUserGift
      ? (marketing?.newUserGift as NewUserGiftPayload | null) ?? null
      : null,
    ready: Boolean(marketing),
  };
}

function readCachedCouponMarketingState(
  showCouponCenter: boolean,
  showNewUserGift: boolean,
): CouponMarketingState {
  return buildCouponMarketingState(
    homeService.getCachedHomeMarketing(),
    showCouponCenter,
    showNewUserGift,
  );
}

export default function MarketingCouponRailSection({
  showCouponCenter,
  showNewUserGift,
  title = "",
  compactAfterNav = false,
}: {
  delay?: number;
  showCouponCenter: boolean;
  showNewUserGift: boolean;
  title?: string;
  compactAfterNav?: boolean;
}) {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const coupons = useCouponStore((s) => s.coupons);
  const loadCoupons = useCouponStore((s) => s.loadCoupons);
  const { claim: claimCouponAction } = useCouponAction("/");
  const shouldLoadMarketing = showCouponCenter || showNewUserGift;
  const [marketingState, setMarketingState] = useState<CouponMarketingState>(() =>
    readCachedCouponMarketingState(showCouponCenter, showNewUserGift),
  );
  const [claimingKey, setClaimingKey] = useState<string | null>(null);
  const [couponStateReady, setCouponStateReady] = useState(false);

  useEffect(() => {
    if (!shouldLoadMarketing) {
      setMarketingState({ ...EMPTY_COUPON_MARKETING_STATE, ready: true });
      return;
    }

    let cancelled = false;
    const cachedState = readCachedCouponMarketingState(showCouponCenter, showNewUserGift);
    setMarketingState(cachedState.ready ? cachedState : EMPTY_COUPON_MARKETING_STATE);

    void (async () => {
      const marketing = await homeService.fetchHomeMarketing().catch(() => null);
      if (cancelled) return;

      const nextCouponZone = shouldLoadMarketing
        ? (marketing?.couponZone as CouponZonePayload | null) ?? await marketingService.fetchCouponZone().catch(() => null)
        : null;
      const nextCouponCenter = showCouponCenter && !nextCouponZone
        ? (marketing?.couponCenter as CouponCenterPayload | null) ?? await marketingService.fetchCouponCenter().catch(() => null)
        : null;
      const nextNewUserGift = showNewUserGift && !nextCouponZone
        ? (marketing?.newUserGift as NewUserGiftPayload | null) ?? await marketingService.fetchNewUserGift().catch(() => null)
        : null;

      if (cancelled) return;
      setMarketingState({
        couponZone: nextCouponZone,
        couponCenter: nextCouponCenter,
        newUserGift: nextNewUserGift,
        ready: true,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [shouldLoadMarketing, showCouponCenter, showNewUserGift]);

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

  const {
    couponCenter,
    couponZone,
    newUserGift,
    ready: marketingReady,
  } = marketingState;
  const isCouponSyncing = isAuthenticated && !couponStateReady;
  const couponItems = useMemo<CouponRailItem[]>(() => {
    const items: CouponRailItem[] = [];
    const seen = new Set<string>();
    if (couponZone?.campaigns?.length) {
      for (const campaign of couponZone.campaigns) {
        for (const item of buildVisibleHomeCouponCardItems(campaign.coupons || [], coupons, {
          isAuthenticated,
          couponStateReady,
        })) {
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
      items.push(...buildVisibleHomeCouponCardItems(couponZone.coupons, coupons, {
        isAuthenticated,
        couponStateReady,
      }).map((item) => ({
        ...item,
        source: "couponZone" as const,
        railKey: `zone-${item.coupon.id}`,
      })));
      return items;
    }
    if (couponCenter?.coupons?.length) {
      items.push(...buildVisibleHomeCouponCardItems(couponCenter.coupons, coupons, {
        isAuthenticated,
        couponStateReady,
      }).map((item) => ({
        ...item,
        source: "couponCenter" as const,
        railKey: `coupon-${item.coupon.id}`,
      })));
    }
    if (newUserGift?.coupons?.length) {
      items.push(...buildVisibleHomeCouponCardItems(newUserGift.coupons, coupons, {
        isAuthenticated,
        couponStateReady,
      }).map((item) => ({
        ...item,
        source: "newUserGift" as const,
        railKey: `gift-${item.coupon.id}`,
      })));
    }
    return items;
  }, [couponCenter?.coupons, couponStateReady, coupons, couponZone?.campaigns, couponZone?.coupons, isAuthenticated, newUserGift?.coupons]);

  const couponSummary = useMemo(() => summarizeHomeCouponState(coupons), [coupons]);
  const hasAnyMarketing = hasHomeCouponMarketingPayload({
    couponCenter,
    couponZone,
    newUserGift,
  });

  if (!shouldLoadMarketing) return null;
  if (!marketingReady) return <CouponRailLoadingShell compactAfterNav={compactAfterNav} />;
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
    const { useCartStore } = await import("@/stores/useCartStore");
    const selectedCartCount = useCartStore.getState().getSelectedItems().length;
    if (selectedCartCount > 0) navigate(`/checkout?coupon_id=${item.userCoupon.id}`);
    else navigate("/cart", { state: { coupon_id: item.userCoupon.id } });
  };

  const handleClaim = async (item: CouponRailItem) => {
    try {
      setClaimingKey(item.railKey);
      await claimCouponAction(item.coupon, { from: "/", successMessage: "领取成功，已放入你的券包" });
    } catch {
      // useCouponAction / store 已统一错误提示，这里只负责释放 loading
    } finally {
      setClaimingKey(null);
    }
  };

  const handleCouponAction = (item: CouponRailItem) => {
    void (item.action === "claim" ? handleClaim(item) : goUseCoupon(item));
  };

  const sectionTitle = title || couponZone?.activity?.title || couponCenter?.activity?.title || "优惠券模块";
  const showFallback = isAuthenticated && couponStateReady && couponItems.length === 0;
  const sectionClassName = compactAfterNav
    ? "store-coupon-rail-section store-coupon-rail-section--after-nav w-full"
    : "store-coupon-rail-section w-full";

  return (
    <>
      <section className={sectionClassName}>
        <div className="store-section-heading mb-3 flex items-center justify-between gap-3">
          <h2 className="store-section-title flex min-w-0 items-center gap-2 text-[var(--theme-text-on-surface)]">
            <Ticket className="h-5 w-5 shrink-0 text-[var(--theme-primary)]" />
            <span className="truncate">{sectionTitle}</span>
          </h2>
          <UnifiedButton
            type="button"
            onClick={openAllCoupons}
            className="inline-flex min-h-9 shrink-0 items-center gap-0.5 rounded-full px-2 text-xs font-semibold text-[var(--theme-primary)]"
          >
            全部优惠券
            <ChevronRight size={13} />
          </UnifiedButton>
        </div>

        {isCouponSyncing && couponItems.length === 0 ? (
          <CouponRailSkeleton />
        ) : (
          <div className="store-coupon-rail no-scrollbar -mx-[var(--store-page-x)] flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-[var(--store-page-x)] pb-1 md:mx-0 md:px-0" data-syncing={isCouponSyncing ? "true" : undefined}>
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
                <div key={item.railKey} className="store-coupon-rail-card relative w-[min(86vw,330px)] shrink-0 snap-start">
                  <PremiumCouponCard
                    colorScheme="invite"
                    layout="home"
                    title={display.title}
                    amount={display.amount}
                    minSpendText={display.minSpendText}
                    expireText={display.expireText}
                    scopeText={item.source === "newUserGift" && !isAuthenticated ? "新人专享" : display.scopeText}
                    statusLabel={item.statusLabel}
                    actionLabel={actionLabel}
                    actionLoading={item.action === "claim" && claimingKey === item.railKey}
                    actionDisabled={item.action === "claim" && (item.actionDisabled || claimingKey === item.railKey || isCouponSyncing)}
                    onAction={() => handleCouponAction(item)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function CouponRailLoadingShell({ compactAfterNav = false }: { compactAfterNav?: boolean }) {
  const sectionClassName = compactAfterNav
    ? "store-coupon-rail-section store-coupon-rail-section--after-nav w-full"
    : "store-coupon-rail-section w-full";

  return (
    <section className={sectionClassName} aria-busy="true">
      <div className="store-section-heading mb-3 flex items-center justify-between gap-3">
        <div className="h-6 w-36 rounded-full bg-[color-mix(in_srgb,var(--theme-border)_72%,transparent)]" />
        <div className="h-9 w-24 rounded-full bg-[color-mix(in_srgb,var(--theme-border)_58%,transparent)]" />
      </div>
      <CouponRailSkeleton />
    </section>
  );
}

function CouponRailSkeleton() {
  return (
    <div className="store-coupon-rail no-scrollbar -mx-[var(--store-page-x)] flex snap-x snap-mandatory gap-3 overflow-x-auto px-[var(--store-page-x)] pb-1 md:mx-0 md:px-0">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="store-coupon-skeleton-card w-[min(86vw,330px)] shrink-0 snap-start"
        />
      ))}
    </div>
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
    <div className="store-coupon-rail-card flex min-h-[6.75rem] w-[min(86vw,330px)] shrink-0 snap-start items-start gap-3 rounded-xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)]/70 p-3">
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
          <UnifiedButton
            type="button"
            onClick={onCoupons}
            className="rounded-full bg-[var(--theme-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-primary-foreground)]"
          >
            查看券包
          </UnifiedButton>
          <UnifiedButton
            type="button"
            onClick={onShopping}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-text-on-surface)]"
          >
            <ShoppingBag size={13} />
            {STORE_COPY.browseAllCategories}
          </UnifiedButton>
        </div>
      </div>
    </div>
  );
}
