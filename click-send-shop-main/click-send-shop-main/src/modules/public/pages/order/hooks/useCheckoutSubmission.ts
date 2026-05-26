import { useState, useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { flushSync } from "react-dom";
import { useCartStore } from "@/stores/useCartStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useCouponStore } from "@/stores/useCouponStore";
import * as orderService from "@/services/orderService";
import * as paymentService from "@/services/paymentService";
import * as rewardWalletService from "@/services/rewardService";
import type { Order, SubmitOrderParams } from "@/types/order";
import type { CheckoutPickerCoupon } from "@/types/coupon";
import type { Address } from "@/types/address";
import type { CartItem } from "@/types/cart";
import type { PublicPaymentChannel } from "@/services/paymentService";
import { ORDER_STATUS } from "@/constants/statusDictionary";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import { copyToClipboard } from "@/utils/clipboard";
import { trackPurchase } from "@/utils/tracking";
import { getSearchAttributionKeyword } from "@/services/analyticsService";
import {
  paymentInstructionToastMessage,
  sanitizeClientInstructions,
} from "@/utils/paymentClientInstructions";
import { generateOrderText } from "../utils/checkoutText";
import { validateCheckoutSubmit } from "../utils/checkoutSubmitValidation";
import { safeOpenExternal } from "@/utils/safeOpen";
import { resolveEffectivePaymentMethod } from "@/utils/checkoutPaymentMethod";
import type { PaymentMethod } from "@/components/PaymentMethodPicker";

export type UseCheckoutSubmissionParams = {
  items: CartItem[];
  cartItems: CartItem[];
  isBuyNow: boolean;
  name: string;
  phone: string;
  address: string;
  selectedAddress: Address | null;
  note: string;
  selectedCoupon: CheckoutPickerCoupon | null;
  selectedTemplate: { id: string; name: string } | null;
  weightKg: number;
  paymentMethod: PaymentMethod;
  onlinePaymentEnabled: boolean;
  couponEnabled: boolean;
  pointsEnabled: boolean;
  usePoints: boolean;
  pointsToUse: number;
  useRewardCash: boolean;
  rewardCashAmount: number;
  shippingRulesLoading: boolean;
  shippingQuoteLoading: boolean;
  shippingRulesError: string | null | undefined;
  shippingQuoteError: string | null | undefined;
  checkoutAbandonmentId: string | null;
  checkoutAbandonmentIdRef: MutableRefObject<string | null>;
  selectedPaymentChannelCode: string;
  paymentChannels: PublicPaymentChannel[];
  submittedOrder: Order | null;
  setSubmittedOrder: Dispatch<SetStateAction<Order | null>>;
  setOrderFinalizing: Dispatch<SetStateAction<boolean>>;
  setRewardBalance: Dispatch<SetStateAction<number>>;
};

export function useCheckoutSubmission({
  items,
  cartItems,
  isBuyNow,
  name,
  phone,
  address,
  selectedAddress,
  note,
  selectedCoupon,
  selectedTemplate,
  weightKg,
  paymentMethod,
  onlinePaymentEnabled,
  couponEnabled,
  pointsEnabled,
  usePoints,
  pointsToUse,
  useRewardCash,
  rewardCashAmount,
  shippingRulesLoading,
  shippingQuoteLoading,
  shippingRulesError,
  shippingQuoteError,
  checkoutAbandonmentId,
  checkoutAbandonmentIdRef,
  selectedPaymentChannelCode,
  paymentChannels,
  submittedOrder,
  setSubmittedOrder,
  setOrderFinalizing,
  setRewardBalance,
}: UseCheckoutSubmissionParams) {
  const removeOrderedItems = useCartStore((s) => s.removeOrderedItems);
  const clearCart = useCartStore((s) => s.clearCart);
  const clearBuyNow = useCartStore((s) => s.clearBuyNow);
  const { submitOrder, submitting, loadOrderDetail } = useOrderStore();
  const loadCoupons = useCouponStore((s) => s.loadCoupons);

  const [postSubmitOnlineError, setPostSubmitOnlineError] = useState<string | null>(null);
  const [postSubmitOnlineNote, setPostSubmitOnlineNote] = useState<string | null>(null);
  const [postSubmitWalletError, setPostSubmitWalletError] = useState<string | null>(null);
  const [payingWallet, setPayingWallet] = useState(false);

  const buildSubmitPayload = useCallback((): SubmitOrderParams => {
    const payloadItems = items.map((i) => ({
      product_id: i.product.id,
      variant_id: i.variant_id,
      sku_code: i.sku_code,
      qty: i.qty,
    }));
    return {
      items: payloadItems,
      contact_name: name,
      contact_phone: phone,
      address: selectedAddress
        ? {
            recipient_name: selectedAddress.recipient_name,
            phone: selectedAddress.phone,
            line1: selectedAddress.line1,
            line2: selectedAddress.line2 || "",
            city: selectedAddress.city,
            state: selectedAddress.state,
            postcode: selectedAddress.postcode,
            country: "MY",
          }
        : address,
      note,
      coupon_id: couponEnabled ? selectedCoupon?.id : undefined,
      coupon_title: couponEnabled ? selectedCoupon?.title ?? "" : "",
      shipping_template_id: selectedTemplate?.id ? String(selectedTemplate.id) : undefined,
      shipping_name: selectedTemplate?.name ?? "",
      payment_method: resolveEffectivePaymentMethod(paymentMethod, onlinePaymentEnabled),
      estimated_weight_kg: weightKg,
      checkout_abandonment_id: checkoutAbandonmentIdRef.current || checkoutAbandonmentId || undefined,
      use_points: pointsEnabled && usePoints,
      points_to_use: pointsEnabled && usePoints ? pointsToUse : 0,
      use_reward_cash: useRewardCash,
      reward_cash_amount: useRewardCash ? rewardCashAmount : 0,
      search_keyword: getSearchAttributionKeyword() || undefined,
    };
  }, [
    items,
    name,
    phone,
    address,
    selectedAddress,
    note,
    couponEnabled,
    selectedCoupon,
    selectedTemplate,
    paymentMethod,
    onlinePaymentEnabled,
    weightKg,
    checkoutAbandonmentIdRef,
    checkoutAbandonmentId,
    pointsEnabled,
    usePoints,
    pointsToUse,
    useRewardCash,
    rewardCashAmount,
  ]);

  const clearCartAfterOrder = useCallback(
    (payloadItems: { product_id: string; variant_id?: string | null }[]) => {
      const orderedLines = payloadItems.map((i) => ({
        product_id: i.product_id,
        variant_id: i.variant_id ?? undefined,
      }));
      if (isBuyNow) {
        clearBuyNow();
      } else if (orderedLines.length >= cartItems.length) {
        clearCart();
      } else {
        removeOrderedItems(orderedLines);
      }
    },
    [isBuyNow, cartItems.length, clearBuyNow, clearCart, removeOrderedItems],
  );

  const handleOnlinePaymentAfterSubmit = useCallback(
    async (order: Order) => {
      const channelCode = selectedPaymentChannelCode || paymentChannels[0]?.code || "stripe_checkout";
      try {
        const intent = await paymentService.createPaymentIntent({
          orderId: order.id,
          channelCode,
          returnUrl: `${window.location.origin}/orders/${order.id}`,
        });
        if (intent.redirect_url) {
          window.location.assign(intent.redirect_url);
          return;
        }
        setPostSubmitOnlineNote(sanitizeClientInstructions(intent.client_instructions));
        toast.success("订单已创建");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "在线支付发起失败";
        setPostSubmitOnlineError(msg);
        toast.error(msg);
      }
    },
    [paymentChannels, selectedPaymentChannelCode],
  );

  const handleRewardWalletPaymentAfterSubmit = useCallback(
    async (order: Order) => {
      try {
        await orderService.payOrder(order.id, "reward_wallet");
        const latest = await orderService.fetchOrderById(order.id);
        await loadOrderDetail(latest.id);
        flushSync(() => {
          setSubmittedOrder(latest);
        });
        const balanceData = await rewardWalletService.fetchRewardBalance();
        setRewardBalance(Number(balanceData.balance || 0));
        if (latest.status === ORDER_STATUS.PAID || latest.payment_status === "paid") {
          trackPurchase(latest);
        }
        toast.success("返现钱包支付成功");
        const text = generateOrderText(latest);
        const copied = await copyToClipboard(text);
        if (copied) {
          toast.success("订单内容已复制到剪贴板", toastPresetQuickSuccess);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "返现钱包支付失败";
        setPostSubmitWalletError(msg);
        toast.error(msg);
      }
    },
    [loadOrderDetail, setRewardBalance, setSubmittedOrder],
  );

  const finalizeOfflineOrder = useCallback(async (order: Order) => {
    if (order.payment_method === "whatsapp") {
      toast.success("订单已提交，请通过下方方式联系客服完成付款");
    } else {
      toast.success("订单已提交");
    }
    const text = generateOrderText(order);
    const copied = await copyToClipboard(text);
    if (copied) {
      toast.success("订单内容已复制到剪贴板", toastPresetQuickSuccess);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    const validation = validateCheckoutSubmit({
      name,
      phone,
      address,
      shippingRulesLoading,
      shippingQuoteLoading,
      hasShippingTemplate: Boolean(selectedTemplate),
      shippingRulesError,
      shippingQuoteError,
    });
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }

    setPostSubmitOnlineError(null);
    setPostSubmitOnlineNote(null);
    setPostSubmitWalletError(null);

    try {
      const payload = buildSubmitPayload();
      const order = await submitOrder(payload);
      const payloadItems = payload.items ?? [];

      flushSync(() => {
        setOrderFinalizing(true);
        setSubmittedOrder(order);
      });
      clearCartAfterOrder(payloadItems);
      void loadCoupons();

      const pending = order.status === ORDER_STATUS.PENDING;
      if (pending && order.payment_method === "online") {
        await handleOnlinePaymentAfterSubmit(order);
        return;
      }
      if (pending && order.payment_method === "reward_wallet") {
        await handleRewardWalletPaymentAfterSubmit(order);
        return;
      }
      await finalizeOfflineOrder(order);
    } catch (e) {
      setOrderFinalizing(false);
      toast.error(e instanceof Error ? e.message : "提交订单失败");
    }
  }, [
    name,
    phone,
    address,
    shippingRulesLoading,
    shippingQuoteLoading,
    selectedTemplate,
    shippingRulesError,
    shippingQuoteError,
    buildSubmitPayload,
    submitOrder,
    setOrderFinalizing,
    setSubmittedOrder,
    clearCartAfterOrder,
    loadCoupons,
    handleOnlinePaymentAfterSubmit,
    handleRewardWalletPaymentAfterSubmit,
    finalizeOfflineOrder,
  ]);

  const copyOrderText = useCallback(async () => {
    if (!submittedOrder) return;
    const copied = await copyToClipboard(generateOrderText(submittedOrder));
    if (copied) {
      toast.success("已复制订单内容", toastPresetQuickSuccess);
    } else {
      toast.error("复制失败，请手动复制订单内容");
    }
  }, [submittedOrder]);

  const openWhatsApp = useCallback(() => {
    if (!submittedOrder) return;
    const text = encodeURIComponent(generateOrderText(submittedOrder));
    safeOpenExternal(`https://wa.me/?text=${text}`);
  }, [submittedOrder]);

  const openWeChat = useCallback(() => {
    toast.info("请打开微信，粘贴订单内容发送给客服");
    void copyOrderText();
  }, [copyOrderText]);

  const payOnlineNow = useCallback(async () => {
    if (!submittedOrder) return;
    if (!onlinePaymentEnabled) {
      toast.info("在线支付未开启，请联系客服完成付款");
      return;
    }
    setPostSubmitOnlineError(null);
    setPostSubmitOnlineNote(null);
    try {
      const channelCode = selectedPaymentChannelCode || paymentChannels[0]?.code || "stripe_checkout";
      const intent = await paymentService.createPaymentIntent({
        orderId: submittedOrder.id,
        channelCode,
        returnUrl: `${window.location.origin}/orders/${submittedOrder.id}`,
      });
      if (intent.redirect_url) {
        window.location.assign(intent.redirect_url);
        return;
      }
      setPostSubmitOnlineNote(sanitizeClientInstructions(intent.client_instructions));
      toast.message(paymentInstructionToastMessage(intent.client_instructions));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "在线支付发起失败";
      setPostSubmitOnlineError(msg);
      toast.error(msg);
    }
  }, [submittedOrder, onlinePaymentEnabled, paymentChannels, selectedPaymentChannelCode]);

  const refreshSubmittedOrder = useCallback(async () => {
    if (!submittedOrder?.id) return;
    try {
      const latest = await orderService.fetchOrderById(submittedOrder.id);
      setSubmittedOrder(latest);
    } catch {
      /* 倒计时结束时仅作状态同步 */
    }
  }, [submittedOrder?.id, setSubmittedOrder]);

  const payByRewardWallet = useCallback(async () => {
    if (!submittedOrder) return;
    setPostSubmitWalletError(null);
    setPayingWallet(true);
    try {
      await orderService.payOrder(submittedOrder.id, "reward_wallet");
      const latest = await orderService.fetchOrderById(submittedOrder.id);
      await loadOrderDetail(latest.id);
      setSubmittedOrder(latest);
      if (latest.status === ORDER_STATUS.PAID || latest.payment_status === "paid") {
        trackPurchase(latest);
      }
      const balanceData = await rewardWalletService.fetchRewardBalance();
      setRewardBalance(Number(balanceData.balance || 0));
      toast.success("返现钱包支付成功");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "返现钱包支付失败";
      setPostSubmitWalletError(msg);
      toast.error(msg);
    } finally {
      setPayingWallet(false);
    }
  }, [submittedOrder, loadOrderDetail, setRewardBalance, setSubmittedOrder]);

  return {
    submitting,
    payingWallet,
    postSubmitOnlineError,
    postSubmitOnlineNote,
    postSubmitWalletError,
    handleSubmit,
    copyOrderText,
    openWhatsApp,
    openWeChat,
    payOnlineNow,
    payByRewardWallet,
    refreshSubmittedOrder,
  };
}
