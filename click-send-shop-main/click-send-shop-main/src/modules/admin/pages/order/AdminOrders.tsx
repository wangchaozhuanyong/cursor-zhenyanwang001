import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Package, Truck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import PermissionGate from "@/components/admin/PermissionGate";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import AdminShipOrderDialog from "@/modules/admin/components/AdminShipOrderDialog";
import { AdminTableCell, AdminTableCellGroup } from "@/components/admin/AdminTableCell";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
import { AnimatedTable } from "@/modules/micro-interactions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import { useLocalizedAdminEmptyGuide } from "@/hooks/useLocalizedAdminEmptyGuide";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import * as orderService from "@/services/admin/orderService";
import type { AdminOrderSummary, Order, OrderListParams, OrderStatus, PaymentStatus } from "@/types/order";
import { formatDateTime } from "@/utils/formatDateTime";
import { toastErrorMessage } from "@/utils/errorMessage";
import { maskPhone } from "@/utils/privacyMask";
import {
  buildOrderFilterChips,
  hasActiveOrderFilters,
  removeOrderFilterChip,
} from "@/utils/adminOrderFilters";
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  getOrderStatusBadgeClass,
} from "@/constants/statusDictionary";
import { PaymentStatusBadge } from "@/components/admin/PaymentStatusBadge";
import {
  useAdminOrderStatusFilterOptions,
  useAdminPaymentStatusFilterOptions,
} from "@/hooks/useAdminStatusLabels";
import { THEME_OUTLINE_DANGER, THEME_OUTLINE_PRIMARY, THEME_OUTLINE_SUCCESS } from "@/utils/themeVisuals";
import { Tx } from "@/components/admin/AdminText";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { useAdminT } from "@/hooks/useAdminT";

const initialSummary: AdminOrderSummary = {
  pending: 0,
  paid: 0,
  shipped: 0,
  completed: 0,
  cancelled: 0,
  refunding: 0,
  refunded: 0,
};

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

function money(value: unknown): string {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function shortId(value?: string): string {
  const raw = String(value || "");
  return raw ? raw.slice(-6) : "-";
}

function getFirstItemSummary(items: Order["items"] | undefined, tText: (zh: string) => string): string {
  const first = items?.[0];
  if (!first) return "-";
  const name = first.product?.name || tText("商品");
  const suffix = items && items.length > 1 ? tText(`，另 ${items.length - 1} 件`) : "";
  return `${name} ×${first.qty}${suffix}`;
}

function buildOrderBadges(order: Order, tText: (zh: string) => string): string[] {
  if (Array.isArray(order.risk_badges) && order.risk_badges.length) {
    return order.risk_badges.map((badge) => tText(badge));
  }
  const badges: string[] = [];
  if (order.note) badges.push(tText("买家备注"));
  if ((order.active_return_count || 0) > 0) badges.push(tText("售后中"));
  if (Number(order.refund_amount || 0) > 0) badges.push(tText("有退款"));
  if (order.cost_snapshot_source === "missing" || Number(order.missing_cost_item_count || 0) > 0) badges.push(tText("缺成本"));
  if (Number(order.total_amount || 0) >= 500) badges.push(tText("高金额"));
  return badges;
}

function afterSaleLabel(order: Order, tText: (zh: string) => string): { text: string; className: string } {
  if ((order.active_return_count || 0) > 0) return { text: tText("售后中"), className: "bg-amber-100 text-amber-700" };
  if (Number(order.refund_amount || 0) > 0 || order.payment_status === "refunded") return { text: tText("已退款"), className: "bg-red-100 text-red-700" };
  if (order.payment_status === "partially_refunded") return { text: tText("部分退款"), className: "bg-orange-100 text-orange-700" };
  return { text: tText("无售后"), className: "bg-slate-100 text-slate-600" };
}

export default function AdminOrders() {
  const { tText } = useAdminT();
  const orderStatusFilterOptions = useAdminOrderStatusFilterOptions();
  const paymentStatusFilterOptions = useAdminPaymentStatusFilterOptions();
  const paymentMethodOptionsLocalized = useMemo(
    () => paymentMethodOptions.map((o) => ({ ...o, label: tText(o.label) })),
    [tText],
  );
  const shippingOptionsLocalized = useMemo(
    () => shippingOptions.map((o) => ({ ...o, label: tText(o.label) })),
    [tText],
  );
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { confirm } = useAdminConfirm();
  const [shipTarget, setShipTarget] = useState<{ id: string; orderNo: string } | null>(null);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"" | PaymentStatus>("");
  const [search, setSearch] = useState(() => (searchParams.get("keyword") || "").replace(/^#+/, "").trim());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentChannel, setPaymentChannel] = useState("");
  const [shippingName, setShippingName] = useState("");
  const [returnStatus, setReturnStatus] = useState<"" | "none" | "active" | "any">("");
  const [refundStatus, setRefundStatus] = useState("");
  const [hasNote, setHasNote] = useState<"" | "1" | "0">("");
  const [costStatus, setCostStatus] = useState<"" | "normal" | "missing">("");
  const [overduePayment, setOverduePayment] = useState<"" | "1" | "0">("");
  const [overdueShipment, setOverdueShipment] = useState<"" | "1" | "0">("");
  const [buyerType, setBuyerType] = useState<"" | "new" | "repeat">("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [exportingScope, setExportingScope] = useState<"filtered" | "selected" | null>(null);

  useEffect(() => {
    const kw = (searchParams.get("keyword") || "").replace(/^#+/, "").trim();
    if (kw) setSearch(kw);
  }, [searchParams]);

  const clearFilters = () => {
    setStatusFilter("");
    setPaymentFilter("");
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPaymentMethod("");
    setPaymentChannel("");
    setShippingName("");
    setReturnStatus("");
    setRefundStatus("");
    setHasNote("");
    setCostStatus("");
    setOverduePayment("");
    setOverdueShipment("");
    setBuyerType("");
    setAmountMin("");
    setAmountMax("");
    setPage(1);
  };

  const filterState = useMemo(
    () => ({
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
    }),
    [
      amountMax,
      amountMin,
      buyerType,
      costStatus,
      dateFrom,
      dateTo,
      hasNote,
      overduePayment,
      overdueShipment,
      paymentChannel,
      paymentFilter,
      paymentMethod,
      refundStatus,
      returnStatus,
      search,
      shippingName,
      statusFilter,
    ],
  );
  const filterChips = useMemo(
    () => buildOrderFilterChips(filterState).map((chip) => ({ ...chip, label: tText(chip.label) })),
    [filterState, tText],
  );
  const tableHeaders = useMemo(
    () => ["订单", "用户/收货人", "商品", "金额", "支付", "履约/物流", "售后", "标记", "创建时间", "操作"].map((h) => tText(h)),
    [tText],
  );
  const filtersActive = hasActiveOrderFilters(filterState);
  const ordersEmptyGuide = useLocalizedAdminEmptyGuide(
    filtersActive ? ADMIN_EMPTY_GUIDES.ordersFiltered : ADMIN_EMPTY_GUIDES.orders,
  );

  const queryParams = useMemo<OrderListParams>(() => ({
    page,
    pageSize,
    status: (statusFilter || undefined) as OrderStatus | undefined,
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
  }), [
    page,
    pageSize,
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
  ]);

  const ordersQuery = useQuery({
    queryKey: adminQueryKeys.orders(queryParams),
    queryFn: () => orderService.fetchOrders(queryParams),
    placeholderData: (previous) => previous,
    refetchInterval: 60_000,
  });

  const orders = useMemo(() => ordersQuery.data?.list ?? [], [ordersQuery.data?.list]);
  const loading = ordersQuery.isLoading && !ordersQuery.data;
  const total = ordersQuery.data?.total ?? 0;
  const summary = ordersQuery.data?.summary ?? initialSummary;
  const pageOrderIds = useMemo(() => orders.map((order) => order.id), [orders]);
  const allSelectedOnPage = pageOrderIds.length > 0 && pageOrderIds.every((id) => selectedOrderIds.includes(id));
  const someSelectedOnPage = !allSelectedOnPage && pageOrderIds.some((id) => selectedOrderIds.includes(id));

  const invalidateOrderQueries = async (orderId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.ordersRoot() }),
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() }),
      orderId ? queryClient.invalidateQueries({ queryKey: adminQueryKeys.orderDetail(orderId) }) : Promise.resolve(),
    ]);
  };

  const statusMutation = useMutation({
    mutationFn: ({ orderId, nextStatus }: { orderId: string; nextStatus: string }) => orderService.updateOrderStatus(orderId, nextStatus),
    onSuccess: async (_data, variables) => invalidateOrderQueries(variables.orderId),
  });

  const shipMutation = useMutation({
    mutationFn: ({ orderId, trackingNo, carrier, shippingCostAmount }: { orderId: string; trackingNo: string; carrier: string; shippingCostAmount?: number }) => (
      orderService.shipOrder(orderId, trackingNo, carrier, shippingCostAmount)
    ),
    onSuccess: async (_data, variables) => invalidateOrderQueries(variables.orderId),
  });

  const stats = useMemo(
    () => {
      const filterScope = filtersActive ? tText("当前筛选") : tText("全站");
      return [
        { label: tText("待付款"), value: summary.pending, status: ORDER_STATUS.PENDING, sub: `${filterScope} · RM ${money(summary.pending_payment_amount)}` },
        { label: tText("待发货"), value: summary.pending_shipment_count ?? summary.paid, status: ORDER_STATUS.PAID, sub: `${filterScope} · RM ${money(summary.pending_shipment_amount)}` },
        { label: tText("售后中"), value: summary.active_return_count ?? summary.refunding, status: ORDER_STATUS.REFUNDING, sub: `${filterScope} · ${tText("退款")} RM ${money(summary.today_refund_amount)}` },
        { label: tText("今日订单"), value: summary.today_order_count ?? 0, status: "", sub: tText(`全站 · ${summary.today_paid_order_count ?? 0} 单已支付`) },
        { label: tText("今日实收"), value: `RM ${money(summary.today_paid_amount)}`, status: "", sub: tText("全站 · 按支付时间") },
        { label: tText("今日毛利"), value: `RM ${money(summary.today_gross_profit_amount)}`, status: "", sub: tText("全站 · 商品毛利") },
        { label: tText("今日净利润"), value: `RM ${money(summary.today_net_profit_amount ?? summary.today_gross_profit_amount)}`, status: "", sub: tText("全站 · 含物流/手续费") },
      ];
    },
    [filtersActive, summary, tText],
  );

  const applyQuickStatusFilter = (status: string) => {
    if (!status) return;
    setStatusFilter(statusFilter === status ? "" : status);
    setPage(1);
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((prev) => (
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    ));
  };

  const togglePageSelection = () => {
    setSelectedOrderIds((prev) => {
      if (allSelectedOnPage) return prev.filter((id) => !pageOrderIds.includes(id));
      return Array.from(new Set([...prev, ...pageOrderIds]));
    });
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

  const handleExportCsv = async () => {
    setExportingScope("filtered");
    try {
      await orderService.exportOrdersCsv(queryParams);
      toast.success(tText("已开始下载 CSV"));
    } catch (e) {
      toast.error(toastErrorMessage(e, tText("导出失败")));
    } finally {
      setExportingScope(null);
    }
  };

  const handleExportSelectedCsv = async () => {
    if (!selectedOrderIds.length) {
      toast.warning(tText("请先勾选要导出的订单"));
      return;
    }
    setExportingScope("selected");
    try {
      await orderService.exportOrdersCsv({ ids: selectedOrderIds });
      toast.success(tText(`已开始导出 ${selectedOrderIds.length} 个订单`));
    } catch (e) {
      toast.error(toastErrorMessage(e, tText("批量导出失败")));
    } finally {
      setExportingScope(null);
    }
  };

  const reloadAfterAction = async (message: string, orderId?: string) => {
    await invalidateOrderQueries(orderId);
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
          await statusMutation.mutateAsync({ orderId, nextStatus });
          await reloadAfterAction(successMessage, orderId);
        } catch (e) {
          toast.error(toastErrorMessage(e, tText("订单操作失败")));
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
    const badges = buildOrderBadges(o, tText);
    const discount = Number(o.discount_amount || 0) + Number(o.points_discount_amount || 0) + Number(o.reward_cash_discount_amount || 0);
    const phone = o.shipping_phone_masked || o.contact_phone_masked || maskPhone(o.shipping_phone || o.contact_phone) || "-";
    const shippedWithoutTracking = o.status === ORDER_STATUS.SHIPPED && !o.tracking_no;

    const itemsSummary = o.items_summary || getFirstItemSummary(o.items, tText);
    const itemQty = o.items_count || o.items?.reduce((sum, item) => sum + Number(item.qty || 0), 0) || 0;
    const amountTooltip = [
      tText(`实付 RM ${money(o.total_amount)}`),
      tText(`优惠 RM ${money(discount)}`),
      Number(o.refund_amount || 0) > 0 ? tText(`退款 RM ${money(o.refund_amount)}`) : null,
      o.gross_profit_amount !== undefined ? tText(`毛利 RM ${money(o.gross_profit_amount)}`) : null,
      o.net_profit_amount !== undefined ? tText(`净利 RM ${money(o.net_profit_amount)}`) : null,
    ].filter(Boolean) as string[];

    return (
      <>
        <td className="w-10 px-4 py-2.5 align-middle">
          <input
            type="checkbox"
            checked={checked}
            onClick={(e) => e.stopPropagation()}
            onChange={() => toggleOrderSelection(o.id)}
            aria-label={tText(`选择订单 ${o.order_no}`)}
          />
        </td>
        <td className="max-w-[9rem] px-4 py-2.5 align-middle">
          <AdminTableCellGroup
            maxWidth="8.5rem"
            lines={[
              { text: o.order_no, mono: true },
              { text: `UID ${shortId(o.user_id)}`, muted: true, mono: true },
            ]}
            tooltipLines={[tText(`订单号：${o.order_no}`), tText(`用户 ID：${o.user_id || "-"}`)]}
          />
        </td>
        <td className="max-w-[11rem] px-4 py-2.5 align-middle">
          <AdminTableCellGroup
            maxWidth="10.5rem"
            lines={[
              { text: o.user_nickname || tText("未命名用户") },
              { text: `${tText("电话")} ${phone}`, muted: true },
            ]}
            tooltipLines={[
              tText(`昵称：${o.user_nickname || "未命名用户"}`),
              tText(`收货人：${o.contact_name || "-"}`),
              tText(`电话：${phone}`),
              tText(`历史订单：${o.user_order_count || 0} 单${o.member_level_name ? ` · ${o.member_level_name}` : ""}`),
            ]}
          />
        </td>
        <td className="max-w-[12rem] px-4 py-2.5 align-middle">
          <div className="flex min-w-0 items-start gap-2">
            <Package size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
            <AdminTableCellGroup
              maxWidth="10rem"
              lines={[
                { text: itemsSummary },
                { text: tText(`${itemQty} 件 / ${o.sku_count || o.items?.length || 0} SKU`), muted: true },
              ]}
              tooltipLines={[itemsSummary, tText(`${itemQty} 件，${o.sku_count || o.items?.length || 0} 个 SKU`)]}
            />
          </div>
        </td>
        <td className="max-w-[8rem] px-4 py-2.5 align-middle">
          <AdminTableCellGroup
            maxWidth="7.5rem"
            lines={[
              { text: `RM ${money(o.total_amount)}` },
              { text: tText(`优惠 RM ${money(discount)}`), muted: true },
            ]}
            tooltipLines={amountTooltip}
          />
        </td>
        <td className="max-w-[9rem] px-4 py-2.5 align-middle">
          <div className="min-w-0 space-y-1">
            <PaymentStatusBadge status={o.payment_status || PAYMENT_STATUS.PENDING} />
            <AdminTableCell
              value={`${o.payment_method || "-"}${o.payment_channel ? ` / ${o.payment_channel}` : ""}`}
              fullText={`${o.payment_method || "-"}${o.payment_channel ? ` / ${o.payment_channel}` : ""}\n${formatDateTime(o.paid_at || o.payment_time || "") || tText("未支付")}`}
              maxWidth="8.5rem"
              muted
            />
          </div>
        </td>
        <td className="max-w-[9rem] px-4 py-2.5 align-middle">
          <div className="min-w-0 space-y-1">
            <OrderStatusBadge status={o.status} />
            <AdminTableCell
              value={shippedWithoutTracking ? tText("已发货·无单号") : (o.tracking_no || tText("无单号"))}
              fullText={[
                tText(`配送：${o.shipping_name || o.carrier || "-"}`),
                shippedWithoutTracking ? tText("已发货但未填写物流单号") : tText(`单号：${o.tracking_no || "无"}`),
                tText(`发货时间：${formatDateTime(o.shipped_at || "") || "未发货"}`),
              ].join("\n")}
              maxWidth="8.5rem"
              muted
              className={shippedWithoutTracking ? "text-red-500" : undefined}
            />
          </div>
        </td>
        <td className="max-w-[7rem] px-4 py-2.5 align-middle">
          <div className="min-w-0 space-y-1">
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${afterSale.className}`}>{afterSale.text}</span>
            <AdminTableCell
              value={tText(`售后 ${o.return_request_count || 0} 单`)}
              fullText={[
                afterSale.text,
                tText(`售后单数：${o.return_request_count || 0}`),
                Number(o.refund_amount || 0) > 0 ? tText(`退款 RM ${money(o.refund_amount)}`) : "",
              ].filter(Boolean).join("\n")}
              maxWidth="6.5rem"
              muted
            />
          </div>
        </td>
        <td className="max-w-[8rem] px-4 py-2.5 align-middle">
          <AdminTableCell
            value={
              badges.length
                ? badges.slice(0, 2).join(" · ") + (badges.length > 2 ? ` +${badges.length - 2}` : "")
                : "-"
            }
            fullText={badges.join("、") || "-"}
            maxWidth="7.5rem"
            muted
          />
        </td>
        <td className="max-w-[9rem] whitespace-nowrap px-4 py-2.5 align-middle text-xs text-muted-foreground">
          <AdminTableCell value={formatDateTime(o.created_at)} columnKey="created_at" maxWidth="8.5rem" />
        </td>
        <td className="px-4 py-3 align-top">{renderActions(o)}</td>
        <td className="px-4 py-3 align-top"><button type="button" onClick={() => navigate(`/admin/orders/${o.id}`)} className="text-xs text-[var(--theme-price)] hover:underline"><Tx>详情</Tx></button></td>
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
    <div className="min-w-0 space-y-4">
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-7">
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
        <SearchBar placeholder={tText("搜索订单号、昵称、收货人、手机号、用户ID、物流单号")} value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
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
                <input value={amountMin} onChange={(e) => { setAmountMin(e.target.value); setPage(1); }} placeholder={tText("最低金额")} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm" />
                <input value={amountMax} onChange={(e) => { setAmountMax(e.target.value); setPage(1); }} placeholder={tText("最高金额")} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm">
                  {orderStatusFilterOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value as "" | PaymentStatus); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm">
                  {paymentStatusFilterOptions.map((s) => <option key={s.value || "all"} value={s.value}>{s.label}</option>)}
                </select>
                <select value={paymentMethod} onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm">
                  {paymentMethodOptionsLocalized.map((s) => <option key={s.value || "all"} value={s.value}>{s.label}</option>)}
                </select>
                <input value={paymentChannel} onChange={(e) => { setPaymentChannel(e.target.value); setPage(1); }} placeholder={tText("支付渠道")} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm" />
                <select value={shippingName} onChange={(e) => { setShippingName(e.target.value); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm">
                  {shippingOptionsLocalized.map((s) => <option key={s.value || "all"} value={s.value}>{s.label}</option>)}
                </select>
                <select value={returnStatus} onChange={(e) => { setReturnStatus(e.target.value as "" | "none" | "active" | "any"); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm">
                  <option value=""><Tx>全部售后</Tx></option>
                  <option value="none"><Tx>无售后</Tx></option>
                  <option value="active"><Tx>售后中</Tx></option>
                  <option value="any"><Tx>有售后</Tx></option>
                </select>
                <select value={refundStatus} onChange={(e) => { setRefundStatus(e.target.value); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm">
                  <option value=""><Tx>全部退款</Tx></option>
                  <option value="none"><Tx>无退款</Tx></option>
                  <option value="partially_refunded"><Tx>部分退款</Tx></option>
                  <option value="refunded"><Tx>全额退款</Tx></option>
                </select>
                <select value={hasNote} onChange={(e) => { setHasNote(e.target.value as "" | "1" | "0"); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm">
                  <option value=""><Tx>备注不限</Tx></option>
                  <option value="1"><Tx>有买家备注</Tx></option>
                  <option value="0"><Tx>无买家备注</Tx></option>
                </select>
                <select value={costStatus} onChange={(e) => { setCostStatus(e.target.value as "" | "normal" | "missing"); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm">
                  <option value=""><Tx>成本不限</Tx></option>
                  <option value="normal"><Tx>成本正常</Tx></option>
                  <option value="missing"><Tx>缺成本</Tx></option>
                </select>
                <select value={overduePayment} onChange={(e) => { setOverduePayment(e.target.value as "" | "1" | "0"); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm">
                  <option value=""><Tx>付款时效不限</Tx></option>
                  <option value="1"><Tx>超时未支付</Tx></option>
                </select>
                <select value={overdueShipment} onChange={(e) => { setOverdueShipment(e.target.value as "" | "1" | "0"); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm">
                  <option value=""><Tx>发货时效不限</Tx></option>
                  <option value="1"><Tx>待发货超24h</Tx></option>
                </select>
                <select value={buyerType} onChange={(e) => { setBuyerType(e.target.value as "" | "new" | "repeat"); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 text-sm">
                  <option value=""><Tx>全部客户</Tx></option>
                  <option value="new"><Tx>新客</Tx></option>
                  <option value="repeat"><Tx>老客</Tx></option>
                </select>
                <button type="button" disabled={exportingScope !== null} onClick={handleExportCsv} className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-[var(--theme-border)] px-3 text-sm disabled:opacity-60">
                  {exportingScope === "filtered" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  <Tx>导出</Tx>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

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
            <th className="w-10 px-4 py-3">
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
            {tableHeaders.map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
            ))}
            <th className="px-4 py-3" aria-hidden />
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
    </div>
  );
}
