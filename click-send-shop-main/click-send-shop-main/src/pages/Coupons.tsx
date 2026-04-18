import { useState, useEffect, forwardRef } from "react";
import { ArrowLeft, Ticket, Clock, CheckCircle2, Sparkles, Gift, Zap, Crown, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useCouponStore } from "@/stores/useCouponStore";
import type { UserCoupon } from "@/types/coupon";

type DisplayStatus = "available" | "claimed" | "used" | "expired";

interface DisplayCoupon {
  id: string;
  title: string;
  discount: string;
  condition: string;
  expire: string;
  status: DisplayStatus;
  color: "gold" | "ruby" | "emerald" | "sapphire";
  icon: React.ElementType;
  tag?: string;
  code: string;
}

const couponColors = {
  gold: {
    bg: "from-[hsl(43,72%,52%)] to-[hsl(35,80%,45%)]",
    light: "bg-[hsl(43,72%,52%)]/10",
    text: "text-[hsl(43,72%,52%)]",
    border: "border-[hsl(43,72%,52%)]/20",
    stamp: "bg-[hsl(43,72%,52%)]",
  },
  ruby: {
    bg: "from-[hsl(350,75%,55%)] to-[hsl(340,70%,45%)]",
    light: "bg-[hsl(350,75%,55%)]/10",
    text: "text-[hsl(350,75%,55%)]",
    border: "border-[hsl(350,75%,55%)]/20",
    stamp: "bg-[hsl(350,75%,55%)]",
  },
  emerald: {
    bg: "from-[hsl(160,60%,42%)] to-[hsl(170,55%,35%)]",
    light: "bg-[hsl(160,60%,42%)]/10",
    text: "text-[hsl(160,60%,42%)]",
    border: "border-[hsl(160,60%,42%)]/20",
    stamp: "bg-[hsl(160,60%,42%)]",
  },
  sapphire: {
    bg: "from-[hsl(220,70%,55%)] to-[hsl(230,65%,45%)]",
    light: "bg-[hsl(220,70%,55%)]/10",
    text: "text-[hsl(220,70%,55%)]",
    border: "border-[hsl(220,70%,55%)]/20",
    stamp: "bg-[hsl(220,70%,55%)]",
  },
};

const COLOR_CYCLE: DisplayCoupon["color"][] = ["ruby", "gold", "sapphire", "emerald"];
const ICON_MAP: Record<string, React.ElementType> = {
  fixed: Gift,
  percentage: Crown,
  shipping: Zap,
};

function toDisplayCoupon(uc: UserCoupon, index: number): DisplayCoupon {
  const c = uc.coupon;
  const displayStatus: DisplayStatus =
    uc.status === "used" ? "used"
    : uc.status === "expired" ? "expired"
    : uc.claimed_at ? "claimed"
    : "available";

  const discount =
    c.type === "percentage" ? `${c.value}% OFF` : `RM ${c.value}`;
  const condition =
    c.min_amount > 0 ? `满 RM ${c.min_amount} 可用` : "无门槛";

  return {
    id: uc.id,
    title: c.title,
    discount,
    condition,
    expire: c.end_date,
    status: displayStatus,
    color: COLOR_CYCLE[index % COLOR_CYCLE.length],
    icon: ICON_MAP[c.type] ?? Sparkles,
    tag: c.description || undefined,
    code: c.code,
  };
}

type Tab = "available" | "mine";

export default function Coupons() {
  const navigate = useNavigate();
  const { coupons: rawCoupons, loading, error, loadCoupons, claimCoupon } = useCouponStore();
  const [tab, setTab] = useState<Tab>("available");
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const coupons = rawCoupons.map((uc, i) => toDisplayCoupon(uc, i));

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
          <button onClick={() => navigate(-1)} className="touch-target flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary">
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
  const colors = couponColors[coupon.color];
  const Icon = coupon.icon;

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 300, damping: 30 }}
      className={`relative overflow-hidden rounded-2xl ${isDisabled ? "opacity-50" : ""}`}
    >
      {/* Tag */}
      {coupon.tag && !isDisabled && (
        <div className={`absolute right-0 top-0 z-10 rounded-bl-xl px-2.5 py-1 text-[10px] font-bold text-white ${colors.stamp}`}>
          {coupon.tag}
        </div>
      )}

      <div className="flex items-stretch border border-border bg-card rounded-2xl overflow-hidden">
        {/* Left: gradient discount area */}
        <div className={`relative flex w-[110px] flex-shrink-0 flex-col items-center justify-center bg-gradient-to-br ${colors.bg} p-4`}>
          {/* Semicircle cutouts */}
          <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-background" />

          <Icon size={16} className="mb-1.5 text-white/70" />
          <span className="text-2xl font-bold text-white leading-none">
            {coupon.discount}
          </span>
          <span className="mt-1.5 text-[10px] text-white/70 text-center leading-tight">{coupon.condition}</span>
        </div>

        {/* Right: info + action */}
        <div className="flex flex-1 items-center justify-between px-4 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{coupon.title}</p>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock size={11} />
              <span>有效期至 {coupon.expire}</span>
            </div>
          </div>

          <div className="flex-shrink-0 ml-3">
            {coupon.status === "available" && (
              <motion.button
                onClick={onClaim}
                disabled={claiming}
                whileTap={{ scale: 0.9 }}
                className={`relative overflow-hidden rounded-full px-5 py-2.5 text-xs font-bold text-white transition-all ${colors.stamp} ${claiming ? "opacity-60" : "shadow-lg"}`}
              >
                {claiming ? (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-1"
                  >
                    <Sparkles size={12} className="animate-spin" /> 领取中
                  </motion.span>
                ) : (
                  "立即领取"
                )}
              </motion.button>
            )}
            {coupon.status === "claimed" && (
              <div className="flex flex-col items-center gap-1">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${colors.light}`}>
                  <CheckCircle2 size={16} className={colors.text} />
                </div>
                <span className={`text-[10px] font-medium ${colors.text}`}>可用</span>
              </div>
            )}
            {coupon.status === "used" && (
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 rotate-[-15deg]">
                  <span className="text-[9px] font-bold text-muted-foreground">已用</span>
                </div>
              </div>
            )}
            {coupon.status === "expired" && (
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 rotate-[-15deg]">
                  <span className="text-[9px] font-bold text-muted-foreground">过期</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});
