import { useEffect, useMemo, useState } from "react";
import { Download, Package, Truck } from "lucide-react";
import { formatDateTime } from "@/utils/formatDateTime";
import { AnimatedTable } from "@/modules/micro-interactions";
import { useNavigate } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import { toast } from "sonner";
import * as orderService from "@/services/admin/orderService";
import PermissionGate from "@/components/admin/PermissionGate";
import type { Order, PaymentStatus } from "@/types/order";
import { useAdminOrdersStore } from "@/stores/useAdminOrdersStore";
import { Tx } from "@/components/admin/AdminText";
import { toastErrorMessage } from "@/utils/errorMessage";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  ORDER_STATUS_FILTER_OPTIONS,
  PAYMENT_STATUS_FILTER_OPTIONS,
  getOrderStatusBadgeClass,
  getOrderStatusLabel,
  getPaymentStatusBadgeClass,
  getPaymentStatusLabel,
} from "@/constants/statusDictionary";
import { THEME_OUTLINE_DANGER, THEME_OUTLINE_PRIMARY, THEME_OUTLINE_SUCCESS } from "@/utils/themeVisuals";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import AdminShipOrderDialog from "@/modules/admin/components/AdminShipOrderDialog";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import {
  buildOrderFilterChips,
  hasActiveOrderFilters,
  removeOrderFilterChip,
} from "@/utils/adminOrderFilters";
import { maskPhone } from "@/utils/privacyMask";

function money(value: unknown): string {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function shortId(value?: string): string {
  const raw = String(value || "");
  return raw ? raw.slice(-6) : "-";
}

function getFirstItemSummary(items?: Order["items"]): string {
  const first = items?.[0];
  if (!first) return "-";
  const name = first.product?.name || "商品";
  const suffix = items && items.length > 1 ? `，另 ${items.length - 1} 件` : "";
  return `${name} ×${first.qty}${suffix}`;
}

function buildOrderBadges(order: Order): string[] {
  if (Array.isArray(order.risk_badges) && order.risk_badges.length) return order.risk_badges;
  const badges: string[] = [];
  if (order.note) badges.push("买家备注");
  if ((order.active_return_count || 0) > 0) badges.push("售后中");
  if (Number(order.refund_amount || 0) > 0) badges.push("有退款");
  if (order.cost_snapshot_source === "missing" || Number(order.missing_cost_item_count || 0) > 0) badges.push("缺成本");
  if (Number(order.total_amount || 0) >= 500) badges.push("高金额");
  return badges;
}

function afterSaleLabel(order: Order): { text: string; className: string } {
  if ((order.active_return_count || 0) > 0) return { text: "售后中", className: "bg-amber-100 text-amber-700" };
  if (Number(order.refund_amount || 0) > 0 || order.payment_status === "refunded") return { text: "已退款", className: "bg-red-100 text-red-700" };
  if (order.payment_status === "partially_refunded") return { text: "部分退款", className: "bg-orange-100 text-orange-700" };
  return { text: "无售后", className: "bg-slate-100 text-slate-600" };
}

const paymentMethodOptions = [
  { value: "", label: "全部支付方式" },
  { value: "online", label: "Online" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "reward_wallet", label: "返现余额" },
];

const shippingOptions = [
  { value: "", label: "全部配送方式" },
  { value: "J&T Express", label: "J&T Express" },
  { value: "DHL", label: "DHL" },
  { value: "Self Pickup", label: "自提" },
];

export default function AdminOrders() {
  const navigate = useNavigate();
  const { confirm } = useAdminConfirm();
  const [shipTarget, setShipTarget] = useState<{ id: string; orderNo: string } | null>(null);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const {
    orders,
    loading,
    statusFilter,
    paymentFilter,
    search,
    dateFrom,
    dateTo,
    paymentMethod,
    paymentChannel,
    shippingName,
    returnStatus,
    refundStatus,
    hasNote,
    costStatus,
    overduePayment,
    overdueShipment,
    buyerType,
    amountMin,
    amountMax,
    page,
    pageSize,
    total,
    summary,
    setStatusFilter,
    setPaymentFilter,
    setSearch,
    setDateFrom,
    setDateTo,
    setPaymentMethod,
    setPaymentChannel,
    setShippingName,
    setReturnStatus,
    setRefundStatus,
    setHasNote,
    setCostStatus,
    setOverduePayment,
    setOverdueShipment,
    setBuyerType,
    setAmountMin,
    setAmountMax,
    setPage,
    setPageSize,
    loadOrders,
    clearFilters,
    reset,
  } = useAdminOrdersStore();

  const filterState = {
    statusFilter,
    paymentFilter,
    search,
    dateFrom,
    dateTo,
    paymentMethod,
    paymentChannel,
    shippingName,
    returnStatus,
    refundStatus,
    hasNote,
    costStatus,
    overduePayment,
    overdueShipment,
    buyerType,
    amountMin,
    amountMax,
  };
  const filterChips = useMemo(() => buildOrderFilterChips(filterState), [filterState]);
  const filtersActive = hasActiveOrderFilters(filterState);
  const ordersEmptyGuide = filtersActive ? ADMIN_EMPTY_GUIDES.ordersFiltered : ADMIN_EMPTY_GUIDES.orders;

  useEffect(() => {
    void loadOrders().catch((e) => toast.error(toastErrorMessage(e, "加载订单失败")));
  }, [
    statusFilter,
    paymentFilter,
    search,
    dateFrom,
    dateTo,
    paymentMethod,
    paymentChannel,
    shippingName,
    returnStatus,
    refundStatus,
    hasNote,
    costStatus,
    overduePayment,
    overdueShipment,
    buyerType,
    amountMin,
    amountMax,
    page,
    pageSize,
    loadOrders,
  ]);

  useEffect(() => () => reset(), [reset]);

  const stats = useMemo(
    () => [
      { label: "待付款", value: summary.pending, status: ORDER_STATUS.PENDING, sub: `RM ${money(summary.pending_payment_amount)}` },
      { label: "待发货", value: summary.pending_shipment_count ?? summary.paid, status: ORDER_STATUS.PAID, sub: `RM ${money(summary.pending_shipment_amount)}` },
      { label: "售后中", value: summary.active_return_count ?? summary.refunding, status: ORDER_STATUS.REFUNDING, sub: `退款 RM ${money(summary.today_refund_amount)}` },
      { label: "今日订单", value: summary.today_order_count ?? 0, status: "", sub: `${summary.today_paid_order_count ?? 0} 单已支付` },
      { label: "今日实收", value: `RM ${money(summary.today_paid_amount)}`, status: "", sub: "按支付时间" },
      { label: "今日毛利", value: `RM ${money(summary.today_gross_profit_amount)}`, status: "", sub: "商品毛利" },
      { label: "今日净利润", value: `RM ${money(summary.today_net_profit_amount ?? summary.today_gross_profit_amount)}`, status: "", sub: "含物流/手续费" },
    ],
    [summary],
  );

  const applyQuickStatusFilter = (status: string) => {
    if (!status) return;
    setStatusFilter(statusFilter === status ? "" : status);
    setPage(1);
  };

  const handleRemoveFilterChip = (key: string) => {
    const patch = removeOrderFilterChip(filterState, key);
    if ("search" in patch) setSearch(patch.search ?? "");
    if ("statusFilter" in patch) setStatusFilter(patch.statusFilter ?? "");
    if ("paymentFilter" in patch) setPaymentFilter(patch.paymentFilter ?? "");
    if ("dateFrom" in patch) setDateFrom(patch.dateFrom ?? "");
    if ("dateTo" in patch) setDateTo(patch.dateTo ?? "");
    if ("amountMin" in patch) setAmountMin(patch.amountMin ?? "");
    if ("amountMax" in patch) setAmountMax(patch.amountMax ?? "");
    if ("paymentMethod" in patch) setPaymentMethod(patch.paymentMethod ?? "");
    if ("paymentChannel" in patch) setPaymentChannel(patch.paymentChannel ?? "");
    if ("shippingName" in patch) setShippingName(patch.shippingName ?? "");
    if ("returnStatus" in patch) setReturnStatus((patch.returnStatus ?? "") as "" | "none" | "active" | "any");
    if ("refundStatus" in patch) setRefundStatus(patch.refundStatus ?? "");
    if ("hasNote" in patch) setHasNote((patch.hasNote ?? "") as "" | "1" | "0");
    if ("costStatus" in patch) setCostStatus((patch.costStatus ?? "") as "" | "normal" | "missing");
    if ("overduePayment" in patch) setOverduePayment((patch.overduePayment ?? "") as "" | "1" | "0");
    if ("overdueShipment" in patch) setOverdueShipment((patch.overdueShipment ?? "") as "" | "1" | "0");
    if ("buyerType" in patch) setBuyerType((patch.buyerType ?? "") as "" | "new" | "repeat");
    setPage(1);
  };

  const currentQuery = () => ({
    status: statusFilter || undefined,
    paymentStatus: paymentFilter || undefined,
    keyword: search.trim() || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    payment_method: paymentMethod || undefined,
    payment_channel: paymentChannel || undefined,
    shipping_name: shippingName || undefined,
    returnStatus: returnStatus || undefined,
    refundStatus: refundStatus || undefined,
    hasNote: hasNote || undefined,
    costStatus: costStatus || undefined,
    overduePayment: overduePayment || undefined,
    overdueShipment: overdueShipment || undefined,
    buyerType: buyerType || undefined,
    amountMin: amountMin ? Number(amountMin) : undefined,
    amountMax: amountMax ? Number(amountMax) : undefined,
  });

  const handleExportCsv = async () => {
    try {
      await orderService.exportOrdersCsv(currentQuery());
      toast.success("已开始下载 CSV");
    } catch (e) {
      toast.error(toastErrorMessage(e, "导出失败"));
    }
  };

  const reloadAfterAction = async (message: string) => {
    await loadOrders();
    toast.success(message);
  };

  const confirmStatusChange = (
    orderId: string,
    nextStatus: string,
    title: string,
    description: string,
    successMessage: string,
    danger = false,
  ) => {
    confirm({
      title,
      description,
      confirmText: title,
      danger,
      onConfirm: async () => {
        try {
          await orderService.updateOrderStatus(orderId, nextStatus);
          await reloadAfterAction(successMessage);
        } catch (e) {
          toast.error(toastErrorMessage(e, "订单操作失败"));
        }
      },
    });
  };

  const renderActions = (o: Order) => {
    if (o.status === ORDER_STATUS.PENDING) {
      return (
        <div className="flex gap-2">
          <PermissionGate permission="payment.manage">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                confirmStatusChange(o.id, ORDER_STATUS.PAID, "确认收款", `确定将订单「${o.order_no}」标记为已付款？`, "订单已确认收款");
              }}
              className={`rounded-md px-2 py-1 text-[11px] ${THEME_OUTLINE_SUCCESS}`}
            >
              确认收款
            </button>
          </PermissionGate>
          <PermissionGate permission="order.update">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                confirmStatusChange(o.id, ORDER_STATUS.CANCELLED, "取消订单", `确定取消订单「${o.order_no}」？取消后会释放库存并回滚相关权益。`, "订单已取消", true);
              }}
              className={`rounded-md px-2 py-1 text-[11px] ${THEME_OUTLINE_DANGER}`}
            >
              取消订单
            </button>
          </PermissionGate>
        </div>
      );
    }

    if (o.status === ORDER_STATUS.PAID) {
      return (
        <PermissionGate permission="order.ship">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShipTarget({ id: o.id, orderNo: o.order_no });
            }}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] ${THEME_OUTLINE_PRIMARY}`}
          >
            <Truck size={12} /> 发货
          </button>
        </PermissionGate>
      );
    }

    if (o.status === ORDER_STATUS.SHIPPED) {
      return (
        <PermissionGate permission="order.update">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              confirmStatusChange(o.id, ORDER_STATUS.COMPLETED, "标记完成", `确定将订单「${o.order_no}」标记为已完成？`, "订单已完成");
            }}
            className="rounded-md border border-[var(--theme-border)] px-2 py-1 text-[11px]"
          >
            标记完成
          </button>
        </PermissionGate>
      );
    }

    return <span className="text-xs text-muted-foreground">只读</span>;
  };

  const renderRow = (o: Order) => {
    const afterSale = afterSaleLabel(o);
    const badges = buildOrderBadges(o);
    const discount = Number(o.discount_amount || 0) + Number(o.points_discount_amount || 0) + Number(o.reward_cash_discount_amount || 0);
    const phone = o.shipping_phone_masked || o.contact_phone_masked || maskPhone(o.shipping_phone || o.contact_phone) || "-";
    const shippedWithoutTracking = o.status === ORDER_STATUS.SHIPPED && !o.tracking_no;

    return (
      <>
        <td className="px-4 py-3 align-top">
          <div className="font-mono text-xs text-foreground">{o.order_no}</div>
          <div className="text-[11px] text-muted-foreground">UID {shortId(o.user_id)}</div>
        </td>
        <td className="px-4 py-3 align-top text-foreground">
          <div className="font-medium">{o.user_nickname || "未命名用户"}</div>
          <div className="text-xs text-muted-foreground">收货人：{o.contact_name || "-"}</div>
          <div className="text-xs text-muted-foreground">电话：{phone}</div>
          <div className="text-[11px] text-muted-foreground">历史 {o.user_order_count || 0} 单{ o.member_level_name ? ` · ${o.member_level_name}` : ""}</div>
        </td>
        <td className="px-4 py-3 align-top">
          <div className="flex max-w-[260px] items-start gap-2">
            <Package size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <div className="max-w-[220px] truncate text-sm text-foreground" title={o.items_summary || undefined}>{o.items_summary || getFirstItemSummary(o.items)}</div>
              <div className="text-xs text-muted-foreground">{o.items_count || o.items?.reduce((sum, item) => sum + Number(item.qty || 0), 0) || 0} 件 / {o.sku_count || o.items?.length || 0} 个 SKU</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 align-top">
          <div className="font-semibold text-foreground">RM {money(o.total_amount)}</div>
          <div className="text-xs text-muted-foreground">优惠 RM {money(discount)}</div>
          {Number(o.refund_amount || 0) > 0 ? <div className="text-xs text-red-500">退款 RM {money(o.refund_amount)}</div> : null}
          {o.gross_profit_amount !== undefined ? <div className="text-xs text-muted-foreground">毛利 RM {money(o.gross_profit_amount)}</div> : null}
          {o.net_profit_amount !== undefined ? <div className="text-xs font-medium text-foreground">净利 RM {money(o.net_profit_amount)}</div> : null}
          {Number(o.shipping_cost_amount || 0) > 0 ? (
            <div className="text-[11px] text-muted-foreground">物流成本 RM {money(o.shipping_cost_amount)}</div>
          ) : null}
          {Number(o.payment_fee_amount || 0) > 0 ? (
            <div className="text-[11px] text-muted-foreground">手续费 RM {money(o.payment_fee_amount)}</div>
          ) : null}
        </td>
        <td className="px-4 py-3 align-top">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getPaymentStatusBadgeClass(o.payment_status || PAYMENT_STATUS.PENDING)}`}>{getPaymentStatusLabel(o.payment_status || PAYMENT_STATUS.PENDING)}</span>
          <div className="mt-1 text-xs text-muted-foreground">{o.payment_method || "-"}{o.payment_channel ? ` / ${o.payment_channel}` : ""}</div>
          <div className="text-[11px] text-muted-foreground">{formatDateTime(o.paid_at || o.payment_time || "") || "未支付"}</div>
        </td>
        <td className="px-4 py-3 align-top">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getOrderStatusBadgeClass(o.status)}`}>{getOrderStatusLabel(o.status)}</span>
          <div className="mt-1 text-xs text-muted-foreground">{o.shipping_name || o.carrier || "-"}</div>
          <div className={shippedWithoutTracking ? "text-[11px] text-red-500" : "text-[11px] text-muted-foreground"}>{shippedWithoutTracking ? "已发货但无单号" : (o.tracking_no || "无单号")}</div>
          <div className="text-[11px] text-muted-foreground">{formatDateTime(o.shipped_at || "") || "未发货"}</div>
        </td>
        <td className="px-4 py-3 align-top">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${afterSale.className}`}>{afterSale.text}</span>
          <div className="mt-1 text-xs text-muted-foreground">售后 {o.return_request_count || 0} 单</div>
          {Number(o.refund_amount || 0) > 0 ? <div className="text-xs text-red-500">RM {money(o.refund_amount)}</div> : null}
        </td>
        <td className="px-4 py-3 align-top">
          <div className="flex max-w-[160px] flex-wrap gap-1">
            {badges.length ? badges.map((badge) => <span key={badge} className="rounded-full bg-[var(--theme-bg)] px-2 py-0.5 text-[10px] text-muted-foreground">{badge}</span>) : <span className="text-xs text-muted-foreground">-</span>}
          </div>
        </td>
        <td className="px-4 py-3 align-top text-xs text-muted-foreground">{formatDateTime(o.created_at)}</td>
        <td className="px-4 py-3 align-top">{renderActions(o)}</td>
        <td className="px-4 py-3 align-top"><button type="button" onClick={() => navigate(`/admin/orders/${o.id}`)} className="text-xs text-[var(--theme-price)] hover:underline"><Tx>详情</Tx></button></td>
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-7">
        {stats.map((stat) => {
          const active = statusFilter === stat.status && !!stat.status;
          return (
            <button
              key={stat.label}
              type="button"
              onClick={() => applyQuickStatusFilter(stat.status)}
              className={`theme-rounded border p-3 text-left theme-shadow transition-colors ${
                active
                  ? "border-[var(--theme-price)] bg-[color-mix(in_srgb,var(--theme-price)_12%,var(--theme-surface))]"
                  : "border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-bg)]"
              }`}
            >
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{stat.sub}</p>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <SearchBar placeholder="搜索订单号、昵称、收货人、手机号、用户ID、物流单号" value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
        <AdminFilterSummaryBar chips={filterChips} onClearAll={() => clearFilters()} onRemove={handleRemoveFilterChip} />
        <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2">
          <button
            type="button"
            onClick={() => setAdvancedFiltersOpen((v) => !v)}
            className="w-full text-left text-sm font-medium text-foreground"
            aria-expanded={advancedFiltersOpen}
          >
            {advancedFiltersOpen ? "收起高级筛选" : "展开高级筛选"}
          </button>
          {advancedFiltersOpen ? (
            <div className="mt-3 space-y-2 border-t border-[var(--theme-border)] pt-3">
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                <SegmentedDateInput value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1); }} />
                <SegmentedDateInput value={dateTo} onChange={(v) => { setDateTo(v); setPage(1); }} />
                <input value={amountMin} onChange={(e) => { setAmountMin(e.target.value); setPage(1); }} placeholder="最低金额" className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm" />
                <input value={amountMax} onChange={(e) => { setAmountMax(e.target.value); setPage(1); }} placeholder="最高金额" className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm">
                  {ORDER_STATUS_FILTER_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value as "" | PaymentStatus); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm">
                  {PAYMENT_STATUS_FILTER_OPTIONS.map((s) => <option key={s.value || "all"} value={s.value}>{s.label}</option>)}
                </select>
                <select value={paymentMethod} onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm">
                  {paymentMethodOptions.map((s) => <option key={s.value || "all"} value={s.value}>{s.label}</option>)}
                </select>
                <input value={paymentChannel} onChange={(e) => { setPaymentChannel(e.target.value); setPage(1); }} placeholder="支付渠道" className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm" />
                <select value={shippingName} onChange={(e) => { setShippingName(e.target.value); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm">
                  {shippingOptions.map((s) => <option key={s.value || "all"} value={s.value}>{s.label}</option>)}
                </select>
                <select value={returnStatus} onChange={(e) => { setReturnStatus(e.target.value as "" | "none" | "active" | "any"); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm">
                  <option value="">全部售后</option>
                  <option value="none">无售后</option>
                  <option value="active">售后中</option>
                  <option value="any">有售后</option>
                </select>
                <select value={refundStatus} onChange={(e) => { setRefundStatus(e.target.value); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm">
                  <option value="">全部退款</option>
                  <option value="none">无退款</option>
                  <option value="partially_refunded">部分退款</option>
                  <option value="refunded">全额退款</option>
                </select>
                <select value={hasNote} onChange={(e) => { setHasNote(e.target.value as "" | "1" | "0"); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm">
                  <option value="">备注不限</option>
                  <option value="1">有买家备注</option>
                  <option value="0">无买家备注</option>
                </select>
                <select value={costStatus} onChange={(e) => { setCostStatus(e.target.value as "" | "normal" | "missing"); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm">
                  <option value="">成本不限</option>
                  <option value="normal">成本正常</option>
                  <option value="missing">缺成本</option>
                </select>
                <select value={overduePayment} onChange={(e) => { setOverduePayment(e.target.value as "" | "1" | "0"); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm">
                  <option value="">付款时效不限</option>
                  <option value="1">超时未支付</option>
                </select>
                <select value={overdueShipment} onChange={(e) => { setOverdueShipment(e.target.value as "" | "1" | "0"); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm">
                  <option value="">发货时效不限</option>
                  <option value="1">待发货超24h</option>
                </select>
                <select value={buyerType} onChange={(e) => { setBuyerType(e.target.value as "" | "new" | "repeat"); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm">
                  <option value="">全部客户</option>
                  <option value="new">新客</option>
                  <option value="repeat">老客</option>
                </select>
                <button type="button" onClick={handleExportCsv} className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-[var(--theme-border)] px-3 text-sm"><Download size={14} /> 导出</button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <AnimatedTable
        loading={loading}
        rows={orders}
        rowKey={(o) => o.id}
        skeletonRows={8}
        skeletonCols={11}
        className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow overflow-x-auto"
        tableClassName="w-full min-w-[1320px] text-sm"
        theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70"
        thead={(
          <tr>
            {["订单", "用户/收货人", "商品", "金额", "支付", "履约/物流", "售后", "标记", "创建时间", "操作", ""].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
            ))}
          </tr>
        )}
        footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />}
        emptyIcon={ordersEmptyGuide.icon}
        emptyTitle={ordersEmptyGuide.title}
        emptyDescription={ordersEmptyGuide.description}
        emptyAction={<AdminEmptyGuideActions guide={ordersEmptyGuide} showClearFilters={filtersActive} onClearFilters={() => clearFilters()} />}
        renderRow={renderRow}
      />

      <AdminShipOrderDialog
        open={!!shipTarget}
        orderNo={shipTarget?.orderNo ?? ""}
        onOpenChange={(open) => !open && setShipTarget(null)}
        onConfirm={async (trackingNo, carrier, shippingCostAmount) => {
          if (!shipTarget) return;
          try {
            await orderService.shipOrder(shipTarget.id, trackingNo, carrier, shippingCostAmount);
            await reloadAfterAction("订单已发货");
          } catch (e) {
            toast.error(toastErrorMessage(e, "发货失败"));
            throw e;
          }
        }}
      />
    </div>
  );
}
