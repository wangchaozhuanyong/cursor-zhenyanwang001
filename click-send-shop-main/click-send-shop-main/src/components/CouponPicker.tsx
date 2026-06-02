import { useState } from "react";
import { Ticket, ChevronRight, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PremiumCouponCard from "@/components/PremiumCouponCard";
import type { CheckoutPickerCoupon } from "@/types/coupon";
import { formatCouponExpireText } from "@/utils/couponDisplay";
import { AppModal, usePreferBottomSheet } from "@/modules/micro-interactions";

interface CouponPickerProps {
  totalAmount: number;
  shippingFee?: number;
  selectedCouponId: string | null;
  onSelect: (coupon: CheckoutPickerCoupon | null) => void;
  coupons: CheckoutPickerCoupon[];
  loading: boolean;
  embedded?: boolean;
}

function useCouponHelpers(totalAmount: number, shippingFee: number) {
  const getDiscountAmount = (c: CheckoutPickerCoupon) => {
    if (c.discountAmount != null && c.discountAmount > 0) return c.discountAmount;
    if (c.discountType === "percentage") return Math.min(totalAmount, Math.floor((totalAmount * c.discount) / 100));
    if (c.discountType === "shipping") return Math.min(shippingFee, c.discount > 0 ? c.discount : shippingFee);
    return Math.min(totalAmount, c.discount);
  };
  const isUsable = (c: CheckoutPickerCoupon) => c.usable !== false && totalAmount >= c.condition && (c.discountType !== "shipping" || shippingFee > 0);
  const getAmountParts = (c: CheckoutPickerCoupon) => {
    if (c.discountType === "percentage") return `${c.discount}%`;
    if (c.discountType === "shipping" && c.discount <= 0) return "免运";
    return `RM ${c.discount}`;
  };
  const getMinSpendText = (c: CheckoutPickerCoupon) => {
    if (c.discountType === "shipping") return c.condition > 0 ? `满 RM ${c.condition} 包邮` : "无门槛运费券";
    return c.condition > 0 ? `满 RM ${c.condition} 可用` : "无门槛可用";
  };
  return { getDiscountAmount, isUsable, getAmountParts, getMinSpendText };
}

function CouponListBody(props: {
  coupons: CheckoutPickerCoupon[];
  selectedCouponId: string | null;
  selected: CheckoutPickerCoupon | null;
  totalAmount: number;
  onSelect: (coupon: CheckoutPickerCoupon | null) => void;
  onClose: () => void;
  getDiscountAmount: (c: CheckoutPickerCoupon) => number;
  isUsable: (c: CheckoutPickerCoupon) => boolean;
  getAmountParts: (c: CheckoutPickerCoupon) => string;
  getMinSpendText: (c: CheckoutPickerCoupon) => string;
}) {
  const { coupons, selectedCouponId, selected, totalAmount, onSelect, onClose, getDiscountAmount, isUsable, getAmountParts, getMinSpendText } = props;
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => {
          onSelect(null);
          onClose();
        }}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 transition-all ${!selectedCouponId ? "border-[var(--theme-primary)] bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))]" : "border-[var(--theme-border)] hover:border-[color-mix(in_srgb,var(--theme-primary)_35%,var(--theme-border))]"}`}
      >
        <span className="text-sm text-[var(--theme-text-on-surface)]">不使用优惠券</span>
        {!selectedCouponId && <Check size={16} className="text-theme-price" />}
      </button>

      {coupons.map((coupon) => {
        const usable = isUsable(coupon);
        const isSelected = selectedCouponId === coupon.id;
        const amount = getAmountParts(coupon);
        return (
          <motion.div key={coupon.id} whileTap={usable ? { scale: 0.98 } : undefined} className="relative">
            <PremiumCouponCard
              colorScheme="invite"
              layout="compact"
              title={coupon.title}
              amount={amount}
              minSpendText={getMinSpendText(coupon)}
              expireText={formatCouponExpireText(coupon.expire)}
              scopeText={coupon.scopeText}
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
                <div className="flex h-6 w-6 items-center justify-center rounded-full btn-theme-price">
                  <Check size={14} />
                </div>
              </motion.div>
            ) : null}
            {!usable && (
              <p className="mt-1 px-2 text-[11px] text-[var(--theme-danger)]">
                {coupon.reason || (totalAmount < coupon.condition ? `还差 RM ${coupon.condition - totalAmount} 可用` : "当前订单无运费可抵扣")}
              </p>
            )}
          </motion.div>
        );
      })}

      {selected ? <p className="pt-1 text-center text-xs text-theme-price">已为您节省 RM {getDiscountAmount(selected)}</p> : null}
    </div>
  );
}

export default function CouponPicker({ totalAmount, shippingFee = 0, selectedCouponId, onSelect, coupons, loading, embedded = false }: CouponPickerProps) {
  const [open, setOpen] = useState(false);
  const isMobileSheet = usePreferBottomSheet("standard");
  const selected = coupons.find((c) => c.id === selectedCouponId) ?? null;
  const { getDiscountAmount, isUsable, getAmountParts, getMinSpendText } = useCouponHelpers(totalAmount, shippingFee);
  const usableCount = coupons.filter(isUsable).length;
  const close = () => setOpen(false);
  const listProps = { coupons, selectedCouponId, selected, totalAmount, onSelect, onClose: close, getDiscountAmount, isUsable, getAmountParts, getMinSpendText };
  const statusLabel = loading ? "加载中..." : selected ? `-RM ${getDiscountAmount(selected)}` : usableCount > 0 ? `${usableCount} 张可用` : "暂无可用";

  return (
    <div className={embedded ? "" : "store-card overflow-hidden rounded-2xl border border-[var(--theme-border)]"}>
      <button
        type="button"
        onClick={() => (isMobileSheet ? setOpen(true) : setOpen((v) => !v))}
        className={embedded ? "flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-primary)_6%,var(--theme-surface))] px-4 py-3.5 text-left" : "flex w-full items-center justify-between p-5"}
      >
        {embedded ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--theme-text-on-surface)]">{selected ? selected.title : "选择优惠券"}</p>
              <p className="mt-0.5 text-xs text-[var(--theme-text-muted-on-surface)]">{statusLabel}</p>
            </div>
            {loading ? <Loader2 size={18} className="shrink-0 animate-spin text-[var(--theme-text-muted-on-surface)]" /> : <ChevronRight size={18} className="shrink-0 text-[var(--theme-text-muted-on-surface)]" />}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--theme-price)_14%,var(--theme-surface))]">
                <Ticket size={16} className="text-theme-price" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--theme-text-on-surface)]">优惠券</h3>
            </div>
            <div className="flex items-center gap-2">
              {loading ? (
                <Loader2 size={14} className="animate-spin text-[var(--theme-text-muted-on-surface)]" />
              ) : selected ? (
                <span className="rounded-full bg-[color-mix(in_srgb,var(--theme-price)_14%,var(--theme-surface))] px-3 py-1 text-sm font-bold text-theme-price">-RM {getDiscountAmount(selected)}</span>
              ) : usableCount > 0 ? (
                <span className="rounded-full bg-[color-mix(in_srgb,var(--theme-danger)_12%,var(--theme-surface))] px-2.5 py-1 text-[11px] font-medium text-[var(--theme-danger)]">{usableCount} 张可用</span>
              ) : (
                <span className="text-xs text-[var(--theme-text-muted-on-surface)]">暂无可用</span>
              )}
              <ChevronRight size={16} className={`text-[var(--theme-text-muted-on-surface)] transition-transform duration-200 ${!isMobileSheet && open ? "rotate-90" : ""}`} />
            </div>
          </>
        )}
      </button>

      {isMobileSheet ? (
        <AppModal tier="standard" open={open} onClose={close} title="选择优惠券" height="90vh">
          <CouponListBody {...listProps} />
        </AppModal>
      ) : (
        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
              <div className="space-y-2 border-t border-[var(--theme-border)] px-4 pb-4 pt-3">
                <CouponListBody {...listProps} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
