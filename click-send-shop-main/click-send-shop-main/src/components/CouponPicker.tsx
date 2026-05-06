import { useState } from "react";
import { Ticket, ChevronRight, Check, Clock, Gift, Zap, Crown, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CheckoutPickerCoupon } from "@/types/coupon";

const couponGradients = {
  gold: "",
  ruby: "from-[hsl(350,75%,55%)] to-[hsl(340,70%,45%)]",
  emerald: "from-[hsl(160,60%,42%)] to-[hsl(170,55%,35%)]",
  sapphire: "from-[hsl(220,70%,55%)] to-[hsl(230,65%,45%)]",
};

const colors: Array<keyof typeof couponGradients> = ["gold", "ruby", "sapphire", "emerald"];
const icons = [Gift, Sparkles, Crown, Zap];

function stripeClassForCouponVariant(color: keyof typeof couponGradients) {
  if (color === "gold") return "bg-theme-coupon-accent";
  return `bg-gradient-to-br ${couponGradients[color]}`;
}

function styleForVariant(variantIndex: number) {
  const color = colors[variantIndex % colors.length];
  const Icon = icons[variantIndex % icons.length];
  return { color, Icon };
}

interface CouponPickerProps {
  totalAmount: number;
  shippingFee?: number;
  selectedCouponId: string | null;
  onSelect: (coupon: CheckoutPickerCoupon | null) => void;
  /** 由页面经 useCheckoutPickerCoupons → couponService 注入 */
  coupons: CheckoutPickerCoupon[];
  loading: boolean;
}

export default function CouponPicker({
  totalAmount,
  shippingFee = 0,
  selectedCouponId,
  onSelect,
  coupons,
  loading,
}: CouponPickerProps) {
  const [open, setOpen] = useState(false);

  const selected = coupons.find((c) => c.id === selectedCouponId) ?? null;

  const getDiscountText = (c: CheckoutPickerCoupon) => {
    if (c.discountType === "percent") return `${c.discount}%`;
    if (c.discountType === "shipping") return c.discount > 0 ? `运费减 RM ${c.discount}` : "免运费";
    return `RM ${c.discount}`;
  };

  const getDiscountAmount = (c: CheckoutPickerCoupon) => {
    if (c.discountType === "percent") return Math.min(totalAmount, Math.floor((totalAmount * c.discount) / 100));
    if (c.discountType === "shipping") return Math.min(shippingFee, c.discount > 0 ? c.discount : shippingFee);
    return Math.min(totalAmount, c.discount);
  };

  const isUsable = (c: CheckoutPickerCoupon) => totalAmount >= c.condition && (c.discountType !== "shipping" || shippingFee > 0);
  const usableCount = coupons.filter(isUsable).length;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-5"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10">
            <Ticket size={16} className="text-gold" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">优惠券</h3>
        </div>
        <div className="flex items-center gap-2">
          {loading ? (
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          ) : selected ? (
            <span className="rounded-full bg-gold/10 px-3 py-1 text-sm font-bold text-gold">
              -RM {getDiscountAmount(selected)}
            </span>
          ) : usableCount > 0 ? (
            <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive">
              {usableCount} 张可用
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">无可用</span>
          )}
          <ChevronRight size={16} className={`text-muted-foreground transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 pb-4 pt-3 space-y-2">
              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 transition-all ${
                  !selectedCouponId ? "border-gold bg-gold/5" : "border-border hover:border-gold/20"
                }`}
              >
                <span className="text-sm text-foreground">不使用优惠券</span>
                {!selectedCouponId && <Check size={16} className="text-gold" />}
              </button>

              {coupons.map((coupon) => {
                const usable = isUsable(coupon);
                const isSelected = selectedCouponId === coupon.id;
                const { Icon, color: stripeColor } = styleForVariant(coupon.variantIndex);
                const stripeFg = stripeColor === "gold" ? "text-[var(--theme-price-foreground)]" : "text-white";
                const stripeFgMuted =
                  stripeColor === "gold"
                    ? "text-[color-mix(in_srgb,var(--theme-price-foreground)_72%,transparent)]"
                    : "text-white/70";
                return (
                  <motion.button
                    key={coupon.id}
                    type="button"
                    disabled={!usable}
                    onClick={() => {
                      onSelect(coupon);
                      setOpen(false);
                    }}
                    whileTap={usable ? { scale: 0.98 } : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl border overflow-hidden transition-all ${
                      isSelected ? "border-gold ring-1 ring-gold/30" : usable ? "border-border hover:border-gold/20" : "border-border opacity-35"
                    }`}
                  >
                    <div className={`flex h-full w-20 flex-shrink-0 flex-col items-center justify-center py-3.5 ${stripeClassForCouponVariant(stripeColor)}`}>
                      <Icon size={12} className={`mb-1 ${stripeFgMuted}`} />
                      <span className={`text-base font-bold leading-none ${stripeFg}`}>{getDiscountText(coupon)}</span>
                    </div>
                    <div className="flex-1 text-left min-w-0 py-2">
                      <p className="text-sm font-medium text-foreground">{coupon.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock size={10} />
                        {coupon.condition > 0 ? `满 RM ${coupon.condition}` : "无门槛"} · {coupon.expire}
                        {!usable && (
                          <span className="text-destructive">
                            {totalAmount < coupon.condition ? ` · 还差 RM ${coupon.condition - totalAmount}` : " · 当前订单无运费可抵扣"}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="pr-4">
                      {isSelected ? (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gold">
                          <Check size={14} className="text-[var(--theme-price-foreground)]" />
                        </div>
                      ) : usable ? (
                        <div className="h-6 w-6 rounded-full border-2 border-border" />
                      ) : null}
                    </div>
                  </motion.button>
                );
              })}

              {selected && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-1 text-center text-xs text-gold"
                >
                  已为您节省 RM {getDiscountAmount(selected)}
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
