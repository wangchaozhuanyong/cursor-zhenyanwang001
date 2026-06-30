import { useId, useState } from "react";
import { Ticket, ChevronRight, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PremiumCouponCard from "@/components/PremiumCouponCard";
import type { CheckoutPickerCoupon } from "@/types/coupon";
import { formatCouponExpireText } from "@/utils/couponDisplay";
import { AppModal, usePreferBottomSheet } from "@/modules/micro-interactions";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

interface CouponPickerProps {
  totalAmount: number;
  shippingFee?: number;
  selectedCouponId: string | null;
  onSelect: (coupon: CheckoutPickerCoupon | null) => void;
  coupons: CheckoutPickerCoupon[];
  unusableCoupons?: CheckoutPickerCoupon[];
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
  unusableCoupons: CheckoutPickerCoupon[];
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
  const { coupons, unusableCoupons, selectedCouponId, selected, totalAmount, onSelect, onClose, getDiscountAmount, isUsable, getAmountParts, getMinSpendText } = props;
  const [showUnusable, setShowUnusable] = useState(false);
  return (
    <div className="space-y-2">
      <UnifiedButton
        type="button"
        onClick={() => {
          onSelect(null);
          onClose();
        }}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 transition-all ${!selectedCouponId ? "border-[var(--theme-primary)] bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))]" : "border-[var(--theme-border)] hover:border-[color-mix(in_srgb,var(--theme-primary)_35%,var(--theme-border))]"}`}
      >
        <span className="text-sm text-[var(--theme-text-on-surface)]">不使用优惠券</span>
        {!selectedCouponId && <Check size={16} className="text-theme-price" />}
      </UnifiedButton>

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

      {unusableCoupons.length > 0 ? (
        <div className="pt-1">
          <UnifiedButton
            type="button"
            onClick={() => setShowUnusable((value) => !value)}
            className="flex w-full items-center justify-between rounded-xl border border-dashed border-[var(--theme-border)] px-4 py-3 text-left text-xs font-medium text-[var(--theme-text-muted-on-surface)]"
          >
            <span>{unusableCoupons.length} 张暂不可用优惠券</span>
            <ChevronRight size={14} className={`transition-transform ${showUnusable ? "rotate-90" : ""}`} />
          </UnifiedButton>
          {showUnusable ? (
            <div className="mt-2 space-y-2">
              {unusableCoupons.map((coupon) => (
                <div key={coupon.id} className="rounded-xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-text-muted)_5%,var(--theme-surface))] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--theme-text-on-surface)]">{coupon.title}</p>
                      <p className="mt-1 text-xs text-[var(--theme-text-muted-on-surface)]">{coupon.scopeText || "当前订单不可用"}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-[var(--theme-danger)]">{coupon.reason || "不可用"}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {selected ? <p className="pt-1 text-center text-xs text-theme-price">已为您节省 RM {getDiscountAmount(selected)}</p> : null}
    </div>
  );
}

export default function CouponPicker({ totalAmount, shippingFee = 0, selectedCouponId, onSelect, coupons, unusableCoupons = [], loading, embedded = false }: CouponPickerProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const isMobileSheet = usePreferBottomSheet("standard");
  const selected = coupons.find((c) => c.id === selectedCouponId) ?? null;
  const { getDiscountAmount, isUsable, getAmountParts, getMinSpendText } = useCouponHelpers(totalAmount, shippingFee);
  const usableCount = coupons.filter(isUsable).length;
  const close = () => setOpen(false);
  const listProps = { coupons, unusableCoupons, selectedCouponId, selected, totalAmount, onSelect, onClose: close, getDiscountAmount, isUsable, getAmountParts, getMinSpendText };
  const selectedDiscountAmount = selected ? getDiscountAmount(selected) : 0;
  const statusLabel = loading ? "同步可用优惠" : selected ? (selectedDiscountAmount > 0 ? `-RM ${selectedDiscountAmount}` : "结算页确认") : usableCount > 0 ? `${usableCount} 张可用` : "暂无可用";

  return (
    <div className={embedded ? "" : "sf-next-surface-card overflow-hidden rounded-2xl border border-[var(--theme-border)]"}>
      <UnifiedButton
        type="button"
        aria-controls={!isMobileSheet ? listId : undefined}
        aria-expanded={open}
        aria-haspopup={isMobileSheet ? "dialog" : undefined}
        aria-busy={loading}
        disabled={embedded && loading && coupons.length === 0 && unusableCoupons.length === 0}
        onClick={() => (isMobileSheet ? setOpen(true) : setOpen((v) => !v))}
        className={embedded ? "sf-next-checkout-coupon-trigger flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-primary)_6%,var(--theme-surface))] px-4 py-3.5 text-left" : "flex w-full items-center justify-between p-5"}
      >
        {embedded ? (
          <>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="sf-next-checkout-coupon-title truncate text-sm font-medium text-[var(--theme-text-on-surface)]">{selected ? selected.title : "选择优惠券"}</p>
              <p className="sf-next-checkout-coupon-status mt-0.5 truncate text-xs text-[var(--theme-text-muted-on-surface)]" aria-live="polite">{statusLabel}</p>
            </div>
            {loading ? <span className="sf-next-checkout-coupon-loading-pill" aria-hidden /> : <ChevronRight size={18} className="shrink-0 text-[var(--theme-text-muted-on-surface)]" />}
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
                <span className="rounded-full bg-[color-mix(in_srgb,var(--theme-price)_14%,var(--theme-surface))] px-3 py-1 text-sm font-bold text-theme-price">
                  {selectedDiscountAmount > 0 ? `-RM ${selectedDiscountAmount}` : "结算页确认"}
                </span>
              ) : usableCount > 0 ? (
                <span className="rounded-full bg-[color-mix(in_srgb,var(--theme-danger)_12%,var(--theme-surface))] px-2.5 py-1 text-[11px] font-medium text-[var(--theme-danger)]">{usableCount} 张可用</span>
              ) : (
                <span className="text-xs text-[var(--theme-text-muted-on-surface)]">暂无可用</span>
              )}
              <ChevronRight size={16} className={`text-[var(--theme-text-muted-on-surface)] transition-transform duration-200 ${!isMobileSheet && open ? "rotate-90" : ""}`} />
            </div>
          </>
        )}
      </UnifiedButton>

      {isMobileSheet ? (
        <AppModal tier="standard" open={open} onClose={close} title="选择优惠券" height="90vh">
          <CouponListBody {...listProps} />
        </AppModal>
      ) : (
        <AnimatePresence>
          {open && (
            <motion.div id={listId} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
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
