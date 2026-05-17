import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "@/utils/formatDateTime";
import { RotateCcw } from "lucide-react";
import { AnimatedTable } from "@/modules/micro-interactions";
import PermissionGate from "@/components/admin/PermissionGate";
import Pagination from "@/components/admin/Pagination";
import PaymentAdminSubnav from "./PaymentAdminSubnav";
import * as paymentAdmin from "@/services/admin/paymentAdminService";
import type { PaymentEventAdminRow } from "@/types/adminPayment";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";
import { Tx } from "@/components/admin/AdminText";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import {
  labelPaymentEventType,
  labelProcessingResult,
  labelProvider,
  labelVerifyStatus,
  PAYMENT_PROVIDER_FILTER_OPTIONS,
} from "@/utils/paymentAdminLabels";

export default function AdminPaymentEvents() {
  const { confirm } = useAdminConfirm();
  const [list, setList] = useState<PaymentEventAdminRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [provider, setProvider] = useState("");
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
      if (provider.trim()) params.provider = provider.trim();
      if (orderId.trim()) params.orderId = orderId.trim();
      const data = await paymentAdmin.fetchAdminPaymentEvents(params);
      setList(data.list);
      setTotal(data.total);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载事件失败"));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, provider, orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const replay = async (id: string) => {
    try {
      await paymentAdmin.replayAdminPaymentEvent(id);
      toast.success("已记录重放操作");
    } catch (e) {
      toast.error(toastErrorMessage(e, "操作失败"));
    }
  };

  return (
    <PermissionGate permission="payment.manage">
      <div className="p-4 md:p-6">
        <div className="mb-2">
          <h1 className="text-xl font-bold text-foreground"><Tx>支付管理</Tx></h1>
          <p className="text-sm text-muted-foreground"><Tx>支付回调与内部事件审计</Tx></p>
        </div>
        <PaymentAdminSubnav />

        <div className="mb-4 flex flex-wrap gap-3">
          <select
            value={provider}
            onChange={(e) => { setPage(1); setProvider(e.target.value); }}
            className="min-w-[180px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {PAYMENT_PROVIDER_FILTER_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="订单号或内部编号（可选）"
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

        <AnimatedTable
          loading={loading}
          rows={list}
          rowKey={(r) => r.id}
          skeletonRows={8}
          skeletonCols={6}
          className="theme-rounded border border-[var(--theme-border)] overflow-x-auto"
          tableClassName="w-full min-w-[900px] text-left text-sm"
          theadClassName="bg-secondary/50 text-xs text-muted-foreground"
          thead={(
            <tr>
              <th className="px-3 py-2"><Tx>时间</Tx></th>
              <th className="px-3 py-2"><Tx>支付网关</Tx></th>
              <th className="px-3 py-2"><Tx>事件类型</Tx></th>
              <th className="px-3 py-2"><Tx>验签 / 处理</Tx></th>
              <th className="px-3 py-2"><Tx>订单</Tx></th>
              <th className="px-3 py-2"><Tx>操作</Tx></th>
            </tr>
          )}
          footer={<Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={() => {}} />}
          emptyIcon={RotateCcw}
          emptyTitle="暂无数据"
          renderRow={(r) => (
            <>
              <td className="px-3 py-2 text-xs text-muted-foreground">{formatDateTime(r.created_at)}</td>
              <td className="px-3 py-2">{labelProvider(r.provider)}</td>
              <td className="px-3 py-2 text-xs" title={r.event_type}>{labelPaymentEventType(r.event_type)}</td>
              <td className="px-3 py-2 text-xs">
                {labelVerifyStatus(r.verify_status)} / {labelProcessingResult(r.processing_result)}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.order_id ? "已关联订单" : "—"}</td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() =>
                    confirm({
                      title: "确认重放",
                      description: "确定重放该支付事件？可能影响订单支付状态，请谨慎操作。",
                      confirmText: "重放",
                      danger: true,
                      onConfirm: () => replay(r.id),
                    })
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--theme-price)]"
                >
                  <RotateCcw size={12} /><Tx> 重放记录
                </Tx></button>
              </td>
            </>
          )}
        />
      </div>
    </PermissionGate>
  );
}
