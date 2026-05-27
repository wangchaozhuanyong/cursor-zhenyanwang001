import { Copy, Download, Loader2, Package, RefreshCw, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import PermissionGate from "@/components/admin/PermissionGate";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import AdminShipOrderDialog from "@/modules/admin/components/AdminShipOrderDialog";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
import { AnimatedTable } from "@/modules/micro-interactions";
import type { Order, PaymentStatus } from "@/types/order";
import { formatDateTime } from "@/utils/formatDateTime";
import { toastErrorMessage } from "@/utils/errorMessage";
import { maskPhone } from "@/utils/privacyMask";
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
} from "@/constants/statusDictionary";
import { PaymentStatusBadge } from "@/components/admin/PaymentStatusBadge";
import {
  AdminFilterButton,
  AdminFilterInput,
  AdminFilterSelect,
} from "@/components/admin/AdminFilterControls";
import {
  useAdminOrderStatusFilterOptions,
  useAdminPaymentStatusFilterOptions,
} from "@/hooks/useAdminStatusLabels";
import { THEME_OUTLINE_DANGER, THEME_OUTLINE_PRIMARY, THEME_OUTLINE_SUCCESS } from "@/utils/themeVisuals";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminRealtimeStatus } from "@/hooks/admin/useAdminEvents";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import {
  afterSaleLabel,
  buildOrderBadges,
  getFirstItemSummary,
  money,
} from "@/modules/admin/pages/order/orderListDisplayUtils";
import { useAdminOrders } from "@/modules/admin/pages/order/useAdminOrders";
import {
  adminTableAlignClass,
  type AdminTableAlign,
} from "@/utils/adminTableClasses";

const ORDER_COLUMN_ALIGNS: AdminTableAlign[] = [
  "left",
  "left",
  "left",
  "left",
  "right",
  "right",
  "right",
  "right",
  "center",
  "center",
  "center",
  "right",
];

export default function AdminOrders() {
  const navigate = useNavigate();
  const orderStatusFilterOptions = useAdminOrderStatusFilterOptions();
  const paymentStatusFilterOptions = useAdminPaymentStatusFilterOptions();
  const {
    tText,
    shipTarget,
    setShipTarget,
    shipMutation,
    advancedFiltersOpen,
    setAdvancedFiltersOpen,
    statusFilter,
    setStatusFilter,
    paymentFilter,
    setPaymentFilter,
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    paymentMethod,
    setPaymentMethod,
    paymentChannel,
    setPaymentChannel,
    shippingName,
    setShippingName,
    returnStatus,
    setReturnStatus,
    refundStatus,
    setRefundStatus,
    hasNote,
    setHasNote,
    costStatus,
    setCostStatus,
    overduePayment,
    setOverduePayment,
    overdueShipment,
    setOverdueShipment,
    buyerType,
    setBuyerType,
    amountMin,
    setAmountMin,
    amountMax,
    setAmountMax,
    page,
    setPage,
    pageSize,
    setPageSize,
    paymentMethodOptionsLocalized,
    shippingOptionsLocalized,
    clearFilters,
    filterChips,
    filtersActive,
    handleRemoveFilterChip,
    applyQuickStatusFilter,
    orders,
    loading,
    refetch,
    isFetching,
    dataUpdatedAt,
    total,
    stats,
    ordersEmptyGuide,
    tableHeaders,
    selectedOrderIds,
    setSelectedOrderIds,
    toggleOrderSelection,
    togglePageSelection,
    allSelectedOnPage,
    someSelectedOnPage,
    exportingScope,
    handleExportCsv,
    handleExportSelectedCsv,
    confirmStatusChange,
    reloadAfterAction,
  } = useAdminOrders();
  const realtimeStatus = useAdminRealtimeStatus();
  const realtimeLabel = realtimeStatus.mode === "sse"
    ? tText("实时连接中")
    : realtimeStatus.mode === "polling"
      ? tText("轮询同步中")
      : tText("同步异常");
  const realtimeClassName = realtimeStatus.mode === "sse"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : realtimeStatus.mode === "polling"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-red-200 bg-red-50 text-red-700";
  const lastUpdatedText = dataUpdatedAt > 0 ? formatDateTime(new Date(dataUpdatedAt).toISOString()) : tText("尚未同步");

  const renderActions = (o: Order) => {
    if (o.status === ORDER_STATUS.PENDING) {
      return (
        <div className="flex gap-2">
          <PermissionGate permission="payment.manage">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                confirmStatusChange(o.id, ORDER_STATUS.PAID, tText("确认收款"), tText(`确定将订单「${o.order_no}」标记为已付款？`), tText("订单已确认收款"));
              }}
              className={`rounded-md px-2 py-1 text-[11px] ${THEME_OUTLINE_SUCCESS}`}
            >
              <Tx>确认收款</Tx>
            </button>
          </PermissionGate>
          <PermissionGate permission="order.update">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                confirmStatusChange(o.id, ORDER_STATUS.CANCELLED, tText("取消订单"), tText(`确定取消订单「${o.order_no}」？取消后会释放库存并回滚相关权益。`), tText("订单已取消"), true);
              }}
              className={`rounded-md px-2 py-1 text-[11px] ${THEME_OUTLINE_DANGER}`}
            >
              <Tx>取消订单</Tx>
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
            <Truck size={12} /> <Tx>发货</Tx>
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
              confirmStatusChange(o.id, ORDER_STATUS.COMPLETED, tText("标记完成"), tText(`确定将订单「${o.order_no}」标记为已完成？`), tText("订单已完成"));
            }}
            className="rounded-md border border-[var(--theme-border)] px-2 py-1 text-[11px]"
          >
            <Tx>标记完成</Tx>
          </button>
        </PermissionGate>
      );
    }

    return <span className="text-xs text-muted-foreground"><Tx>只读</Tx></span>;
  };

  const renderRow = (o: Order) => {
    const checked = selectedOrderIds.includes(o.id);
    const afterSale = afterSaleLabel(o, tText);
    const discount = Number(o.total_discount_amount ?? (
      Number(o.discount_amount || 0)
      + Number(o.points_discount_amount || 0)
      + Number(o.reward_cash_discount_amount || 0)
      + Number(o.shipping_discount_amount || 0)
    ));
    const phone = o.shipping_phone_masked || o.contact_phone_masked || maskPhone(o.shipping_phone || o.contact_phone) || "-";
    const shippedWithoutTracking = o.status === ORDER_STATUS.SHIPPED && !o.tracking_no;
    const itemsSummary = o.items_summary || getFirstItemSummary(o.items, tText);
    const itemQty = o.items_count || o.items?.reduce((sum, item) => sum + Number(item.qty || 0), 0) || 0;
    const payableAmount = Number(o.payable_amount ?? o.total_amount ?? 0);
    const paidAmount = Number(o.paid_amount ?? (["paid", "partially_refunded", "refunded"].includes(o.payment_status || "") ? payableAmount : 0));
    const shippingIncome = Number(o.shipping_fee || 0);
    const shippingDiscount = Number(o.shipping_discount_amount || 0);
    const amountTooltip = [
      tText(`应付 RM ${money(payableAmount)}`),
      tText(`实付 RM ${money(paidAmount)}`),
      tText(`减免 RM ${money(discount)}`),
      tText(`活动优惠 RM ${money(o.activity_discount_amount || 0)}`),
      tText(`优惠券 RM ${money(o.coupon_discount_amount || 0)}`),
      tText(`积分 RM ${money(o.points_discount_amount || 0)}`),
      tText(`余额 RM ${money(o.reward_cash_discount_amount || 0)}`),
      tText(`运费减免 RM ${money(shippingDiscount)}`),
      Number(o.refund_amount || 0) > 0 ? tText(`退款 RM ${money(o.refund_amount)}`) : null,
      o.gross_profit_amount !== undefined ? tText(`毛利 RM ${money(o.gross_profit_amount)}`) : null,
      o.net_profit_amount !== undefined ? tText(`净利 RM ${money(o.net_profit_amount)}`) : null,
    ].filter(Boolean) as string[];

    return (
      <>
        <td className={`w-10 px-4 py-2.5 align-middle ${adminTableAlignClass("center")}`}>
          <input
            type="checkbox"
            checked={checked}
            onClick={(e) => e.stopPropagation()}
            onChange={() => toggleOrderSelection(o.id)}
            aria-label={tText(`选择订单 ${o.order_no}`)}
          />
        </td>
        <td className={`max-w-[10rem] whitespace-nowrap px-4 py-2.5 align-middle ${adminTableAlignClass("left")}`}>
          <button
            type="button"
            onClick={() => navigate(`/admin/orders/${o.id}`)}
            title={`${tText("订单号")}：${o.order_no}`}
            className="block min-w-0 max-w-[9.5rem] truncate text-left font-mono text-xs font-semibold text-[var(--theme-price)] hover:underline"
          >
            {o.order_no}
          </button>
        </td>
        <td className={`max-w-[9rem] whitespace-nowrap px-4 py-2.5 align-middle text-xs text-muted-foreground ${adminTableAlignClass("left")}`}>
          <AdminTableCell value={formatDateTime(o.created_at)} columnKey="created_at" maxWidth="8.5rem" />
        </td>
        <td className={`max-w-[10rem] whitespace-nowrap px-4 py-2.5 align-middle ${adminTableAlignClass("left")}`}>
          <AdminTableCell
            value={`${o.user_nickname || o.contact_name || tText("未命名用户")} / ${phone}`}
            fullText={[
              tText(`昵称：${o.user_nickname || "未命名用户"}`),
              tText(`收货人：${o.contact_name || "-"}`),
              tText(`电话：${phone}`),
              tText(`历史订单：${o.user_order_count || 0} 单${o.member_level_name ? ` · ${o.member_level_name}` : ""}`),
            ].join("\n")}
            maxWidth="9.5rem"
          />
        </td>
        <td className={`max-w-[13rem] whitespace-nowrap px-4 py-2.5 align-middle ${adminTableAlignClass("left")}`}>
          <div className="flex min-w-0 items-center gap-2">
            <Package size={15} className="shrink-0 text-muted-foreground" />
            <AdminTableCell value={itemsSummary} fullText={`${itemsSummary}\n${itemQty} 件，${o.sku_count || o.items?.length || 0} 个 SKU`} maxWidth="11rem" />
          </div>
        </td>
        <td className={`whitespace-nowrap px-4 py-2.5 align-middle font-semibold tabular-nums text-foreground ${adminTableAlignClass("right")}`} title={amountTooltip.join("\n")}>
          RM {money(payableAmount)}
        </td>
        <td className={`whitespace-nowrap px-4 py-2.5 align-middle font-semibold tabular-nums text-[var(--theme-price)] ${adminTableAlignClass("right")}`} title={amountTooltip.join("\n")}>
          RM {money(paidAmount)}
        </td>
        <td className={`whitespace-nowrap px-4 py-2.5 align-middle tabular-nums text-muted-foreground ${adminTableAlignClass("right")}`} title={amountTooltip.join("\n")}>
          RM {money(discount)}
        </td>
        <td className={`whitespace-nowrap px-4 py-2.5 align-middle tabular-nums text-muted-foreground ${adminTableAlignClass("right")}`} title={tText(`原始运费 RM ${money(o.shipping_original_fee ?? shippingIncome + shippingDiscount)}\n实收运费 RM ${money(shippingIncome)}\n运费减免 RM ${money(shippingDiscount)}\n物流成本 RM ${money(o.shipping_cost_amount || 0)}`)}>
          {tText(`收${money(shippingIncome)}/减${money(shippingDiscount)}`)}
        </td>
        <td className={`max-w-[9rem] whitespace-nowrap px-4 py-2.5 align-middle ${adminTableAlignClass("center")}`}>
          <AdminTableCell
            value={<PaymentStatusBadge status={o.payment_status || PAYMENT_STATUS.PENDING} />}
            fullText={`${o.payment_method || "-"}${o.payment_channel ? ` / ${o.payment_channel}` : ""}\n${formatDateTime(o.paid_at || o.payment_time || "") || tText("未支付")}`}
            maxWidth="8.5rem"
          />
        </td>
        <td className={`max-w-[9rem] whitespace-nowrap px-4 py-2.5 align-middle ${adminTableAlignClass("center")}`} title={[
          tText(`配送：${o.shipping_name || o.carrier || "-"}`),
          shippedWithoutTracking ? tText("已发货但未填写物流单号") : tText(`单号：${o.tracking_no || "无"}`),
          tText(`发货时间：${formatDateTime(o.shipped_at || "") || "未发货"}`),
        ].join("\n")}>
          <OrderStatusBadge status={o.status} />
        </td>
        <td className={`max-w-[7rem] whitespace-nowrap px-4 py-2.5 align-middle ${adminTableAlignClass("center")}`}>
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${afterSale.className}`} title={[
            afterSale.text,
            tText(`售后单数：${o.return_request_count || 0}`),
            Number(o.refund_amount || 0) > 0 ? tText(`退款 RM ${money(o.refund_amount)}`) : "",
          ].filter(Boolean).join("\n")}>{afterSale.text}</span>
        </td>
        <td className={`whitespace-nowrap px-4 py-2.5 align-middle ${adminTableAlignClass("right")}`}>
          <div className="flex items-center justify-end gap-2">
            {renderActions(o)}
            <button type="button" onClick={() => navigate(`/admin/orders/${o.id}`)} className="rounded-md border border-[var(--theme-border)] px-2 py-1 text-[11px] hover:bg-[var(--theme-bg)]"><Tx>详情</Tx></button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard?.writeText(o.order_no).then(() => toast.success(tText("订单号已复制"))).catch(() => {});
              }}
              className="rounded-md border border-[var(--theme-border)] p-1 hover:bg-[var(--theme-bg)]"
              aria-label={tText("复制订单号")}
            >
              <Copy size={13} />
            </button>
          </div>
        </td>
      </>
    );
  };

  const renderMobileCard = (o: Order) => {
    const checked = selectedOrderIds.includes(o.id);
    const afterSale = afterSaleLabel(o, tText);
    const badges = buildOrderBadges(o, tText);
    const discount = Number(o.discount_amount || 0) + Number(o.points_discount_amount || 0) + Number(o.reward_cash_discount_amount || 0);
    const phone = o.shipping_phone_masked || o.contact_phone_masked || maskPhone(o.shipping_phone || o.contact_phone) || "-";
    const itemsSummary = o.items_summary || getFirstItemSummary(o.items, tText);
    const itemQty = o.items_count || o.items?.reduce((sum, item) => sum + Number(item.qty || 0), 0) || 0;

    return (
      <AdminTableMobileCard>
        <div className="mb-3 flex items-start gap-2">
          <input
            type="checkbox"
            checked={checked}
            onClick={(e) => e.stopPropagation()}
            onChange={() => toggleOrderSelection(o.id)}
            aria-label={tText(`选择订单 ${o.order_no}`)}
            className="mt-1"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-semibold">{o.order_no}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(o.created_at)}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/admin/orders/${o.id}`)}
                className="shrink-0 text-xs text-[var(--theme-price)] hover:underline"
              >
                <Tx>详情</Tx>
              </button>
            </div>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <OrderStatusBadge status={o.status} />
          <PaymentStatusBadge status={o.payment_status || PAYMENT_STATUS.PENDING} />
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${afterSale.className}`}>{afterSale.text}</span>
        </div>

        <div className="space-y-2">
          <AdminTableMobileCardField label={tText("用户")}>
            <span className="block truncate">{o.user_nickname || tText("未命名用户")}</span>
            <span className="block text-xs text-muted-foreground">{phone}</span>
          </AdminTableMobileCardField>
          <AdminTableMobileCardField label={tText("商品")}>
            <span className="block truncate">{itemsSummary}</span>
            <span className="block text-xs text-muted-foreground">{tText(`${itemQty} 件`)}</span>
          </AdminTableMobileCardField>
          <AdminTableMobileCardField label={tText("金额")}>
            <span className="font-semibold text-[var(--theme-price)]">RM {money(o.total_amount)}</span>
            {discount > 0 ? <span className="block text-xs text-muted-foreground">{tText(`优惠 RM ${money(discount)}`)}</span> : null}
          </AdminTableMobileCardField>
          {badges.length ? (
            <AdminTableMobileCardField label={tText("标记")}>
              <span className="text-xs text-muted-foreground">{badges.join(" · ")}</span>
            </AdminTableMobileCardField>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--theme-border)] pt-3">
          {renderActions(o)}
        </div>
      </AdminTableMobileCard>
    );
  };

  return (
    <PermissionGate permission="order.view">
      <AdminPageShell
        className="min-w-0"
        hint={<Tx>查看与处理订单，支持状态筛选、批量导出及发货操作。</Tx>}
        toolbar={(
          <div className="flex max-w-full flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${realtimeClassName}`}>
              {realtimeLabel}
            </span>
            <span className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-2.5 py-1 text-xs text-muted-foreground">
              {tText(`最后更新：${lastUpdatedText}`)}
            </span>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-60"
            >
              <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
              <Tx>刷新</Tx>
            </button>
          </div>
        )}
        filters={(
          <>
      <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-7">
        {stats.map((stat) => {
          const active = statusFilter === stat.status && !!stat.status;
          return (
            <button
              key={stat.label}
              type="button"
              onClick={() => applyQuickStatusFilter(stat.status)}
              className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                active
                  ? "border-[var(--theme-price)] bg-[color-mix(in_srgb,var(--theme-price)_12%,var(--theme-surface))]"
                  : "border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-bg)]"
              }`}
            >
              <p className="truncate text-sm font-bold text-foreground">{stat.value}</p>
              <p className="truncate text-[10px] text-muted-foreground">{stat.label}</p>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <SearchBar placeholder={tText("搜索订单号、昵称、收货人、手机号、物流单号")} value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
        <AdminFilterSummaryBar chips={filterChips} onClearAll={() => clearFilters()} onRemove={handleRemoveFilterChip} />
        <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2">
          <button
            type="button"
            onClick={() => setAdvancedFiltersOpen((v) => !v)}
            className="w-full text-left text-sm font-medium text-foreground"
            aria-expanded={advancedFiltersOpen}
          >
            {advancedFiltersOpen ? tText("收起高级筛选") : tText("展开高级筛选")}
          </button>
          {advancedFiltersOpen ? (
            <div className="mt-3 space-y-2 border-t border-[var(--theme-border)] pt-3">
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                <SegmentedDateInput value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1); }} />
                <SegmentedDateInput value={dateTo} onChange={(v) => { setDateTo(v); setPage(1); }} />
                <AdminFilterInput value={amountMin} onChange={(e) => { setAmountMin(e.target.value); setPage(1); }} placeholder={tText("最低金额")} variant="themeBg" />
                <AdminFilterInput value={amountMax} onChange={(e) => { setAmountMax(e.target.value); setPage(1); }} placeholder={tText("最高金额")} variant="themeBg" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <AdminFilterSelect value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} variant="themeBg">
                  {orderStatusFilterOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </AdminFilterSelect>
                <AdminFilterSelect value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value as "" | PaymentStatus); setPage(1); }} variant="themeBg">
                  {paymentStatusFilterOptions.map((s) => <option key={s.value || "all"} value={s.value}>{s.label}</option>)}
                </AdminFilterSelect>
                <AdminFilterSelect value={paymentMethod} onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }} variant="themeBg">
                  {paymentMethodOptionsLocalized.map((s) => <option key={s.value || "all"} value={s.value}>{s.label}</option>)}
                </AdminFilterSelect>
                <AdminFilterInput value={paymentChannel} onChange={(e) => { setPaymentChannel(e.target.value); setPage(1); }} placeholder={tText("支付渠道")} variant="themeBg" />
                <AdminFilterSelect value={shippingName} onChange={(e) => { setShippingName(e.target.value); setPage(1); }} variant="themeBg">
                  {shippingOptionsLocalized.map((s) => <option key={s.value || "all"} value={s.value}>{s.label}</option>)}
                </AdminFilterSelect>
                <AdminFilterSelect value={returnStatus} onChange={(e) => { setReturnStatus(e.target.value as "" | "none" | "active" | "any"); setPage(1); }} variant="themeBg">
                  <option value=""><Tx>全部售后</Tx></option>
                  <option value="none"><Tx>无售后</Tx></option>
                  <option value="active"><Tx>售后中</Tx></option>
                  <option value="any"><Tx>有售后</Tx></option>
                </AdminFilterSelect>
                <AdminFilterSelect value={refundStatus} onChange={(e) => { setRefundStatus(e.target.value); setPage(1); }} variant="themeBg">
                  <option value=""><Tx>全部退款</Tx></option>
                  <option value="none"><Tx>无退款</Tx></option>
                  <option value="partially_refunded"><Tx>部分退款</Tx></option>
                  <option value="refunded"><Tx>全额退款</Tx></option>
                </AdminFilterSelect>
                <AdminFilterSelect value={hasNote} onChange={(e) => { setHasNote(e.target.value as "" | "1" | "0"); setPage(1); }} variant="themeBg">
                  <option value=""><Tx>备注不限</Tx></option>
                  <option value="1"><Tx>有买家备注</Tx></option>
                  <option value="0"><Tx>无买家备注</Tx></option>
                </AdminFilterSelect>
                <AdminFilterSelect value={costStatus} onChange={(e) => { setCostStatus(e.target.value as "" | "normal" | "missing"); setPage(1); }} variant="themeBg">
                  <option value=""><Tx>成本不限</Tx></option>
                  <option value="normal"><Tx>成本正常</Tx></option>
                  <option value="missing"><Tx>缺成本</Tx></option>
                </AdminFilterSelect>
                <AdminFilterSelect value={overduePayment} onChange={(e) => { setOverduePayment(e.target.value as "" | "1" | "0"); setPage(1); }} variant="themeBg">
                  <option value=""><Tx>付款时效不限</Tx></option>
                  <option value="1"><Tx>超时未支付</Tx></option>
                </AdminFilterSelect>
                <AdminFilterSelect value={overdueShipment} onChange={(e) => { setOverdueShipment(e.target.value as "" | "1" | "0"); setPage(1); }} variant="themeBg">
                  <option value=""><Tx>发货时效不限</Tx></option>
                  <option value="1"><Tx>待发货超24h</Tx></option>
                </AdminFilterSelect>
                <AdminFilterSelect value={buyerType} onChange={(e) => { setBuyerType(e.target.value as "" | "new" | "repeat"); setPage(1); }} variant="themeBg">
                  <option value=""><Tx>全部客户</Tx></option>
                  <option value="new"><Tx>新客</Tx></option>
                  <option value="repeat"><Tx>老客</Tx></option>
                </AdminFilterSelect>
                <AdminFilterButton disabled={exportingScope !== null} onClick={handleExportCsv} variant="themeBg" className="gap-1 disabled:opacity-60">
                  {exportingScope === "filtered" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  <Tx>导出</Tx>
                </AdminFilterButton>
              </div>
            </div>
          ) : null}
        </div>
      </div>
        </>
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{tText(`已选 ${selectedOrderIds.length} 单`)}</span>
        <button
          type="button"
          disabled={selectedOrderIds.length === 0 || exportingScope !== null}
          onClick={handleExportSelectedCsv}
          className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-xs font-medium transition hover:bg-[var(--theme-bg)] disabled:opacity-60"
        >
          {exportingScope === "selected" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {tText(`批量导出 (${selectedOrderIds.length})`)}
        </button>
        {selectedOrderIds.length > 0 ? (
          <button
            type="button"
            onClick={() => setSelectedOrderIds([])}
            className="min-h-[36px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-xs font-medium transition hover:bg-[var(--theme-bg)]"
          >
            <Tx>清空选择</Tx>
          </button>
        ) : null}
      </div>

      <AnimatedTable
        loading={loading}
        rows={orders}
        rowKey={(o) => o.id}
        skeletonRows={8}
        skeletonCols={12}
        className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow overflow-x-auto"
        tableClassName="w-full min-w-[1380px] text-sm"
        theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70"
        thead={(
          <tr>
            <th className={`w-10 px-4 py-3 ${adminTableAlignClass("center")}`}>
              <input
                type="checkbox"
                checked={allSelectedOnPage}
                ref={(input) => {
                  if (input) input.indeterminate = someSelectedOnPage;
                }}
                onChange={togglePageSelection}
                aria-label={tText("全选当前页订单")}
              />
            </th>
            {tableHeaders.map((h, index) => (
              <th
                key={h}
                className={`whitespace-nowrap px-4 py-3 text-xs font-semibold text-muted-foreground ${adminTableAlignClass(ORDER_COLUMN_ALIGNS[index] ?? "left")}`}
              >
                {h}
              </th>
            ))}
          </tr>
        )}
        footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />}
        emptyIcon={ordersEmptyGuide.icon}
        emptyTitle={ordersEmptyGuide.title}
        emptyDescription={ordersEmptyGuide.description}
        emptyAction={<AdminEmptyGuideActions guide={ordersEmptyGuide} showClearFilters={filtersActive} onClearFilters={() => clearFilters()} />}
        renderRow={renderRow}
        renderMobileCard={renderMobileCard}
      />

      <AdminShipOrderDialog
        open={!!shipTarget}
        orderNo={shipTarget?.orderNo ?? ""}
        onOpenChange={(open) => !open && setShipTarget(null)}
        onConfirm={async (trackingNo, carrier, shippingCostAmount) => {
          if (!shipTarget) return;
          try {
            await shipMutation.mutateAsync({ orderId: shipTarget.id, trackingNo, carrier, shippingCostAmount });
            await reloadAfterAction(tText("订单已发货"), shipTarget.id);
            setShipTarget(null);
          } catch (e) {
            toast.error(toastErrorMessage(e, tText("发货失败")));
            throw e;
          }
        }}
      />
      </AdminPageShell>
    </PermissionGate>
  );
}
