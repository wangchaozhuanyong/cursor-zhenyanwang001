import { useEffect, useLayoutEffect } from "react";
import { Loader2, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import { toast } from "sonner";
import { usePagination } from "@/hooks/usePagination";
import * as orderService from "@/services/admin/orderService";
import PermissionGate from "@/components/admin/PermissionGate";
import type { OrderStatus, PaymentStatus } from "@/types/order";
import { useAdminOrdersStore } from "@/stores/useAdminOrdersStore";
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

const actionStatuses = [ORDER_STATUS.SHIPPED, ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED];

export default function AdminOrders() {
  const navigate = useNavigate();
  const orders = useAdminOrdersStore((s) => s.orders);
  const loading = useAdminOrdersStore((s) => s.loading);
  const statusFilter = useAdminOrdersStore((s) => s.statusFilter);
  const paymentFilter = useAdminOrdersStore((s) => s.paymentFilter);
  const search = useAdminOrdersStore((s) => s.search);
  const setStatusFilter = useAdminOrdersStore((s) => s.setStatusFilter);
  const setPaymentFilter = useAdminOrdersStore((s) => s.setPaymentFilter);
  const setSearch = useAdminOrdersStore((s) => s.setSearch);
  const loadOrders = useAdminOrdersStore((s) => s.loadOrders);
  const applyOrderStatus = useAdminOrdersStore((s) => s.applyOrderStatus);
  const resetOrdersStore = useAdminOrdersStore((s) => s.reset);

  /** 再次进入页面时避免短暂展示上一次缓存的列表 */
  useLayoutEffect(() => {
    useAdminOrdersStore.setState({ loading: true });
  }, []);

  useEffect(() => {
    loadOrders().catch(() => toast.error("加载数据失败"));
  }, [statusFilter, paymentFilter, loadOrders]);

  useEffect(() => () => resetOrdersStore(), [resetOrdersStore]);

  const filteredOrders = orders.filter((o) => {
    if (search && !o.order_no?.toLowerCase().includes(search.toLowerCase()) && !o.contact_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const { page, pageSize, setPage, setPageSize, paginatedData, total } = usePagination(filteredOrders, 10);

  const handleExportCsv = async () => {
    try {
      await orderService.exportOrdersCsv({
        status: statusFilter || undefined,
        paymentStatus: paymentFilter || undefined,
        keyword: search.trim() || undefined,
      });
      toast.success("已开始下载 CSV");
    } catch {
      toast.error("导出失败");
    }
  };

  const handleStatusChange = (orderId: string, newStatus: string) => {
    orderService.updateOrderStatus(orderId, newStatus)
      .then(() => {
        applyOrderStatus(orderId, newStatus as OrderStatus);
        toast.success(`订单状态已更新为「${getOrderStatusLabel(newStatus)}」`);
      })
      .catch(() => toast.error("状态更新失败"));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {[
          { label: "总订单", value: orders.length.toString() },
          { label: "待处理", value: orders.filter((o) => o.status === ORDER_STATUS.PENDING).length.toString() },
          { label: "已完成", value: orders.filter((o) => o.status === ORDER_STATUS.COMPLETED).length.toString() },
          { label: "已取消", value: orders.filter((o) => o.status === ORDER_STATUS.CANCELLED).length.toString() },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="min-w-0 flex-1"><SearchBar placeholder="搜索订单号 / 用户..." value={search} onChange={(v) => { setSearch(v); setPage(1); }} /></div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="touch-manipulation min-h-[44px] rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none">
            {ORDER_STATUS_FILTER_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value as "" | PaymentStatus); setPage(1); }} className="touch-manipulation min-h-[44px] max-w-[160px] rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none">
            {PAYMENT_STATUS_FILTER_OPTIONS.map((s) => <option key={s.value || "all"} value={s.value}>{s.label}</option>)}
          </select>
          <button type="button" onClick={() => { setPage(1); void loadOrders().catch(() => toast.error("加载数据失败")); }} className="touch-manipulation min-h-[44px] rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground hover:bg-secondary/80">
            搜索
          </button>
          <PermissionGate permission="order.view">
            <button type="button" onClick={handleExportCsv} className="touch-manipulation flex min-h-[44px] items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground hover:bg-secondary">
              <Download size={16} /> 导出
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Mobile card view */}
      <div className="space-y-3 md:hidden">
        {paginatedData.map((o) => (
          <div key={o.id} className="rounded-xl border border-border bg-card p-4" onClick={() => navigate(`/admin/orders/${o.id}`)}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs text-foreground">{o.order_no}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getOrderStatusBadgeClass(o.status)}`}>{getOrderStatusLabel(o.status)}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-foreground">{o.contact_name || "—"}</span>
              <span className="text-sm font-semibold text-gold">RM {parseFloat(String(o.total_amount ?? 0)).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{new Date(o.created_at).toLocaleString("zh-CN")}</span>
              <div className="flex items-center gap-2">
                <span>积分:{o.total_points ?? 0}</span>
                <PermissionGate permission="order.update">
                  <select value="" onChange={(e) => { e.stopPropagation(); if (e.target.value) handleStatusChange(o.id, e.target.value); }} className="rounded-lg border border-border bg-transparent px-2 py-1 text-[10px] text-foreground outline-none">
                    <option value="">改状态</option>
                    {actionStatuses.filter((s) => s !== o.status).map((s) => <option key={s} value={s}>{getOrderStatusLabel(s)}</option>)}
                  </select>
                </PermissionGate>
              </div>
            </div>
          </div>
        ))}
        {paginatedData.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">无匹配订单</div>
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      {/* 平板及以上：表格 */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              {["订单号", "联系人", "金额", "积分", "优惠券", "履约", "支付", "时间", "操作", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                <td className="px-4 py-3 font-mono text-xs text-foreground">{o.order_no}</td>
                <td className="px-4 py-3 text-foreground">{o.contact_name || "—"}</td>
                <td className="px-4 py-3 font-semibold text-foreground">RM {parseFloat(String(o.total_amount ?? 0)).toFixed(2)}</td>
                <td className="px-4 py-3 text-foreground">{o.total_points ?? 0}</td>
                <td className="px-4 py-3 text-foreground">{o.coupon_title || "—"}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getOrderStatusBadgeClass(o.status)}`}>{getOrderStatusLabel(o.status)}</span></td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getPaymentStatusBadgeClass(o.payment_status || PAYMENT_STATUS.PENDING)}`}>{getPaymentStatusLabel(o.payment_status || PAYMENT_STATUS.PENDING)}</span></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("zh-CN")}</td>
                <td className="px-4 py-3">
                  <PermissionGate permission="order.update">
                    <select value="" onChange={(e) => { if (e.target.value) handleStatusChange(o.id, e.target.value); }} className="rounded-lg border border-border bg-transparent px-2 py-1 text-[10px] text-foreground outline-none">
                      <option value="">改状态</option>
                      {actionStatuses.filter((s) => s !== o.status).map((s) => <option key={s} value={s}>{getOrderStatusLabel(s)}</option>)}
                    </select>
                  </PermissionGate>
                </td>
                <td className="px-4 py-3"><button onClick={() => navigate(`/admin/orders/${o.id}`)} className="text-xs text-gold hover:underline">详情</button></td>
              </tr>
            ))}
            {paginatedData.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-muted-foreground">无匹配订单</td></tr>
            )}
          </tbody>
        </table>
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>
    </div>
  );
}
