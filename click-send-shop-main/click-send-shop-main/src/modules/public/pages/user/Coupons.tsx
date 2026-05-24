import { useState, useEffect, forwardRef } from "react";
import { Ticket, Loader2 } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import { motion, AnimatePresence } from "framer-motion";
import { useCouponStore } from "@/stores/useCouponStore";
import PremiumCouponCard from "@/components/PremiumCouponCard";
import EmptyState from "@/components/EmptyState";
import type { UserCoupon } from "@/types/coupon";
import { userCouponToPremiumDisplay } from "@/utils/couponDisplay";
import { cn } from "@/lib/utils";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import {
  THEME_ACCENT_HERO_LABEL,
  THEME_ACCENT_HERO_MUTED,
  THEME_ACCENT_HERO_SHELL,
  THEME_ACCENT_HERO_SUBTLE,
  THEME_ACCENT_HERO_VALUE,
  THEME_BTN_PRICE,
} from "@/utils/themeVisuals";

type DisplayStatus = "available" | "claimed" | "pending" | "used" | "expired" | "invalidated";

interface DisplayCoupon {
  id: string;
  title: string;
  amountPrefix: string;
  amount: string;
  minSpendText: string;
  scopeText: string;
  expire: string;
  status: DisplayStatus;
  code: string;
  orderNo?: string;
  invalidReason?: string;
}

function toDisplayCoupon(uc: UserCoupon): DisplayCoupon {
  const displayStatus: DisplayStatus =
    uc.status === "pending" ? "pending"
    : uc.status === "used" ? "used"
    : uc.status === "expired" ? "expired"
    : uc.status === "invalidated" || uc.status === "cancelled" ? "invalidated"
    : uc.claimed_at ? "claimed"
    : "available";

  const d = userCouponToPremiumDisplay(uc);
  return {
    id: uc.id,
    title: d.title,
    amountPrefix: d.amountPrefix,
    amount: d.amount,
    minSpendText: d.minSpendText,
    scopeText: d.scopeText,
    expire: d.expireText,
    status: displayStatus,
    code: d.code,
    orderNo: uc.order_no,
    invalidReason: uc.invalid_reason,
  };
}

type Tab = "all" | "mine" | "pending" | "used" | "expired" | "invalidated";
type PageView = "mine" | "claimCenter";

const TAB_ITEMS: Array<{ key: Tab; label: string; badge?: boolean }> = [
  { key: "all", label: "全部" },
  { key: "mine", label: "可使用", badge: true },
  { key: "pending", label: "未生效" },
  { key: "used", label: "已使用" },
  { key: "expired", label: "已过期" },
  { key: "invalidated", label: "已失效" },
];

const EMPTY_STATE_COPY: Record<Tab, { title: string; description?: string }> = {
  all: { title: "暂无优惠券", description: "已领取的优惠券会显示在这里" },
  mine: { title: "暂无可使用优惠券", description: "去领券中心看看有没有新券" },
  pending: { title: "暂无未生效优惠券" },
  used: { title: "暂无已使用优惠券" },
  expired: { title: "暂无已过期优惠券" },
  invalidated: { title: "暂无已失效优惠券" },
};

function filterByTab(coupons: DisplayCoupon[], tab: Tab): DisplayCoupon[] {
  const owned = coupons.filter((c) => c.status !== "available");
  switch (tab) {
    case "all":
      return owned;
    case "mine":
      return owned.filter((c) => c.status === "claimed");
    case "pending":
      return owned.filter((c) => c.status === "pending");
    case "used":
      return owned.filter((c) => c.status === "used");
    case "expired":
      return owned.filter((c) => c.status === "expired");
    case "invalidated":
      return owned.filter((c) => c.status === "invalidated");
    default:
      return owned;
  }
}

export default function Coupons() {
  const goBack = useGoBack();
  const { coupons: rawCoupons, loading, error, loadCoupons, claimCoupon } = useCouponStore();
  const [tab, setTab] = useState<Tab>("mine");
  const [pageView, setPageView] = useState<PageView>("mine");
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const coupons = rawCoupons.map((uc) => toDisplayCoupon(uc));
  const available = coupons.filter((c) => c.status === "available");
  const usableCount = coupons.filter((c) => c.status === "claimed").length;
  const list = pageView === "claimCenter" ? available : filterByTab(coupons, tab);

  const handleClaim = async (coupon: DisplayCoupon) => {
    setClaimingId(coupon.id);
    try {
      await claimCoupon(coupon.code);
      toast.success("领取成功！已添加到我的优惠券", toastPresetQuickSuccess);
      setPageView("mine");
      setTab("mine");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "领取失败");
    } finally {
      setClaimingId(null);
    }
  };

  const headerRightSlot = pageView === "claimCenter" ? (
    <button
      type="button"
      onClick={() => setPageView("mine")}
      className="touch-target shrink-0 whitespace-nowrap px-1 text-sm font-medium text-[var(--theme-primary)]"
    >
      我的优惠券
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setPageView("claimCenter")}
      className="touch-target shrink-0 whitespace-nowrap px-1 text-sm font-medium text-[var(--theme-primary)]"
    >
      领券中心
      {available.length > 0 ? (
        <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-price)_18%,var(--theme-surface))] px-1 text-[10px] font-bold text-[var(--theme-price)]">
          {available.length}
        </span>
      ) : null}
    </button>
  );

  if (loading && rawCoupons.length === 0) {
    return (
      <div className="store-page flex min-h-screen items-center justify-center">
        <Loader2 size={32} className="animate-spin text-theme-price" />
      </div>
    );
  }

  if (error && rawCoupons.length === 0) {
    return (
      <div className="store-page flex min-h-screen flex-col items-center justify-center gap-3 px-[var(--store-page-x)] sm:px-4">
        <p className="text-sm text-[var(--theme-danger)]">{error}</p>
        <button
          type="button"
          onClick={() => loadCoupons()}
          className={cn("rounded-full px-6 py-2.5 text-sm font-bold", THEME_BTN_PRICE)}
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <StoreAccountLayout
      title={pageView === "claimCenter" ? "领券中心" : "优惠券"}
      onBack={pageView === "claimCenter" ? () => setPageView("mine") : goBack}
      rightSlot={headerRightSlot}
      className="store-page pb-6"
      mainClassName="sm:px-4 lg:py-6"
    >
      {pageView === "mine" ? (
        <div className="mb-4 hidden items-center justify-end lg:flex">
          <button
            type="button"
            onClick={() => setPageView("claimCenter")}
            className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-[var(--theme-primary)] ring-1 ring-[var(--theme-border)]"
          >
            领券中心
            {available.length > 0 ? (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-price)_18%,var(--theme-surface))] px-1 text-[10px] font-bold text-[var(--theme-price)]">
                {available.length}
              </span>
            ) : null}
          </button>
        </div>
      ) : (
        <div className="mb-4 hidden items-center justify-end lg:flex">
          <button
            type="button"
            onClick={() => setPageView("mine")}
            className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-[var(--theme-primary)] ring-1 ring-[var(--theme-border)]"
          >
            返回我的优惠券
          </button>
        </div>
      )}

      {pageView === "mine" ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("rounded-2xl p-5", THEME_ACCENT_HERO_SHELL)}
        >
          <p className={THEME_ACCENT_HERO_LABEL}>我的优惠券</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`store-stat-value ${THEME_ACCENT_HERO_VALUE}`}>{usableCount}</span>
            <span className={`text-sm ${THEME_ACCENT_HERO_MUTED}`}>张可用</span>
          </div>
          <p className={`mt-2 ${THEME_ACCENT_HERO_SUBTLE}`}>已领取的优惠券都在这里</p>
        </motion.div>
      ) : null}

      {pageView === "mine" ? (
        <motion.div
          className="mt-5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="优惠券状态筛选"
        >
          <div className="flex min-w-max gap-1 rounded-2xl bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))] p-1 ring-1 ring-[var(--theme-border)]">
            {TAB_ITEMS.map((t) => {
              const count = t.badge ? usableCount : 0;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "relative shrink-0 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    tab === t.key
                      ? "bg-[var(--theme-surface)] text-[var(--theme-text-on-surface)] shadow-[var(--theme-shadow)]"
                      : "text-[color-mix(in_srgb,var(--theme-text-on-surface)_72%,var(--theme-text-muted))]",
                  )}
                >
                  {t.label}
                  {t.badge && count > 0 ? (
                    <span
                      className={cn(
                        "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                        tab === t.key
                          ? THEME_BTN_PRICE
                          : "bg-[color-mix(in_srgb,var(--theme-text-muted)_24%,transparent)] text-[color-mix(in_srgb,var(--theme-text-on-surface)_72%,var(--theme-text-muted))]",
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </motion.div>
      ) : null}

      <div className={cn("space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0", pageView === "mine" ? "mt-4" : "mt-0")}>
        <AnimatePresence mode="popLayout">
          {list.length === 0 ? (
            <motion.div
              key={`empty-${pageView}-${tab}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:col-span-2"
            >
              {pageView === "claimCenter" ? (
                <EmptyState
                  icon={Ticket}
                  title="暂无可领取优惠券"
                  description="新优惠券上线后会出现在这里"
                />
              ) : (
                <EmptyState
                  icon={Ticket}
                  title={EMPTY_STATE_COPY[tab].title}
                  description={EMPTY_STATE_COPY[tab].description}
                  action={
                    tab === "mine" && available.length > 0
                      ? { label: "去领券中心", onClick: () => setPageView("claimCenter") }
                      : undefined
                  }
                />
              )}
            </motion.div>
          ) : null}
          {list.map((coupon, i) => (
            <CouponCard
              key={coupon.id}
              coupon={coupon}
              index={i}
              claiming={claimingId === coupon.id}
              onClaim={() => handleClaim(coupon)}
            />
          ))}
        </AnimatePresence>
      </div>
    </StoreAccountLayout>
  );
}

type CouponCardProps = {
  coupon: DisplayCoupon;
  index: number;
  claiming: boolean;
  onClaim: () => void;
};

const CouponCard = forwardRef<HTMLDivElement, CouponCardProps>(function CouponCard(
  { coupon, index, claiming, onClaim },
  ref,
) {
  const isDisabled = coupon.status === "used" || coupon.status === "expired" || coupon.status === "pending" || coupon.status === "invalidated";

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 300, damping: 30 }}
      className="relative overflow-hidden rounded-2xl"
    >
      <PremiumCouponCard
        colorScheme="invite"
        infoFieldOrder="thresholdFirst"
        title={coupon.title}
        amountPrefix={coupon.amountPrefix}
        amount={coupon.amount}
        minSpendText={coupon.minSpendText}
        expireText={coupon.expire}
        scopeText={coupon.scopeText}
        disabled={isDisabled}
        actionLabel={coupon.status === "available" ? "立即领取" : undefined}
        actionLoading={claiming}
        actionDisabled={claiming}
        onAction={coupon.status === "available" ? onClaim : undefined}
      />
      {coupon.orderNo ? <p className="mt-1 px-3 text-xs text-theme-muted">使用订单：{coupon.orderNo}</p> : null}
      {coupon.invalidReason ? <p className="mt-1 px-3 text-xs text-[var(--theme-danger)]">{coupon.invalidReason}</p> : null}
    </motion.div>
  );
});
