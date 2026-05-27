import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Scale } from "lucide-react";
import { AnimatedTable } from "@/modules/micro-interactions";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import PermissionGate from "@/components/admin/PermissionGate";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import Pagination from "@/components/admin/Pagination";
import PaymentAdminSubnav from "./PaymentAdminSubnav";
import * as paymentAdmin from "@/services/admin/paymentAdminService";
import type { PaymentReconciliationRow } from "@/types/adminPayment";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import {
  labelChannelCode,
  labelProvider,
  labelReconciliationStatus,
  PAYMENT_CHANNEL_FILTER_OPTIONS,
  PAYMENT_PROVIDER_FILTER_OPTIONS,
} from "@/utils/paymentAdminLabels";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { useAdminT } from "@/hooks/useAdminT";
import { useLocalizedAdminEmptyGuide } from "@/hooks/useLocalizedAdminEmptyGuide";
import {
  adminTableHeadCellClass,
  adminTdClassName,
  type AdminTableAlign,
} from "@/utils/adminTableClasses";

const RECONCILIATION_COLUMN_ALIGNS: AdminTableAlign[] = [
  "left", "left", "left", "right", "right", "right", "center",
];
const RECONCILIATION_HEADERS = ["日期", "支付网关", "支付渠道", "笔数", "成功金额", "差异", "状态"] as const;

export default function AdminPaymentReconciliations() {
  const { tText } = useAdminT();
  const reconciliationsEmptyGuide = useLocalizedAdminEmptyGuide(ADMIN_EMPTY_GUIDES.paymentReconciliations);
  const { confirm } = useAdminConfirm();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [reconcileDate, setReconcileDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [provider, setProvider] = useState("stripe");
  const [channelCode, setChannelCode] = useState("");
  const [diffAmount, setDiffAmount] = useState("");
  const [notes, setNotes] = useState("");

  const queryParams = useMemo(
    () => ({ page: String(page), pageSize: String(pageSize) }),
    [page, pageSize],
  );

  const listQuery = useQuery({
    queryKey: adminQueryKeys.paymentReconciliations(queryParams),
    queryFn: () => paymentAdmin.fetchAdminPaymentReconciliations(queryParams),
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });

  const list = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading && !listQuery.data;

  const createMutation = useMutation({
    mutationFn: () =>
      paymentAdmin.createAdminPaymentReconciliation({
        reconcile_date: reconcileDate,
        provider,
        channel_code: channelCode.trim() || undefined,
        diff_amount: diffAmount.trim() ? Number(diffAmount) : undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: async () => {
      toast.success(tText("已创建对账草稿"));
      setNotes("");
      setDiffAmount("");
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.paymentReconciliationsRoot() });
    },
    onError: (e) => toast.error(toastErrorMessage(e, tText("创建失败"))),
  });

  const create = () => createMutation.mutate();

  const renderMobileCard = (r: PaymentReconciliationRow) => (
    <AdminTableMobileCard>
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">{r.reconcile_date}</p>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{tText(labelReconciliationStatus(r.status))}</span>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{tText(labelProvider(r.provider))}</span>
        {r.channel_code ? <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{tText(labelChannelCode(r.channel_code))}</span> : null}
      </div>
      <div className="space-y-2">
        <AdminTableMobileCardField label={tText("笔数")}>
          <span className="text-xs text-muted-foreground">{r.order_count}</span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={tText("成功金额")}>
          <span className="text-sm font-semibold text-[var(--theme-price)]">RM {Number(r.success_amount).toFixed(2)}</span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={tText("差异")}>
          <span className="text-xs text-muted-foreground">RM {Number(r.diff_amount).toFixed(2)}</span>
        </AdminTableMobileCardField>
      </div>
    </AdminTableMobileCard>
  );

  return (
    <PermissionGate permission="payment.manage">
      <AdminPageShell
        hint={<Tx>按日 / 渠道汇总实收与差异（手续费来自渠道 JSON 配置）</Tx>}
        filters={<PaymentAdminSubnav />}
      >
        <div className="theme-rounded mb-6 border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
          <h2 className="mb-3 text-sm font-semibold text-foreground"><Tx>新建对账草稿</Tx></h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs text-muted-foreground"><Tx>
              对账日期
              </Tx><div className="mt-1">
                <SegmentedDateInput
                  value={reconcileDate}
                  onChange={setReconcileDate}
                  className="w-full [&>div]:border-border [&>div]:bg-background"
                />
              </div>
            </label>
            <label className="text-xs text-muted-foreground"><Tx>
              支付网关
              </Tx><select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {PAYMENT_PROVIDER_FILTER_OPTIONS.filter((o) => o.value).map((o) => (
                  <option key={o.value} value={o.value}>
                    {tText(o.label)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground"><Tx>
              支付渠道（可选）
              </Tx><select
                value={channelCode}
                onChange={(e) => setChannelCode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {PAYMENT_CHANNEL_FILTER_OPTIONS.map((o) => (
                  <option key={o.value || "any"} value={o.value}>
                    {tText(o.label)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground"><Tx>
              差异金额（可选）
              </Tx><input
                value={diffAmount}
                onChange={(e) => setDiffAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="0"
              />
            </label>
          </div>
          <label className="mt-3 block text-xs text-muted-foreground"><Tx>
            备注
            </Tx><input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() =>
              confirm({ title: tText("确认创建"),
                description: tText(`确定创建 ${reconcileDate} 的对账草稿？`),
                confirmText: tText("创建"),
                onConfirm: () => create(),
              })
            }
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--theme-price)] px-5 py-2.5 text-sm font-semibold btn-theme-gradient"
          >
            <Plus size={16} /><Tx> 创建草稿
          </Tx></button>
        </div>

        <AnimatedTable
          loading={loading}
          rows={list}
          rowKey={(r) => r.id}
          skeletonRows={8}
          skeletonCols={7}
          className="theme-rounded border border-[var(--theme-border)] overflow-x-auto"
          tableClassName="w-full min-w-[720px] text-sm"
          theadClassName="bg-secondary/50 text-xs text-muted-foreground"
          thead={(
            <tr>
              {RECONCILIATION_HEADERS.map((label, index) => (
                <th key={label} className={adminTableHeadCellClass(RECONCILIATION_COLUMN_ALIGNS[index], "px-3 py-2")}>
                  <Tx>{label}</Tx>
                </th>
              ))}
            </tr>
          )}
          footer={<Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={() => {}} />}
          emptyIcon={reconciliationsEmptyGuide.icon}
          emptyTitle={reconciliationsEmptyGuide.title}
          emptyDescription={reconciliationsEmptyGuide.description}
          emptyAction={<AdminEmptyGuideActions guide={reconciliationsEmptyGuide} />}
          renderMobileCard={renderMobileCard}
          renderRow={(r) => (
            <>
              <td className={adminTdClassName("px-3 py-2", "left")}>{r.reconcile_date}</td>
              <td className={adminTdClassName("px-3 py-2", "left")}>{tText(labelProvider(r.provider))}</td>
              <td className={adminTdClassName("px-3 py-2", "left")}>{r.channel_code ? tText(labelChannelCode(r.channel_code)) : "—"}</td>
              <td className={adminTdClassName("px-3 py-2", "right")}>{r.order_count}</td>
              <td className={adminTdClassName("px-3 py-2", "right")}>RM {Number(r.success_amount).toFixed(2)}</td>
              <td className={adminTdClassName("px-3 py-2", "right")}>RM {Number(r.diff_amount).toFixed(2)}</td>
              <td className={adminTdClassName("px-3 py-2", "center")}>{tText(labelReconciliationStatus(r.status))}</td>
            </>
          )}
        />
      </AdminPageShell>
    </PermissionGate>
  );
}
