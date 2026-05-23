import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { flushSync } from "react-dom";
import { cartLineKey, getCartLinePrice, useCartStore } from "@/stores/useCartStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useOrderStore } from "@/stores/useOrderStore";
import * as orderService from "@/services/orderService";
import * as paymentService from "@/services/paymentService";
import * as rewardWalletService from "@/services/rewardService";
import * as loyaltyService from "@/services/loyaltyService";
import { useGoBack } from "@/hooks/useGoBack";
import { useUserStore } from "@/stores/useUserStore";
import { useCouponStore } from "@/stores/useCouponStore";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import type { Order, SubmitOrderParams } from "@/types/order";
import type { OrderPreviewResult } from "@/types/orderPreview";
import type { PaymentMethod } from "@/components/PaymentMethodPicker";
import { useShippingStore, calcShippingFee, estimateCartWeightKg } from "@/stores/useShippingStore";
import { useCheckoutPickerCoupons } from "@/hooks/useCheckoutPickerCoupons";
import type { CheckoutPickerCoupon } from "@/types/coupon";
import { ORDER_STATUS } from "@/constants/statusDictionary";
import * as userShippingService from "@/services/userShippingService";
import { copyToClipboard } from "@/utils/clipboard";
import type { PublicPaymentChannel } from "@/services/paymentService";
import { trackBeginCheckout, trackPurchase } from "@/utils/tracking";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import {
  paymentInstructionToastMessage,
  sanitizeClientInstructions,
} from "@/utils/paymentClientInstructions";
import {
  goodsTaxableInclusivePreview,
  parseSstFromSiteInfo,
  splitInclusiveTax,
} from "@/utils/sstTax";
import type { Address } from "@/types/address";
import { formatAddressForDisplay } from "@/services/addressService";
import { generateOrderText } from "../utils/checkoutText";
import { safeOpenExternal } from "@/utils/safeOpen";
import {
  canStartOnlinePayment,
  resolveEffectivePaymentMethod,
} from "@/utils/checkoutPaymentMethod";

export function useCheckoutPage() {
  const navigate = useNavigate();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const [searchParams, setSearchParams] = useSearchParams();
  const goBack = useGoBack("/cart");
  const removeOrderedItems = useCartStore((s) => s.removeOrderedItems);
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
  const { submitOrder, submitting, loadOrderDetail } = useOrderStore();
  const { getDefaultAddress, loadAddresses } = useUserStore();
  const loadCoupons = useCouponStore((s) => s.loadCoupons);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [note, setNote] = useState("");
  const [addressLoaded, setAddressLoaded] = useState(false);

  useEffect(() => {
    loadAddresses().finally(() => setAddressLoaded(true));
  }, [loadAddresses]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!addressLoaded) return;
    const addr = getDefaultAddress();
    if (addr) {
      setName((prev) => prev || addr.recipient_name);
      setPhone((prev) => prev || addr.phone);
      setAddress((prev) => prev || formatAddressForDisplay(addr));
      setSelectedAddress(addr);
    }
  }, [addressLoaded, getDefaultAddress]);

  useEffect(() => {
    const handler = () => {
      const addr = getDefaultAddress();
      if (addr) {
        setName(addr.recipient_name);
        setPhone(addr.phone);
        setAddress(formatAddressForDisplay(addr));
        setSelectedAddress(addr);
      }
    };
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, [getDefaultAddress]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("online");
  const [stripeReady, setStripeReady] = useState(true);
  const [paymentChannels, setPaymentChannels] = useState<PublicPaymentChannel[]>([]);
  const [selectedPaymentChannelCode, setSelectedPaymentChannelCode] = useState("");
  const [paymentConfigLoaded, setPaymentConfigLoaded] = useState(false);
  const [loyaltyConfig, setLoyaltyConfig] = useState<loyaltyService.LoyaltyConfig | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
  const [postSubmitOnlineError, setPostSubmitOnlineError] = useState<string | null>(null);
  const [postSubmitOnlineNote, setPostSubmitOnlineNote] = useState<string | null>(null);
  const [postSubmitWalletError, setPostSubmitWalletError] = useState<string | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<CheckoutPickerCoupon | null>(null);
  const siteInfo = useSiteInfo();
  const capabilities = useSiteCapabilities();
  const [rewardBalance, setRewardBalance] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [useRewardCash, setUseRewardCash] = useState(false);
  const [rewardCashAmount, setRewardCashAmount] = useState(0);
  const [payingWallet, setPayingWallet] = useState(false);
  const [orderFinalizing, setOrderFinalizing] = useState(false);
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
    Promise.all([
      paymentService.getPaymentConfig().catch(() => null),
      paymentService.getPaymentChannels().catch(() => [] as PublicPaymentChannel[]),
    ])
      .then(([config, channels]) => {
        if (cancelled) return;
        const ready = !!config?.stripeCheckoutReady;
        const onlineChannels = channels.filter((channel) => channel.provider !== "internal");
        setStripeReady(ready);
        setPaymentChannels(onlineChannels);
        setSelectedPaymentChannelCode((current) => current || onlineChannels[0]?.code || (ready ? "stripe_checkout" : ""));
        setPaymentConfigLoaded(true);
        if (!ready && onlineChannels.length === 0) {
          setPaymentMethod("whatsapp");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStripeReady(false);
        setPaymentConfigLoaded(true);
        setPaymentMethod("whatsapp");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loyaltyService.fetchLoyaltyConfig()
      .then((cfg) => { if (!cancelled) setLoyaltyConfig(cfg); })
      .catch(() => { if (!cancelled) setLoyaltyConfig(null); });
    return () => { cancelled = true; };
  }, []);

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
  const { coupons: pickerCouponsRaw, loading: pickerCouponsLoading } = useCheckoutPickerCoupons(rawTotal);
  const pickerCoupons = useMemo(
    () => (capabilities.couponEnabled ? pickerCouponsRaw : []),
    [capabilities.couponEnabled, pickerCouponsRaw],
  );
  const { templates: shippingTemplates, loading: shippingRulesLoading, loadError: shippingRulesError } = useShippingStore();
  const enabledTemplates = shippingTemplates.filter((t) => t.enabled);
  const selectedTemplate = enabledTemplates[0] ?? null;
  const weightKg = estimateCartWeightKg(items.map((i) => ({ qty: i.qty })));
  const previewShippingFee = selectedTemplate
    ? calcShippingFee(selectedTemplate, rawTotal, { totalWeightKg: weightKg })
    : 0;
  const shippingFee = orderPreview?.shipping_fee ?? serverShippingFee ?? previewShippingFee;
  const clientCouponDiscount = capabilities.couponEnabled && selectedCoupon
    ? selectedCoupon.discountType === "percentage"
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

  const estimateCouponDiscount = useCallback((coupon: CheckoutPickerCoupon) => {
    if (coupon.discountType === "percentage") {
      return Math.min(rawTotal, Math.floor((rawTotal * coupon.discount) / 100));
    }
    if (coupon.discountType === "shipping") {
      return Math.min(shippingFee, coupon.discount > 0 ? coupon.discount : shippingFee);
    }
    return Math.min(rawTotal, coupon.discount);
  }, [rawTotal, shippingFee]);

  useEffect(() => {
    if (couponInitDone) return;
    if (pickerCouponsLoading) return;

    const candidates = pickerCoupons.filter((c) => rawTotal >= c.condition && (c.discountType !== "shipping" || shippingFee > 0));

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
    const stillExists = pickerCoupons.some((c) => c.id === selectedCoupon.id);
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

  const selectedTemplateId = selectedTemplate?.id ?? null;

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
        contact_name: name.trim() || "缁撶畻棰勮",
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

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("请填写姓名和电话");
      return;
    }
    if (!address.trim()) {
      toast.error("请填写收货地址");
      return;
    }
    if (shippingRulesLoading || shippingQuoteLoading) {
      toast.error("运费规则加载中，请稍后重试");
      return;
    }
    if (!selectedTemplate) {
      toast.error("运费规则未加载完成，无法提交订单");
      return;
    }
    if (shippingRulesError || shippingQuoteError) {
      toast.error("运费规则校验失败，请稍后重试");
      return;
    }
    setPostSubmitOnlineError(null);
    setPostSubmitOnlineNote(null);
    setPostSubmitWalletError(null);
    try {
      const payloadItems = items.map((i) => ({
        product_id: i.product.id,
        variant_id: i.variant_id,
        sku_code: i.sku_code,
        qty: i.qty,
      }));
      const order = await submitOrder({
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
        coupon_id: capabilities.couponEnabled ? selectedCoupon?.id : undefined,
        coupon_title: capabilities.couponEnabled ? selectedCoupon?.title ?? "" : "",
        shipping_template_id: selectedTemplate?.id,
        shipping_name: selectedTemplate?.name ?? "",
        payment_method: resolveEffectivePaymentMethod(paymentMethod, capabilities.onlinePaymentEnabled),
        estimated_weight_kg: weightKg,
        checkout_abandonment_id: checkoutAbandonmentIdRef.current || checkoutAbandonmentId || undefined,
        use_points: capabilities.pointsEnabled && usePoints,
        points_to_use: capabilities.pointsEnabled && usePoints ? pointsToUse : 0,
        use_reward_cash: useRewardCash,
        reward_cash_amount: useRewardCash ? rewardCashAmount : 0,
      });
      const orderedLines = payloadItems.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id }));
      flushSync(() => {
        setOrderFinalizing(true);
        setSubmittedOrder(order);
      });
      if (isBuyNow) {
        clearBuyNow();
      } else if (orderedLines.length >= cartItems.length) {
        clearCart();
      } else {
        removeOrderedItems(orderedLines);
      }
      void loadCoupons();

      const pending = order.status === ORDER_STATUS.PENDING;

      if (pending && order.payment_method === "online") {
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
        return;
      }

      if (pending && order.payment_method === "reward_wallet") {
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
        return;
      }

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
    } catch (e) {
      setOrderFinalizing(false);
      toast.error(e instanceof Error ? e.message : "提交订单失败");
    }
  };

  const copyOrderText = async () => {
    if (!submittedOrder) return;
    const copied = await copyToClipboard(generateOrderText(submittedOrder));
    if (copied) {
      toast.success("已复制订单内容", toastPresetQuickSuccess);
    } else {
      toast.error("复制失败，请手动复制订单内容");
    }
  };

  const openWhatsApp = () => {
    if (!submittedOrder) return;
    const text = encodeURIComponent(generateOrderText(submittedOrder));
    safeOpenExternal(`https://wa.me/?text=${text}`);
  };

  const openWeChat = () => {
    toast.info("请打开微信，粘贴订单内容发送给客服");
    copyOrderText();
  };

  const payOnlineNow = async () => {
    if (!submittedOrder) return;
    if (!capabilities.onlinePaymentEnabled) {
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
  };

  const refreshSubmittedOrder = useCallback(async () => {
    if (!submittedOrder?.id) return;
    try {
      const latest = await orderService.fetchOrderById(submittedOrder.id);
      setSubmittedOrder(latest);
    } catch {
      /* 闈欓粯锛氬€掕鏃剁粨鏉熸椂浠呬綔鐘舵€佸悓姝?*/
    }
  }, [submittedOrder?.id]);

  const payByRewardWallet = async () => {
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
  };

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



