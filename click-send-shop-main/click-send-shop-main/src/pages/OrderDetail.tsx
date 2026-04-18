import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useOrderStore } from "@/stores/useOrderStore";
import * as orderService from "@/services/orderService";
import * as paymentService from "@/services/paymentService";
import PageHeader from "@/components/PageHeader";
import {
  Copy,
  Phone,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  Loader2,
  XCircle,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { Order } from "@/types/order";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ORDER_STATUS, ORDER_STATUS_META, ORDER_STATUS_PROGRESS } from "@/constants/statusDictionary";

const statusIconMap: Record<string, React.ElementType> = {
  pending: Clock,
  paid: CheckCircle2,
  shipped: Truck,
  completed: Package,
  cancelled: XCircle,
  refunding: Clock,
  refunded: CheckCircle2,
};

const statusColorMap: Record<string, string> = {
  pending: "text-yellow-500",
  paid: "text-gold",
  shipped: "text-blue-500",
  completed: "text-emerald-500",
  cancelled: "text-destructive",
  refunding: "text-orange-500",
  refunded: "text-muted-foreground",
};

const steps = ORDER_STATUS_PROGRESS.map((status) => ORDER_STATUS_META[status].label);

function generateOrderText(order: Order) {
  const itemsText = order.items
    .map((item, i) => `${i + 1}. ${item.product.name} x ${item.qty} — RM ${item.product.price * item.qty}`)
    .join("\n");
  return `📋 订单编号：${order.order_no}
━━━━━━━━━━━━
商品清单：
${itemsText}
━━━━━━━━━━━━
💰 总金额：RM ${order.total_amount}
⭐ 总积分：${order.total_points}
👤 姓名：${order.contact_name}
📱 电话：${order.contact_phone}
📍 地址：${order.address || "未填写"}
📝 备注：${order.note || "无"}
━━━━━━━━━━━━
下单时间：${new Date(order.created_at).toLocaleString("zh-CN")}`;
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentOrder: order, loading, error, loadOrderDetail, cancelOrder, confirmReceive } = useOrderStore();
  const [stripeRedirecting, setStripeRedirecting] = useState(false);
  const [stripeCheckoutReady, setStripeCheckoutReady] = useState(false);

  useDocumentTitle(order ? `订单 ${order.order_no}` : "订单详情");

  useEffect(() => {
    if (id) loadOrderDetail(id);
  }, [id, loadOrderDetail]);

  useEffect(() => {
    let cancelled = false;
    paymentService
      .getPaymentConfig()
      .then((config) => {
        if (!cancelled) setStripeCheckoutReady(!!config.stripeCheckoutReady);
      })
      .catch(() => {
        if (!cancelled) setStripeCheckoutReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const stripe = searchParams.get("stripe");
    if (!stripe || !id) return;

    if (stripe === "success") {
      toast.success("支付处理中，如未更新请稍后刷新");
      loadOrderDetail(id);
    } else if (stripe === "cancel") {
      toast.message("已取消支付");
    }
    setSearchParams({}, { replace: true });
  }, [searchParams, id, loadOrderDetail, setSearchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="订单详情" />
        <div className="flex flex-col items-center py-20 text-muted-foreground">
          <Loader2 size={24} className="animate-spin mb-3" />
          <p className="text-sm">加载中…</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="订单详情" />
        <div className="flex flex-col items-center py-20 text-muted-foreground">
          <Package size={48} className="mb-3 opacity-30" />
          <p className="text-sm">{error || "订单不存在或已被删除"}</p>
          <button
            onClick={() => navigate("/orders")}
            className="mt-4 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-primary-foreground"
          >
            查看所有订单
          </button>
        </div>
      </div>
    );
  }

  const step = ORDER_STATUS_PROGRESS.indexOf(order.status);
  const label = ORDER_STATUS_META[order.status]?.label ?? order.status;
  const StatusIcon = statusIconMap[order.status] ?? Clock;
  const iconColor = statusColorMap[order.status] ?? "text-muted-foreground";

  const copyOrderText = () => {
    navigator.clipboard.writeText(generateOrderText(order));
    toast.success("订单内容已复制");
  };

  const openWhatsApp = () => {
    const text = encodeURIComponent(generateOrderText(order));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleCancel = async () => {
    if (!confirm("确定要取消该订单吗？")) return;
    try {
      await cancelOrder(order.id);
      toast.success("订单已取消");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "取消失败");
    }
  };

  const handlePayStripe = async () => {
    if (!order || order.payment_method !== "online") return;
    setStripeRedirecting(true);
    try {
      const { url } = await orderService.createStripeCheckoutSession(order.id);
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "无法打开 Stripe 支付");
      setStripeRedirecting(false);
    }
  };

  const handleConfirmReceive = async () => {
    if (!confirm("确认已收到商品？确认后无法撤销。")) return;
    try {
      await confirmReceive(order.id);
      toast.success("已确认收货，感谢您的购买！");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "确认收货失败");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <PageHeader title="订单详情" />

      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-lg px-4 py-4 space-y-4"
      >
        {/* Status card */}
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gold-light">
            <StatusIcon size={28} className={iconColor} />
          </div>
          <p className="text-base font-semibold text-foreground">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground font-mono">{order.order_no}</p>

          <div className="mt-5 flex items-center gap-1">
            {steps.map((step, i) => (
              <div key={step} className="flex flex-1 flex-col items-center">
                <div className={`h-1.5 w-full rounded-full ${i <= step ? "bg-gold" : "bg-border"}`} />
                <span className={`mt-1.5 text-[10px] ${i <= step ? "text-gold font-medium" : "text-muted-foreground"}`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tracking info */}
        {order.tracking_no && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
              <Truck size={16} className="text-blue-500" /> 物流信息
            </h3>
            <div className="space-y-2">
              {order.carrier && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">物流公司</span>
                  <span className="text-foreground font-medium">{order.carrier}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">运单号</span>
                <span className="text-foreground font-mono font-medium">{order.tracking_no}</span>
              </div>
            </div>
          </div>
        )}

        {/* Items */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">商品清单</h3>
          {order.items.map((item) => (
            <div
              key={item.product.id}
              className="flex items-center gap-3 border-b border-border py-3 last:border-0 cursor-pointer"
              onClick={() => navigate(`/product/${item.product.id}`)}
            >
              <img src={item.product.cover_image} alt={item.product.name} className="h-14 w-14 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{item.product.name}</p>
                <p className="text-xs text-muted-foreground">x{item.qty}</p>
              </div>
              <span className="text-sm font-bold text-gold flex-shrink-0">RM {item.product.price * item.qty}</span>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">收货信息</h3>
          {[
            { label: "姓名", value: order.contact_name },
            { label: "电话", value: order.contact_phone },
            { label: "地址", value: order.address || "未填写" },
            { label: "备注", value: order.note || "无" },
          ].map((row) => (
            <div key={row.label} className="flex justify-between border-b border-border py-2.5 text-sm last:border-0">
              <span className="text-muted-foreground flex-shrink-0">{row.label}</span>
              <span className="text-foreground text-right ml-4 min-w-0 truncate">{row.value}</span>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">商品总额</span>
            <span className="font-medium text-foreground">RM {order.raw_amount ?? order.total_amount}</span>
          </div>
          {(order.discount_amount ?? 0) > 0 && (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">优惠券（{order.coupon_title}）</span>
              <span className="font-medium text-destructive">-RM {order.discount_amount}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">运费（{order.shipping_name || "标准"}）</span>
            <span className={`font-medium ${(order.shipping_fee ?? 0) === 0 ? "text-emerald-600" : "text-foreground"}`}>
              {(order.shipping_fee ?? 0) === 0 ? "包邮" : `RM ${order.shipping_fee}`}
            </span>
          </div>
          <div className="mt-2 border-t border-border pt-2 flex justify-between text-sm">
            <span className="text-foreground font-medium">应付金额</span>
            <span className="text-lg font-bold text-gold">RM {order.total_amount}</span>
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-muted-foreground">获得积分</span>
            <span className="font-medium text-foreground">+{order.total_points}</span>
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-muted-foreground">下单时间</span>
            <span className="text-foreground">{new Date(order.created_at).toLocaleString("zh-CN")}</span>
          </div>
          {order.payment_time && (
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-muted-foreground">支付时间</span>
              <span className="text-foreground">{new Date(order.payment_time).toLocaleString("zh-CN")}</span>
            </div>
          )}
          {order.payment_channel && (
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-muted-foreground">支付渠道</span>
              <span className="text-foreground">{order.payment_channel}</span>
            </div>
          )}
          {order.payment_transaction_no && (
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-muted-foreground">交易号</span>
              <span className="text-foreground font-mono">{order.payment_transaction_no}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          {order.status === ORDER_STATUS.PENDING && order.payment_method === "online" && (
            <>
              {stripeCheckoutReady && (
                <button
                  type="button"
                  onClick={handlePayStripe}
                  disabled={stripeRedirecting}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-gold py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-gold/20 transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  <CreditCard size={16} /> {stripeRedirecting ? "跳转中…" : "银行卡支付（Stripe）"}
                </button>
              )}
              {!stripeCheckoutReady && (
                <p className="rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
                  当前环境未配置 Stripe Checkout，请联系管理员配置支付参数后再完成在线支付。
                </p>
              )}
            </>
          )}
          {order.status === ORDER_STATUS.SHIPPED && (
            <button
              onClick={handleConfirmReceive}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gold py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-gold/20 transition-all active:scale-[0.98]"
            >
              <CheckCircle2 size={16} /> 确认收货
            </button>
          )}
          {(order.status === ORDER_STATUS.PENDING || order.status === ORDER_STATUS.PAID) && (
            <button
              onClick={handleCancel}
              className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-destructive/30 py-3.5 text-sm font-semibold text-destructive transition-all active:scale-[0.98] hover:bg-destructive/5"
            >
              <XCircle size={16} /> 取消订单
            </button>
          )}
          <button
            onClick={copyOrderText}
            className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-border py-3.5 text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-secondary"
          >
            <Copy size={16} /> 复制订单内容
          </button>
          <button
            onClick={openWhatsApp}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[hsl(142,70%,45%)] py-3.5 text-sm font-bold text-white shadow-lg shadow-[hsl(142,70%,45%)]/20 transition-all active:scale-[0.98]"
          >
            <Phone size={16} /> 发送到 WhatsApp
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-all active:scale-[0.98]"
          >
            返回首页
          </button>
        </div>
      </motion.main>
    </div>
  );
}
