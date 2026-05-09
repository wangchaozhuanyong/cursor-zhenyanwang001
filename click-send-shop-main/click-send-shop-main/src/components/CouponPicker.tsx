import { useState } from "react";
import { Ticket, ChevronRight, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PremiumCouponCard from "@/components/PremiumCouponCard";
import type { CheckoutPickerCoupon } from "@/types/coupon";

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

  const getDiscountAmount = (c: CheckoutPickerCoupon) => {
    if (c.discountType === "percent") return Math.min(totalAmount, Math.floor((totalAmount * c.discount) / 100));
    if (c.discountType === "shipping") return Math.min(shippingFee, c.discount > 0 ? c.discount : shippingFee);
    return Math.min(totalAmount, c.discount);
  };

  const isUsable = (c: CheckoutPickerCoupon) => totalAmount >= c.condition && (c.discountType !== "shipping" || shippingFee > 0);
  const usableCount = coupons.filter(isUsable).length;
  const getAmountParts = (c: CheckoutPickerCoupon) => {
    if (c.discountType === "percent") return { amountPrefix: "", amount: `${c.discount}%` };
    if (c.discountType === "shipping" && c.discount <= 0) return { amountPrefix: "", amount: "免运" };
    return { amountPrefix: "RM", amount: String(c.discount) };
  };
  const getConditionText = (c: CheckoutPickerCoupon) => {
    if (c.discountType === "shipping") return c.condition > 0 ? `满 RM ${c.condition} 免/减运费` : "免/减运费";
    return c.condition > 0 ? `满 RM ${c.condition} 可用` : "无门槛可用";
  };

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
                const { amountPrefix, amount } = getAmountParts(coupon);
                return (
                  <motion.div
                    key={coupon.id}
                    whileTap={usable ? { scale: 0.98 } : undefined}
                    className="relative"
                  >
                    <PremiumCouponCard
                      compact
                      title={coupon.title}
                      amountPrefix={amountPrefix}
                      amount={amount}
                      conditionText={getConditionText(coupon)}
                      expireText={coupon.expire}
                      selected={isSelected}
                      disabled={!usable}
                      statusLabel={isSelected ? "已选择" : usable ? "点击使用" : "不可用"}
                      onClick={() => {
                        if (!usable) return;
                        onSelect(coupon);
                        setOpen(false);
                      }}
                    />
                    {usable && (
                      <div className="pointer-events-none absolute right-3 top-3 z-20">
                        {isSelected ? (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E2C382]">
                            <Check size={14} className="text-[#4A0A17]" />
                          </div>
                        ) : null}
                      </div>
                    )}
                    {!usable && (
                      <p className="mt-1 px-2 text-[11px] text-destructive">
                        {totalAmount < coupon.condition ? `还差 RM ${coupon.condition - totalAmount} 可用` : "当前订单无运费可抵扣"}
                      </p>
                    )}
                  </motion.div>
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
