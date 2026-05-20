import { useEffect, useMemo } from "react";
import { Download, Package, Truck } from "lucide-react";
import { formatDateTime } from "@/utils/formatDateTime";
import { AnimatedTable } from "@/modules/micro-interactions";
import { useNavigate } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import { toast } from "sonner";
import * as orderService from "@/services/admin/orderService";
import PermissionGate from "@/components/admin/PermissionGate";
import type { PaymentStatus } from "@/types/order";
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

export default function AdminOrders() {
  const navigate = useNavigate();
  const { confirm } = useAdminConfirm();
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
    setAmountMin,
    setAmountMax,
    setPage,
    setPageSize,
    loadOrders,
    reset,
  } = useAdminOrdersStore();

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
    amountMin,
    amountMax,
    page,
    pageSize,
    loadOrders,
  ]);

  useEffect(() => () => reset(), [reset]);

  const stats = useMemo(
    () => [
      { label: "待付款", value: summary.pending },
      { label: "已付款", value: summary.paid },
      { label: "待发货", value: summary.paid },
      { label: "已发货", value: summary.shipped },
      { label: "已完成", value: summary.completed },
      { label: "已取消", value: summary.cancelled },
      { label: "退款中", value: summary.refunding },
      { label: "已退款", value: summary.refunded },
    ],
    [summary],
  );

  const handleExportCsv = async () => {
    try {
      await orderService.exportOrdersCsv({
        status: statusFilter || undefined,
        paymentStatus: paymentFilter || undefined,
        keyword: search.trim() || undefined,
      });
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

  const handleShipOrder = (orderId: string) => {
    const trackingNo = window.prompt("请输入运单号（可留空）", "") ?? "";
    const carrier = window.prompt("请输入承运商（可留空）", "") ?? "";
    confirm({
      title: "确认发货",
      description: "确定将该订单标记为已发货？",
      confirmText: "发货",
      onConfirm: async () => {
        try {
          await orderService.shipOrder(orderId, trackingNo.trim(), carrier.trim());
          await reloadAfterAction("订单已发货");
        } catch (e) {
          toast.error(toastErrorMessage(e, "发货失败"));
        }
      },
    });
  };

  const renderActions = (o: (typeof orders)[number]) => {
    if (o.status === ORDER_STATUS.PENDING) {
      return (
        <div className="flex gap-2">
          <PermissionGate permission="payment.manage">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                confirmStatusChange(
                  o.id,
                  ORDER_STATUS.PAID,
                  "确认收款",
                  `确定将订单「${o.order_no}」标记为已付款？`,
                  "订单已确认收款",
                );
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
                confirmStatusChange(
                  o.id,
                  ORDER_STATUS.CANCELLED,
                  "取消订单",
                  `确定取消订单「${o.order_no}」？取消后会释放库存并回滚相关权益。`,
                  "订单已取消",
                  true,
                );
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
              handleShipOrder(o.id);
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
              confirmStatusChange(
                o.id,
                ORDER_STATUS.COMPLETED,
                "标记完成",
                `确定将订单「${o.order_no}」标记为已完成？`,
                "订单已完成",
              );
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {stats.map((stat) => (
          <div key={stat.label} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 text-center theme-shadow">
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="grid gap-2 md:grid-cols-5">
          <SearchBar placeholder="搜索订单号/联系人/电话" value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
          <SegmentedDateInput value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1); }} />
          <SegmentedDateInput value={dateTo} onChange={(v) => { setDateTo(v); setPage(1); }} />
          <input value={amountMin} onChange={(e) => { setAmountMin(e.target.value); setPage(1); }} placeholder="最低金额" className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-sm" />
          <input value={amountMax} onChange={(e) => { setAmountMax(e.target.value); setPage(1); }} placeholder="最高金额" className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-sm" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-sm">
            {ORDER_STATUS_FILTER_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value as "" | PaymentStatus); setPage(1); }} className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-sm">
            {PAYMENT_STATUS_FILTER_OPTIONS.map((s) => <option key={s.value || "all"} value={s.value}>{s.label}</option>)}
          </select>
          <input value={paymentMethod} onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }} placeholder="支付方式" className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-sm" />
          <input value={paymentChannel} onChange={(e) => { setPaymentChannel(e.target.value); setPage(1); }} placeholder="支付渠道" className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-sm" />
          <input value={shippingName} onChange={(e) => { setShippingName(e.target.value); setPage(1); }} placeholder="配送方式" className="min-h-[44px] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-sm" />
          <button type="button" onClick={handleExportCsv} className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-[var(--theme-border)] px-3 text-sm"><Download size={14} /> 导出</button>
        </div>
      </div>

      <AnimatedTable
        loading={loading}
        rows={orders}
        rowKey={(o) => o.id}
        skeletonRows={8}
        skeletonCols={10}
        className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow overflow-x-auto"
        tableClassName="w-full text-sm"
        theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70"
        thead={(
          <tr>
            {['订单号', '联系人', '金额', '履约', '支付', '创建时间', '操作', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
            ))}
          </tr>
        )}
        footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />}
        emptyIcon={Package}
        emptyTitle="无匹配订单"
        renderRow={(o) => (
          <>
            <td className="px-4 py-3 font-mono text-xs text-foreground">{o.order_no}</td>
            <td className="px-4 py-3 text-foreground">{o.contact_name || '—'}</td>
            <td className="px-4 py-3 font-semibold text-foreground">RM {parseFloat(String(o.total_amount ?? 0)).toFixed(2)}</td>
            <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getOrderStatusBadgeClass(o.status)}`}>{getOrderStatusLabel(o.status)}</span></td>
            <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getPaymentStatusBadgeClass(o.payment_status || PAYMENT_STATUS.PENDING)}`}>{getPaymentStatusLabel(o.payment_status || PAYMENT_STATUS.PENDING)}</span></td>
            <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(o.created_at)}</td>
            <td className="px-4 py-3">{renderActions(o)}</td>
            <td className="px-4 py-3"><button type="button" onClick={() => navigate(`/admin/orders/${o.id}`)} className="text-xs text-[var(--theme-price)] hover:underline"><Tx>详情</Tx></button></td>
          </>
        )}
      />
    </div>
  );
}
