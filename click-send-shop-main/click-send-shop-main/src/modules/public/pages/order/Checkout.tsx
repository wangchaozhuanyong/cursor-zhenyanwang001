import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Copy, MessageCircle, Phone, MapPin, CheckCircle2, ShieldCheck } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { flushSync } from "react-dom";
import { useCartStore } from "@/stores/useCartStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useOrderStore } from "@/stores/useOrderStore";
import * as orderService from "@/services/orderService";
import * as paymentService from "@/services/paymentService";
import * as rewardWalletService from "@/services/rewardService";
import { useGoBack } from "@/hooks/useGoBack";
import { useUserStore } from "@/stores/useUserStore";
import { useCouponStore } from "@/stores/useCouponStore";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import type { Order } from "@/types/order";
import { motion } from "framer-motion";
import PaymentMethodPicker, { type PaymentMethod } from "@/components/PaymentMethodPicker";
import CouponPicker from "@/components/CouponPicker";
import ShippingPicker from "@/components/ShippingPicker";
import { useShippingStore, calcShippingFee, estimateCartWeightKg } from "@/stores/useShippingStore";
import { useCheckoutPickerCoupons } from "@/hooks/useCheckoutPickerCoupons";
import type { CheckoutPickerCoupon } from "@/types/coupon";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ORDER_STATUS } from "@/constants/statusDictionary";
import * as userShippingService from "@/services/userShippingService";
import { copyToClipboard } from "@/utils/clipboard";
import TrustInfo from "@/components/TrustInfo";
import CheckoutStepBar from "@/components/CheckoutStepBar";
import NotificationIconButton from "@/components/NotificationIconButton";
import type { PublicPaymentChannel } from "@/services/paymentService";
import { trackBeginCheckout, trackPurchase } from "@/utils/tracking";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import {
  goodsTaxableInclusivePreview,
  parseSstFromSiteInfo,
  splitInclusiveTax,
} from "@/utils/sstTax";
import { OrderSstLines } from "@/components/OrderSstLines";
import type { Address } from "@/types/address";
import { formatAddressForDisplay } from "@/services/addressService";

function generateOrderText(order: Order) {
  const itemsText = order.items
    .map((item, i) => `${i + 1}. ${item.product.name} x ${item.qty} - RM ${item.product.price * item.qty}`)
    .join("\n");

  const lines = [
    `订单编号：${order.order_no}`,
    `------------------------`,
    `商品清单：`,
    itemsText,
    `------------------------`,
    `${order.tax_mode === "inclusive" ? "商品总额（含税）" : "商品总额"}：RM ${order.raw_amount}`,
  ];
  if (order.discount_amount > 0) {
    lines.push(`优惠券（${order.coupon_title}）：-RM ${order.discount_amount}`);
  }
  if (
    order.tax_mode === "inclusive"
    && order.taxable_amount != null
    && order.tax_amount != null
    && order.tax_rate != null
  ) {
    const tl = order.tax_label || "SST";
    lines.push(`应税商品金额（含税）：RM ${order.taxable_amount}`);
    if (order.tax_exclusive_amount != null) {
      lines.push(`商品不含税净额：RM ${order.tax_exclusive_amount}`);
    }
    lines.push(`${tl}（${order.tax_rate}%）：RM ${order.tax_amount}`);
  }
  if (order.shipping_fee > 0) {
    lines.push(`运费（${order.shipping_name}，不计税）：RM ${order.shipping_fee}`);
  } else {
    lines.push(`运费：包邮（不计税）`);
  }
  lines.push(
    `应付金额：RM ${order.total_amount}`,
    `获得积分：${order.total_points}`,
    ``,
    `姓名：${order.contact_name}`,
    `电话：${order.contact_phone}`,
    `地址：${order.address}`,
    `备注：${order.note || "无"}`,
    `------------------------`,
    `下单时间：${new Date(order.created_at).toLocaleString("zh-CN")}`,
  );
  return lines.join("\n");
}

function submitCtaLabel(method: PaymentMethod, submitting: boolean) {
  if (submitting) return "提交中…";
  if (method === "online") return "提交订单并去支付";
  if (method === "reward_wallet") return "提交订单并使用钱包";
  return "提交订单";
}

export default function Checkout() {
  useDocumentTitle("缁撶畻");
  const navigate = useNavigate();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const [searchParams, setSearchParams] = useSearchParams();
  const goBack = useGoBack("/cart");
  const getSelectedItems = useCartStore((s) => s.getSelectedItems);
  const removeOrderedItems = useCartStore((s) => s.removeOrderedItems);
  const { items: cartItems, buyNowItem, clearCart, clearBuyNow } = useCartStore();
  const isBuyNow = !!buyNowItem;
  const items = isBuyNow ? [buyNowItem] : getSelectedItems();
  const totalAmount = () => items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const totalPoints = () => items.reduce((s, i) => s + i.product.points * i.qty, 0);
  const { submitOrder, submitting } = useOrderStore();
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
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
  /** 鍦ㄧ嚎鏀粯鑷姩鍙戣捣澶辫触鏃跺睍绀猴紝瀛愰〉銆岄噸鏂版敮浠樸€嶆垚鍔熷悗鐢?payOnlineNow 娓呯┖ */
  const [postSubmitOnlineError, setPostSubmitOnlineError] = useState<string | null>(null);
  /** 鏃?redirect_url 鏃剁殑缃戝叧璇存槑 */
  const [postSubmitOnlineNote, setPostSubmitOnlineNote] = useState<string | null>(null);
  /** 閽卞寘鑷姩鎵ｆ澶辫触锛堝涓轰綑棰濅笉瓒筹級 */
  const [postSubmitWalletError, setPostSubmitWalletError] = useState<string | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<CheckoutPickerCoupon | null>(null);
  const siteInfo = useSiteInfo();
  const [rewardBalance, setRewardBalance] = useState(0);
  const [payingWallet, setPayingWallet] = useState(false);
  const [orderFinalizing, setOrderFinalizing] = useState(false);
  const [couponInitDone, setCouponInitDone] = useState(false);
  const [shippingId, setShippingId] = useState<number | null>(null);
  const [serverShippingFee, setServerShippingFee] = useState<number | null>(null);
  const [shippingQuoteLoading, setShippingQuoteLoading] = useState(false);
  const [shippingQuoteError, setShippingQuoteError] = useState<string | null>(null);
  const [checkoutAbandonmentId, setCheckoutAbandonmentId] = useState<string | null>(null);
  /** 涓?state 鍚屾锛涘揩鐓?API 杩斿洖 ID 鍚庣珛鍗冲啓鍏ワ紝閬垮厤闃叉姈鍐呰繛缁姹傚湪 setState 鍓嶄粛涓嶅甫 id 鑰屾彃鍏ュ鏉°€屼粎杩涘叆缁撶畻銆?*/
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
  const { coupons: pickerCoupons, loading: pickerCouponsLoading } = useCheckoutPickerCoupons(rawTotal);
  
  const { templates: shippingTemplates, loading: shippingRulesLoading, loadError: shippingRulesError } = useShippingStore();
  const enabledTemplates = shippingTemplates.filter((t) => t.enabled);
  const selectedTemplate = (shippingId != null ? enabledTemplates.find((t) => t.id === shippingId) : null) ?? enabledTemplates[0] ?? null;
  const weightKg = estimateCartWeightKg(items.map((i) => ({ qty: i.qty })));
  const previewShippingFee = selectedTemplate
    ? calcShippingFee(selectedTemplate, rawTotal, { totalWeightKg: weightKg })
    : 0;
  const shippingFee = serverShippingFee ?? previewShippingFee;
  const discountAmount = selectedCoupon
    ? selectedCoupon.discountType === "percent"
      ? Math.min(rawTotal, Math.floor(rawTotal * selectedCoupon.discount / 100))
      : selectedCoupon.discountType === "shipping"
        ? Math.min(shippingFee, selectedCoupon.discount > 0 ? selectedCoupon.discount : shippingFee)
        : Math.min(rawTotal, selectedCoupon.discount)
    : 0;
  const finalTotal = Math.max(0, rawTotal - discountAmount + shippingFee);
  const preferredCouponId = searchParams.get("coupon_id");

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
    if (coupon.discountType === "percent") {
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
      const preferred = candidates.find((c) => c.id === preferredCouponId) ?? null;
      if (preferred) {
        setSelectedCoupon(preferred);
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
  }, [couponInitDone, pickerCouponsLoading, pickerCoupons, preferredCouponId, rawTotal, shippingFee, searchParams, setSearchParams, estimateCouponDiscount]);

  useEffect(() => {
    if (!selectedCoupon) return;
    const stillExists = pickerCoupons.some((c) => c.id === selectedCoupon.id);
    const meetsAmount = rawTotal >= selectedCoupon.condition;
    const canUseShippingCoupon = selectedCoupon.discountType !== "shipping" || shippingFee > 0;
    if (!stillExists || !meetsAmount || !canUseShippingCoupon) {
      setSelectedCoupon(null);
    }
  }, [pickerCoupons, rawTotal, selectedCoupon, shippingFee]);

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
        setShippingQuoteError(e instanceof Error ? e.message : "杩愯垂瑙勫垯鍔犺浇澶辫触");
      })
      .finally(() => {
        if (!cancelled) setShippingQuoteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedTemplateId, rawTotal, weightKg]);

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
          price: item.product.price,
        })),
        raw_amount: rawTotal,
        discount_amount: discountAmount,
        shipping_fee: shippingFee,
        total_amount: finalTotal,
        payment_method: paymentMethod,
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
    // 鏁呮剰涓嶄緷璧?checkoutAbandonmentId锛氶伩鍏嶄粎鍥犳嬁鍒板揩鐓?ID 灏遍噸缃槻鎶栵紱ID 涓€寰嬭 ref
    // eslint-disable-next-line react-hooks/exhaustive-deps -- checkoutAbandonmentId 鐢?ref 鎻愪緵
  }, [items, rawTotal, discountAmount, shippingFee, finalTotal, paymentMethod, name, phone, submittedOrder, orderFinalizing]);

  useEffect(() => {
    if (items.length === 0 && !submittedOrder && !orderFinalizing) {
      navigate("/cart", { replace: true });
    }
  }, [items.length, submittedOrder, orderFinalizing, navigate]);

  if (items.length === 0 && !submittedOrder && !orderFinalizing) {
    return null;
  }

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("璇峰～鍐欏鍚嶅拰鐢佃瘽");
      return;
    }
    if (!address.trim()) {
      toast.error("璇峰～鍐欐敹璐у湴鍧€");
      return;
    }
    if (!selectedTemplate) {
      toast.error("杩愯垂瑙勫垯鏈姞杞藉畬鎴愶紝鏃犳硶鎻愪氦璁㈠崟");
      return;
    }
    if (shippingRulesError || shippingQuoteError) {
      toast.error("杩愯垂瑙勫垯鏍￠獙澶辫触锛岃绋嶅悗閲嶈瘯");
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
        coupon_id: selectedCoupon?.id,
        coupon_title: selectedCoupon?.title ?? "",
        shipping_template_id: selectedTemplate?.id ?? shippingId,
        shipping_name: selectedTemplate?.name ?? "",
        payment_method: paymentMethod,
        estimated_weight_kg: weightKg,
        checkout_abandonment_id: checkoutAbandonmentIdRef.current || checkoutAbandonmentId || undefined,
      });
      const orderedIds = payloadItems.map((i) => i.product_id);
      flushSync(() => {
        setOrderFinalizing(true);
        setSubmittedOrder(order);
      });
      if (isBuyNow) {
        clearBuyNow();
      } else if (orderedIds.length >= cartItems.length) {
        clearCart();
      } else {
        removeOrderedItems(orderedIds);
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
          setPostSubmitOnlineNote(
            intent.client_instructions || "未获取到跳转链接，请点击下方“继续支付”或前往“订单详情”完成付款。",
          );
          toast.success("订单已创建");
        } catch (err) {
          const msg = err instanceof Error ? err.message : "鍦ㄧ嚎鏀粯鍙戣捣澶辫触";
          setPostSubmitOnlineError(msg);
          toast.error(msg);
        }
        return;
      }

      if (pending && order.payment_method === "reward_wallet") {
        try {
          await orderService.payOrder(order.id, "reward_wallet");
          const latest = await orderService.fetchOrderById(order.id);
          flushSync(() => {
            setSubmittedOrder(latest);
          });
          const balanceData = await rewardWalletService.fetchRewardBalance();
          setRewardBalance(Number(balanceData.balance || 0));
          if (latest.status === ORDER_STATUS.PAID || latest.payment_status === "paid") {
            trackPurchase(latest);
          }
          toast.success("杩旂幇閽卞寘鏀粯鎴愬姛");
          const text = generateOrderText(latest);
          const copied = await copyToClipboard(text);
          if (copied) {
            toast.success("璁㈠崟鍐呭宸插鍒跺埌鍓创鏉匡紒", toastPresetQuickSuccess);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "杩旂幇閽卞寘鏀粯澶辫触";
          setPostSubmitWalletError(msg);
          toast.error(msg);
        }
        return;
      }

      if (order.payment_method === "whatsapp") {
        toast.success("璁㈠崟宸叉彁浜わ紝璇烽€氳繃涓嬫柟鏂瑰紡鑱旂郴瀹㈡湇瀹屾垚浠樻");
      } else {
        toast.success("订单已提交");
      }
      const text = generateOrderText(order);
      const copied = await copyToClipboard(text);
      if (copied) {
        toast.success("璁㈠崟鍐呭宸插鍒跺埌鍓创鏉匡紒", toastPresetQuickSuccess);
      }
    } catch (e) {
      setOrderFinalizing(false);
      toast.error(e instanceof Error ? e.message : "鎻愪氦璁㈠崟澶辫触");
    }
  };

  const copyOrderText = async () => {
    if (!submittedOrder) return;
    const copied = await copyToClipboard(generateOrderText(submittedOrder));
    if (copied) {
      toast.success("已复制订单内容", toastPresetQuickSuccess);
    } else {
      toast.error("澶嶅埗澶辫触锛岃鎵嬪姩澶嶅埗璁㈠崟鍐呭");
    }
  };

  const openWhatsApp = () => {
    if (!submittedOrder) return;
    const text = encodeURIComponent(generateOrderText(submittedOrder));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const openWeChat = () => {
    toast.info("璇锋墦寮€寰俊锛岀矘璐磋鍗曞唴瀹瑰彂閫佺粰瀹㈡湇");
    copyOrderText();
  };

  const payOnlineNow = async () => {
    if (!submittedOrder) return;
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
      setPostSubmitOnlineNote(
        intent.client_instructions || "请前往订单详情查看支付状态，或稍后在“我的订单”中继续付款。",
      );
      toast.message(intent.client_instructions || "支付单已创建");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "在线支付发起失败";
      setPostSubmitOnlineError(msg);
      toast.error(msg);
    }
  };

  const payByRewardWallet = async () => {
    if (!submittedOrder) return;
    setPostSubmitWalletError(null);
    setPayingWallet(true);
    try {
      await orderService.payOrder(submittedOrder.id, "reward_wallet");
      const latest = await orderService.fetchOrderById(submittedOrder.id);
      setSubmittedOrder(latest);
      if (latest.status === ORDER_STATUS.PAID || latest.payment_status === "paid") {
        trackPurchase(latest);
      }
      const balanceData = await rewardWalletService.fetchRewardBalance();
      setRewardBalance(Number(balanceData.balance || 0));
      toast.success("返现钱包支付成功");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "杩旂幇閽卞寘鏀粯澶辫触";
      setPostSubmitWalletError(msg);
      toast.error(msg);
    } finally {
      setPayingWallet(false);
    }
  };

  if (submittedOrder) {
    return (
      <OrderSuccess
        order={submittedOrder}
        postSubmitOnlineError={postSubmitOnlineError}
        postSubmitOnlineNote={postSubmitOnlineNote}
        postSubmitWalletError={postSubmitWalletError}
        onCopy={copyOrderText}
        onWhatsApp={openWhatsApp}
        onWeChat={openWeChat}
        onPayOnline={payOnlineNow}
        onPayRewardWallet={payByRewardWallet}
        rewardBalance={rewardBalance}
        payingWallet={payingWallet}
        onHome={() => navigate("/")}
        onViewOrders={() => navigate("/orders")}
        onViewOrderDetail={() => navigate(`/orders/${submittedOrder.id}`)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] pb-28 md:pb-0">
      <header className="sticky top-0 z-40 bg-[var(--theme-surface)]/95 px-4 py-3 backdrop-blur-md md:px-6 border-b border-[var(--theme-border)]">
        <div className="mx-auto flex w-full max-w-screen-xl items-center gap-3">
          <button onClick={goBack} aria-label="返回购物车" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--theme-bg)] touch-target">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="flex-1 text-base font-semibold text-foreground md:text-xl">确认订单</h1>
          <NotificationIconButton unreadCount={unreadCount} onClick={() => navigate("/notifications")} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-screen-xl px-4 py-4 md:px-6 md:py-6">
        <CheckoutStepBar className="mb-4" />
        <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-xs text-[var(--theme-text-muted)]">1) 填写收货信息</div>
          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-xs text-[var(--theme-text-muted)]">2) 选择支付方式</div>
          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-xs text-[var(--theme-text-muted)]">3) 配送与优惠</div>
          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-xs text-[var(--theme-text-muted)]">4) 确认并提交</div>
        </div>
        <div className="md:grid md:grid-cols-[1fr_380px] md:items-start md:gap-8">
          <div className="space-y-4">
        {/* Contact info */}
        <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">1. 收货信息</h3>
            <button onClick={() => navigate("/address")} className="flex items-center gap-1 rounded-full bg-[var(--theme-bg)] px-3 py-1.5 text-xs font-medium text-[var(--theme-price)]">
              <MapPin size={12} /> 閫夋嫨鍦板潃
            </button>
          </div>
          <div className="space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="濮撳悕 *"
              className="w-full rounded-xl bg-secondary px-4 py-3.5 text-sm text-foreground outline-none ring-gold focus:ring-2 placeholder:text-muted-foreground" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="鐢佃瘽 *" type="tel"
              className="w-full rounded-xl bg-secondary px-4 py-3.5 text-sm text-foreground outline-none ring-gold focus:ring-2 placeholder:text-muted-foreground" />
            <input value={address} onChange={(e) => { setAddress(e.target.value); setSelectedAddress(null); }} placeholder="鏀惰揣鍦板潃"
              className="w-full rounded-xl bg-secondary px-4 py-3.5 text-sm text-foreground outline-none ring-gold focus:ring-2 placeholder:text-muted-foreground" />
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="澶囨敞锛堝彲閫夛級" rows={2}
              className="w-full rounded-xl bg-secondary px-4 py-3.5 text-sm text-foreground outline-none ring-gold focus:ring-2 placeholder:text-muted-foreground" />
          </div>
        </div>

        {/* Payment method */}
        <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">2. 鏀粯鏂瑰紡</h3>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <ShieldCheck size={12} className="text-emerald-600" /> 瀹夊叏鏀粯
            </span>
          </div>
          <PaymentMethodPicker
            value={paymentMethod}
            onChange={setPaymentMethod}
            onlineDisabled={paymentConfigLoaded && paymentChannels.length === 0 && !stripeReady}
            onlineDisabledHint="鍟嗘埛鏆傛湭寮€閫氬湪绾挎敮浠橈紝璇烽€夋嫨鑱旂郴瀹㈡湇涓嬪崟"
            rewardBalance={rewardBalance}
            onlineChannels={paymentChannels}
            selectedOnlineChannelCode={selectedPaymentChannelCode}
            onOnlineChannelChange={setSelectedPaymentChannelCode}
          />
          <TrustInfo className="mt-3" />
        </div>

        <div className="px-1">
          <p className="mb-2 text-sm font-semibold text-foreground">3. 优惠券</p>
        </div>
        {/* Coupon */}
        <CouponPicker
          totalAmount={rawTotal}
          shippingFee={shippingFee}
          selectedCouponId={selectedCoupon?.id ?? null}
          onSelect={(c) => setSelectedCoupon(c)}
          coupons={pickerCoupons}
          loading={pickerCouponsLoading}
        />

        <div className="px-1">
          <p className="mb-2 text-sm font-semibold text-foreground">4. 配送方式</p>
        </div>
        {/* Shipping */}
        <ShippingPicker
          totalAmount={rawTotal}
          selectedId={shippingId}
          onSelect={(t) => { setShippingId(t.id); }}
        />
        {(shippingRulesLoading || shippingQuoteLoading) && (
          <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-xs text-muted-foreground">
            姝ｅ湪鍚屾鏈嶅姟绔繍璐硅鍒?..
          </div>
        )}
        {(shippingRulesError || shippingQuoteError) && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive">
            运费规则获取失败：{shippingQuoteError || shippingRulesError}
          </div>
        )}

        <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
          <h3 className="mb-3 text-sm font-semibold text-foreground">5. 纭鍟嗗搧</h3>
          {items.map((item) => (
            <div key={`${item.product.id}:${item.variant_id || ""}`} className="flex items-center gap-3 border-b border-[var(--theme-border)] py-3 last:border-0">
              <img src={item.product.cover_image} alt={item.product.name} className="h-14 w-14 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{item.product.name}</p>
                {item.variant_name && (
                  <p className="text-xs text-muted-foreground truncate">规格：{item.variant_name}</p>
                )}
                <p className="text-xs text-muted-foreground">x{item.qty}</p>
              </div>
              <span className="text-sm font-bold text-[var(--theme-price)] flex-shrink-0">RM {item.product.price * item.qty}</span>
            </div>
          ))}
        </div>

        {/* 绉诲姩绔細鎽樿鍐呰仈鍦ㄤ富娴佷笂 */}
        <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 md:hidden theme-shadow">
          <SummaryRows
            rawTotal={rawTotal}
            discountAmount={discountAmount}
            shippingFee={shippingFee}
            totalPoints={totalPoints()}
            finalTotal={finalTotal}
            sstPreview={sstPreview}
            sstShowInCatalog={sstCfg.enabled}
            sstCustomerNote={sstCfg.customerNote}
          />
        </div>
          </div>

          {/* 妗岄潰绔細鍙充晶绮樻€х粨绠楁憳瑕?*/}
          <aside className="mt-6 hidden self-start md:sticky md:top-20 md:mt-0 md:block">
            <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
              <h3 className="mb-4 text-base font-semibold text-foreground">璁㈠崟鎽樿</h3>
              <SummaryRows
                rawTotal={rawTotal}
                discountAmount={discountAmount}
                shippingFee={shippingFee}
                totalPoints={totalPoints()}
                finalTotal={finalTotal}
                sstPreview={sstPreview}
                sstShowInCatalog={sstCfg.enabled}
                sstCustomerNote={sstCfg.customerNote}
              />
              <button
                onClick={handleSubmit}
                disabled={submitting || shippingRulesLoading || shippingQuoteLoading || !!shippingRulesError || !!shippingQuoteError || !selectedTemplate}
                className="mt-5 w-full rounded-full py-3.5 text-sm font-bold text-white theme-shadow transition-all hover:opacity-95 disabled:opacity-60"
                style={{ background: "var(--theme-gradient)" }}
              >
                {submitCtaLabel(paymentMethod, submitting)}
              </button>
              <TrustInfo className="mt-4" />
            </div>
          </aside>
        </div>
      </main>

      {/* 绉诲姩绔細搴曢儴鍥哄畾鎻愪氦鏍?*/}
      <div className="fixed bottom-0 left-0 right-0 z-[55] border-t border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-md pb-safe safe-bottom-bar md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3.5">
          <div>
            <p className="text-xs text-muted-foreground">鍚堣</p>
            <p className="text-xl font-bold text-[var(--theme-price)]">RM {finalTotal}</p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || shippingRulesLoading || shippingQuoteLoading || !!shippingRulesError || !!shippingQuoteError || !selectedTemplate}
            className="rounded-full px-8 py-3.5 text-sm font-bold text-white theme-shadow transition-all active:scale-[0.97] disabled:opacity-60"
            style={{ background: "var(--theme-gradient)" }}
          >
            {submitCtaLabel(paymentMethod, submitting)}
          </button>
        </div>
      </div>
    </div>
  );
}

/** 缁撶畻鎽樿琛岋紙绉诲姩 + 妗岄潰鍏辩敤锛?*/
function SummaryRows({
  rawTotal,
  discountAmount,
  shippingFee,
  totalPoints,
  finalTotal,
  sstPreview,
  sstShowInCatalog,
  sstCustomerNote,
}: {
  rawTotal: number;
  discountAmount: number;
  shippingFee: number;
  totalPoints: number;
  finalTotal: number;
  sstPreview: {
    label: string;
    ratePercent: number;
    taxable: number;
    taxAmount: number;
    exclusiveAmount: number;
  } | null;
  sstShowInCatalog: boolean;
  sstCustomerNote: string;
}) {
  const rateStr = sstPreview
    ? (Number.isInteger(sstPreview.ratePercent) ? String(sstPreview.ratePercent) : String(sstPreview.ratePercent))
    : "";
  return (
    <div>
      {sstShowInCatalog && sstCustomerNote ? (
        <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">{sstCustomerNote}</p>
      ) : null}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{sstShowInCatalog ? "鍟嗗搧鎬婚锛堝惈绋庯級" : "鍟嗗搧鎬婚"}</span>
        <span className="font-medium text-foreground">RM {rawTotal}</span>
      </div>
      {discountAmount > 0 && (
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-muted-foreground">优惠券抵扣</span>
          <span className="font-medium text-destructive">-RM {discountAmount}</span>
        </div>
      )}
      {sstPreview ? (
        <>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">搴旂◣鍟嗗搧閲戦锛堝惈绋庯級</span>
            <span className="font-medium text-foreground">RM {sstPreview.taxable}</span>
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>其中商品不含税净额</span>
            <span>RM {sstPreview.exclusiveAmount}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-muted-foreground">
              含 {sstPreview.label}（{rateStr}%）
            </span>
            <span className="font-medium text-foreground">RM {sstPreview.taxAmount}</span>
          </div>
        </>
      ) : null}
      <div className="mt-2 flex justify-between text-sm">
        <span className="text-muted-foreground">运费{sstShowInCatalog ? "（不计税）" : ""}</span>
        <span
          className={`font-medium ${
            shippingFee === 0 ? "text-emerald-600" : "text-foreground"
          }`}
        >
          {shippingFee === 0 ? "鍖呴偖" : `RM ${shippingFee}`}
        </span>
      </div>
      <div className="mt-2 flex justify-between text-sm">
        <span className="text-muted-foreground">鍙幏绉垎</span>
        <span className="font-medium text-foreground">{totalPoints}</span>
      </div>
      <div className="mt-3 flex items-baseline justify-between border-t border-[var(--theme-border)] pt-3">
        <span className="text-sm font-medium text-foreground">搴斾粯閲戦</span>
        <span className="text-2xl font-bold text-[var(--theme-price)]">RM {finalTotal}</span>
      </div>
    </div>
  );
}

/* 鈹€鈹€鈹€鈹€鈹€ Order Success Page 鈹€鈹€鈹€鈹€鈹€ */
function OrderSuccess({
  order,
  postSubmitOnlineError,
  postSubmitOnlineNote,
  postSubmitWalletError,
  onCopy,
  onWhatsApp,
  onWeChat,
  onPayOnline,
  onPayRewardWallet,
  rewardBalance,
  payingWallet,
  onHome,
  onViewOrders,
  onViewOrderDetail,
}: {
  order: Order;
  postSubmitOnlineError: string | null;
  postSubmitOnlineNote: string | null;
  postSubmitWalletError: string | null;
  onCopy: () => void;
  onWhatsApp: () => void;
  onWeChat: () => void;
  onPayOnline: () => void;
  onPayRewardWallet: () => void;
  rewardBalance: number;
  payingWallet: boolean;
  onHome: () => void;
  onViewOrders: () => void;
  onViewOrderDetail: () => void;
}) {
  const [alternatePayOpen, setAlternatePayOpen] = useState(false);
  const [moreWaysOpen, setMoreWaysOpen] = useState(false);

  const isOnlinePaid = order.payment_method === "online" && order.status === ORDER_STATUS.PAID;
  const isRewardWalletPaid = order.payment_method === "reward_wallet" && order.status === ORDER_STATUS.PAID;
  const isPaid = isOnlinePaid || isRewardWalletPaid;
  const isPending = order.status === ORDER_STATUS.PENDING;
  const isWhatsappOrder = order.payment_method === "whatsapp";
  const isOnlinePending = isPending && order.payment_method === "online";
  const isWalletPending = isPending && order.payment_method === "reward_wallet";
  const isWhatsappPending = isPending && isWhatsappOrder;

  const headerTitle = isPaid
    ? "支付成功"
    : isOnlinePending
      ? "请完成支付"
      : isWalletPending && postSubmitWalletError
        ? "待付款"
        : "订单已提交";

  const mainHeading = isPaid
    ? "支付成功！"
    : isOnlinePending
      ? "请完成支付"
      : isWalletPending && postSubmitWalletError
        ? "钱包余额不足"
        : isWalletPending
          ? "请完成支付"
          : "订单提交成功！";

  const helperText = (() => {
    if (isPaid) {
      return "支付已完成，我们会尽快为您安排发货，可在“我的订单”中实时查看进度。";
    }
    if (isOnlinePending) {
      return "已按结算页所选渠道发起支付。若未自动跳转，请点击下方“继续支付”或“重新支付”；也可在订单详情中继续付款。";
    }
    if (isWalletPending && postSubmitWalletError) {
      return `${postSubmitWalletError} 建议改用在线支付完成付款，或联系人工客服协助。`;
    }
    if (isWalletPending) {
      return `返现钱包可用 RM ${rewardBalance.toFixed(2)}。请点击下方完成钱包扣款，或改用在线支付。`;
    }
    if (isWhatsappPending) {
      return "请将订单内容发送给客服完成对接。如需在线支付或钱包支付，可展开“更多方式”。";
    }
    if (isPending) {
      return "订单待付款，可在订单详情中继续付款。";
    }
    if (isWhatsappOrder) {
      return "感谢您的下单。";
    }
    return "";
  })();
  const statusBadge = isPaid ? "已支付" : isPending ? "待支付" : "处理中";
  const primaryActionClass = isPaid
    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
    : "bg-gold text-primary-foreground shadow-lg shadow-gold/20";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button onClick={onHome} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary touch-target">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">{headerTitle}</h1>
        </div>
      </header>

      <motion.main initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-lg px-4 py-6">
        {/* Success card */}
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gold-light"
          >
            <CheckCircle2 size={40} className="text-gold" />
          </motion.div>
          <h2 className="font-display text-2xl font-bold text-foreground">{mainHeading}</h2>
          <div className="mt-3">
            <span className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-1 text-xs font-semibold text-[var(--theme-text)]">
              鐘舵€侊細{statusBadge}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            璁㈠崟缂栧彿: <span className="font-mono font-semibold text-foreground">{order.order_no}</span>
          </p>
          {postSubmitOnlineError && isOnlinePending && (
            <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-left text-xs text-destructive">
              {postSubmitOnlineError}
            </p>
          )}
          {postSubmitOnlineNote && isOnlinePending && !postSubmitOnlineError && (
            <p className="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-left text-xs text-muted-foreground">
              {postSubmitOnlineNote}
            </p>
          )}
          <div className="mt-5 rounded-xl bg-secondary p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">{helperText}</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">鍏抽敭淇℃伅</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">鏀粯鏂瑰紡</span>
              <span className="font-medium text-foreground">
                {order.payment_method === "online"
                  ? "鍦ㄧ嚎鏀粯"
                  : order.payment_method === "reward_wallet"
                    ? "杩旂幇閽卞寘"
                    : "鑱旂郴瀹㈡湇"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">搴斾粯閲戦</span>
              <span className="font-semibold text-[var(--theme-price)]">RM {order.total_amount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">涓嬪崟鏃堕棿</span>
              <span className="font-medium text-foreground">
                {new Date(order.created_at).toLocaleString("zh-CN")}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 space-y-3">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">下一步操作</p>
          {isOnlinePending && (
            <>
              <button
                type="button"
                onClick={onPayOnline}
                className={`flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-sm font-bold transition-all active:scale-[0.98] ${primaryActionClass}`}
              >
                {postSubmitOnlineError ? "閲嶆柊鏀粯" : "缁х画鏀粯"}
              </button>
              <button
                type="button"
                onClick={onViewOrderDetail}
                className="w-full rounded-full border-2 border-border py-3 text-center text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
              >
                在订单详情里继续付款
              </button>
              <button
                type="button"
                onClick={() => setAlternatePayOpen((o) => !o)}
                className="flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                更换支付方式
                {alternatePayOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {alternatePayOpen && (
                <div className="space-y-2 rounded-xl border border-border bg-card p-3">
                  <p className="px-1 text-center text-[11px] text-muted-foreground">以下为备选支付方式，与结算页不一致时请谨慎操作</p>
                  <button
                    type="button"
                    onClick={onPayRewardWallet}
                    disabled={payingWallet}
                    className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-[var(--theme-price)] py-3 text-sm font-semibold text-[var(--theme-price)] transition-all disabled:opacity-60"
                  >
                    {payingWallet ? "支付中…" : `尝试返现钱包（可用 RM ${rewardBalance.toFixed(2)}）`}
                  </button>
                  <button
                    type="button"
                    onClick={onWhatsApp}
                    className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-[var(--theme-gradient-foreground)] theme-shadow"
                    style={{ background: "var(--theme-gradient)" }}
                  >
                    <Phone size={16} /> 联系客服下单
                  </button>
                </div>
              )}
            </>
          )}

          {isWalletPending && postSubmitWalletError && (
            <>
              <button
                type="button"
                onClick={onPayOnline}
                className={`flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-sm font-bold transition-all active:scale-[0.98] ${primaryActionClass}`}
              >
                改用在线支付
              </button>
              <button
                type="button"
                onClick={onWhatsApp}
                className="flex w-full items-center justify-center gap-2.5 rounded-full border-2 border-border py-4 text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
              >
                <Phone size={18} /> 联系客服
              </button>
              <button
                type="button"
                onClick={onViewOrderDetail}
                className="w-full rounded-full py-3 text-center text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                查看订单详情
              </button>
            </>
          )}

          {isWalletPending && !postSubmitWalletError && (
            <>
              <button
                type="button"
                onClick={onPayRewardWallet}
                disabled={payingWallet}
                className={`flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60 ${primaryActionClass}`}
              >
                {payingWallet ? "支付中…" : `使用返现钱包支付（可用 RM ${rewardBalance.toFixed(2)}）`}
              </button>
              <button
                type="button"
                onClick={onPayOnline}
                className="flex w-full items-center justify-center gap-2.5 rounded-full border-2 border-border py-4 text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
              >
                改用在线支付
              </button>
            </>
          )}

          {isWhatsappPending && (
            <>
              <button
                type="button"
                onClick={onWhatsApp}
                className="flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-sm font-bold text-[var(--theme-gradient-foreground)] theme-shadow transition-all active:scale-[0.98]"
                style={{ background: "var(--theme-gradient)" }}
              >
                <Phone size={18} /> 鍙戦€佸埌 WhatsApp
              </button>
              <button
                type="button"
                onClick={onWeChat}
                className="flex w-full items-center justify-center gap-2.5 rounded-full bg-[var(--theme-price)] py-4 text-sm font-bold text-[var(--theme-price-foreground)] theme-shadow transition-all active:scale-[0.98]"
              >
                <MessageCircle size={18} /> 鍙戦€佸埌寰俊
              </button>
              <button
                type="button"
                onClick={onCopy}
                className="flex w-full items-center justify-center gap-2.5 rounded-full border-2 border-border py-4 text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
              >
                <Copy size={18} /> 复制订单内容
              </button>
              <button
                type="button"
                onClick={() => setMoreWaysOpen((o) => !o)}
                className="flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                更多方式
                {moreWaysOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {moreWaysOpen && (
                <div className="space-y-2 rounded-xl border border-border bg-card p-3">
                  <button
                    type="button"
                    onClick={onPayOnline}
                    className="flex w-full items-center justify-center rounded-full border border-border py-3 text-sm font-semibold text-foreground hover:bg-secondary"
                  >
                    在线支付
                  </button>
                  <button
                    type="button"
                    onClick={onPayRewardWallet}
                    disabled={payingWallet}
                    className="flex w-full items-center justify-center rounded-full border border-border py-3 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-60"
                  >
                    {payingWallet ? "支付中…" : `返现钱包（可用 RM ${rewardBalance.toFixed(2)}）`}
                  </button>
                </div>
              )}
            </>
          )}

          {isPending && !isOnlinePending && !isWalletPending && !isWhatsappPending && (
            <>
              <button
                type="button"
                onClick={onPayOnline}
                className={`flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-sm font-bold transition-all active:scale-[0.98] ${primaryActionClass}`}
              >
                继续支付
              </button>
              <button
                type="button"
                onClick={onViewOrderDetail}
                className="w-full rounded-full border-2 border-border py-3 text-center text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
              >
                查看订单详情
              </button>
            </>
          )}

          {!isPending && (
            <button
              type="button"
              onClick={onViewOrderDetail}
              className={`flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-sm font-bold transition-all active:scale-[0.98] ${primaryActionClass}`}
            >
              鏌ョ湅璁㈠崟璇︽儏
            </button>
          )}

          {!isWhatsappPending && (
            <button
              type="button"
              onClick={onCopy}
              className="flex w-full items-center justify-center gap-2.5 rounded-full border-2 border-border py-4 text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
            >
              <Copy size={18} /> 澶嶅埗璁㈠崟鍐呭
            </button>
          )}
        </div>

        {/* Order detail */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">订单详情</h3>
          {order.items.map((item) => (
            <div key={item.product.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
              <img src={item.product.cover_image} alt={item.product.name} className="h-14 w-14 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{item.product.name}</p>
                <p className="text-xs text-muted-foreground">x{item.qty}</p>
              </div>
              <span className="text-sm font-bold text-gold flex-shrink-0">RM {item.product.price * item.qty}</span>
            </div>
          ))}
          <div className="mt-4 border-t border-border pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {order.tax_mode === "inclusive" ? "商品总额（含税）" : "商品总额"}
              </span>
              <span className="font-medium text-foreground">RM {order.raw_amount}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">优惠券（{order.coupon_title}）</span>
                <span className="font-medium text-destructive">-RM {order.discount_amount}</span>
              </div>
            )}
            <OrderSstLines order={order} />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                运费（{order.shipping_name || "标准"}{order.tax_mode === "inclusive" ? "，不计税" : ""}）
              </span>
              <span className={`font-medium ${order.shipping_fee === 0 ? "text-emerald-600" : "text-foreground"}`}>
                {order.shipping_fee === 0 ? "包邮" : `RM ${order.shipping_fee}`}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t border-border pt-2">
              <span className="text-foreground font-medium">应付金额</span>
              <span className="text-lg font-bold text-gold">RM {order.total_amount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">获得积分</span>
              <span className="font-medium text-foreground">+{order.total_points}</span>
            </div>
          </div>
        </div>

        <TrustInfo className="mt-6 rounded-2xl border border-border bg-card p-4" />

        <div className="mt-6 space-y-3">
          <button
            onClick={onViewOrders}
            className="w-full rounded-full border-2 border-border py-4 text-center text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
          >
            查看我的订单
          </button>
          <button
            onClick={onHome}
            className="w-full rounded-full py-3 text-center text-sm font-medium text-muted-foreground transition-all hover:text-foreground"
          >
            继续逛逛
          </button>
        </div>
      </motion.main>
    </div>
  );
}
