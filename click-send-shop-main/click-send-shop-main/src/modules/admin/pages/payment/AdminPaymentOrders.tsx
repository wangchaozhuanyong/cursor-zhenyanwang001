import { formatDateTime } from "@/utils/formatDateTime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard } from "lucide-react";
import { AnimatedTable } from "@/modules/micro-interactions";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import {
  buildPaymentOrderFilterChips,
  hasActivePaymentOrderFilters,
  removePaymentOrderFilterChip,
} from "@/utils/adminPaymentFilters";
import PermissionGate from "@/components/admin/PermissionGate";
import Pagination from "@/components/admin/Pagination";
import PaymentAdminSubnav from "./PaymentAdminSubnav";
import * as paymentAdmin from "@/services/admin/paymentAdminService";
import type { PaymentOrderAdminRow } from "@/types/adminPayment";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";
import { Tx } from "@/components/admin/AdminText";
import { AdminPageTitle } from "@/components/admin/AdminFieldHint";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import {
  labelChannelCode,
  labelCurrency,
  labelPaymentOrderStatus,
} from "@/utils/paymentAdminLabels";

const statusOpts = [
  { value: "", label: "全部" },
  { value: "pending", label: "待支付" },
  { value: "paid", label: "已支付" },
];

export default function AdminPaymentOrders() {
  const { confirm } = useAdminConfirm();
  const [list, setList] = useState<PaymentOrderAdminRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [markOrderId, setMarkOrderId] = useState("");
  const [markReason, setMarkReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(pageSize),
      };
      if (status) params.status = status;
      if (keyword.trim()) params.keyword = keyword.trim();
      const data = await paymentAdmin.fetchAdminPaymentOrders(params);
      setList(data.list);
      setTotal(data.total);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载支付流水失败"));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, keyword]);

  useEffect(() => {
    void load();
  }, [load]);

  const filterState = { status, keyword };
  const filterChips = useMemo(() => buildPaymentOrderFilterChips(filterState), [status, keyword]);
  const filtersActive = hasActivePaymentOrderFilters(filterState);
  const emptyGuide = filtersActive ? ADMIN_EMPTY_GUIDES.paymentOrdersFiltered : ADMIN_EMPTY_GUIDES.paymentOrders;

  const clearFilters = () => {
    setStatus("");
    setKeyword("");
    setPage(1);
  };

  const handleRemoveFilterChip = (key: string) => {
    const patch = removePaymentOrderFilterChip(key);
    if ("status" in patch) setStatus(patch.status ?? "");
    if ("keyword" in patch) setKeyword(patch.keyword ?? "");
    setPage(1);
  };

  const markPaid = async () => {
    const id = markOrderId.trim();
    if (!id) {
      toast.error("请填写订单号或内部订单编号");
      return;
    }
    try {
      await paymentAdmin.markAdminOrderPaid(id, { reason: markReason.trim() || undefined });
      toast.success("已补记为已支付");
      setMarkOrderId("");
      setMarkReason("");
      void load();
    } catch (e) {
      toast.error(toastErrorMessage(e, "补记失败"));
    }
  };

  return (
    <PermissionGate permission="payment.manage">
      <div className="p-4 md:p-6">
        <div className="mb-2">
          <AdminPageTitle title={<Tx>支付管理</Tx>} hint={<Tx>支付单流水、线下补单</Tx>} />
        </div>
        <PaymentAdminSubnav />

        <div className="theme-rounded mb-6 border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
          <h2 className="mb-2 text-sm font-semibold text-foreground"><Tx>补记已支付（线下转账核对后）</Tx></h2>
          <div className="flex flex-col gap-2 md:flex-row md:items-end">
            <label className="flex-1 text-xs text-muted-foreground"><Tx>
              订单编号
              </Tx><input
                value={markOrderId}
                onChange={(e) => setMarkOrderId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="填写内部订单编号（见下方流水悬停提示）"
                title="补单接口需要 orders 表内部编号，可在支付流水订单列悬停查看"
              />
            </label>
            <label className="flex-[2] text-xs text-muted-foreground"><Tx>
              备注
              </Tx><input
                value={markReason}
                onChange={(e) => setMarkReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="可选"
              />
            </label>
            <button
              type="button"
              onClick={() =>
                confirm({
                  title: "确认补单",
                  description: `确定将订单「${markOrderId.trim()}」补记为已支付？此操作会修改订单支付状态。`,
                  confirmText: "确认补单",
                  danger: true,
                  onConfirm: () => markPaid(),
                })
              }
              className="rounded-full bg-[var(--theme-price)] px-5 py-2.5 text-sm font-semibold btn-theme-gradient"
            ><Tx>
              确认补单
            </Tx></button>
          </div>
        </div>

        <div className="mb-4 space-y-2">
          <div className="flex flex-wrap gap-3">
            <select
              value={status}
              onChange={(e) => { setPage(1); setStatus(e.target.value); }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {statusOpts.map((o) => (
                <option key={o.value || "all"} value={o.value}>{o.label}</option>
              ))}
            </select>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setPage(1), void load())}
              placeholder="订单号 / 交易号"
              className="min-w-[200px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => { setPage(1); void load(); }}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium"
            ><Tx>
              查询
            </Tx></button>
          </div>
          <AdminFilterSummaryBar chips={filterChips} onClearAll={clearFilters} onRemove={handleRemoveFilterChip} />
        </div>

        <AnimatedTable
          loading={loading}
          rows={list}
          rowKey={(r) => r.id}
          skeletonRows={8}
          skeletonCols={7}
          className="theme-rounded border border-[var(--theme-border)] overflow-x-auto"
          tableClassName="w-full min-w-[800px] text-left text-sm"
          theadClassName="bg-secondary/50 text-xs text-muted-foreground"
          thead={(
            <tr>
              <th className="px-3 py-2"><Tx>支付单</Tx></th>
              <th className="px-3 py-2"><Tx>订单</Tx></th>
              <th className="px-3 py-2"><Tx>渠道</Tx></th>
              <th className="px-3 py-2"><Tx>金额</Tx></th>
              <th className="px-3 py-2"><Tx>状态</Tx></th>
              <th className="px-3 py-2"><Tx>交易号</Tx></th>
              <th className="px-3 py-2"><Tx>时间</Tx></th>
            </tr>
          )}
          footer={<Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={() => {}} />}
          emptyIcon={emptyGuide.icon}
          emptyTitle={emptyGuide.title}
          emptyDescription={emptyGuide.description}
          emptyAction={(
            <AdminEmptyGuideActions
              guide={emptyGuide}
              showClearFilters={filtersActive}
              onClearFilters={clearFilters}
            />
          )}
          renderRow={(r) => (
            <>
              <td className="px-3 py-2 text-xs text-muted-foreground" title={r.id}>
                支付单 {r.id.slice(0, 8)}…
              </td>
              <td className="px-3 py-2 font-medium" title={r.order_id || undefined}>
                {r.order_no || "—"}
              </td>
              <td className="px-3 py-2">{labelChannelCode(r.channel_code)}</td>
              <td className="px-3 py-2">
                {labelCurrency(r.currency, { short: true })} {Number(r.amount).toFixed(2)}
              </td>
              <td className="px-3 py-2">{labelPaymentOrderStatus(r.status)}</td>
              <td className="px-3 py-2 font-mono text-xs">{r.payment_transaction_no || "—"}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.payment_time ? formatDateTime(r.payment_time) : "—"}</td>
            </>
          )}
        />
      </div>
    </PermissionGate>
  );
}
