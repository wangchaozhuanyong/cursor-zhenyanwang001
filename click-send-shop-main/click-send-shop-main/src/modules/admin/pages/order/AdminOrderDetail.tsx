import { ArrowLeft, Loader2, Truck, Check, XCircle, ReceiptText } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { useGoBack } from "@/hooks/useGoBack";
import { fetchOrderById, updateOrderStatus, shipOrder } from "@/services/admin/orderService";
import { getAuditLogs, type AuditLogRow } from "@/api/admin/audit";
import { markAdminOrderPaid } from "@/services/admin/paymentAdminService";
import PermissionGate from "@/components/admin/PermissionGate";
import { toastErrorMessage } from "@/utils/errorMessage";
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  getOrderStatusLabel,
  getPaymentStatusLabel,
} from "@/constants/statusDictionary";
import type { Order } from "@/types/order";

const ORDER_STATUS_PROGRESS = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.PAID,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.COMPLETED,
] as const;

function canShipByState(order: Order) {
  return order.status === ORDER_STATUS.PAID && (order.payment_status ?? PAYMENT_STATUS.PENDING) === PAYMENT_STATUS.PAID;
}

export default function AdminOrderDetail() {
  const navigate = useNavigate();
  const goBack = useGoBack("/admin/orders");
  const { id = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [showShipForm, setShowShipForm] = useState(false);
  const [trackingNo, setTrackingNo] = useState("");
  const [carrier, setCarrier] = useState("J&T Express");

  const reload = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchOrderById(id);
      setOrder(data);
      try {
        const logRes = await getAuditLogs({
          page: 1,
          pageSize: 20,
          objectType: "order",
          objectId: data.id,
          sortBy: "created_at",
          sortOrder: "desc",
        });
        const payload = logRes.data as unknown as { list?: AuditLogRow[] };
        setLogs(Array.isArray(payload?.list) ? payload.list : []);
      } catch {
        setLogs([]);
      }
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载订单详情失败"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, [id]);

  useEffect(() => {
    if (!order) return;
    const action = searchParams.get("action");
    if (action === "ship" && canShipByState(order)) setShowShipForm(true);
  }, [order, searchParams]);

  const statusIndex = ORDER_STATUS_PROGRESS.indexOf((order?.status || "") as (typeof ORDER_STATUS_PROGRESS)[number]);
  const nextStatus = statusIndex >= 0 && statusIndex < ORDER_STATUS_PROGRESS.length - 1
    ? ORDER_STATUS_PROGRESS[statusIndex + 1]
    : null;

  const discountLines = useMemo(() => {
    const src = order as unknown as {
      flash_sale_discount?: number;
      full_reduction_discount?: number;
      coupon_discount?: number;
      discount_lines?: Array<{ label?: string; amount?: number }>;
    };
    const list: Array<{ label: string; amount: number }> = [];
    const flash = Number(src.flash_sale_discount || 0);
    const fullReduction = Number(src.full_reduction_discount || 0);
    const coupon = Number(src.coupon_discount || 0);
    if (flash > 0) list.push({ label: "秒杀优惠", amount: flash });
    if (fullReduction > 0) list.push({ label: "满减优惠", amount: fullReduction });
    if (coupon > 0) list.push({ label: "优惠券优惠", amount: coupon });
    if (Array.isArray(src.discount_lines)) {
      for (const it of src.discount_lines) {
        const amount = Number(it?.amount || 0);
        if (amount > 0 && it?.label) list.push({ label: it.label, amount });
      }
    }
    return list;
  }, [order]);

  const handleStatus = async (target: string) => {
    if (!id) return;
    setBusy(true);
    try {
      await updateOrderStatus(id, target);
      toast.success(`订单状态已更新为「${getOrderStatusLabel(target)}」`);
      await reload();
      setSearchParams({});
    } catch (e) {
      toast.error(toastErrorMessage(e, "状态更新失败"));
    } finally {
      setBusy(false);
    }
  };

  const handleShip = async () => {
    if (!id) return;
    if (!trackingNo.trim()) return toast.error("请填写快递单号");
    setBusy(true);
    try {
      await shipOrder(id, trackingNo.trim(), carrier);
      toast.success("已发货");
      setShowShipForm(false);
      await reload();
      setSearchParams({});
    } catch (e) {
      toast.error(toastErrorMessage(e, "发货失败"));
    } finally {
      setBusy(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!id || !order) return;
    const payment_channel = window.prompt("收款渠道", "offline_transfer") || "offline_transfer";
    const admin_remark = window.prompt("收款备注", "") || "";
    const payment_reference = window.prompt("交易凭证编号（可选）", "") || "";
    setBusy(true);
    try {
      await markAdminOrderPaid(order.id, {
        payment_channel,
        admin_remark,
        payment_reference,
        reason: admin_remark,
      });
      toast.success("已补记为已支付");
      await reload();
    } catch (e) {
      toast.error(toastErrorMessage(e, "确认收款失败"));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">加载中...</div>;
  }

  if (!order) {
    return <div className="p-6">订单不存在</div>;
  }

  const isReadonly = [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED].includes(order.status);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={goBack}><ArrowLeft size={18} /></button>
        <h2 className="text-lg font-semibold">订单详情</h2>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{getOrderStatusLabel(order.status)}</span>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">支付：{getPaymentStatusLabel(order.payment_status ?? PAYMENT_STATUS.PENDING)}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <h3 className="font-semibold">收货信息</h3>
            <div className="text-sm">姓名：{order.contact_name || "-"}</div>
            <div className="text-sm">电话：{order.contact_phone || "-"}</div>
            <div className="text-sm">地址：{order.address || "-"}</div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <h3 className="font-semibold">快捷操作</h3>
            <div className="flex flex-wrap gap-2">
              {order.status === ORDER_STATUS.PENDING && (
                <>
                  <PermissionGate permission="payment.manage">
                    <button type="button" disabled={busy} onClick={handleMarkPaid} className="rounded-lg border border-emerald-500/40 px-3 py-2 text-xs text-emerald-600">确认线下收款</button>
                  </PermissionGate>
                  <PermissionGate permission="order.update">
                    <button type="button" disabled={busy} onClick={() => void handleStatus(ORDER_STATUS.CANCELLED)} className="rounded-lg border border-red-500/40 px-3 py-2 text-xs text-red-600">取消订单</button>
                  </PermissionGate>
                </>
              )}

              {order.status === ORDER_STATUS.PAID && (
                <PermissionGate permission="order.ship">
                  <button type="button" disabled={busy} onClick={() => setShowShipForm(true)} className="rounded-lg border border-blue-500/40 px-3 py-2 text-xs text-blue-600">发货</button>
                </PermissionGate>
              )}

              {order.status === ORDER_STATUS.SHIPPED && (
                <PermissionGate permission="order.update">
                  <button type="button" disabled={busy} onClick={() => void handleStatus(ORDER_STATUS.COMPLETED)} className="rounded-lg border border-[var(--theme-border)] px-3 py-2 text-xs">标记完成</button>
                </PermissionGate>
              )}

              {isReadonly && <span className="text-xs text-muted-foreground">当前状态只读</span>}
            </div>

            {nextStatus && nextStatus !== ORDER_STATUS.SHIPPED && !isReadonly && (
              <div className="text-xs text-muted-foreground">
                下一步建议状态：{getOrderStatusLabel(nextStatus)}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="font-semibold">商品清单</h3>
          {(order.items || []).map((item, idx) => {
            const p = item.product || item;
            return (
              <div key={idx} className="flex items-center justify-between rounded-lg border border-border p-2">
                <div className="text-sm">{p.name} x{item.qty}</div>
                <div className="text-sm font-semibold">RM {((p.price || 0) * item.qty).toFixed(2)}</div>
              </div>
            );
          })}

          <div className="border-t border-border pt-2 space-y-1 text-sm">
            <div className="flex justify-between"><span>商品原价</span><span>RM {Number(order.raw_amount || 0).toFixed(2)}</span></div>
            {discountLines.map((d, i) => (
              <div key={i} className="flex justify-between text-red-600"><span>{d.label}</span><span>-RM {Number(d.amount).toFixed(2)}</span></div>
            ))}
            {!!Number(order.total_points || 0) && <div className="flex justify-between text-red-600"><span>积分抵扣</span><span>-{order.total_points} 分</span></div>}
            <div className="flex justify-between"><span>运费</span><span>{Number(order.shipping_fee || 0) > 0 ? `RM ${Number(order.shipping_fee).toFixed(2)}` : "包邮"}</span></div>
            <div className="flex justify-between"><span>SST</span><span>RM {Number(order.tax_amount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-border pt-1 font-bold"><span>实付金额</span><span>RM {Number(order.total_amount || 0).toFixed(2)}</span></div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="inline-flex items-center gap-2 font-semibold"><ReceiptText size={16} />操作记录</h3>
          <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
            {logs.length === 0 && <div className="text-xs text-muted-foreground">暂无操作记录</div>}
            {logs.map((log) => (
              <div key={log.id} className="rounded-lg border border-border p-2 text-xs">
                <div className="font-medium">{log.action_type}</div>
                <div className="text-muted-foreground">操作人：{log.operator_name || "系统"}</div>
                <div className="text-muted-foreground">时间：{new Date(log.created_at).toLocaleString("zh-CN")}</div>
                <div className="text-muted-foreground">备注：{log.summary || "-"}</div>
                <div className="text-muted-foreground">before: {JSON.stringify(log.before_json)}</div>
                <div className="text-muted-foreground">after: {JSON.stringify(log.after_json)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showShipForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowShipForm(false)}>
          <div className="w-full max-w-md rounded-xl bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold"><Truck size={14} />填写发货信息</h3>
            <div className="space-y-2">
              <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="物流公司" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <input value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} placeholder="快递单号" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <PermissionGate permission="order.ship">
                <button type="button" disabled={busy} onClick={handleShip} className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} 确认发货
                </button>
              </PermissionGate>
              <button type="button" onClick={() => setShowShipForm(false)} className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 text-sm">
                <XCircle size={14} /> 取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pt-2">
        <button type="button" onClick={() => navigate('/admin/orders')} className="text-xs text-[var(--theme-price)] underline">返回订单列表</button>
      </div>
    </div>
  );
}
