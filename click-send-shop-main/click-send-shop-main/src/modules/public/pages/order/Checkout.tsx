import { useState, useEffect } from "react";
import { ArrowLeft, Copy, MessageCircle, Phone, MapPin, CheckCircle2, ShieldCheck, Truck, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "@/stores/useCartStore";
import { useOrderStore } from "@/stores/useOrderStore";
import * as orderService from "@/services/orderService";
import * as paymentService from "@/services/paymentService";
import { useGoBack } from "@/hooks/useGoBack";
import { useUserStore } from "@/stores/useUserStore";
import { toast } from "sonner";
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

function generateOrderText(order: Order) {
  const itemsText = order.items
    .map((item, i) => `${i + 1}. ${item.product.name} x ${item.qty} — RM ${item.product.price * item.qty}`)
    .join("\n");

  const lines = [
    `📋 订单编号：${order.order_no}`,
    `━━━━━━━━━━━━`,
    `商品清单：`,
    itemsText,
    `━━━━━━━━━━━━`,
    `💰 商品总额：RM ${order.raw_amount}`,
  ];
  if (order.discount_amount > 0) {
    lines.push(`🎫 优惠券（${order.coupon_title}）：-RM ${order.discount_amount}`);
  }
  if (order.shipping_fee > 0) {
    lines.push(`🚚 运费（${order.shipping_name}）：RM ${order.shipping_fee}`);
  } else {
    lines.push(`🚚 运费：包邮`);
  }
  lines.push(
    `💰 应付金额：RM ${order.total_amount}`,
    `⭐ 获得积分：${order.total_points}`,
    ``,
    `👤 姓名：${order.contact_name}`,
    `📱 电话：${order.contact_phone}`,
    `📍 地址：${order.address}`,
    `📝 备注：${order.note || "无"}`,
    `━━━━━━━━━━━━`,
    `下单时间：${new Date(order.created_at).toLocaleString("zh-CN")}`,
  );
  return lines.join("\n");
}

export default function Checkout() {
  useDocumentTitle("结算");
  const navigate = useNavigate();
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

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [addressLoaded, setAddressLoaded] = useState(false);

  useEffect(() => {
    loadAddresses().finally(() => setAddressLoaded(true));
  }, [loadAddresses]);

  useEffect(() => {
    if (!addressLoaded) return;
    const addr = getDefaultAddress();
    if (addr) {
      setName((prev) => prev || addr.name);
      setPhone((prev) => prev || addr.phone);
      setAddress((prev) => prev || addr.address);
    }
  }, [addressLoaded, getDefaultAddress]);

  useEffect(() => {
    const handler = () => {
      const addr = getDefaultAddress();
      if (addr) {
        setName(addr.name);
        setPhone(addr.phone);
        setAddress(addr.address);
      }
    };
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, [getDefaultAddress]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("online");
  const [stripeReady, setStripeReady] = useState(true);
  const [paymentConfigLoaded, setPaymentConfigLoaded] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<CheckoutPickerCoupon | null>(null);
  const [shippingId, setShippingId] = useState<number | null>(null);
  const [serverShippingFee, setServerShippingFee] = useState<number | null>(null);
  const [shippingQuoteLoading, setShippingQuoteLoading] = useState(false);
  const [shippingQuoteError, setShippingQuoteError] = useState<string | null>(null);

  useEffect(() => { useShippingStore.getState().loadTemplates(); }, []);

  useEffect(() => {
    let cancelled = false;
    paymentService
      .getPaymentConfig()
      .then((config) => {
        if (cancelled) return;
        const ready = !!config.stripeCheckoutReady;
        setStripeReady(ready);
        setPaymentConfigLoaded(true);
        if (!ready) {
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

  const rawTotal = totalAmount();
  const { coupons: pickerCoupons, loading: pickerCouponsLoading } = useCheckoutPickerCoupons(rawTotal);
  const discountAmount = selectedCoupon
    ? selectedCoupon.discountType === "fixed"
      ? selectedCoupon.discount
      : Math.floor(rawTotal * selectedCoupon.discount / 100)
    : 0;
  
  const { templates: shippingTemplates, loading: shippingRulesLoading, loadError: shippingRulesError } = useShippingStore();
  const enabledTemplates = shippingTemplates.filter((t) => t.enabled);
  const selectedTemplate = (shippingId != null ? enabledTemplates.find((t) => t.id === shippingId) : null) ?? enabledTemplates[0] ?? null;
  const weightKg = estimateCartWeightKg(items.map((i) => ({ qty: i.qty })));
  const previewShippingFee = selectedTemplate
    ? calcShippingFee(selectedTemplate, rawTotal, { totalWeightKg: weightKg })
    : 0;
  const shippingFee = serverShippingFee ?? previewShippingFee;
  const finalTotal = Math.max(0, rawTotal - discountAmount + shippingFee);

  useEffect(() => {
    if (!selectedTemplate || rawTotal < 0) {
      setServerShippingFee(null);
      setShippingQuoteError(null);
      return;
    }
    let cancelled = false;
    setShippingQuoteLoading(true);
    setShippingQuoteError(null);
    userShippingService
      .quoteShipping({
        shipping_template_id: selectedTemplate.id,
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
  }, [selectedTemplate?.id, rawTotal, weightKg]);

  useEffect(() => {
    return () => { clearBuyNow(); };
  }, [clearBuyNow]);

  useEffect(() => {
    if (items.length === 0 && !submittedOrder) {
      navigate("/cart", { replace: true });
    }
  }, [items.length, submittedOrder, navigate]);

  if (items.length === 0 && !submittedOrder) {
    return null;
  }

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("请填写姓名和电话");
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
    try {
      const payloadItems = items.map((i) => ({ product_id: i.product.id, qty: i.qty }));
      const order = await submitOrder({
        items: payloadItems,
        contact_name: name,
        contact_phone: phone,
        address,
        note,
        coupon_id: selectedCoupon?.id,
        coupon_title: selectedCoupon?.title ?? "",
        shipping_template_id: selectedTemplate?.id ?? shippingId,
        shipping_name: selectedTemplate?.name ?? "",
        payment_method: paymentMethod,
        estimated_weight_kg: weightKg,
      });
      if (paymentMethod === "online") {
        try {
          const session = await orderService.createStripeCheckoutSession(order.id);
          if (!session?.url) {
            throw new Error("未获取到支付链接");
          }
          window.location.href = session.url;
          return;
        } catch (payErr) {
          const msg = payErr instanceof Error ? payErr.message : "支付失败";
          toast.error(`${msg}。订单已生成，请稍后在「我的订单」中查看或重试支付。`);
          navigate(`/orders/${order.id}`, { replace: true });
          return;
        }
      }
      const orderedIds = payloadItems.map((i) => i.product_id);
      if (isBuyNow) {
        clearBuyNow();
      } else if (orderedIds.length >= cartItems.length) {
        clearCart();
      } else {
        removeOrderedItems(orderedIds);
      }
      setSubmittedOrder(order);
      const text = generateOrderText(order);
      navigator.clipboard.writeText(text).then(() => {
        toast.success("订单内容已复制到剪贴板！");
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "提交订单失败");
    }
  };

  const copyOrderText = () => {
    if (!submittedOrder) return;
    navigator.clipboard.writeText(generateOrderText(submittedOrder));
    toast.success("已复制订单内容");
  };

  const openWhatsApp = () => {
    if (!submittedOrder) return;
    const text = encodeURIComponent(generateOrderText(submittedOrder));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const openWeChat = () => {
    toast.info("请打开微信，粘贴订单内容发送给客服");
    copyOrderText();
  };

  if (submittedOrder) {
    return (
      <OrderSuccess
        order={submittedOrder}
        onCopy={copyOrderText}
        onWhatsApp={openWhatsApp}
        onWeChat={openWeChat}
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
          <h1 className="text-base font-semibold text-foreground md:text-xl">确认订单</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-screen-xl px-4 py-4 md:px-6 md:py-6">
        <div className="md:grid md:grid-cols-[1fr_380px] md:items-start md:gap-8">
          <div className="space-y-4">
        {/* Contact info */}
        <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">联系信息</h3>
            <button onClick={() => navigate("/address")} className="flex items-center gap-1 rounded-full bg-[var(--theme-bg)] px-3 py-1.5 text-xs font-medium text-[var(--theme-price)]">
              <MapPin size={12} /> 选择地址
            </button>
          </div>
          <div className="space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="姓名 *"
              className="w-full rounded-xl bg-secondary px-4 py-3.5 text-sm text-foreground outline-none ring-gold focus:ring-2 placeholder:text-muted-foreground" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="电话 *" type="tel"
              className="w-full rounded-xl bg-secondary px-4 py-3.5 text-sm text-foreground outline-none ring-gold focus:ring-2 placeholder:text-muted-foreground" />
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="收货地址"
              className="w-full rounded-xl bg-secondary px-4 py-3.5 text-sm text-foreground outline-none ring-gold focus:ring-2 placeholder:text-muted-foreground" />
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="备注（可选）" rows={2}
              className="w-full rounded-xl bg-secondary px-4 py-3.5 text-sm text-foreground outline-none ring-gold focus:ring-2 placeholder:text-muted-foreground" />
          </div>
        </div>

        {/* Payment method */}
        <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">支付方式</h3>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <ShieldCheck size={12} className="text-emerald-600" /> 安全支付
            </span>
          </div>
          <PaymentMethodPicker
            value={paymentMethod}
            onChange={setPaymentMethod}
            onlineDisabled={paymentConfigLoaded && !stripeReady}
            onlineDisabledHint="商户暂未开通在线支付，请选择联系客服下单"
          />
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><ShieldCheck size={12} /> SSL 安全加密</span>
            <span className="flex items-center gap-1"><Truck size={12} /> 快速发货</span>
            <span className="flex items-center gap-1"><RefreshCcw size={12} /> 7 天无忧退换</span>
          </div>
        </div>

        {/* Coupon */}
        <CouponPicker
          totalAmount={rawTotal}
          selectedCouponId={selectedCoupon?.id ?? null}
          onSelect={(c) => setSelectedCoupon(c)}
          coupons={pickerCoupons}
          loading={pickerCouponsLoading}
        />

        {/* Shipping */}
        <ShippingPicker
          totalAmount={rawTotal}
          selectedId={shippingId}
          onSelect={(t) => { setShippingId(t.id); }}
        />
        {(shippingRulesLoading || shippingQuoteLoading) && (
          <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-xs text-muted-foreground">
            正在同步服务端运费规则...
          </div>
        )}
        {(shippingRulesError || shippingQuoteError) && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive">
            运费规则获取失败：{shippingQuoteError || shippingRulesError}
          </div>
        )}

        <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
          <h3 className="mb-3 text-sm font-semibold text-foreground">商品清单</h3>
          {items.map((item) => (
            <div key={item.product.id} className="flex items-center gap-3 border-b border-[var(--theme-border)] py-3 last:border-0">
              <img src={item.product.cover_image} alt={item.product.name} className="h-14 w-14 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{item.product.name}</p>
                <p className="text-xs text-muted-foreground">x{item.qty}</p>
              </div>
              <span className="text-sm font-bold text-[var(--theme-price)] flex-shrink-0">RM {item.product.price * item.qty}</span>
            </div>
          ))}
        </div>

        {/* 移动端：摘要内联在主流上 */}
        <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 md:hidden theme-shadow">
          <SummaryRows
            rawTotal={rawTotal}
            discountAmount={discountAmount}
            shippingFee={shippingFee}
            totalPoints={totalPoints()}
            finalTotal={finalTotal}
          />
        </div>
          </div>

          {/* 桌面端：右侧粘性结算摘要 */}
          <aside className="mt-6 hidden self-start md:sticky md:top-20 md:mt-0 md:block">
            <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
              <h3 className="mb-4 text-base font-semibold text-foreground">订单摘要</h3>
              <SummaryRows
                rawTotal={rawTotal}
                discountAmount={discountAmount}
                shippingFee={shippingFee}
                totalPoints={totalPoints()}
                finalTotal={finalTotal}
              />
              <button
                onClick={handleSubmit}
                disabled={submitting || shippingRulesLoading || shippingQuoteLoading || !!shippingRulesError || !!shippingQuoteError || !selectedTemplate}
                className="mt-5 w-full rounded-full py-3.5 text-sm font-bold text-white theme-shadow transition-all hover:opacity-95 disabled:opacity-60"
                style={{ background: "var(--theme-gradient)" }}
              >
                {submitting ? "提交中…" : paymentMethod === "online" ? "立即支付" : "提交订单"}
              </button>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><ShieldCheck size={12} /> SSL 安全加密</span>
                <span className="flex items-center gap-1"><Truck size={12} /> 快速发货</span>
                <span className="flex items-center gap-1"><RefreshCcw size={12} /> 7 天无忧退换</span>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* 移动端：底部固定提交栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-md pb-safe safe-bottom-bar md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3.5">
          <div>
            <p className="text-xs text-muted-foreground">合计</p>
            <p className="text-xl font-bold text-[var(--theme-price)]">RM {finalTotal}</p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || shippingRulesLoading || shippingQuoteLoading || !!shippingRulesError || !!shippingQuoteError || !selectedTemplate}
            className="rounded-full px-8 py-3.5 text-sm font-bold text-white theme-shadow transition-all active:scale-[0.97] disabled:opacity-60"
            style={{ background: "var(--theme-gradient)" }}
          >
            {submitting ? "提交中…" : paymentMethod === "online" ? "立即支付" : "提交订单"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** 结算摘要行（移动 + 桌面共用） */
function SummaryRows({
  rawTotal,
  discountAmount,
  shippingFee,
  totalPoints,
  finalTotal,
}: {
  rawTotal: number;
  discountAmount: number;
  shippingFee: number;
  totalPoints: number;
  finalTotal: number;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">商品总额</span>
        <span className="font-medium text-foreground">RM {rawTotal}</span>
      </div>
      {discountAmount > 0 && (
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-muted-foreground">优惠券抵扣</span>
          <span className="font-medium text-destructive">-RM {discountAmount}</span>
        </div>
      )}
      <div className="mt-2 flex justify-between text-sm">
        <span className="text-muted-foreground">运费</span>
        <span
          className={`font-medium ${
            shippingFee === 0 ? "text-emerald-600" : "text-foreground"
          }`}
        >
          {shippingFee === 0 ? "包邮" : `RM ${shippingFee}`}
        </span>
      </div>
      <div className="mt-2 flex justify-between text-sm">
        <span className="text-muted-foreground">可获积分</span>
        <span className="font-medium text-foreground">{totalPoints}</span>
      </div>
      <div className="mt-3 flex items-baseline justify-between border-t border-[var(--theme-border)] pt-3">
        <span className="text-sm font-medium text-foreground">应付金额</span>
        <span className="text-2xl font-bold text-[var(--theme-price)]">RM {finalTotal}</span>
      </div>
    </div>
  );
}

/* ───── Order Success Page ───── */
function OrderSuccess({ order, onCopy, onWhatsApp, onWeChat, onHome, onViewOrders, onViewOrderDetail }: {
  order: Order;
  onCopy: () => void;
  onWhatsApp: () => void;
  onWeChat: () => void;
  onHome: () => void;
  onViewOrders: () => void;
  onViewOrderDetail: () => void;
}) {
  const isOnlinePaid = order.payment_method === "online" && order.status === ORDER_STATUS.PAID;
  const isWhatsappOrder = order.payment_method === "whatsapp";
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button onClick={onHome} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary touch-target">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">
            {isOnlinePaid ? "支付成功" : "订单已提交"}
          </h1>
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
          <h2 className="font-display text-2xl font-bold text-foreground">
            {isOnlinePaid ? "支付成功！" : "订单提交成功！"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            订单编号: <span className="font-mono font-semibold text-foreground">{order.order_no}</span>
          </p>
          <div className="mt-5 rounded-xl bg-secondary p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {isOnlinePaid && "支付已完成，我们会尽快为您安排发货，可在「我的订单」实时查看进度。"}
              {!isOnlinePaid && order.payment_method === "online" && "支付正在处理中，结果将自动同步到您的订单。"}
              {isWhatsappOrder && "📋 订单内容已自动复制到剪贴板，请选择下方方式发送给客服完成对接。"}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 space-y-3">
          {/* 在线支付：主 CTA = 查看订单 */}
          {!isWhatsappOrder && (
            <button
              onClick={onViewOrderDetail}
              className="flex w-full items-center justify-center gap-2.5 rounded-full bg-gold py-4 text-sm font-bold text-primary-foreground shadow-lg shadow-gold/20 transition-all active:scale-[0.98]"
            >
              查看订单详情
            </button>
          )}

          {/* 仅客服下单时显示 WhatsApp / 微信 主 CTA */}
          {isWhatsappOrder && (
            <>
              <button
                onClick={onWhatsApp}
                className="flex w-full items-center justify-center gap-2.5 rounded-full bg-[hsl(142,70%,45%)] py-4 text-sm font-bold text-white shadow-lg shadow-[hsl(142,70%,45%)]/20 transition-all active:scale-[0.98]"
              >
                <Phone size={18} /> 发送到 WhatsApp
              </button>
              <button
                onClick={onWeChat}
                className="flex w-full items-center justify-center gap-2.5 rounded-full bg-[hsl(120,60%,45%)] py-4 text-sm font-bold text-white shadow-lg shadow-[hsl(120,60%,45%)]/20 transition-all active:scale-[0.98]"
              >
                <MessageCircle size={18} /> 发送到微信
              </button>
            </>
          )}

          <button
            onClick={onCopy}
            className="flex w-full items-center justify-center gap-2.5 rounded-full border-2 border-border py-4 text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
          >
            <Copy size={18} /> 复制订单内容
          </button>
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
              <span className="text-muted-foreground">商品总额</span>
              <span className="font-medium text-foreground">RM {order.raw_amount}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">优惠券（{order.coupon_title}）</span>
                <span className="font-medium text-destructive">-RM {order.discount_amount}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">运费（{order.shipping_name || "标准"}）</span>
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
            继续逛
          </button>
        </div>
      </motion.main>
    </div>
  );
}
