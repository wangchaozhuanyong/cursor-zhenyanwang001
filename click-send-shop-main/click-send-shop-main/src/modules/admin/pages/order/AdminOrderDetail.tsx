import { AdminTableCell } from "@/components/admin/AdminTableCell";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchOrderById } from "@/services/admin/orderService";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { formatDateTime } from "@/utils/formatDateTime";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { PaymentStatusBadge } from "@/components/admin/PaymentStatusBadge";

function toMoney(value: unknown) {
  return `RM ${Number(value || 0).toFixed(2)}`;
}

export default function AdminOrderDetail() {
  const navigate = useNavigate();
  const { id = "" } = useParams();

  const orderQuery = useQuery({
    queryKey: adminQueryKeys.orderDetail(id),
    queryFn: () => fetchOrderById(id),
    enabled: !!id,
    staleTime: 60_000,
  });

  const order = orderQuery.data ?? null;
  const loading = orderQuery.isLoading && !orderQuery.data;

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
        <h3 className="mb-3 font-semibold"><Tx>商品信息</Tx></h3>
        <div className="space-y-3">
          {(order.items || []).map((item) => {
            const itemKey = item.order_item_id || item.id || `${item.product?.id || "product"}-${item.variant_id || "default"}`;
            const lineTotal = Number(item.subtotal ?? Number(item.unit_price || 0) * Number(item.qty || 0));
            return (
              <div key={itemKey} className="flex gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
                <img src={item.product?.cover_image || ""} alt={item.product?.name || "product"} className="h-14 w-14 rounded object-cover bg-secondary" />
                <div className="min-w-0 flex-1">
                  <AdminTableCell value={item.product?.name || "-"} fullText={item.product?.name || ""} maxWidth="100%" />
                  <p className="text-xs text-muted-foreground">{item.variant_name || item.sku_code || "默认规格"}</p>
                  <p className="text-xs text-muted-foreground">{toMoney(item.unit_price || 0)} x {item.qty}</p>
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
          净利润 = 商品毛利 + 运费收入 − 实际物流成本 − 支付手续费
          {Number(order.refund_amount || 0) > 0 ? "（未在公式中扣减退款，退款见下方）" : ""}
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
    </div>
  );
}
