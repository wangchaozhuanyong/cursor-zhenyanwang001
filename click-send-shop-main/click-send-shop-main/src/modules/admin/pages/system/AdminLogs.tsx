import { formatDateTime } from "@/utils/formatDateTime";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Shield, ChevronRight } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AdminTableCell, AdminTableCellGroup } from "@/components/admin/AdminTableCell";
import { AnimatedTable } from "@/modules/micro-interactions";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import {
  buildAuditLogFilterChips,
  hasActiveAuditLogFilters,
  removeAuditLogFilterChip,
} from "@/utils/adminAuditLogFilters";
import Pagination from "@/components/admin/Pagination";
import { toast } from "sonner";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { fetchAuditLogs } from "@/services/admin/logService";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import type { AuditLogRow } from "@/services/admin/logService";
import AuditLogDetailPanel from "@/components/admin/AuditLogDetailPanel";
import {
  getAuditActionTypeFilterOptions,
  getAuditObjectTypeFilterOptions,
  zhActionType,
  zhAuditResult,
  zhAuditSummary,
  zhObjectType,
  zhOperatorRole,
} from "@/utils/auditLogI18n";
import { Tx } from "@/components/admin/AdminText";
import AdminFieldHint from "@/components/admin/AdminFieldHint";
import { THEME_BADGE_DANGER } from "@/utils/themeVisuals";
import { adminQueryKeys, type AuditLogListParams } from "@/lib/adminQueryKeys";

export default function AdminLogs() {
  const can = useAdminPermissionStore((s) => s.can);
  const isSuperAdmin = useAdminPermissionStore((s) => s.isSuperAdmin);
  const canAudit = isSuperAdmin || can("audit.view");
  const [searchParams, setSearchParams] = useSearchParams();

  const [auditPage, setAuditPage] = useState(() => Math.max(1, Number(searchParams.get("page")) || 1));
  const [auditPageSize, setAuditPageSize] = useState(() => Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20)));
  const [auditKeyword, setAuditKeyword] = useState(() => searchParams.get("keyword") || "");
  const [auditResult, setAuditResult] = useState<"" | "success" | "failure">(() => {
    const result = searchParams.get("result");
    return result === "success" || result === "failure" ? result : "";
  });
  const [dateFrom, setDateFrom] = useState(() => searchParams.get("dateFrom") || "");
  const [dateTo, setDateTo] = useState(() => searchParams.get("dateTo") || "");
  const [operatorId, setOperatorId] = useState(() => searchParams.get("operatorId") || "");
  const [objectType, setObjectType] = useState(() => searchParams.get("objectType") || "");
  const [objectId, setObjectId] = useState(() => searchParams.get("objectId") || "");
  const [actionType, setActionType] = useState(() => searchParams.get("actionType") || "");
  const [detail, setDetail] = useState<AuditLogRow | null>(null);

  const buildFilterParams = (overrides?: Partial<AuditLogListParams>): AuditLogListParams => ({
    keyword: auditKeyword.trim() || undefined,
    result: auditResult || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    operatorId: operatorId.trim() || undefined,
    objectType: objectType.trim() || undefined,
    objectId: objectId.trim() || undefined,
    actionType: actionType.trim() || undefined,
    ...overrides,
  });

  const [submittedFilters, setSubmittedFilters] = useState<AuditLogListParams>(() =>
    buildFilterParams({
      keyword: searchParams.get("keyword") || undefined,
      result: searchParams.get("result") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      operatorId: searchParams.get("operatorId") || undefined,
      objectType: searchParams.get("objectType") || undefined,
      objectId: searchParams.get("objectId") || undefined,
      actionType: searchParams.get("actionType") || undefined,
    }),
  );

  const queryParams = useMemo(
    () => ({
      ...submittedFilters,
      page: auditPage,
      pageSize: auditPageSize,
      sortOrder: "desc" as const,
    }),
    [auditPage, auditPageSize, submittedFilters],
  );

  const auditQuery = useQuery({
    queryKey: adminQueryKeys.auditLogs(queryParams),
    queryFn: () => fetchAuditLogs(queryParams),
    enabled: canAudit,
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });

  const auditList = auditQuery.data?.list ?? [];
  const auditTotal = auditQuery.data?.total ?? 0;
  const auditLoading = auditQuery.isLoading && !auditQuery.data;

  const syncUrl = useCallback((params: AuditLogListParams & { page?: number; pageSize?: number }) => {
    const next = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value == null || value === "" || key === "sortOrder") return;
      if (key === "page" && Number(value) === 1) return;
      if (key === "pageSize" && Number(value) === 20) return;
      next.set(key, String(value));
    });
    setSearchParams(next, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    if (!canAudit) return;
    syncUrl(queryParams);
  }, [canAudit, queryParams, syncUrl]);

  const applySubmittedFilters = (filters: AuditLogListParams, page = 1) => {
    setSubmittedFilters(filters);
    setAuditPage(page);
  };

  const handleAuditSearch = () => {
    applySubmittedFilters(buildFilterParams(), 1);
  };

  const objectTypeOptions = useMemo(() => getAuditObjectTypeFilterOptions(), []);
  const actionTypeOptions = useMemo(() => getAuditActionTypeFilterOptions(), []);

  const filterState = useMemo(
    () => ({ keyword: auditKeyword, result: auditResult, dateFrom, dateTo, operatorId, objectType, objectId, actionType }),
    [actionType, auditKeyword, auditResult, dateFrom, dateTo, objectId, objectType, operatorId],
  );
  const filterChips = useMemo(() => buildAuditLogFilterChips(filterState), [filterState]);
  const filtersActive = hasActiveAuditLogFilters(filterState);
  const emptyGuide = filtersActive ? ADMIN_EMPTY_GUIDES.auditLogsFiltered : ADMIN_EMPTY_GUIDES.auditLogs;

  const clearFilters = () => {
    setAuditKeyword("");
    setAuditResult("");
    setDateFrom("");
    setDateTo("");
    setOperatorId("");
    setObjectType("");
    setObjectId("");
    setActionType("");
    setSearchParams(new URLSearchParams(), { replace: true });
    applySubmittedFilters({}, 1);
  };

  const handleRemoveFilterChip = (key: string) => {
    const patch = removeAuditLogFilterChip(key);
    const nextKeyword = "keyword" in patch ? (patch.keyword ?? "") : auditKeyword;
    const nextResult = "result" in patch ? (patch.result ?? "") : auditResult;
    const nextDateFrom = "dateFrom" in patch ? (patch.dateFrom ?? "") : dateFrom;
    const nextDateTo = "dateTo" in patch ? (patch.dateTo ?? "") : dateTo;
    const nextOperatorId = "operatorId" in patch ? (patch.operatorId ?? "") : operatorId;
    const nextObjectType = "objectType" in patch ? (patch.objectType ?? "") : objectType;
    const nextObjectId = "objectId" in patch ? (patch.objectId ?? "") : objectId;
    const nextActionType = "actionType" in patch ? (patch.actionType ?? "") : actionType;
    if ("keyword" in patch) setAuditKeyword(nextKeyword);
    if ("result" in patch) setAuditResult(nextResult);
    if ("dateFrom" in patch) setDateFrom(nextDateFrom);
    if ("dateTo" in patch) setDateTo(nextDateTo);
    if ("operatorId" in patch) setOperatorId(nextOperatorId);
    if ("objectType" in patch) setObjectType(nextObjectType);
    if ("objectId" in patch) setObjectId(nextObjectId);
    if ("actionType" in patch) setActionType(nextActionType);
    applySubmittedFilters(
      {
        keyword: nextKeyword.trim() || undefined,
        result: nextResult || undefined,
        dateFrom: nextDateFrom || undefined,
        dateTo: nextDateTo || undefined,
        operatorId: nextOperatorId.trim() || undefined,
        objectType: nextObjectType.trim() || undefined,
        objectId: nextObjectId.trim() || undefined,
        actionType: nextActionType.trim() || undefined,
      },
      1,
    );
  };

  if (!canAudit) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground"><Tx>审计日志</Tx></h1>
          <p className="text-sm text-muted-foreground"><Tx>你无权查看审计日志。</Tx></p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Shield size={16} className="shrink-0 text-[var(--theme-price)]" /><Tx>审计日志</Tx>
        </h1>
        <AdminFieldHint text={<Tx>管理端操作审计（含失败记录与前后快照）</Tx>} size="md" />
      </div>

      <div className="space-y-2">
        <div className="min-w-0">
          <label className="mb-1 block text-xs text-muted-foreground"><Tx>关键词</Tx></label>
          <div className="flex items-center gap-1.5 theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input
              placeholder="摘要 / 操作人 / 动作 / 对象编号 / 错误信息"
              value={auditKeyword}
              onChange={(e) => setAuditKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuditSearch()}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>
        <AdminFilterSummaryBar chips={filterChips} onClearAll={clearFilters} onRemove={handleRemoveFilterChip} />
        <details className="group theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2">
          <summary className="cursor-pointer list-none text-sm font-medium text-foreground marker:content-none">
            <span className="text-muted-foreground group-open:hidden">展开高级筛选</span>
            <span className="hidden group-open:inline">收起高级筛选</span>
          </summary>
          <div className="mt-3 flex flex-col gap-3 border-t border-[var(--theme-border)] pt-3 lg:flex-row lg:flex-wrap lg:items-end">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground"><Tx>结果</Tx></label>
              <select
                value={auditResult}
                onChange={(e) => setAuditResult(e.target.value as "" | "success" | "failure")}
                className="w-full min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
              >
                <option value=""><Tx>全部</Tx></option>
                <option value="success"><Tx>成功</Tx></option>
                <option value="failure"><Tx>失败</Tx></option>
              </select>
            </div>
            <div className="min-w-[10rem] flex-1">
              <label className="mb-1 block text-xs text-muted-foreground"><Tx>操作人编号</Tx></label>
              <input
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAuditSearch()}
                className="w-full min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
                placeholder="管理员或用户编号（可填尾部几位）"
              />
            </div>
            <div className="min-w-[9rem] flex-1">
              <label className="mb-1 block text-xs text-muted-foreground"><Tx>对象类型</Tx></label>
              <select
                value={objectType}
                onChange={(e) => setObjectType(e.target.value)}
                className="w-full min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
              >
                <option value=""><Tx>全部类型</Tx></option>
                {objectTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[10rem] flex-1">
              <label className="mb-1 block text-xs text-muted-foreground"><Tx>对象编号</Tx></label>
              <input
                value={objectId}
                onChange={(e) => setObjectId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAuditSearch()}
                className="w-full min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
                placeholder="订单、用户等对象编号"
              />
            </div>
            <div className="min-w-[11rem] flex-[1.2]">
              <label className="mb-1 block text-xs text-muted-foreground"><Tx>动作</Tx></label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full min-h-[44px] theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
              >
                <option value=""><Tx>全部动作</Tx></option>
                {actionTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="audit-date-from" className="mb-1 block text-xs text-muted-foreground"><Tx>开始日期</Tx></label>
              <SegmentedDateInput
                id="audit-date-from"
                value={dateFrom}
                onChange={setDateFrom}
                className="w-full [&>div]:theme-rounded [&>div]:border-[var(--theme-border)] [&>div]:bg-[var(--theme-surface)]"
              />
            </div>
            <div>
              <label htmlFor="audit-date-to" className="mb-1 block text-xs text-muted-foreground"><Tx>结束日期</Tx></label>
              <SegmentedDateInput
                id="audit-date-to"
                value={dateTo}
                onChange={setDateTo}
                className="w-full [&>div]:theme-rounded [&>div]:border-[var(--theme-border)] [&>div]:bg-[var(--theme-surface)]"
              />
            </div>
            <button
              type="button"
              onClick={handleAuditSearch}
              className="min-h-[44px] theme-rounded px-5 py-2 text-sm font-semibold text-[var(--theme-primary-foreground)]"
            ><Tx>查询</Tx></button>
          </div>
        </details>
      </div>

      <div className="space-y-3 md:hidden">
        {auditLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow space-y-3">
                <div className="skeleton-base skeleton-shimmer h-3 w-28 rounded" />
                <div className="skeleton-base skeleton-shimmer h-4 w-2/3 rounded" />
                <div className="skeleton-base skeleton-shimmer h-3 w-full rounded" />
                <div className="skeleton-base skeleton-shimmer h-10 w-full rounded-lg" />
              </div>
            ))
          : null}
        {!auditLoading && auditList.map((row) => (
          <div key={row.id} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">{row.created_at ? formatDateTime(row.created_at) : "—"}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${row.result === "success" ? "bg-[color-mix(in_srgb,var(--theme-price)_12%,transparent)] text-[var(--theme-price)]" : THEME_BADGE_DANGER}`}>
                {zhAuditResult(row.result)}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">{row.operator_name || "—"}</p>
            <p className="text-xs text-muted-foreground">{zhOperatorRole(row.operator_role)}</p>
            <p className="mt-2 text-xs font-semibold text-foreground">{zhActionType(row.action_type)}</p>
            <p className="mt-1 text-xs text-muted-foreground" title={row.object_id || undefined}>
              {zhObjectType(row.object_type)}{row.object_id ? " · 已关联对象" : ""}
            </p>
            <p className="mt-2 line-clamp-3 text-xs text-foreground">{zhAuditSummary(row.summary)}</p>
            <button type="button" onClick={() => setDetail(row)} className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-1 theme-rounded border border-[var(--theme-border)] py-2 text-sm text-[var(--theme-price)]"><Tx>
              详情 </Tx><ChevronRight size={16} />
            </button>
          </div>
        ))}
        {!auditLoading && auditList.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground"><Tx>暂无审计记录</Tx></div>
        )}
        <Pagination
          total={auditTotal}
          page={auditPage}
          pageSize={auditPageSize}
          onPageChange={setAuditPage}
          onPageSizeChange={(n) => { setAuditPageSize(n); setAuditPage(1); }}
        />
      </div>

      <div className="hidden md:block theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow overflow-hidden">
        <AnimatedTable
          embedded
          loading={auditLoading}
          rows={auditList}
          rowKey={(row) => row.id}
          skeletonRows={8}
          skeletonCols={7}
          tableClassName="w-full min-w-[900px] text-sm"
          theadClassName="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70"
          thead={(
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap"><Tx>时间</Tx></th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground"><Tx>操作人</Tx></th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground"><Tx>动作</Tx></th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground"><Tx>对象</Tx></th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground"><Tx>摘要</Tx></th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground"><Tx>结果</Tx></th>
              <th className="px-3 py-3 w-10" />
            </tr>
          )}
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
          renderRow={(row) => (
            <>
              <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                {row.created_at ? formatDateTime(row.created_at) : "—"}
              </td>
              <td className="max-w-[9rem] px-3 py-2 align-middle">
                <AdminTableCellGroup
                  maxWidth="8.5rem"
                  lines={[
                    { text: row.operator_name || "—" },
                    { text: zhOperatorRole(row.operator_role), muted: true },
                  ]}
                />
              </td>
              <td className="px-3 py-2 text-xs font-semibold text-foreground">{zhActionType(row.action_type)}</td>
              <td className="px-3 py-2 text-xs">
                <span className="text-muted-foreground">{zhObjectType(row.object_type)}</span>
                {row.object_id ? (
                  <div className="text-[10px] text-muted-foreground" title={row.object_id}><Tx>已关联</Tx></div>
                ) : null}
              </td>
              <td className="max-w-[12rem] px-3 py-2 align-middle">
                <AdminTableCell
                  value={zhAuditSummary(row.summary)}
                  fullText={zhAuditSummary(row.summary)}
                  maxWidth="11rem"
                />
              </td>
              <td className="px-3 py-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${row.result === "success" ? "bg-[color-mix(in_srgb,var(--theme-price)_12%,transparent)] text-[var(--theme-price)]" : THEME_BADGE_DANGER}`}>
                  {zhAuditResult(row.result)}
                </span>
              </td>
              <td className="px-3 py-2">
                <button type="button" onClick={() => setDetail(row)} className="text-[var(--theme-price)] hover:underline">
                  <ChevronRight size={16} />
                </button>
              </td>
            </>
          )}
        />
        {(auditLoading || auditList.length > 0) && (
          <Pagination
            total={auditTotal}
            page={auditPage}
            pageSize={auditPageSize}
            onPageChange={setAuditPage}
            onPageSizeChange={(n) => { setAuditPageSize(n); setAuditPage(1); }}
          />
        )}
      </div>

      {detail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetail(null)}>
          <AuditLogDetailPanel detail={detail} onClose={() => setDetail(null)} />
        </div>
      ) : null}
    </div>
  );
}
