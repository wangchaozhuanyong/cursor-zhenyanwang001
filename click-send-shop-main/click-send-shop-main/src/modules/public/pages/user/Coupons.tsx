import { useState, useEffect, forwardRef } from "react";
import { ArrowLeft, Ticket, Loader2 } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useCouponStore } from "@/stores/useCouponStore";
import PremiumCouponCard from "@/components/PremiumCouponCard";
import type { UserCoupon } from "@/types/coupon";
import { userCouponToPremiumDisplay } from "@/utils/couponDisplay";

type DisplayStatus = "available" | "claimed" | "used" | "expired";

interface DisplayCoupon {
  id: string;
  title: string;
  amountPrefix: string;
  amount: string;
  conditionText: string;
  scopeText: string;
  expire: string;
  status: DisplayStatus;
  tag?: string;
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
    conditionText: d.conditionText,
    scopeText: d.scopeText,
    expire: d.expireText,
    status: displayStatus,
    tag: d.badge,
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
      toast.success("领取成功！已添加到我的优惠券");
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gold" />
      </div>
    );
  }

  if (error && rawCoupons.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={() => loadCoupons()}
          className="rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-primary-foreground"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button onClick={goBack} className="touch-target flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">优惠券</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4">
        {/* Hero summary */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-[hsl(var(--gold-dark))] p-6"
        >
          {/* Decorative circles */}
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gold/10" />
          <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-gold/5" />

          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-primary-foreground/50 uppercase tracking-wider">我的优惠券</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-5xl font-bold text-gold">{claimedCount}</span>
                <span className="text-sm text-primary-foreground/60">张可用</span>
              </div>
              <p className="mt-2 text-[11px] text-primary-foreground/40">
                {available.length > 0 ? `还有 ${available.length} 张新券待领取` : "所有优惠券已领取"}
              </p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/15 backdrop-blur-sm">
              <Ticket size={32} className="text-gold" />
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="mt-5 flex rounded-2xl bg-secondary p-1">
          {([
            { key: "available" as Tab, label: "领券中心", count: available.length },
            { key: "mine" as Tab, label: "我的券", count: mine.length },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex-1 rounded-xl py-3 text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  tab === t.key ? "bg-gold text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Coupon list */}
        <div className="mt-4 space-y-3">
          <AnimatePresence mode="popLayout">
            {list.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center py-16 text-muted-foreground"
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
      </main>
    </div>
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
  const statusLabel =
    coupon.status === "claimed" ? "可使用"
    : coupon.status === "used" ? "已使用"
    : coupon.status === "expired" ? "已过期"
    : undefined;

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
        title={coupon.title}
        amountPrefix={coupon.amountPrefix}
        amount={coupon.amount}
        conditionText={coupon.conditionText}
        expireText={coupon.expire}
        scopeText={coupon.scopeText}
        badge={coupon.tag}
        disabled={isDisabled}
        actionLabel={coupon.status === "available" ? "立即领取" : undefined}
        actionLoading={claiming}
        actionDisabled={claiming}
        statusLabel={statusLabel}
        onAction={coupon.status === "available" ? onClaim : undefined}
      />
    </motion.div>
  );
});
