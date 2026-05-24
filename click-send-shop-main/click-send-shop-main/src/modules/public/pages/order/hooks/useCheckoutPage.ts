import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "@/stores/useCartStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import * as rewardWalletService from "@/services/rewardService";
import { useGoBack } from "@/hooks/useGoBack";
import type { Order } from "@/types/order";
import { ORDER_STATUS } from "@/constants/statusDictionary";
import { trackBeginCheckout, trackPurchase } from "@/utils/tracking";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useCheckoutAddress } from "./useCheckoutAddress";
import { useCheckoutPaymentSetup } from "./useCheckoutPaymentSetup";
import { useCheckoutSubmission } from "./useCheckoutSubmission";
import { useCheckoutCartItems } from "./useCheckoutCartItems";
import { useCheckoutShipping } from "./useCheckoutShipping";
import { useCheckoutCouponSelection } from "./useCheckoutCouponSelection";
import { useCheckoutOrderPreview } from "./useCheckoutOrderPreview";
import { useCheckoutAbandonment } from "./useCheckoutAbandonment";
import { useCheckoutSstPreview } from "./useCheckoutSstPreview";

export function useCheckoutPage() {
  const navigate = useNavigate();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const goBack = useGoBack("/cart");
  const clearBuyNow = useCartStore((s) => s.clearBuyNow);
  const siteInfo = useSiteInfo();
  const capabilities = useSiteCapabilities();

  const { items, cartItems, isBuyNow, rawTotal } = useCheckoutCartItems();
  const {
    name, setName, phone, setPhone, address, setAddress, selectedAddress, setSelectedAddress,
  } = useCheckoutAddress();
  const {
    paymentMethod, setPaymentMethod, stripeReady, paymentChannels,
    selectedPaymentChannelCode, setSelectedPaymentChannelCode, paymentConfigLoaded, loyaltyConfig,
  } = useCheckoutPaymentSetup();

  const [note, setNote] = useState("");
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
  const [orderFinalizing, setOrderFinalizing] = useState(false);
  const [rewardBalance, setRewardBalance] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [useRewardCash, setUseRewardCash] = useState(false);
  const [rewardCashAmount, setRewardCashAmount] = useState(0);
  const beginCheckoutTrackedRef = useRef("");

  const shipping = useCheckoutShipping(items, rawTotal);
  const [shippingFeeForCoupons, setShippingFeeForCoupons] = useState(shipping.baseShippingFee);

  useEffect(() => {
    setShippingFeeForCoupons(shipping.baseShippingFee);
  }, [shipping.baseShippingFee]);

  const {
    selectedCoupon,
    setSelectedCoupon,
    pickerCoupons,
    pickerCouponsLoading,
    clientCouponDiscount,
  } = useCheckoutCouponSelection({
    items,
    rawTotal,
    shippingFee: shippingFeeForCoupons,
    name,
    phone,
    address,
    selectedTemplateId: shipping.selectedTemplateId,
    weightKg: shipping.weightKg,
    paymentMethod,
    couponEnabled: capabilities.couponEnabled,
    onlinePaymentEnabled: capabilities.onlinePaymentEnabled,
  });

  const preview = useCheckoutOrderPreview({
    items,
    submittedOrder,
    name,
    phone,
    address,
    selectedCoupon,
    selectedTemplateId: shipping.selectedTemplateId,
    selectedTemplateName: shipping.selectedTemplate?.name,
    weightKg: shipping.weightKg,
    baseShippingFee: shipping.baseShippingFee,
    clientCouponDiscount,
    rawTotal,
    couponEnabled: capabilities.couponEnabled,
    pointsEnabled: capabilities.pointsEnabled,
    usePoints,
    pointsToUse,
    useRewardCash,
    rewardCashAmount,
    setPointsToUse,
    setUsePoints,
    setRewardCashAmount,
    setUseRewardCash,
  });

  useEffect(() => {
    setShippingFeeForCoupons(preview.shippingFee);
  }, [preview.shippingFee]);

  const { checkoutAbandonmentId, checkoutAbandonmentIdRef } = useCheckoutAbandonment({
    items,
    rawTotal,
    discountAmount: preview.discountAmount,
    shippingFee: preview.shippingFee,
    finalTotal: preview.finalTotal,
    paymentMethod,
    onlinePaymentEnabled: capabilities.onlinePaymentEnabled,
    name,
    phone,
    submittedOrder,
    orderFinalizing,
  });

  const { sstCfg, sstPreview } = useCheckoutSstPreview(
    siteInfo,
    rawTotal,
    preview.discountAmount,
    selectedCoupon,
  );

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    let cancelled = false;
    rewardWalletService
      .fetchRewardBalance()
      .then((data) => {
        if (!cancelled) setRewardBalance(Number(data.balance || 0));
      })
      .catch(() => {
        if (!cancelled) setRewardBalance(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (items.length === 0 || submittedOrder) return;
    const key = items.map((item) => `${item.product.id}:${item.qty}`).join("|");
    if (!key || beginCheckoutTrackedRef.current === key) return;
    beginCheckoutTrackedRef.current = key;
    trackBeginCheckout(items, rawTotal);
  }, [items, rawTotal, submittedOrder]);

  useEffect(() => {
    if (!submittedOrder) return;
    if (submittedOrder.status === ORDER_STATUS.PAID || submittedOrder.payment_status === "paid") {
      trackPurchase(submittedOrder);
    }
  }, [submittedOrder]);

  useEffect(() => () => {
    clearBuyNow();
  }, [clearBuyNow]);

  useEffect(() => {
    if (items.length === 0 && !submittedOrder && !orderFinalizing) {
      navigate("/cart", { replace: true });
    }
  }, [items.length, submittedOrder, orderFinalizing, navigate]);

  const submission = useCheckoutSubmission({
    items,
    cartItems,
    isBuyNow,
    name,
    phone,
    address,
    selectedAddress,
    note,
    selectedCoupon,
    selectedTemplate: shipping.selectedTemplate
      ? { id: Number(shipping.selectedTemplate.id), name: shipping.selectedTemplate.name }
      : null,
    weightKg: shipping.weightKg,
    paymentMethod,
    onlinePaymentEnabled: capabilities.onlinePaymentEnabled,
    couponEnabled: capabilities.couponEnabled,
    pointsEnabled: capabilities.pointsEnabled,
    usePoints,
    pointsToUse,
    useRewardCash,
    rewardCashAmount,
    shippingRulesLoading: shipping.shippingRulesLoading,
    shippingQuoteLoading: shipping.shippingQuoteLoading,
    shippingRulesError: shipping.shippingRulesError,
    shippingQuoteError: shipping.shippingQuoteError,
    checkoutAbandonmentId,
    checkoutAbandonmentIdRef,
    selectedPaymentChannelCode,
    paymentChannels,
    submittedOrder,
    setSubmittedOrder,
    setOrderFinalizing,
    setRewardBalance,
  });

  const showOnline = capabilities.onlinePaymentEnabled && (loyaltyConfig?.checkout?.onlinePaymentEnabled ?? true);
  const showCustomerService = loyaltyConfig?.checkout?.customerServicePaymentEnabled ?? true;
  const pointsRedeemEnabled = capabilities.pointsEnabled && (loyaltyConfig?.checkout?.pointsRedeemEnabled ?? true);
  const rewardCashRedeemEnabled = loyaltyConfig?.checkout?.rewardCashRedeemEnabled ?? true;

  return {
    navigate,
    goBack,
    unreadCount,
    items,
    isEmpty: items.length === 0 && !submittedOrder && !orderFinalizing,
    name,
    setName,
    phone,
    setPhone,
    address,
    setAddress,
    selectedAddress,
    setSelectedAddress,
    note,
    setNote,
    paymentMethod,
    setPaymentMethod,
    showOnline,
    showCustomerService,
    onlinePaymentEnabled: capabilities.onlinePaymentEnabled,
    pointsRedeemEnabled,
    rewardCashRedeemEnabled,
    stripeReady,
    paymentChannels,
    selectedPaymentChannelCode,
    setSelectedPaymentChannelCode,
    paymentConfigLoaded,
    submittedOrder,
    postSubmitOnlineError: submission.postSubmitOnlineError,
    postSubmitOnlineNote: submission.postSubmitOnlineNote,
    postSubmitWalletError: submission.postSubmitWalletError,
    selectedCoupon,
    setSelectedCoupon,
    rewardBalance,
    usePoints,
    setUsePoints,
    pointsToUse,
    setPointsToUse,
    useRewardCash,
    setUseRewardCash,
    rewardCashAmount,
    setRewardCashAmount,
    orderPreview: preview.orderPreview,
    payingWallet: submission.payingWallet,
    selectedShippingName: shipping.selectedTemplate?.name || "平台默认运费模板",
    shippingQuoteLoading: shipping.shippingQuoteLoading,
    shippingQuoteError: shipping.shippingQuoteError,
    rawTotal,
    pickerCoupons,
    pickerCouponsLoading,
    shippingRulesLoading: shipping.shippingRulesLoading,
    shippingRulesError: shipping.shippingRulesError,
    shippingFee: preview.shippingFee,
    discountAmount: preview.discountAmount,
    discountLines: preview.discountLines,
    pointsBonusLines: preview.pointsBonusLines,
    finalTotal: preview.finalTotal,
    totalPointsValue: preview.totalPointsValue,
    sstCfg,
    sstPreview,
    submitting: submission.submitting,
    handleSubmit: submission.handleSubmit,
    copyOrderText: submission.copyOrderText,
    openWhatsApp: submission.openWhatsApp,
    openWeChat: submission.openWeChat,
    payOnlineNow: submission.payOnlineNow,
    payByRewardWallet: submission.payByRewardWallet,
    refreshSubmittedOrder: submission.refreshSubmittedOrder,
    goHome: () => navigate("/"),
    goOrders: () => navigate("/orders"),
    goOrderDetail: (orderId: string) => navigate(`/orders/${orderId}`),
    goAddress: () => navigate("/address"),
    goNotifications: () => navigate("/notifications"),
  };
}
