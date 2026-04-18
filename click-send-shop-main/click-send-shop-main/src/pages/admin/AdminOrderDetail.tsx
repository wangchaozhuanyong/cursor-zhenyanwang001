import { ArrowLeft, MessageSquare, Copy, Check, Loader2, Truck } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { fetchOrderById, updateOrderStatus, shipOrder } from "@/services/admin/orderService";
import PermissionGate from "@/components/admin/PermissionGate";
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  ORDER_STATUS_PROGRESS,
  getOrderStatusLabel,
  getPaymentStatusLabel,
} from "@/constants/statusDictionary";

function canShipByState(order: { status?: string; payment_status?: string }) {
  return order.status === ORDER_STATUS.PAID
    && (order.payment_status ?? PAYMENT_STATUS.PENDING) === PAYMENT_STATUS.PAID;
}

const allStatuses = ORDER_STATUS_PROGRESS;

export default function AdminOrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [showShipForm, setShowShipForm] = useState(false);
  const [trackingNo, setTrackingNo] = useState("");
  const [carrier, setCarrier] = useState("J&T Express");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchOrderById(id)
      .then((data) => setOrder(data))
      .catch(() => toast.error("加载订单详情失败"))
      .finally(() => setLoading(false));
  }, [id]);

  const reload = () => {
    if (!id) return;
    fetchOrderById(id).then(setOrder).catch(() => toast.error("刷新订单失败"));
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateOrderStatus(id!, newStatus);
      reload();
      toast.success(`订单状态已更新为「${getOrderStatusLabel(newStatus)}」`);
    } catch {
      toast.error("更新状态失败");
    }
  };

  const handleShip = async () => {
    if (!trackingNo.trim()) { toast.error("请输入快递单号"); return; }
    try {
      await shipOrder(id!, trackingNo.trim(), carrier);
      reload();
      setShowShipForm(false);
      toast.success("发货成功");
    } catch {
      toast.error("发货失败");
    }
  };

  const items = order?.items || [];
  const isCancelled = order?.status === ORDER_STATUS.CANCELLED;
  const isRefund = order?.status === ORDER_STATUS.REFUNDING || order?.status === ORDER_STATUS.REFUNDED;
  const currentStatusIdx = allStatuses.indexOf(order?.status as (typeof allStatuses)[number]);
  const canAdvance = !isCancelled && !isRefund && currentStatusIdx >= 0 && currentStatusIdx < allStatuses.length - 1;
  const nextStatus = canAdvance ? allStatuses[currentStatusIdx + 1] : null;
  const showShip = order && canShipByState(order);

  const orderText = order ? `📦 订单号: ${order.order_no}\n👤 ${order.contact_name || ""} (${order.contact_phone || ""})\n📍 ${order.address || ""}\n---\n${items.map((it: any) => `✦ ${it.product?.name || it.name} x${it.qty} = RM ${((it.product?.price || it.price || 0) * it.qty).toFixed(2)}`).join("\n")}\n---\n💰 合计: RM ${parseFloat(order.total_amount || 0).toFixed(2)}` : "";

  const handleCopyText = () => {
    navigator.clipboard.writeText(orderText);
    toast.success("订单文本已复制到剪贴板");
  };

  const handleSendWhatsApp = () => {
    const encoded = encodeURIComponent(orderText);
    const phone = (order?.contact_phone || "").replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>订单不存在</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-gold underline">返回</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h2 className="text-lg font-semibold text-foreground">订单详情</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
          isCancelled || isRefund ? "bg-red-500/10 text-red-500"
          : order.status === ORDER_STATUS.COMPLETED ? "bg-green-500/10 text-green-500"
          : "bg-gold/10 text-gold"
        }`}>{getOrderStatusLabel(order.status)}</span>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          支付：{getPaymentStatusLabel(order.payment_status ?? PAYMENT_STATUS.PENDING)}
        </span>
      </div>

      {/* Status timeline */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-foreground">订单状态流转</h3>
          {nextStatus === ORDER_STATUS.SHIPPED && (
            <PermissionGate permission="order.ship">
              <button type="button" onClick={() => setShowShipForm(true)} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">
                <Truck size={12} /> 标记发货
              </button>
            </PermissionGate>
          )}
          {nextStatus && nextStatus !== ORDER_STATUS.SHIPPED && (
            <PermissionGate permission="order.update">
              <button type="button" onClick={() => handleStatusChange(nextStatus)} className="flex items-center gap-1 rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                <Check size={12} /> 推进到「{getOrderStatusLabel(nextStatus)}」
              </button>
            </PermissionGate>
          )}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {allStatuses.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                isCancelled || isRefund ? "bg-muted text-muted-foreground"
                : i <= currentStatusIdx ? "bg-gold text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}>{i + 1}</div>
              <span className={`whitespace-nowrap text-xs ${!isCancelled && !isRefund && i <= currentStatusIdx ? "font-medium text-foreground" : "text-muted-foreground"}`}>{getOrderStatusLabel(s)}</span>
              {i < allStatuses.length - 1 && (
                <div className={`h-0.5 w-8 ${!isCancelled && !isRefund && i < currentStatusIdx ? "bg-gold" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
        {isCancelled && (
          <div className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">该订单已被取消</div>
        )}
        {isRefund && (
          <div className="mt-3 rounded-lg bg-orange-500/10 px-3 py-2 text-xs text-orange-600">该订单处于退款流程中</div>
        )}
      </div>

      {/* Ship form modal */}
      {showShipForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowShipForm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-foreground flex items-center gap-2"><Truck size={18} className="text-blue-600" /> 发货信息</h3>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">快递公司</label>
              <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold">
                {["J&T Express", "Pos Laju", "DHL eCommerce", "Ninja Van", "GD Express", "City-Link Express", "顺丰速运", "其他"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">快递单号</label>
              <input value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} placeholder="输入快递单号" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold" />
            </div>
            <PermissionGate permission="order.ship">
              <button type="button" onClick={handleShip} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white">确认发货</button>
            </PermissionGate>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left - user info */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">收货信息</h3>
            {[
              { label: "姓名", value: order.contact_name || "—" },
              { label: "电话", value: order.contact_phone || "—" },
              { label: "地址", value: order.address || "—" },
              { label: "备注", value: order.note || "—" },
            ].map((r) => (
              <div key={r.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="text-right text-foreground max-w-[60%] truncate">{r.value}</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">订单信息</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">订单号</span>
              <span className="font-mono text-foreground">{order.order_no}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">下单时间</span>
              <span className="text-foreground">{new Date(order.created_at).toLocaleString("zh-CN")}</span>
            </div>
            {order.tracking_no && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">快递公司</span>
                  <span className="text-foreground">{order.carrier || "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">快递单号</span>
                  <span className="font-mono text-foreground">{order.tracking_no}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center - items */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">商品清单</h3>
          <div className="space-y-3">
            {items.map((item: any, idx: number) => {
              const product = item.product || item;
              return (
                <div key={idx} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    {product.cover_image && <img src={product.cover_image} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                    <div>
                      <p className="text-sm font-medium text-foreground">{product.name}</p>
                      <p className="text-xs text-muted-foreground">x{item.qty}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground">RM {((product.price || 0) * item.qty).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">商品合计</span>
              <span className="text-foreground">RM {parseFloat(order.raw_amount || order.total_amount || 0).toFixed(2)}</span>
            </div>
            {parseFloat(order.discount_amount || 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">优惠券（{order.coupon_title}）</span>
                <span className="text-destructive">-RM {parseFloat(order.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">运费</span>
              <span className="text-foreground">{parseFloat(order.shipping_fee || 0) === 0 ? "包邮" : `RM ${parseFloat(order.shipping_fee).toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
              <span className="text-foreground">实付金额</span>
              <span className="text-gold">RM {parseFloat(order.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Right - actions */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">快捷操作</h3>
            <div className="grid grid-cols-2 gap-2">
              <PermissionGate permission="order.ship">
                <button
                  type="button"
                  onClick={() => setShowShipForm(true)}
                  disabled={isCancelled || isRefund || !showShip}
                  className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                >标记发货</button>
              </PermissionGate>
              <PermissionGate permission="order.update">
                <button
                  type="button"
                  onClick={() => handleStatusChange(ORDER_STATUS.COMPLETED)}
                  disabled={isCancelled || isRefund || order.status === ORDER_STATUS.COMPLETED}
                  className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                >标记完成</button>
              </PermissionGate>
              <PermissionGate permission="order.update">
                <button
                  type="button"
                  onClick={() => handleStatusChange(ORDER_STATUS.CANCELLED)}
                  disabled={isCancelled || isRefund}
                  className="rounded-lg border border-destructive/30 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-40 disabled:cursor-not-allowed col-span-2"
                >取消订单</button>
              </PermissionGate>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">订单文本预览</h3>
            <div className="rounded-lg bg-secondary p-3 text-xs text-foreground leading-relaxed whitespace-pre-line">{orderText}</div>
            <div className="flex gap-2">
              <button onClick={handleSendWhatsApp} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700">
                <MessageSquare size={14} /> WhatsApp
              </button>
              <button onClick={handleCopyText} className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-secondary">
                <Copy size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
