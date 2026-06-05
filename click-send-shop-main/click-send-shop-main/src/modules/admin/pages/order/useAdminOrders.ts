import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import { useLocalizedAdminEmptyGuide } from "@/hooks/useLocalizedAdminEmptyGuide";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import * as orderService from "@/services/admin/orderService";
import type { OrderListParams, OrderStatus, PaymentStatus } from "@/types/order";
import {
  buildOrderFilterChips,
  hasActiveOrderFilters,
  removeOrderFilterChip,
} from "@/utils/adminOrderFilters";
import { ORDER_STATUS } from "@/constants/statusDictionary";
import { toastErrorMessage } from "@/utils/errorMessage";
import { initialSummary, paymentMethodOptions, shippingOptions } from "@/modules/admin/pages/order/orderListConstants";
import { money } from "@/modules/admin/pages/order/orderListDisplayUtils";

const ORDER_LIST_REFRESH_MS = 300_000;

export function useAdminOrders() {
  const { tText } = useAdminT();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { confirm } = useAdminConfirm();

  const paymentMethodOptionsLocalized = useMemo(
    () => paymentMethodOptions.map((o) => ({ ...o, label: tText(o.label) })),
    [tText],
  );
  const shippingOptionsLocalized = useMemo(
    () => shippingOptions.map((o) => ({ ...o, label: tText(o.label) })),
    [tText],
  );

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
  const [pageSize, setPageSize] = useState(30);
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
    () => [
      "订单号",
      "下单时间",
      "客户",
      "商品",
      "应付",
      "实付",
      "减免",
      "运费",
      "支付",
      "履约",
      "售后",
      "操作",
    ].map((h) => tText(h)),
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
    includeItems: false,
    includeSummary: false,
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

  const summaryParams = useMemo<OrderListParams>(() => {
    const params = { ...queryParams };
    delete params.page;
    delete params.pageSize;
    delete params.includeItems;
    delete params.includeSummary;
    return params;
  }, [queryParams]);

  const ordersQuery = useQuery({
    queryKey: adminQueryKeys.orders(queryParams),
    queryFn: () => orderService.fetchOrders(queryParams),
    placeholderData: (previous) => previous,
    refetchInterval: ORDER_LIST_REFRESH_MS,
    refetchIntervalInBackground: false,
  });

  const summaryQuery = useQuery({
    queryKey: adminQueryKeys.orderSummary(summaryParams),
    queryFn: () => orderService.fetchOrderSummary(summaryParams),
    placeholderData: (previous) => previous,
    refetchInterval: ORDER_LIST_REFRESH_MS,
    refetchIntervalInBackground: false,
  });

  const orders = useMemo(() => ordersQuery.data?.list ?? [], [ordersQuery.data?.list]);
  const loading = ordersQuery.isLoading && !ordersQuery.data;
  const ordersError = ordersQuery.isError && !ordersQuery.data;
  const total = ordersQuery.data?.total ?? 0;
  const summary = summaryQuery.data ?? ordersQuery.data?.summary ?? initialSummary;
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
    () => [
      { label: tText("订单数"), value: String(summary.order_count ?? total), status: "" },
      { label: tText("应收"), value: `RM ${money(summary.payable_amount)}`, status: "" },
      { label: tText("待收"), value: `RM ${money(summary.outstanding_amount)}`, status: ORDER_STATUS.PENDING },
      { label: tText("实收"), value: `RM ${money(summary.paid_amount)}`, status: "" },
      { label: tText("活动优惠"), value: `RM ${money(summary.activity_discount_amount)}`, status: "" },
      { label: tText("运费减免"), value: `RM ${money(summary.shipping_discount_amount)}`, status: "" },
      { label: tText("净实收"), value: `RM ${money(summary.net_received_amount)}`, status: "" },
    ],
    [summary, tText, total],
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

  return {
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
    ordersError,
    refetchOrders: ordersQuery.refetch,
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
  };
}
