import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, ShieldAlert, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import AdminPageShell from "@/components/admin/AdminPageShell";
import Pagination from "@/components/admin/Pagination";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import { Tx } from "@/components/admin/AdminText";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { fetchAuditLogs, type AuditLogListParams, type AuditLogRow } from "@/services/admin/logService";
import { formatDateTime } from "@/utils/formatDateTime";

const PRIVACY_ACTIONS = "user.data_export,user.account_cancel";

function actionLabel(actionType: string) {
  if (actionType === "user.data_export") return "数据导出";
  if (actionType === "user.account_cancel") return "账号注销";
  return actionType;
}

function actionIcon(actionType: string) {
  return actionType === "user.account_cancel" ? Trash2 : Download;
}

export default function AdminPrivacyRequests() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [actionType, setActionType] = useState("");
  const [result, setResult] = useState<"" | "success" | "failure">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filters = useMemo<AuditLogListParams>(() => ({
    page,
    pageSize,
    keyword: keyword.trim() || undefined,
    objectType: "user",
    actionType: actionType || undefined,
    actionTypes: actionType ? undefined : PRIVACY_ACTIONS,
    result: result || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sortOrder: "desc",
  }), [actionType, dateFrom, dateTo, keyword, page, pageSize, result]);

  const query = useQuery({
    queryKey: adminQueryKeys.privacyRequests(filters),
    queryFn: () => fetchAuditLogs(filters),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });

  const rows = query.data?.list ?? [];
  const total = query.data?.total ?? 0;
  const loading = query.isLoading && !query.data;
  const filtersActive = Boolean(keyword.trim() || actionType || result || dateFrom || dateTo);

  const clearFilters = () => {
    setKeyword("");
    setActionType("");
    setResult("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <AdminPageShell
      showTitle
      title={<Tx>隐私请求</Tx>}
      hint={<Tx>集中查看客户自助数据导出和账号注销记录，处理依据仍以审计日志为准。</Tx>}
      filters={(
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="grid gap-2 md:grid-cols-[minmax(0,1.3fr)_180px_160px_auto_auto]">
            <input
              value={keyword}
              onChange={(event) => { setKeyword(event.target.value); setPage(1); }}
              placeholder="搜索用户 ID、摘要、动作"
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-[var(--theme-primary)]"
            />
            <select value={actionType} onChange={(event) => { setActionType(event.target.value); setPage(1); }} className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
              <option value="">全部请求</option>
              <option value="user.data_export">数据导出</option>
              <option value="user.account_cancel">账号注销</option>
            </select>
            <select value={result} onChange={(event) => { setResult(event.target.value as "" | "success" | "failure"); setPage(1); }} className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
              <option value="">全部结果</option>
              <option value="success">成功</option>
              <option value="failure">失败</option>
            </select>
            <SegmentedDateInput value={dateFrom} onChange={(value) => { setDateFrom(value); setPage(1); }} />
            <SegmentedDateInput value={dateTo} onChange={(value) => { setDateTo(value); setPage(1); }} />
          </div>
          {filtersActive ? (
            <div className="mt-3 flex justify-end">
              <UnifiedButton type="button" onClick={clearFilters} className="rounded-lg border border-border px-3 py-2 text-xs hover:bg-secondary">
                <Tx>清空筛选</Tx>
              </UnifiedButton>
            </div>
          ) : null}
        </div>
      )}
    >
      <section className="rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[160px_120px_minmax(0,1fr)_150px_110px] gap-3 border-b border-border px-4 py-3 text-xs font-semibold text-muted-foreground max-lg:hidden">
          <span><Tx>时间</Tx></span>
          <span><Tx>类型</Tx></span>
          <span><Tx>摘要</Tx></span>
          <span><Tx>用户</Tx></span>
          <span className="text-right"><Tx>结果</Tx></span>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground"><Tx>加载中...</Tx></div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground"><Tx>{filtersActive ? "当前筛选下暂无隐私请求" : "暂无隐私请求"}</Tx></div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((row) => <PrivacyRow key={row.id} row={row} />)}
          </div>
        )}
      </section>
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={(next) => { setPageSize(next); setPage(1); }} />
    </AdminPageShell>
  );
}

function PrivacyRow({ row }: { row: AuditLogRow }) {
  const Icon = actionIcon(row.action_type);
  return (
    <article className="grid gap-3 px-4 py-3 text-sm lg:grid-cols-[160px_120px_minmax(0,1fr)_150px_110px] lg:items-center">
      <p className="text-xs text-muted-foreground">{formatDateTime(row.created_at)}</p>
      <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
        <Icon size={13} />
        {actionLabel(row.action_type)}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-foreground">{row.summary || "-"}</p>
        {row.error_message ? <p className="mt-1 line-clamp-1 text-xs text-[var(--theme-danger)]">{row.error_message}</p> : null}
      </div>
      <div className="min-w-0">
        {row.object_id ? (
          <Link to={`/admin/users/${row.object_id}`} className="inline-flex items-center gap-1 text-xs text-[var(--theme-primary)] hover:underline">
            <ShieldAlert size={13} />
            {row.object_id}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </div>
      <div className="lg:text-right">
        <span className={row.result === "success" ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700" : "rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"}>
          {row.result === "success" ? "成功" : "失败"}
        </span>
      </div>
    </article>
  );
}
