import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cartLineKey, getCartLinePrice, useCartStore } from "@/stores/useCartStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import * as orderService from "@/services/orderService";
import * as rewardWalletService from "@/services/rewardService";
import { useGoBack } from "@/hooks/useGoBack";
import { toast } from "sonner";
import type { Order, SubmitOrderParams } from "@/types/order";
import type { OrderPreviewResult } from "@/types/orderPreview";
import { useShippingStore, calcShippingFee, estimateCartWeightKg } from "@/stores/useShippingStore";
import { useCheckoutPickerCoupons } from "@/hooks/useCheckoutPickerCoupons";
import type { CheckoutPickerCoupon } from "@/types/coupon";
import { ORDER_STATUS } from "@/constants/statusDictionary";
import * as userShippingService from "@/services/userShippingService";
import { trackBeginCheckout, trackPurchase } from "@/utils/tracking";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import {
  goodsTaxableInclusivePreview,
  parseSstFromSiteInfo,
  splitInclusiveTax,
} from "@/utils/sstTax";
import { estimateCheckoutCouponDiscount } from "../utils/checkoutCouponDiscount";
import { useCheckoutAddress } from "./useCheckoutAddress";
import { useCheckoutPaymentSetup } from "./useCheckoutPaymentSetup";
import { useCheckoutSubmission } from "./useCheckoutSubmission";
import { resolveEffectivePaymentMethod } from "@/utils/checkoutPaymentMethod";

export function useCheckoutPage() {
  const navigate = useNavigate();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const [searchParams, setSearchParams] = useSearchParams();
  const goBack = useGoBack("/cart");
  const cartItems = useCartStore((s) => s.items);
  const buyNowItem = useCartStore((s) => s.buyNowItem);
  const selection = useCartStore((s) => s.selection);
  const clearCart = useCartStore((s) => s.clearCart);
  const clearBuyNow = useCartStore((s) => s.clearBuyNow);
  const isBuyNow = !!buyNowItem;
  const items = useMemo(() => {
    if (buyNowItem) return [buyNowItem];
    return cartItems.filter((i) => selection[cartLineKey(i.product.id, i.variant_id)] !== false);
  }, [buyNowItem, cartItems, selection]);
  const totalAmount = () => items.reduce((s, i) => s + getCartLinePrice(i), 0);
  const {

    name, setName, phone, setPhone, address, setAddress, selectedAddress, setSelectedAddress,
  } = useCheckoutAddress();
  const {
    paymentMethod, setPaymentMethod, stripeReady, paymentChannels,
    selectedPaymentChannelCode, setSelectedPaymentChannelCode, paymentConfigLoaded, loyaltyConfig,
  } = useCheckoutPaymentSetup();
  const [note, setNote] = useState("");

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
  const [orderFinalizing, setOrderFinalizing] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<CheckoutPickerCoupon | null>(null);
  const siteInfo = useSiteInfo();
  const capabilities = useSiteCapabilities();
  const [rewardBalance, setRewardBalance] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [useRewardCash, setUseRewardCash] = useState(false);
  const [rewardCashAmount, setRewardCashAmount] = useState(0);
  const [couponInitDone, setCouponInitDone] = useState(false);
  const [serverShippingFee, setServerShippingFee] = useState<number | null>(null);
  const [shippingQuoteLoading, setShippingQuoteLoading] = useState(false);
  const [shippingQuoteError, setShippingQuoteError] = useState<string | null>(null);
  const [checkoutAbandonmentId, setCheckoutAbandonmentId] = useState<string | null>(null);
  const [orderPreview, setOrderPreview] = useState<OrderPreviewResult | null>(null);
  const checkoutAbandonmentIdRef = useRef<string | null>(null);
  const checkoutSnapshotTimerRef = useRef<number | null>(null);
  const beginCheckoutTrackedRef = useRef("");

  useEffect(() => { useShippingStore.getState().loadTemplates(); }, []);

  useEffect(() => {
    let cancelled = false;
    rewardWalletService
      .fetchRewardBalance()
      .then((data) => {
        if (cancelled) return;
        setRewardBalance(Number(data.balance || 0));
      })
      .catch(() => {
        if (!cancelled) setRewardBalance(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rawTotal = totalAmount();
  const { templates: shippingTemplates, loading: shippingRulesLoading, loadError: shippingRulesError } = useShippingStore();
  const enabledTemplates = shippingTemplates.filter((t) => t.enabled);
  const selectedTemplate = enabledTemplates[0] ?? null;
  const weightKg = estimateCartWeightKg(items.map((i) => ({ qty: i.qty })));
  const selectedTemplateId = selectedTemplate?.id ?? null;
  const checkoutCouponParams = useMemo<SubmitOrderParams | null>(() => {
    if (!items.length || !capabilities.couponEnabled) return null;
    return {
      items: items.map((item) => ({ product_id: item.product.id, variant_id: item.variant_id || undefined, qty: item.qty })),
      contact_name: name.trim() || "结算预览",
      contact_phone: phone.trim() || "60000000000",
      address: address.trim() || "MY",
      shipping_template_id: selectedTemplateId ?? undefined,
      estimated_weight_kg: weightKg,
      payment_method: resolveEffectivePaymentMethod(paymentMethod, capabilities.onlinePaymentEnabled),
    };
  }, [address, capabilities.couponEnabled, capabilities.onlinePaymentEnabled, items, name, paymentMethod, phone, selectedTemplateId, weightKg]);
  const { coupons: pickerCouponsRaw, loading: pickerCouponsLoading } = useCheckoutPickerCoupons(rawTotal, checkoutCouponParams);
  const pickerCoupons = useMemo(
    () => (capabilities.couponEnabled ? pickerCouponsRaw : []),
    [capabilities.couponEnabled, pickerCouponsRaw],
  );
  const previewShippingFee = selectedTemplate
    ? calcShippingFee(selectedTemplate, rawTotal, { totalWeightKg: weightKg })
    : 0;
  const shippingFee = orderPreview?.shipping_fee ?? serverShippingFee ?? previewShippingFee;
  const clientCouponDiscount = capabilities.couponEnabled && selectedCoupon
    ? selectedCoupon.discountAmount != null && selectedCoupon.discountAmount > 0
      ? selectedCoupon.discountAmount
      : selectedCoupon.discountType === "percentage"
      ? Math.min(rawTotal, Math.floor(rawTotal * selectedCoupon.discount / 100))
      : selectedCoupon.discountType === "shipping"
        ? Math.min(shippingFee, selectedCoupon.discount > 0 ? selectedCoupon.discount : shippingFee)
        : Math.min(rawTotal, selectedCoupon.discount)
    : 0;
  const discountAmount = orderPreview?.discount_amount ?? clientCouponDiscount;
  const discountLines = orderPreview?.discount_lines ?? [];
  const pointsBonusLines = orderPreview?.points_bonus_lines ?? [];
  const finalTotal = orderPreview?.final_amount ?? Math.max(0, rawTotal - clientCouponDiscount + shippingFee);
  const preferredCouponId = searchParams.get("coupon_id");
  const matchesPreferredCoupon = useCallback(
    (coupon: CheckoutPickerCoupon, preferredId: string) => coupon.id === preferredId || coupon.couponId === preferredId,
    [],
  );

  const sstCfg = parseSstFromSiteInfo(siteInfo);
  const goodsTaxablePreview = goodsTaxableInclusivePreview(
    rawTotal,
    discountAmount,
    selectedCoupon?.discountType ?? null,
  );
  const sstPreview =
    sstCfg.enabled && sstCfg.ratePercent > 0 && goodsTaxablePreview > 0
      ? (() => {
          const sp = splitInclusiveTax(goodsTaxablePreview, sstCfg.ratePercent);
          return {
            label: sstCfg.label,
            ratePercent: sstCfg.ratePercent,
            taxable: goodsTaxablePreview,
            taxAmount: sp.taxAmount,
            exclusiveAmount: sp.exclusiveAmount,
          };
        })()
      : null;

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

  const estimateCouponDiscount = useCallback(
    (coupon: CheckoutPickerCoupon) => estimateCheckoutCouponDiscount(coupon, rawTotal, shippingFee),
    [rawTotal, shippingFee],
  );

  useEffect(() => {
    if (couponInitDone) return;
    if (pickerCouponsLoading) return;

    const candidates = pickerCoupons.filter((c) => c.usable !== false && rawTotal >= c.condition && (c.discountType !== "shipping" || shippingFee > 0));

    if (preferredCouponId) {
      const preferred = candidates.find((c) => matchesPreferredCoupon(c, preferredCouponId)) ?? null;
      if (preferred) {
        setSelectedCoupon(preferred);
      } else {
        const exists = pickerCoupons.some((c) => matchesPreferredCoupon(c, preferredCouponId));
        toast.message(exists ? "该优惠券当前不满足本次结算条件，请在结算页选择其他可用优惠券" : "该优惠券当前不可用，请在结算页重新选择可用优惠券");
      }
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("coupon_id");
      setSearchParams(nextParams, { replace: true });
      setCouponInitDone(true);
      return;
    }

    if (candidates.length > 0) {
      const best = candidates.reduce((max, current) =>
        estimateCouponDiscount(current) > estimateCouponDiscount(max) ? current : max,
      );
      setSelectedCoupon(best);
    }
    setCouponInitDone(true);
  }, [couponInitDone, pickerCouponsLoading, pickerCoupons, preferredCouponId, rawTotal, shippingFee, searchParams, setSearchParams, estimateCouponDiscount, matchesPreferredCoupon]);

  useEffect(() => {
    if (!selectedCoupon) return;
    const stillExists = pickerCoupons.some((c) => c.id === selectedCoupon.id && c.usable !== false);
    const meetsAmount = rawTotal >= selectedCoupon.condition;
    const canUseShippingCoupon = selectedCoupon.discountType !== "shipping" || shippingFee > 0;
    if (!stillExists || !meetsAmount || !canUseShippingCoupon) {
      setSelectedCoupon(null);
    }
  }, [pickerCoupons, rawTotal, selectedCoupon, shippingFee]);

  useEffect(() => {
    const maxPoints = Math.max(0, Math.floor(Number(orderPreview?.max_usable_points || 0)));
    const maxRewardCash = Math.max(0, Number(orderPreview?.max_usable_reward_cash || 0));
    if (pointsToUse > maxPoints) setPointsToUse(maxPoints);
    if (rewardCashAmount > maxRewardCash) setRewardCashAmount(maxRewardCash);
    if (usePoints && maxPoints <= 0) setUsePoints(false);
    if (useRewardCash && maxRewardCash <= 0) setUseRewardCash(false);
  }, [orderPreview?.max_usable_points, orderPreview?.max_usable_reward_cash, pointsToUse, rewardCashAmount, usePoints, useRewardCash]);

  useEffect(() => {
    if (!selectedTemplateId || rawTotal < 0) {
      setServerShippingFee(null);
      setShippingQuoteError(null);
      return;
    }
    let cancelled = false;
    setShippingQuoteLoading(true);
    setShippingQuoteError(null);
    userShippingService
      .quoteShipping({
        shipping_template_id: selectedTemplateId,
        raw_amount: rawTotal,
        estimated_weight_kg: weightKg,
      })
      .then((quote) => {
        if (cancelled) return;
        setServerShippingFee(Number(quote.shipping_fee));
      })
      .catch((e) => {
        if (cancelled) return;
        setServerShippingFee(null);
        setShippingQuoteError(e instanceof Error ? e.message : "运费规则加载失败");
      })
      .finally(() => {
        if (!cancelled) setShippingQuoteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedTemplateId, rawTotal, weightKg]);

  useEffect(() => {
    if (!items.length || submittedOrder) {
      setOrderPreview(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const payload: SubmitOrderParams = {
        items: items.map((i) => ({
          product_id: i.product.id,
          variant_id: i.variant_id || undefined,
          qty: i.qty,
        })),
        contact_name: name.trim() || "结算预览",
        contact_phone: phone.trim() || "60000000000",
        address: address.trim() || "MY",
        coupon_id: capabilities.couponEnabled ? selectedCoupon?.id : undefined,
        shipping_template_id: selectedTemplateId ?? undefined,
        shipping_name: selectedTemplate?.name,
        estimated_weight_kg: weightKg,
        use_points: capabilities.pointsEnabled && usePoints,
        points_to_use: capabilities.pointsEnabled && usePoints ? pointsToUse : 0,
        use_reward_cash: useRewardCash,
        reward_cash_amount: useRewardCash ? rewardCashAmount : 0,
      };
      void orderService
        .previewOrder(payload)
        .then((data) => {
          if (!cancelled) setOrderPreview(data);
        })
        .catch(() => {
          if (!cancelled) setOrderPreview(null);
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    items,
    name,
    phone,
    address,
    selectedCoupon?.id,
    selectedTemplateId,
    selectedTemplate?.name,
    weightKg,
    usePoints,
    pointsToUse,
    useRewardCash,
    rewardCashAmount,
    submittedOrder,
    capabilities.couponEnabled,
    capabilities.pointsEnabled,
  ]);

  useEffect(() => {
    return () => { clearBuyNow(); };
  }, [clearBuyNow]);

  useEffect(() => {
    checkoutAbandonmentIdRef.current = checkoutAbandonmentId;
  }, [checkoutAbandonmentId]);

  useEffect(() => {
    if (items.length === 0 || submittedOrder || orderFinalizing) return;
    if (checkoutSnapshotTimerRef.current) {
      window.clearTimeout(checkoutSnapshotTimerRef.current);
    }
    checkoutSnapshotTimerRef.current = window.setTimeout(() => {
      void orderService.recordCheckoutAbandonment({
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
        payment_method: resolveEffectivePaymentMethod(paymentMethod, capabilities.onlinePaymentEnabled),
        contact_name: name,
        contact_phone: phone,
      }).then((snapshot) => {
        if (snapshot?.id) {
          checkoutAbandonmentIdRef.current = snapshot.id;
          setCheckoutAbandonmentId((prev) => (prev === snapshot.id ? prev : snapshot.id));
        }
      }).catch(() => {});
    }, 800);

    return () => {
      if (checkoutSnapshotTimerRef.current) {
        window.clearTimeout(checkoutSnapshotTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- checkoutAbandonmentId 鐢?ref 鎻愪緵
  }, [items, rawTotal, discountAmount, shippingFee, finalTotal, paymentMethod, name, phone, submittedOrder, orderFinalizing]);

  useEffect(() => {
    if (items.length === 0 && !submittedOrder && !orderFinalizing) {
      navigate("/cart", { replace: true });
    }
  }, [items.length, submittedOrder, orderFinalizing, navigate]);

  const {
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
  } = useCheckoutSubmission({
    items,
    cartItems,
    isBuyNow,
    name,
    phone,
    address,
    selectedAddress,
    note,
    selectedCoupon,
    selectedTemplate: selectedTemplate
      ? { id: Number(selectedTemplate.id), name: selectedTemplate.name }
      : null,
    weightKg,
    paymentMethod,
    onlinePaymentEnabled: capabilities.onlinePaymentEnabled,
    couponEnabled: capabilities.couponEnabled,
    pointsEnabled: capabilities.pointsEnabled,
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
    postSubmitOnlineError,
    postSubmitOnlineNote,
    postSubmitWalletError,
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
    orderPreview,
    payingWallet,
    selectedShippingName: selectedTemplate?.name || "平台默认运费模板",
    shippingQuoteLoading,
    shippingQuoteError,
    rawTotal,
    pickerCoupons,
    pickerCouponsLoading,
    shippingRulesLoading,
    shippingRulesError,
    shippingFee,
    discountAmount,
    discountLines,
    pointsBonusLines,
    finalTotal,
    totalPointsValue: Number(orderPreview?.earned_points || orderPreview?.total_points || 0),
    sstCfg,
    sstPreview,
    submitting,
    handleSubmit,
    copyOrderText,
    openWhatsApp,
    openWeChat,
    payOnlineNow,
    payByRewardWallet,
    refreshSubmittedOrder,
    goHome: () => navigate("/"),
    goOrders: () => navigate("/orders"),
    goOrderDetail: (orderId: string) => navigate(`/orders/${orderId}`),
    goAddress: () => navigate("/address"),
    goNotifications: () => navigate("/notifications"),
  };
}



