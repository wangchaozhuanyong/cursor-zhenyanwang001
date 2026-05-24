import { useEffect, useRef, useState } from "react";
import * as orderService from "@/services/orderService";
import type { Order } from "@/types/order";
import type { CartItem } from "@/types/cart";
import type { PaymentMethod } from "@/components/PaymentMethodPicker";
import { resolveEffectivePaymentMethod } from "@/utils/checkoutPaymentMethod";

type UseCheckoutAbandonmentParams = {
  items: CartItem[];
  rawTotal: number;
  discountAmount: number;
  shippingFee: number;
  finalTotal: number;
  paymentMethod: PaymentMethod;
  onlinePaymentEnabled: boolean;
  name: string;
  phone: string;
  submittedOrder: Order | null;
  orderFinalizing: boolean;
};

export function useCheckoutAbandonment({
  items,
  rawTotal,
  discountAmount,
  shippingFee,
  finalTotal,
  paymentMethod,
  onlinePaymentEnabled,
  name,
  phone,
  submittedOrder,
  orderFinalizing,
}: UseCheckoutAbandonmentParams) {
  const [checkoutAbandonmentId, setCheckoutAbandonmentId] = useState<string | null>(null);
  const checkoutAbandonmentIdRef = useRef<string | null>(null);
  const checkoutSnapshotTimerRef = useRef<number | null>(null);

  useEffect(() => {
    checkoutAbandonmentIdRef.current = checkoutAbandonmentId;
  }, [checkoutAbandonmentId]);

  useEffect(() => {
    if (items.length === 0 || submittedOrder || orderFinalizing) return;
    if (checkoutSnapshotTimerRef.current) {
      window.clearTimeout(checkoutSnapshotTimerRef.current);
    }
    checkoutSnapshotTimerRef.current = window.setTimeout(() => {
      void orderService
        .recordCheckoutAbandonment({
          checkout_abandonment_id: checkoutAbandonmentIdRef.current || undefined,
          items: items.map((item) => ({
            product_id: item.product.id,
            variant_id: item.variant_id,
            sku_code: item.sku_code,
            variant_name: item.variant_name,
            name: item.product.name,
            image: item.product.cover_image,
            qty: item.qty,
            price: item.unit_price ?? item.product.price,
          })),
          raw_amount: rawTotal,
          discount_amount: discountAmount,
          shipping_fee: shippingFee,
          total_amount: finalTotal,
          payment_method: resolveEffectivePaymentMethod(paymentMethod, onlinePaymentEnabled),
          contact_name: name,
          contact_phone: phone,
        })
        .then((snapshot) => {
          if (snapshot?.id) {
            checkoutAbandonmentIdRef.current = snapshot.id;
            setCheckoutAbandonmentId((prev) => (prev === snapshot.id ? prev : snapshot.id));
          }
        })
        .catch(() => {});
    }, 800);

    return () => {
      if (checkoutSnapshotTimerRef.current) {
        window.clearTimeout(checkoutSnapshotTimerRef.current);
      }
    };
  }, [
    items,
    rawTotal,
    discountAmount,
    shippingFee,
    finalTotal,
    paymentMethod,
    onlinePaymentEnabled,
    name,
    phone,
    submittedOrder,
    orderFinalizing,
  ]);

  return { checkoutAbandonmentId, checkoutAbandonmentIdRef };
}
