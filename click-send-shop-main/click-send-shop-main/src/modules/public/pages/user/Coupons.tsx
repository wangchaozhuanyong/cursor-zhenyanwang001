import { useState, useEffect, forwardRef } from "react";
import { Ticket, Loader2 } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import { motion, AnimatePresence } from "framer-motion";
import { useCouponStore } from "@/stores/useCouponStore";
import PremiumCouponCard from "@/components/PremiumCouponCard";
import type { UserCoupon } from "@/types/coupon";
import { userCouponToPremiumDisplay } from "@/utils/couponDisplay";
import { cn } from "@/lib/utils";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import {
  THEME_ACCENT_HERO_ICON,
  THEME_ACCENT_HERO_ICON_WRAP,
  THEME_ACCENT_HERO_LABEL,
  THEME_ACCENT_HERO_MUTED,
  THEME_ACCENT_HERO_SHELL,
  THEME_ACCENT_HERO_SUBTLE,
  THEME_ACCENT_HERO_VALUE,
  THEME_BTN_PRICE,
} from "@/utils/themeVisuals";

type DisplayStatus = "available" | "claimed" | "used" | "expired";

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
}

function toDisplayCoupon(uc: UserCoupon): DisplayCoupon {
  const displayStatus: DisplayStatus =
    uc.status === "used" ? "used"
    : uc.status === "expired" ? "expired"
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
  };
}

type Tab = "available" | "mine";

export default function Coupons() {
  const goBack = useGoBack();
  const { coupons: rawCoupons, loading, error, loadCoupons, claimCoupon } = useCouponStore();
  const [tab, setTab] = useState<Tab>("available");
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const coupons = rawCoupons.map((uc) => toDisplayCoupon(uc));

  const available = coupons.filter((c) => c.status === "available");
  const mine = coupons.filter((c) => c.status !== "available");
  const claimedCount = coupons.filter((c) => c.status === "claimed").length;

  const handleClaim = async (coupon: DisplayCoupon) => {
    setClaimingId(coupon.id);
    try {
      await claimCoupon(coupon.code);
      toast.success("领取成功！已添加到我的优惠券", toastPresetQuickSuccess);
      loadCoupons();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "领取失败");
    } finally {
      setClaimingId(null);
    }
  };

  const list = tab === "available" ? available : mine;

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
    <StoreAccountLayout title="优惠券" onBack={goBack} className="store-page pb-6" mainClassName="sm:px-4 lg:py-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden rounded-2xl p-6 ${THEME_ACCENT_HERO_SHELL}`}
        >
          <div
            className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full"
            style={{ background: "color-mix(in srgb, var(--theme-coupon-accent-foreground) 12%, transparent)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-4 -left-4 h-20 w-20 rounded-full"
            style={{ background: "color-mix(in srgb, var(--theme-coupon-accent-foreground) 8%, transparent)" }}
          />

          <div className="relative flex items-center justify-between">
            <div>
              <p className={THEME_ACCENT_HERO_LABEL}>我的优惠券</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`store-stat-value ${THEME_ACCENT_HERO_VALUE}`}>{claimedCount}</span>
                <span className={`text-sm ${THEME_ACCENT_HERO_MUTED}`}>张可用</span>
              </div>
              <p className={`mt-2 ${THEME_ACCENT_HERO_SUBTLE}`}>
                {available.length > 0 ? `还有 ${available.length} 张新券待领取` : "所有优惠券已领取"}
              </p>
            </div>
            <div className={`h-16 w-16 ${THEME_ACCENT_HERO_ICON_WRAP}`}>
              <Ticket size={32} className={THEME_ACCENT_HERO_ICON} />
            </div>
          </div>
        </motion.div>

        <div className="mt-5 flex rounded-2xl bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))] p-1 ring-1 ring-[var(--theme-border)]">
          {([
            { key: "available" as Tab, label: "领券中心", count: available.length },
            { key: "mine" as Tab, label: "我的券", count: mine.length },
          ]).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "relative flex-1 rounded-xl py-3 text-sm font-medium transition-all",
                tab === t.key
                  ? "bg-[var(--theme-surface)] text-[var(--theme-text-on-surface)] shadow-[var(--theme-shadow)]"
                  : "text-[color-mix(in_srgb,var(--theme-text-on-surface)_72%,var(--theme-text-muted))]",
              )}
            >
              {t.label}
              {t.count > 0 ? (
                <span
                  className={cn(
                    "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                    tab === t.key
                      ? THEME_BTN_PRICE
                      : "bg-[color-mix(in_srgb,var(--theme-text-muted)_24%,transparent)] text-[color-mix(in_srgb,var(--theme-text-on-surface)_72%,var(--theme-text-muted))]",
                  )}
                >
                  {t.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          <AnimatePresence mode="popLayout">
            {list.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center py-16 text-[color-mix(in_srgb,var(--theme-text-on-surface)_72%,var(--theme-text-muted))]"
              >
                <Ticket size={48} className="mb-3 opacity-20" />
                <p className="text-sm">暂无优惠券</p>
              </motion.div>
            )}
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
  const isDisabled = coupon.status === "used" || coupon.status === "expired";

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
    </motion.div>
  );
});
