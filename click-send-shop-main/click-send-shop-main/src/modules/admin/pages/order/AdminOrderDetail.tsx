import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchOrderById } from "@/services/admin/orderService";
import type { Order } from "@/types/order";
import { formatDateTime } from "@/utils/formatDateTime";
import {
  getOrderStatusBadgeClass,
  getOrderStatusLabel,
  getPaymentStatusBadgeClass,
  getPaymentStatusLabel,
} from "@/constants/statusDictionary";

function toMoney(value: unknown) {
  return `RM ${Number(value || 0).toFixed(2)}`;
}

export default function AdminOrderDetail() {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!id) return;
    void fetchOrderById(id)
      .then((o) => {
        if (mounted) setOrder(o);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <div className="p-6 text-sm">加载中...</div>;
  if (!order) return <div className="p-6 text-sm">订单不存在</div>;

  return (
    <div className="space-y-4 p-6 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">订单详情</h2>
        <button className="rounded border px-3 py-1.5" onClick={() => navigate("/admin/orders")}>返回列表</button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div><span className="text-muted-foreground">订单号：</span><span className="font-mono">{order.order_no}</span></div>
          <div><span className="text-muted-foreground">下单时间：</span><span>{order.created_at ? formatDateTime(order.created_at) : "-"}</span></div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">履约状态：</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${getOrderStatusBadgeClass(order.status)}`}>{getOrderStatusLabel(order.status)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">支付状态：</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${getPaymentStatusBadgeClass(order.payment_status || "pending")}`}>{getPaymentStatusLabel(order.payment_status || "pending")}</span>
          </div>
          <div><span className="text-muted-foreground">支付方式：</span><span>{order.payment_method || "-"}</span></div>
          <div><span className="text-muted-foreground">支付时间：</span><span>{order.payment_time ? formatDateTime(order.payment_time) : "-"}</span></div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-semibold">商品信息</h3>
        <div className="space-y-3">
          {(order.items || []).map((item) => {
            const itemKey = item.order_item_id || item.id || `${item.product?.id || "product"}-${item.variant_id || "default"}`;
            const lineTotal = Number(item.subtotal ?? Number(item.unit_price || 0) * Number(item.qty || 0));
            return (
              <div key={itemKey} className="flex gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
                <img src={item.product?.cover_image || ""} alt={item.product?.name || "product"} className="h-14 w-14 rounded object-cover bg-secondary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.product?.name || "-"}</p>
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
        <h3 className="mb-3 font-semibold">金额信息</h3>
        <div className="space-y-2">
          <div className="flex justify-between"><span className="text-muted-foreground">商品金额</span><span>{toMoney(order.raw_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">优惠金额</span><span>-{toMoney(order.discount_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">运费（向客户收取）</span><span>{toMoney(order.shipping_fee)}</span></div>
          <div className="flex justify-between pt-1 text-base font-semibold"><span>实付金额</span><span>{toMoney(order.total_amount)}</span></div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-1 font-semibold">利润拆解</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          净利润 = 商品毛利 + 运费收入 − 实际物流成本 − 支付手续费
          {Number(order.refund_amount || 0) > 0 ? "（未在公式中扣减退款，退款见下方）" : ""}
        </p>
        <div className="space-y-2">
          <div className="flex justify-between"><span className="text-muted-foreground">商品成本</span><span>{toMoney(order.goods_cost_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">商品毛利</span><span>{toMoney(order.gross_profit_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">运费收入</span><span>{toMoney(order.shipping_fee)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">实际物流成本</span><span>-{toMoney(order.shipping_cost_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">支付手续费</span><span>-{toMoney(order.payment_fee_amount)}</span></div>
          {Number(order.refund_amount || 0) > 0 ? (
            <div className="flex justify-between text-red-600"><span>已退款</span><span>-{toMoney(order.refund_amount)}</span></div>
          ) : null}
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <span>净利润</span>
            <span className="text-[var(--theme-price)]">{toMoney(order.net_profit_amount)}</span>
          </div>
        </div>
        {order.cost_snapshot_source === "missing" || Number(order.missing_cost_item_count || 0) > 0 ? (
          <p className="mt-3 text-xs text-amber-700">部分商品缺少成本快照，毛利/净利润可能偏低，请核对商品成本后重算。</p>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-semibold">收货信息</h3>
        <div className="grid gap-2">
          <div><span className="text-muted-foreground">收货人：</span><span>{order.contact_name || "-"}</span></div>
          <div><span className="text-muted-foreground">联系电话：</span><span>{order.shipping_phone || order.contact_phone || "-"}</span></div>
          <div><span className="text-muted-foreground">收货地址：</span><span>{order.address || "-"}</span></div>
          <div><span className="text-muted-foreground">配送方式：</span><span>{order.shipping_name || "-"}</span></div>
          <div><span className="text-muted-foreground">物流单号：</span><span>{order.tracking_no || order.logistics_provider?.tracking_no || "-"}</span></div>
          <div><span className="text-muted-foreground">物流承运商：</span><span>{order.carrier || order.logistics_provider?.carrier || "-"}</span></div>
          {order.note ? <div><span className="text-muted-foreground">买家备注：</span><span>{order.note}</span></div> : null}
        </div>
      </div>
    </div>
  );
}
