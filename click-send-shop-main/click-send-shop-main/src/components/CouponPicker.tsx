import { useState } from "react";
import { Ticket, ChevronRight, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PremiumCouponCard from "@/components/PremiumCouponCard";
import type { CheckoutPickerCoupon } from "@/types/coupon";
import { formatCouponExpireText } from "@/utils/couponDisplay";
import { ResponsiveSheet, useMediaSheetMode } from "@/modules/micro-interactions";

interface CouponPickerProps {
  totalAmount: number;
  shippingFee?: number;
  selectedCouponId: string | null;
  onSelect: (coupon: CheckoutPickerCoupon | null) => void;
  coupons: CheckoutPickerCoupon[];
  loading: boolean;
}

function useCouponHelpers(totalAmount: number, shippingFee: number) {
  const getDiscountAmount = (c: CheckoutPickerCoupon) => {
    if (c.discountType === "percent") return Math.min(totalAmount, Math.floor((totalAmount * c.discount) / 100));
    if (c.discountType === "shipping") return Math.min(shippingFee, c.discount > 0 ? c.discount : shippingFee);
    return Math.min(totalAmount, c.discount);
  };
  const isUsable = (c: CheckoutPickerCoupon) =>
    totalAmount >= c.condition && (c.discountType !== "shipping" || shippingFee > 0);
  const getAmountParts = (c: CheckoutPickerCoupon) => {
    if (c.discountType === "percent") {
      const pct =
        c.title.includes("折") && c.discount > 0 && c.discount < 20
          ? `${Math.round(c.discount * 10)}%`
          : `${c.discount}%`;
      return { amountPrefix: "", amount: pct };
    }
    if (c.discountType === "shipping" && c.discount <= 0) return { amountPrefix: "", amount: "免运" };
    return { amountPrefix: "", amount: `RM ${c.discount}` };
  };
  const getMinSpendText = (c: CheckoutPickerCoupon) => {
    if (c.discountType === "shipping") return c.condition > 0 ? `满 RM ${c.condition} 免/减运费` : "无门槛运费券";
    return c.condition > 0 ? `满 RM ${c.condition} 可用` : "无门槛可用";
  };
  return { getDiscountAmount, isUsable, getAmountParts, getMinSpendText };
}

function CouponListBody({
  coupons,
  selectedCouponId,
  selected,
  totalAmount,
  onSelect,
  onClose,
  getDiscountAmount,
  isUsable,
  getAmountParts,
  getMinSpendText,
}: {
  coupons: CheckoutPickerCoupon[];
  selectedCouponId: string | null;
  selected: CheckoutPickerCoupon | null;
  totalAmount: number;
  onSelect: (coupon: CheckoutPickerCoupon | null) => void;
  onClose: () => void;
  getDiscountAmount: (c: CheckoutPickerCoupon) => number;
  isUsable: (c: CheckoutPickerCoupon) => boolean;
  getAmountParts: (c: CheckoutPickerCoupon) => { amountPrefix: string; amount: string };
  getMinSpendText: (c: CheckoutPickerCoupon) => string;
}) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => {
          onSelect(null);
          onClose();
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
          <motion.div key={coupon.id} whileTap={usable ? { scale: 0.98 } : undefined} className="relative">
            <PremiumCouponCard
              compact
              title={coupon.title}
              amountPrefix={amountPrefix}
              amount={amount}
              minSpendText={getMinSpendText(coupon)}
              expireText={formatCouponExpireText(coupon.expire)}
              selected={isSelected}
              disabled={!usable}
              onClick={() => {
                if (!usable) return;
                onSelect(coupon);
                onClose();
              }}
            />
            {usable && isSelected ? (
              <motion.div className="pointer-events-none absolute right-3 top-3 z-20">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E2C382]">
                  <Check size={14} className="text-[#4A0A17]" />
                </div>
              </motion.div>
            ) : null}
            {!usable && (
              <p className="mt-1 px-2 text-[11px] text-destructive">
                {totalAmount < coupon.condition
                  ? `还差 RM ${coupon.condition - totalAmount} 可用`
                  : "当前订单无运费可抵扣"}
              </p>
            )}
          </motion.div>
        );
      })}

      {selected ? (
        <p className="pt-1 text-center text-xs text-gold">已为您节省 RM {getDiscountAmount(selected)}</p>
      ) : null}
    </div>
  );
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
  const isMobileSheet = useMediaSheetMode();
  const selected = coupons.find((c) => c.id === selectedCouponId) ?? null;
  const { getDiscountAmount, isUsable, getAmountParts, getMinSpendText } = useCouponHelpers(
    totalAmount,
    shippingFee,
  );
  const usableCount = coupons.filter(isUsable).length;
  const close = () => setOpen(false);

  const listProps = {
    coupons,
    selectedCouponId,
    selected,
    totalAmount,
    onSelect,
    onClose: close,
    getDiscountAmount,
    isUsable,
    getAmountParts,
    getMinSpendText,
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={() => (isMobileSheet ? setOpen(true) : setOpen((v) => !v))}
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
          <ChevronRight
            size={16}
            className={`text-muted-foreground transition-transform duration-200 ${!isMobileSheet && open ? "rotate-90" : ""}`}
          />
        </div>
      </button>

      {isMobileSheet ? (
        <ResponsiveSheet open={open} onClose={close} title="选择优惠券" height="85vh">
          <CouponListBody {...listProps} />
        </ResponsiveSheet>
      ) : (
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 border-t border-border px-4 pb-4 pt-3">
                <CouponListBody {...listProps} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
