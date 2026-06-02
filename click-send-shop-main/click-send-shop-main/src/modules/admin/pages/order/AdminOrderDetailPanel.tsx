import { AdminTableCell } from "@/components/admin/AdminTableCell";
import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchOrderById, applyShortageAdjustment, previewShortageAdjustment } from "@/services/admin/orderService";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { adminRealtimeQueryOptions } from "@/lib/adminRealtimeQueryOptions";
import { formatDateTime } from "@/utils/formatDateTime";
import { useAdminTOptional } from "@/hooks/useAdminT";
import { useAdminTabTitle } from "@/hooks/useAdminTabTitle";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { PaymentStatusBadge } from "@/components/admin/PaymentStatusBadge";
import { cn } from "@/lib/utils";
import type { Order, ShortageAdjustmentPreview, ShortageAdjustmentRequest } from "@/types/order";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

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

type DetailTab = "overview" | "items" | "finance" | "shipping" | "adjustments";

type AdminOrderDetailPanelProps = {
  orderId: string;
  embedded?: boolean;
  onBack?: () => void;
  onUpdated?: () => void | Promise<void>;
  enableTabTitle?: boolean;
  className?: string;
};

export default function AdminOrderDetailPanel({
  orderId,
  embedded = false,
  onBack,
  onUpdated,
  enableTabTitle = true,
  className,
}: AdminOrderDetailPanelProps) {
  const { locale } = useAdminTOptional();
  const isEn = locale === "en";
  const L = (zh: string, en: string) => (isEn ? en : zh);

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [shortageOpen, setShortageOpen] = useState(false);
  const [reason, setReason] = useState(L("仓库实际无货，已与客户沟通确认。", "The warehouse is actually out of stock and we have confirmed with the customer."));
  const [customerConfirmed, setCustomerConfirmed] = useState(true);
  const [confirmMethod, setConfirmMethod] = useState("whatsapp");
  const [confirmNote, setConfirmNote] = useState("");
  const [lineDrafts, setLineDrafts] = useState<Record<string, LineDraft>>({});
  const [preview, setPreview] = useState<ShortageAdjustmentPreview | null>(null);

  useEffect(() => {
    setActiveTab("overview");
    setShortageOpen(false);
    setPreview(null);
  }, [orderId]);

  const orderQuery = useQuery({
    queryKey: adminQueryKeys.orderDetail(orderId),
    queryFn: () => fetchOrderById(orderId),
    enabled: !!orderId,
    ...adminRealtimeQueryOptions.order,
  });

  const order = orderQuery.data ?? null;
  const loading = orderQuery.isLoading && !orderQuery.data;

  const tabTitle = order?.order_no
    ? L(`订单：${order.order_no}`, `Order: ${order.order_no}`)
    : orderId
      ? L(`订单 #${orderId}`, `Order #${orderId}`)
      : null;
  useAdminTabTitle(tabTitle, enableTabTitle && !loading && Boolean(order));

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
    return {
      reason,
      customer_confirmed: customerConfirmed,
      customer_confirm_method: confirmMethod,
      customer_confirm_note: confirmNote,
      stock_handling: items.some((item) => item.correct_stock_zero) ? "correct_zero" : "no_restore",
      items,
    };
  };

  const previewMutation = useMutation({
    mutationFn: () => previewShortageAdjustment(orderId, buildPayload()),
    onSuccess: (data) => setPreview(data),
    onError: (e) => toast.error(e instanceof Error ? e.message : L("预览失败", "Preview failed")),
  });

  const applyMutation = useMutation({
    mutationFn: () => applyShortageAdjustment(orderId, buildPayload()),
    onSuccess: async () => {
      toast.success(L("订单缺货调整已生成", "Shortage adjustment has been created"));
      setShortageOpen(false);
      setPreview(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.orderDetail(orderId) }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.ordersRoot() }),
      ]);
      await onUpdated?.();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : L("调整失败", "Adjustment failed")),
  });

  const openShortageDialog = () => {
    if (!order) return;
    const drafts = Object.fromEntries((order.items || []).map((item) => {
      const itemId = item.order_item_id || item.id || "";
      return [itemId, { after_qty: Number(item.qty || 0), shortage_reason: "", correct_stock_zero: false }];
    }).filter(([itemId]) => itemId));
    setLineDrafts(drafts);
    setPreview(null);
    setShortageOpen(true);
  };

  if (loading) {
    return <div className={cn("p-4 text-sm text-muted-foreground", !embedded && "p-6", className)}>{L("加载中...", "Loading...")}</div>;
  }

  if (!order) {
    return <div className={cn("p-4 text-sm text-muted-foreground", !embedded && "p-6", className)}>{L("订单不存在", "Order not found")}</div>;
  }

  const payableAmount = Number(order.payable_amount ?? order.total_amount ?? 0);
  const paidAmount = Number(order.paid_amount ?? (["paid", "partially_refunded", "refunded"].includes(order.payment_status || "") ? payableAmount : 0));
  const discountAmount = Number(order.total_discount_amount ?? (
    Number(order.discount_amount || 0)
    + Number(order.points_discount_amount || 0)
    + Number(order.reward_cash_discount_amount || 0)
    + Number(order.shipping_discount_amount || 0)
  ));
  const itemsCount = order.items_count || order.items?.reduce((sum, item) => sum + Number(item.qty || 0), 0) || 0;
  const tabs = buildTabs(order, L);

  const renderOverview = () => (
    <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
      <InfoCard title={L("订单信息", "Order info")}>
        <DetailLine label={L("订单号", "Order no")} value={<span className="font-mono">{order.order_no}</span>} />
        <DetailLine label={L("下单时间", "Created at")} value={order.created_at ? formatDateTime(order.created_at) : "-"} />
        <DetailLine label={L("支付方式", "Payment method")} value={order.payment_method || "-"} />
        <DetailLine label={L("支付渠道", "Payment channel")} value={order.payment_channel || "-"} />
        <DetailLine label={L("支付时间", "Paid at")} value={order.payment_time || order.paid_at ? formatDateTime(order.payment_time || order.paid_at || "") : "-"} />
        <DetailLine label={L("交易号", "Transaction no")} value={order.payment_transaction_no || "-"} />
      </InfoCard>
      <InfoCard title={L("客户信息", "Customer info")}>
        <DetailLine label={L("客户昵称", "Nickname")} value={order.user_nickname || "-"} />
        <DetailLine label={L("会员等级", "Member level")} value={order.member_level_name || "-"} />
        <DetailLine label={L("邮箱", "Email")} value={order.user_email || "-"} />
        <DetailLine label={L("手机", "Phone")} value={order.user_phone_masked || order.contact_phone_masked || order.shipping_phone_masked || "-"} />
        <DetailLine label={L("历史订单", "Orders")} value={order.user_order_count ?? "-"} />
        <DetailLine label={L("历史实付", "Total paid")} value={order.user_total_paid_amount !== undefined ? toMoney(order.user_total_paid_amount) : "-"} />
      </InfoCard>
      <InfoCard title={L("履约状态", "Fulfillment")} className="xl:col-span-2">
        <div className="grid gap-2 md:grid-cols-3">
          <StatusBlock label={L("订单状态", "Order status")} value={<OrderStatusBadge status={order.status} />} />
          <StatusBlock label={L("支付状态", "Payment status")} value={<PaymentStatusBadge status={order.payment_status || "pending"} />} />
          <StatusBlock label={L("售后数量", "After-sales")} value={order.return_request_count || 0} />
          <StatusBlock label={L("退款状态", "Refund status")} value={order.refund_status || order.after_sale_status || "-"} />
          <StatusBlock label={L("付款截止", "Payment deadline")} value={order.payment_deadline_at ? formatDateTime(order.payment_deadline_at) : "-"} />
          <StatusBlock label={L("自动确认截止", "Auto receive deadline")} value={order.auto_confirm_receive_deadline_at ? formatDateTime(order.auto_confirm_receive_deadline_at) : "-"} />
        </div>
        {order.shortage_notice ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{order.shortage_notice}</p>
        ) : null}
      </InfoCard>
    </div>
  );

  const renderItems = () => (
    <InfoCard
      title={L("商品信息", "Items")}
      action={canAdjustShortage(order) ? (
        <UnifiedButton
          type="button"
          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-medium text-amber-800 transition hover:bg-amber-100"
          onClick={openShortageDialog}
        >
          {L("缺货处理", "Handle shortage")}
        </UnifiedButton>
      ) : null}
    >
      <div className="space-y-2">
        {(order.items || []).map((item) => {
          const itemKey = item.order_item_id || item.id || `${item.product?.id || "product"}-${item.variant_id || "default"}`;
          const lineTotal = Number(item.subtotal ?? Number(item.unit_price || 0) * Number(item.qty || 0));
          return (
            <div key={itemKey} className="grid gap-3 rounded-xl border border-border bg-background/50 p-3 md:grid-cols-[4rem_minmax(0,1fr)_7rem_7rem] md:items-center">
              <img src={item.product?.cover_image || ""} alt={item.product?.name || "product"} className="h-16 w-16 rounded-lg bg-secondary object-cover" />
              <div className="min-w-0">
                <AdminTableCell value={item.product?.name || "-"} fullText={item.product?.name || ""} maxWidth="100%" />
                <p className="mt-1 text-xs text-muted-foreground">{item.variant_name || item.sku_code || L("默认规格", "Default variant")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{L("系统库存：", "Stock: ")}{Number(item.product?.stock || 0)}</p>
              </div>
              <div className="text-xs text-muted-foreground md:text-right">
                <span className="block">{toMoney(item.unit_price || 0)}</span>
                <span className="block">x {item.qty}</span>
              </div>
              <div className="font-semibold md:text-right">{toMoney(lineTotal)}</div>
            </div>
          );
        })}
      </div>
    </InfoCard>
  );

  const renderFinance = () => (
    <div className="grid gap-3 xl:grid-cols-3">
      <InfoCard title={L("金额信息", "Amounts")}>
        <DetailLine label={L("商品金额", "Item subtotal")} value={toMoney(order.raw_amount)} />
        <DetailLine label={L("优惠金额", "Discount")} value={`-${toMoney(discountAmount)}`} />
        <DetailLine label={L("运费收入", "Shipping income")} value={toMoney(order.shipping_fee)} />
        <DetailLine label={L("应付金额", "Payable")} value={toMoney(payableAmount)} strong />
        <DetailLine label={L("实付金额", "Paid")} value={toMoney(paidAmount)} strong accent />
        {Number(order.refund_amount || 0) > 0 ? (
          <DetailLine label={L("已退款", "Refunded")} value={`-${toMoney(order.refund_amount)}`} danger />
        ) : null}
      </InfoCard>
      <InfoCard title={L("利润拆解", "Profit breakdown")}>
        <DetailLine label={L("商品成本", "Item cost")} value={toMoney(order.goods_cost_amount)} />
        <DetailLine label={L("商品毛利", "Gross profit")} value={toMoney(order.gross_profit_amount)} />
        <DetailLine label={L("物流成本", "Logistics cost")} value={`-${toMoney(order.shipping_cost_amount)}`} />
        <DetailLine label={L("支付手续费", "Payment fee")} value={`-${toMoney(order.payment_fee_amount)}`} />
        <DetailLine label={L("净利润", "Net profit")} value={toMoney(order.net_profit_amount)} strong accent />
        {order.gross_margin !== undefined ? (
          <DetailLine label={L("毛利率", "Gross margin")} value={`${Number(order.gross_margin || 0).toFixed(2)}%`} />
        ) : null}
      </InfoCard>
      <InfoCard title={L("优惠拆分", "Discount breakdown")}>
        <DetailLine label={L("活动优惠", "Activity")} value={toMoney(order.activity_discount_amount)} />
        <DetailLine label={L("优惠券", "Coupon")} value={toMoney(order.coupon_discount_amount || order.coupon_discount)} />
        <DetailLine label={L("积分抵扣", "Points")} value={toMoney(order.points_discount_amount)} />
        <DetailLine label={L("余额抵扣", "Reward cash")} value={toMoney(order.reward_cash_discount_amount)} />
        <DetailLine label={L("运费减免", "Shipping discount")} value={toMoney(order.shipping_discount_amount)} />
        {order.cost_snapshot_source === "missing" || Number(order.missing_cost_item_count || 0) > 0 ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {L("部分商品缺少成本快照，毛利 / 净利润可能偏低。", "Some items are missing cost snapshots, so gross/net profit may be lower than expected.")}
          </p>
        ) : null}
      </InfoCard>
    </div>
  );

  const renderShipping = () => (
    <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
      <InfoCard title={L("收货信息", "Shipping info")}>
        <DetailLine label={L("收货人", "Recipient")} value={order.contact_name || "-"} />
        <DetailLine label={L("联系电话", "Phone")} value={order.shipping_phone || order.contact_phone || "-"} />
        <DetailLine label={L("收货地址", "Address")} value={order.address || "-"} wide />
        <DetailLine label={L("配送方式", "Shipping method")} value={order.shipping_name || "-"} />
        <DetailLine label={L("物流单号", "Tracking no")} value={order.tracking_no || order.logistics_provider?.tracking_no || "-"} />
        <DetailLine label={L("承运商", "Carrier")} value={order.carrier || order.logistics_provider?.carrier || "-"} />
      </InfoCard>
      <InfoCard title={L("时间节点", "Timeline")}>
        <DetailLine label={L("下单时间", "Created at")} value={order.created_at ? formatDateTime(order.created_at) : "-"} />
        <DetailLine label={L("支付时间", "Paid at")} value={order.payment_time || order.paid_at ? formatDateTime(order.payment_time || order.paid_at || "") : "-"} />
        <DetailLine label={L("发货时间", "Shipped at")} value={order.shipped_at ? formatDateTime(order.shipped_at) : "-"} />
        <DetailLine label={L("完成时间", "Completed at")} value={order.completed_at ? formatDateTime(order.completed_at) : "-"} />
        <DetailLine label={L("取消时间", "Cancelled at")} value={order.cancelled_at ? formatDateTime(order.cancelled_at) : "-"} />
        {order.note ? <DetailLine label={L("买家备注", "Buyer note")} value={order.note} wide /> : null}
      </InfoCard>
      {order.logistics_timeline?.length ? (
        <InfoCard title={L("物流轨迹", "Logistics timeline")} className="xl:col-span-2">
          <div className="space-y-2">
            {order.logistics_timeline.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{item.title || item.status || "-"}</span>
                  <span className="text-muted-foreground">{item.event_time ? formatDateTime(item.event_time) : "-"}</span>
                </div>
                <p className="mt-1 text-muted-foreground">{item.description || item.location || "-"}</p>
              </div>
            ))}
          </div>
        </InfoCard>
      ) : null}
    </div>
  );

  const renderAdjustments = () => (
    <InfoCard title={L("订单调整记录", "Adjustment history")}>
      {(order.adjustments || []).length > 0 ? (
        <div className="space-y-3">
          {(order.adjustments || []).map((adjustment) => (
            <div key={adjustment.id} className="rounded-xl border border-border bg-background/50 p-3">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{adjustment.adjustment_no}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{adjustment.created_at ? formatDateTime(adjustment.created_at) : "-"}</p>
                </div>
                <div className="text-right text-xs">
                  <p>{L("退款：", "Refund: ")}<span className="font-semibold text-red-600">{toMoney(adjustment.refund_amount)}</span></p>
                  <p className="mt-1 text-muted-foreground">{L("客户确认：", "Customer confirm: ")}{adjustment.customer_confirm_method || "-"}</p>
                </div>
              </div>
              <div className="grid gap-2 text-xs md:grid-cols-2">
                <DetailLine label={L("原金额", "Before")} value={toMoney(adjustment.before_amount?.total_amount)} />
                <DetailLine label={L("最新金额", "After")} value={toMoney(adjustment.after_amount?.total_amount)} />
                <DetailLine label={L("操作人", "Operator")} value={adjustment.operator_id || "-"} />
                <DetailLine label={L("原因", "Reason")} value={adjustment.reason || "-"} />
              </div>
              <div className="mt-3 space-y-1 text-xs">
                {(adjustment.items || []).map((item) => (
                  <div key={item.id} className="rounded bg-secondary/60 px-2 py-1">
                    {item.product_name_snapshot} {item.variant_name_snapshot || item.sku_code || ""}，{item.before_qty} → {item.after_qty}
                    {item.line_refund_amount > 0 ? `，${L("退款", "refund")} ${toMoney(item.line_refund_amount)}` : ""}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{L("暂无调整记录", "No adjustment history")}</p>
      )}
    </InfoCard>
  );

  return (
    <div className={cn("space-y-3 text-sm", !embedded && "p-6", className)}>
      {!embedded ? (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{L("订单详情", "Order details")}</h2>
          {onBack ? (
            <UnifiedButton className="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:bg-secondary" onClick={onBack}>
              {L("返回列表", "Back to list")}
            </UnifiedButton>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="truncate font-mono text-base font-semibold text-[var(--theme-price)]">{order.order_no}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={order.status} />
              <PaymentStatusBadge status={order.payment_status || "pending"} />
              {order.has_shortage_adjustment ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                  {L("有缺货调整", "Shortage adjusted")}
                </span>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[34rem]">
            <MetricCard label={L("实付", "Paid")} value={toMoney(paidAmount)} accent />
            <MetricCard label={L("应付", "Payable")} value={toMoney(payableAmount)} />
            <MetricCard label={L("商品", "Items")} value={`${itemsCount} ${L("件", "pcs")}`} />
            <MetricCard label={L("净利润", "Net profit")} value={toMoney(order.net_profit_amount)} />
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-10 bg-[var(--theme-surface)]/95 py-2 backdrop-blur">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
          {tabs.map((tab) => (
            <UnifiedButton
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "min-h-9 shrink-0 rounded-lg px-3 text-xs font-medium transition sm:flex-1",
                activeTab === tab.key
                  ? "bg-[var(--theme-price)] text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {tab.label}
            </UnifiedButton>
          ))}
        </div>
      </div>

      {activeTab === "overview" ? renderOverview() : null}
      {activeTab === "items" ? renderItems() : null}
      {activeTab === "finance" ? renderFinance() : null}
      {activeTab === "shipping" ? renderShipping() : null}
      {activeTab === "adjustments" ? renderAdjustments() : null}

      {shortageOpen ? (
        <ShortageAdjustmentDialog
          L={L}
          order={order}
          lineDrafts={lineDrafts}
          setLineDrafts={setLineDrafts}
          reason={reason}
          setReason={setReason}
          customerConfirmed={customerConfirmed}
          setCustomerConfirmed={setCustomerConfirmed}
          confirmMethod={confirmMethod}
          setConfirmMethod={setConfirmMethod}
          confirmNote={confirmNote}
          setConfirmNote={setConfirmNote}
          preview={preview}
          setPreview={setPreview}
          previewing={previewMutation.isPending}
          applying={applyMutation.isPending}
          onPreview={() => previewMutation.mutate()}
          onApply={() => applyMutation.mutate()}
          onClose={() => setShortageOpen(false)}
        />
      ) : null}
    </div>
  );
}

function buildTabs(order: Order, L: (zh: string, en: string) => string): Array<{ key: DetailTab; label: string }> {
  return [
    { key: "overview", label: L("概览", "Overview") },
    { key: "items", label: L(`商品 ${order.items?.length || 0}`, `Items ${order.items?.length || 0}`) },
    { key: "finance", label: L("金额/利润", "Finance") },
    { key: "shipping", label: L("收货/物流", "Shipping") },
    { key: "adjustments", label: L(`调整记录 ${order.adjustments?.length || 0}`, `Adjustments ${order.adjustments?.length || 0}`) },
  ];
}

function InfoCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-3", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function DetailLine({
  label,
  value,
  strong,
  accent,
  danger,
  wide,
}: {
  label: ReactNode;
  value: ReactNode;
  strong?: boolean;
  accent?: boolean;
  danger?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={cn("grid gap-1 py-1 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]", wide && "sm:grid-cols-[7rem_minmax(0,1fr)]")}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("min-w-0 break-words text-foreground", strong && "font-semibold", accent && "text-[var(--theme-price)]", danger && "text-red-600")}>
        {value}
      </span>
    </div>
  );
}

function StatusBlock({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div className="mt-1 font-medium text-foreground">{value}</div>
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 px-3 py-2">
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("mt-1 truncate text-sm font-semibold text-foreground", accent && "text-[var(--theme-price)]")}>{value}</p>
    </div>
  );
}

function ShortageAdjustmentDialog({
  L,
  order,
  lineDrafts,
  setLineDrafts,
  reason,
  setReason,
  customerConfirmed,
  setCustomerConfirmed,
  confirmMethod,
  setConfirmMethod,
  confirmNote,
  setConfirmNote,
  preview,
  setPreview,
  previewing,
  applying,
  onPreview,
  onApply,
  onClose,
}: {
  L: (zh: string, en: string) => string;
  order: Order;
  lineDrafts: Record<string, LineDraft>;
  setLineDrafts: Dispatch<SetStateAction<Record<string, LineDraft>>>;
  reason: string;
  setReason: (value: string) => void;
  customerConfirmed: boolean;
  setCustomerConfirmed: (value: boolean) => void;
  confirmMethod: string;
  setConfirmMethod: (value: string) => void;
  confirmNote: string;
  setConfirmNote: (value: string) => void;
  preview: ShortageAdjustmentPreview | null;
  setPreview: (value: ShortageAdjustmentPreview | null) => void;
  previewing: boolean;
  applying: boolean;
  onPreview: () => void;
  onApply: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/45 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border p-4">
          <div>
            <h3 className="text-base font-semibold">{L("缺货处理 / 修改订单商品", "Handle shortage / edit items")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{L("只允许删除或减少商品数量，不会回补库存。", "Only deleting or reducing quantities is allowed. No stock will be restored.")}</p>
          </div>
          <UnifiedButton type="button" className="rounded-lg border border-border px-3 py-1.5 text-xs transition hover:bg-secondary" onClick={onClose}>{L("关闭", "Close")}</UnifiedButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <label className="text-xs">
              <span className="mb-1 block text-muted-foreground">{L("调整原因", "Reason")}</span>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2" />
            </label>
            <div className="grid gap-3">
              <label className="text-xs">
                <span className="mb-1 block text-muted-foreground">{L("客户确认方式", "Customer confirm method")}</span>
                <input
                  value={confirmMethod}
                  onChange={(e) => setConfirmMethod(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2"
                  placeholder="whatsapp / phone / email"
                />
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={customerConfirmed} onChange={(e) => setCustomerConfirmed(e.target.checked)} />
                <span>{L("已与客户确认", "Confirmed with customer")}</span>
              </label>
            </div>
            <label className="text-xs md:col-span-2">
              <span className="mb-1 block text-muted-foreground">{L("客户确认备注", "Customer confirm note")}</span>
              <input
                value={confirmNote}
                onChange={(e) => setConfirmNote(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                placeholder={L("例如：客户同意删除缺货商品并继续发货", "For example: customer agreed to remove the shortage item and continue shipping")}
              />
            </label>
          </div>

          <div className="space-y-3">
            {(order.items || []).map((item) => {
              const itemId = item.order_item_id || item.id || "";
              const draft = lineDrafts[itemId] || { after_qty: Number(item.qty || 0), shortage_reason: "", correct_stock_zero: false };
              const beforeQty = Number(item.qty || 0);
              return (
                <div key={itemId} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[1fr_7rem_8rem_1fr]">
                  <div className="min-w-0">
                    <AdminTableCell value={item.product?.name || "-"} fullText={item.product?.name || ""} maxWidth="100%" />
                    <p className="mt-1 text-xs text-muted-foreground">{item.variant_name || item.sku_code || L("默认规格", "Default variant")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{L("当前系统库存：", "Current stock: ")}{Number(item.product?.stock || 0)}</p>
                  </div>
                  <div className="text-xs">
                    <span className="mb-1 block text-muted-foreground">{L("原数量", "Original qty")}</span>
                    <span className="font-semibold">{beforeQty}</span>
                  </div>
                  <label className="text-xs">
                    <span className="mb-1 block text-muted-foreground">{L("处理后数量", "Adjusted qty")}</span>
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
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5"
                    />
                    <UnifiedButton
                      type="button"
                      className="mt-1 text-xs text-red-600 underline"
                      onClick={() => {
                        setLineDrafts((prev) => ({ ...prev, [itemId]: { ...draft, after_qty: 0 } }));
                        setPreview(null);
                      }}
                    >
                      {L("删除该商品", "Remove this item")}
                    </UnifiedButton>
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block text-muted-foreground">{L("缺货原因", "Shortage reason")}</span>
                    <input
                      value={draft.shortage_reason}
                      onChange={(e) => {
                        setLineDrafts((prev) => ({ ...prev, [itemId]: { ...draft, shortage_reason: e.target.value } }));
                        setPreview(null);
                      }}
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5"
                      placeholder={L("仓库实际无货", "Warehouse out of stock")}
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
                      <span>{L("将该 SKU 库存校正为 0", "Correct this SKU stock to 0")}</span>
                    </label>
                  </label>
                </div>
              );
            })}
          </div>

          {preview ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="mb-2 font-semibold">{L("金额预览", "Amount preview")}</p>
              <div className="grid gap-2 md:grid-cols-3">
                <div>{L("原订单金额：", "Before: ")}{toMoney(preview.before_amount.total_amount)}</div>
                <div>{L("最新订单金额：", "After: ")}{toMoney(preview.after_amount.total_amount)}</div>
                <div>{L("应退款：", "Refund: ")}{toMoney(preview.refund_amount)}</div>
              </div>
              <p className="mt-2">{preview.notice}</p>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border p-4">
          <UnifiedButton
            type="button"
            className="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:bg-secondary"
            disabled={previewing}
            onClick={onPreview}
          >
            {previewing ? L("预览中...", "Previewing...") : L("预览最新金额", "Preview latest amount")}
          </UnifiedButton>
          <UnifiedButton
            type="button"
            className="rounded-lg bg-[var(--theme-price)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
            disabled={applying}
            onClick={onApply}
          >
            {applying ? L("生成中...", "Generating...") : L("生成最新订单", "Generate latest order")}
          </UnifiedButton>
        </div>
      </div>
    </div>
  );
}
