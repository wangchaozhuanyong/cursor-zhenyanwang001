import { AdminTableCell } from "@/components/admin/AdminTableCell";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchOrderById, applyShortageAdjustment, previewShortageAdjustment } from "@/services/admin/orderService";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { adminRealtimeQueryOptions } from "@/lib/adminRealtimeQueryOptions";
import { formatDateTime } from "@/utils/formatDateTime";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminTabTitle } from "@/hooks/useAdminTabTitle";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { PaymentStatusBadge } from "@/components/admin/PaymentStatusBadge";
import type { Order, ShortageAdjustmentPreview, ShortageAdjustmentRequest } from "@/types/order";

function toMoney(value: unknown) {
  return `RM ${Number(value || 0).toFixed(2)}`;
}

function canAdjustShortage(order: Order) {
  const paymentStatus = order.payment_status || "pending";
  if (order.shipped_at || ["shipped", "completed", "cancelled", "refunded"].includes(order.status)) return false;
  if (order.status === "pending") return paymentStatus === "pending";
  return order.status === "paid" && ["paid", "partially_refunded"].includes(paymentStatus);
}

type LineDraft = {
  after_qty: number;
  shortage_reason: string;
  correct_stock_zero: boolean;
};

export default function AdminOrderDetail() {
  const { tText } = useAdminT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id = "" } = useParams();
  const [shortageOpen, setShortageOpen] = useState(false);
  const [reason, setReason] = useState("仓库实际无货，已与客户沟通确认");
  const [customerConfirmed, setCustomerConfirmed] = useState(true);
  const [confirmMethod, setConfirmMethod] = useState("whatsapp");
  const [confirmNote, setConfirmNote] = useState("");
  const [lineDrafts, setLineDrafts] = useState<Record<string, LineDraft>>({});
  const [preview, setPreview] = useState<ShortageAdjustmentPreview | null>(null);

  const orderQuery = useQuery({
    queryKey: adminQueryKeys.orderDetail(id),
    queryFn: () => fetchOrderById(id),
    enabled: !!id,
    ...adminRealtimeQueryOptions.order,
  });

  const order = orderQuery.data ?? null;
  const loading = orderQuery.isLoading && !orderQuery.data;
  const buildPayload = (): ShortageAdjustmentRequest => {
    if (!order) {
      return {
        reason,
        customer_confirmed: customerConfirmed,
        customer_confirm_method: confirmMethod,
        customer_confirm_note: confirmNote,
        stock_handling: "no_restore",
        items: [],
      };
    }
    const items = (order.items || [])
      .map((item) => {
        const itemId = item.order_item_id || item.id || "";
        const draft = lineDrafts[itemId];
        const beforeQty = Number(item.qty || 0);
        const afterQty = Math.max(0, Math.min(beforeQty, Number(draft?.after_qty ?? beforeQty)));
        return {
          order_item_id: itemId,
          after_qty: afterQty,
          shortage_reason: draft?.shortage_reason || "",
          correct_stock_zero: !!draft?.correct_stock_zero,
          beforeQty,
        };
      })
      .filter((item) => item.order_item_id && item.after_qty < item.beforeQty)
      .map(({ beforeQty: _beforeQty, ...item }) => item);
    const stockHandling: "correct_zero" | "no_restore" = items.some((item) => item.correct_stock_zero) ? "correct_zero" : "no_restore";
    return {
      reason,
      customer_confirmed: customerConfirmed,
      customer_confirm_method: confirmMethod,
      customer_confirm_note: confirmNote,
      stock_handling: stockHandling,
      items,
    };
  };

  const previewMutation = useMutation({
    mutationFn: () => previewShortageAdjustment(id, buildPayload()),
    onSuccess: (data) => setPreview(data),
    onError: (e) => toast.error(e instanceof Error ? e.message : tText("预览失败")),
  });

  const applyMutation = useMutation({
    mutationFn: () => applyShortageAdjustment(id, buildPayload()),
    onSuccess: async () => {
      toast.success(tText("订单缺货调整已生成"));
      setShortageOpen(false);
      setPreview(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.orderDetail(id) }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.ordersRoot() }),
      ]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : tText("调整失败")),
  });

  const tabTitle = useMemo(() => {
    if (!order) return null;
    if (order.order_no) return tText(`订单：${order.order_no}`);
    if (id) return tText(`订单 #${id}`);
    return null;
  }, [id, order, tText]);
  useAdminTabTitle(tabTitle, !loading && Boolean(order));

  const openShortageDialog = () => {
    if (!order) return;
    const drafts = Object.fromEntries((order.items || []).map((item) => {
      const itemId = item.order_item_id || item.id || "";
      return [itemId, {
        after_qty: Number(item.qty || 0),
        shortage_reason: "",
        correct_stock_zero: false,
      }];
    }).filter(([itemId]) => itemId));
    setLineDrafts(drafts);
    setPreview(null);
    setShortageOpen(true);
  };

  if (loading) return <div className="p-6 text-sm"><Tx>加载中...</Tx></div>;
  if (!order) return <div className="p-6 text-sm"><Tx>订单不存在</Tx></div>;

  return (
    <div className="space-y-4 p-6 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold"><Tx>订单详情</Tx></h2>
        <button className="rounded border px-3 py-1.5" onClick={() => navigate("/admin/orders")}><Tx>返回列表</Tx></button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div><span className="text-muted-foreground"><Tx>订单号：</Tx></span><span className="font-mono">{order.order_no}</span></div>
          <div><span className="text-muted-foreground"><Tx>下单时间：</Tx></span><span>{order.created_at ? formatDateTime(order.created_at) : "-"}</span></div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground"><Tx>履约状态：</Tx></span>
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground"><Tx>支付状态：</Tx></span>
            <PaymentStatusBadge status={order.payment_status || "pending"} />
          </div>
          <div><span className="text-muted-foreground"><Tx>支付方式：</Tx></span><span>{order.payment_method || "-"}</span></div>
          <div><span className="text-muted-foreground"><Tx>支付时间：</Tx></span><span>{order.payment_time ? formatDateTime(order.payment_time) : "-"}</span></div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold"><Tx>商品信息</Tx></h3>
          {canAdjustShortage(order) ? (
            <button
              type="button"
              className="rounded border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800"
              onClick={openShortageDialog}
            >
              <Tx>缺货处理 / 修改订单商品</Tx>
            </button>
          ) : null}
        </div>
        <div className="space-y-3">
          {(order.items || []).map((item) => {
            const itemKey = item.order_item_id || item.id || `${item.product?.id || "product"}-${item.variant_id || "default"}`;
            const lineTotal = Number(item.subtotal ?? Number(item.unit_price || 0) * Number(item.qty || 0));
            return (
              <div key={itemKey} className="flex gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
                <img src={item.product?.cover_image || ""} alt={item.product?.name || "product"} className="h-14 w-14 rounded object-cover bg-secondary" />
                <div className="min-w-0 flex-1">
                  <AdminTableCell value={item.product?.name || "-"} fullText={item.product?.name || ""} maxWidth="100%" />
                  <p className="text-xs text-muted-foreground">{item.variant_name || item.sku_code || tText("默认规格")}</p>
                  <p className="text-xs text-muted-foreground">{toMoney(item.unit_price || 0)} x {item.qty}</p>
                  <p className="text-xs text-muted-foreground"><Tx>当前系统库存：</Tx>{Number(item.product?.stock || 0)}</p>
                </div>
                <div className="shrink-0 font-semibold">{toMoney(lineTotal)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-semibold"><Tx>金额信息</Tx></h3>
        <div className="space-y-2">
          <div className="flex justify-between"><span className="text-muted-foreground"><Tx>商品金额</Tx></span><span>{toMoney(order.raw_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground"><Tx>优惠金额</Tx></span><span>-{toMoney(order.discount_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground"><Tx>运费（向客户收取）</Tx></span><span>{toMoney(order.shipping_fee)}</span></div>
          <div className="flex justify-between pt-1 text-base font-semibold"><span><Tx>实付金额</Tx></span><span>{toMoney(order.total_amount)}</span></div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-1 font-semibold"><Tx>利润拆解</Tx></h3>
        <p className="mb-3 text-xs text-muted-foreground">
          <Tx>净利润 = 商品毛利 + 运费收入 − 实际物流成本 − 支付手续费</Tx>
          {Number(order.refund_amount || 0) > 0 ? (
            <Tx>（未在公式中扣减退款，退款见下方）</Tx>
          ) : null}
        </p>
        <div className="space-y-2">
          <div className="flex justify-between"><span className="text-muted-foreground"><Tx>商品成本</Tx></span><span>{toMoney(order.goods_cost_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground"><Tx>商品毛利</Tx></span><span>{toMoney(order.gross_profit_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground"><Tx>运费收入</Tx></span><span>{toMoney(order.shipping_fee)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground"><Tx>实际物流成本</Tx></span><span>-{toMoney(order.shipping_cost_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground"><Tx>支付手续费</Tx></span><span>-{toMoney(order.payment_fee_amount)}</span></div>
          {Number(order.refund_amount || 0) > 0 ? (
            <div className="flex justify-between text-red-600"><span><Tx>已退款</Tx></span><span>-{toMoney(order.refund_amount)}</span></div>
          ) : null}
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <span><Tx>净利润</Tx></span>
            <span className="text-[var(--theme-price)]">{toMoney(order.net_profit_amount)}</span>
          </div>
        </div>
        {order.cost_snapshot_source === "missing" || Number(order.missing_cost_item_count || 0) > 0 ? (
          <p className="mt-3 text-xs text-amber-700"><Tx>部分商品缺少成本快照，毛利/净利润可能偏低，请核对商品成本后重算。</Tx></p>
        ) : null}
      </div>

      {(order.adjustments || []).length > 0 ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-semibold"><Tx>订单调整记录</Tx></h3>
          <div className="space-y-3">
            {(order.adjustments || []).map((adjustment) => (
              <div key={adjustment.id} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{adjustment.adjustment_no}</p>
                    <p className="text-xs text-muted-foreground">{adjustment.created_at ? formatDateTime(adjustment.created_at) : "-"}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p><Tx>退款金额：</Tx><span className="font-semibold text-red-600">{toMoney(adjustment.refund_amount)}</span></p>
                    <p className="text-muted-foreground"><Tx>客户确认：</Tx>{adjustment.customer_confirm_method || "-"}</p>
                  </div>
                </div>
                <div className="grid gap-2 text-xs md:grid-cols-2">
                  <div><span className="text-muted-foreground"><Tx>原金额：</Tx></span>{toMoney(adjustment.before_amount?.total_amount)}</div>
                  <div><span className="text-muted-foreground"><Tx>最新金额：</Tx></span>{toMoney(adjustment.after_amount?.total_amount)}</div>
                  <div><span className="text-muted-foreground"><Tx>操作人：</Tx></span>{adjustment.operator_id || "-"}</div>
                  <div><span className="text-muted-foreground"><Tx>原因：</Tx></span>{adjustment.reason || "-"}</div>
                </div>
                <div className="mt-2 space-y-1 text-xs">
                  {(adjustment.items || []).map((item) => (
                    <div key={item.id} className="rounded bg-secondary/40 px-2 py-1">
                      {item.product_name_snapshot} {item.variant_name_snapshot || item.sku_code || ""}：
                      {item.before_qty} → {item.after_qty}
                      {item.line_refund_amount > 0 ? `，退款 ${toMoney(item.line_refund_amount)}` : ""}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-semibold"><Tx>收货信息</Tx></h3>
        <div className="grid gap-2">
          <div><span className="text-muted-foreground"><Tx>收货人：</Tx></span><span>{order.contact_name || "-"}</span></div>
          <div><span className="text-muted-foreground"><Tx>联系电话：</Tx></span><span>{order.shipping_phone || order.contact_phone || "-"}</span></div>
          <div><span className="text-muted-foreground"><Tx>收货地址：</Tx></span><span>{order.address || "-"}</span></div>
          <div><span className="text-muted-foreground"><Tx>配送方式：</Tx></span><span>{order.shipping_name || "-"}</span></div>
          <div><span className="text-muted-foreground"><Tx>物流单号：</Tx></span><span>{order.tracking_no || order.logistics_provider?.tracking_no || "-"}</span></div>
          <div><span className="text-muted-foreground"><Tx>物流承运商：</Tx></span><span>{order.carrier || order.logistics_provider?.carrier || "-"}</span></div>
          {order.note ? <div><span className="text-muted-foreground"><Tx>买家备注：</Tx></span><span>{order.note}</span></div> : null}
        </div>
      </div>

      {shortageOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl border border-border bg-card p-4 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold"><Tx>缺货处理 / 修改订单商品</Tx></h3>
                <p className="mt-1 text-xs text-muted-foreground"><Tx>只允许删除或减少商品数量，不会回补库存。</Tx></p>
              </div>
              <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => setShortageOpen(false)}>
                <Tx>关闭</Tx>
              </button>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <label className="text-xs">
                <span className="mb-1 block text-muted-foreground"><Tx>调整原因</Tx></span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-20 w-full rounded border border-border bg-background px-3 py-2"
                />
              </label>
              <div className="grid gap-3">
                <label className="text-xs">
                  <span className="mb-1 block text-muted-foreground"><Tx>客户确认方式</Tx></span>
                  <input
                    value={confirmMethod}
                    onChange={(e) => setConfirmMethod(e.target.value)}
                    className="w-full rounded border border-border bg-background px-3 py-2"
                    placeholder={tText("whatsapp / phone / email")}
                  />
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={customerConfirmed} onChange={(e) => setCustomerConfirmed(e.target.checked)} />
                  <Tx>已与客户确认</Tx>
                </label>
              </div>
              <label className="text-xs md:col-span-2">
                <span className="mb-1 block text-muted-foreground"><Tx>客户确认备注</Tx></span>
                <input
                  value={confirmNote}
                  onChange={(e) => setConfirmNote(e.target.value)}
                  className="w-full rounded border border-border bg-background px-3 py-2"
                  placeholder={tText("客户同意删除缺货商品并继续发货")}
                />
              </label>
            </div>

            <div className="space-y-3">
              {(order.items || []).map((item) => {
                const itemId = item.order_item_id || item.id || "";
                const draft = lineDrafts[itemId] || { after_qty: Number(item.qty || 0), shortage_reason: "", correct_stock_zero: false };
                const beforeQty = Number(item.qty || 0);
                return (
                  <div key={itemId} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[1fr_8rem_8rem_1fr]">
                    <div className="min-w-0">
                      <AdminTableCell value={item.product?.name || "-"} fullText={item.product?.name || ""} maxWidth="100%" />
                      <p className="text-xs text-muted-foreground">{item.variant_name || item.sku_code || tText("默认规格")}</p>
                      <p className="text-xs text-muted-foreground"><Tx>当前系统库存：</Tx>{Number(item.product?.stock || 0)}</p>
                    </div>
                    <div className="text-xs">
                      <span className="mb-1 block text-muted-foreground"><Tx>原数量</Tx></span>
                      <span className="font-semibold">{beforeQty}</span>
                    </div>
                    <label className="text-xs">
                      <span className="mb-1 block text-muted-foreground"><Tx>处理后数量</Tx></span>
                      <input
                        type="number"
                        min={0}
                        max={beforeQty}
                        value={draft.after_qty}
                        onChange={(e) => {
                          const nextQty = Math.max(0, Math.min(beforeQty, Number(e.target.value || 0)));
                          setLineDrafts((prev) => ({ ...prev, [itemId]: { ...draft, after_qty: nextQty } }));
                          setPreview(null);
                        }}
                        className="w-full rounded border border-border bg-background px-2 py-1.5"
                      />
                      <button
                        type="button"
                        className="mt-1 text-xs text-red-600 underline"
                        onClick={() => {
                          setLineDrafts((prev) => ({ ...prev, [itemId]: { ...draft, after_qty: 0 } }));
                          setPreview(null);
                        }}
                      >
                        <Tx>删除该商品</Tx>
                      </button>
                    </label>
                    <label className="text-xs">
                      <span className="mb-1 block text-muted-foreground"><Tx>缺货原因</Tx></span>
                      <input
                        value={draft.shortage_reason}
                        onChange={(e) => {
                          setLineDrafts((prev) => ({ ...prev, [itemId]: { ...draft, shortage_reason: e.target.value } }));
                          setPreview(null);
                        }}
                        className="w-full rounded border border-border bg-background px-2 py-1.5"
                        placeholder={tText("仓库实际无货")}
                      />
                      <label className="mt-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={draft.correct_stock_zero}
                          onChange={(e) => {
                            setLineDrafts((prev) => ({ ...prev, [itemId]: { ...draft, correct_stock_zero: e.target.checked } }));
                            setPreview(null);
                          }}
                        />
                        <span><Tx>将该 SKU 库存校正为 0</Tx></span>
                      </label>
                    </label>
                  </div>
                );
              })}
            </div>

            {preview ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="mb-2 font-semibold"><Tx>金额预览</Tx></p>
                <div className="grid gap-2 md:grid-cols-3">
                  <div><Tx>原订单金额：</Tx>{toMoney(preview.before_amount.total_amount)}</div>
                  <div><Tx>最新订单金额：</Tx>{toMoney(preview.after_amount.total_amount)}</div>
                  <div><Tx>应退款：</Tx>{toMoney(preview.refund_amount)}</div>
                </div>
                <p className="mt-2">{preview.notice}</p>
              </div>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border px-3 py-1.5"
                disabled={previewMutation.isPending}
                onClick={() => previewMutation.mutate()}
              >
                {previewMutation.isPending ? tText("预览中...") : <Tx>预览最新金额</Tx>}
              </button>
              <button
                type="button"
                className="rounded bg-[var(--theme-price)] px-3 py-1.5 text-white disabled:opacity-60"
                disabled={applyMutation.isPending}
                onClick={() => applyMutation.mutate()}
              >
                {applyMutation.isPending ? tText("生成中...") : <Tx>生成最新订单</Tx>}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
