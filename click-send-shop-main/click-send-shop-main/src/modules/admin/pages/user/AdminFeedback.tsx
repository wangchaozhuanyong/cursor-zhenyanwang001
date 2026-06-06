import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MessageSquareMore, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import SearchBar from "@/components/SearchBar";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { AdminFilterSelect } from "@/components/admin/AdminFilterControls";
import Pagination from "@/components/admin/Pagination";
import PermissionGate from "@/components/admin/PermissionGate";
import { AdminTableCell, AdminTableCellGroup } from "@/components/admin/AdminTableCell";
import { AdminTableMobileCard, AdminTableMobileCardField } from "@/components/admin/AdminTableMobileCard";
import { Tx } from "@/components/admin/AdminText";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import AnimatedTable from "@/modules/micro-interactions/components/AnimatedTable";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import { useAdminTOptional } from "@/hooks/useAdminT";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import * as feedbackService from "@/services/admin/feedbackService";
import type {
  AdminFeedback as AdminFeedbackItem,
  AdminFeedbackListParams,
  AdminFeedbackStatus,
  AdminFeedbackType,
} from "@/services/admin/feedbackService";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatDateTime } from "@/utils/formatDateTime";
import {
  adminTableCellClass,
  adminTableHeadCellClass,
  type AdminTableAlign,
} from "@/utils/adminTableClasses";
import {
  THEME_BADGE_DANGER,
  THEME_BADGE_MUTED,
  THEME_BADGE_PRIMARY,
  THEME_BADGE_SUCCESS,
  THEME_BADGE_WARNING,
} from "@/utils/themeVisuals";

type FeedbackDraft = {
  status: AdminFeedbackStatus;
  handler_note: string;
};

const STATUS_OPTIONS: Array<{ value: "" | AdminFeedbackStatus; zh: string; en: string }> = [
  { value: "", zh: "全部状态", en: "All statuses" },
  { value: "pending", zh: "待处理", en: "Pending" },
  { value: "in_progress", zh: "处理中", en: "In progress" },
  { value: "resolved", zh: "已解决", en: "Resolved" },
  { value: "dismissed", zh: "不处理", en: "Dismissed" },
];

const TYPE_OPTIONS: Array<{ value: "" | AdminFeedbackType; zh: string; en: string }> = [
  { value: "", zh: "全部类型", en: "All types" },
  { value: "suggestion", zh: "功能建议", en: "Suggestion" },
  { value: "bug", zh: "页面问题", en: "Bug" },
  { value: "order", zh: "订单售后", en: "Order" },
  { value: "payment", zh: "支付问题", en: "Payment" },
  { value: "account", zh: "账号问题", en: "Account" },
  { value: "other", zh: "其他反馈", en: "Other" },
];

const STATUS_LABEL: Record<AdminFeedbackStatus, { zh: string; en: string; cls: string }> = {
  pending: { zh: "待处理", en: "Pending", cls: THEME_BADGE_PRIMARY },
  in_progress: { zh: "处理中", en: "In progress", cls: THEME_BADGE_WARNING },
  resolved: { zh: "已解决", en: "Resolved", cls: THEME_BADGE_SUCCESS },
  dismissed: { zh: "不处理", en: "Dismissed", cls: THEME_BADGE_MUTED },
};

const TYPE_LABEL: Record<AdminFeedbackType, { zh: string; en: string; cls: string }> = {
  suggestion: { zh: "功能建议", en: "Suggestion", cls: THEME_BADGE_SUCCESS },
  bug: { zh: "页面问题", en: "Bug", cls: THEME_BADGE_DANGER },
  order: { zh: "订单售后", en: "Order", cls: THEME_BADGE_WARNING },
  payment: { zh: "支付问题", en: "Payment", cls: THEME_BADGE_PRIMARY },
  account: { zh: "账号问题", en: "Account", cls: THEME_BADGE_PRIMARY },
  other: { zh: "其他反馈", en: "Other", cls: THEME_BADGE_MUTED },
};

const TABLE_HEADERS = ["类型", "反馈内容", "用户", "联系方式", "订单号", "状态", "提交时间", "处理"] as const;
const TABLE_ALIGNS: AdminTableAlign[] = ["center", "left", "left", "left", "left", "center", "left", "left"];

function useLabel() {
  const { locale, tText } = useAdminTOptional();
  const isEn = locale === "en";
  return {
    tText,
    L: (zh: string, en: string) => (isEn ? en : zh),
    optionLabel: (item: { zh: string; en: string }) => (isEn ? item.en : item.zh),
  };
}

function statusBadge(status: AdminFeedbackStatus, label: (item: { zh: string; en: string }) => string) {
  const item = STATUS_LABEL[status] ?? STATUS_LABEL.pending;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.cls}`}>{label(item)}</span>;
}

function typeBadge(type: AdminFeedbackType, label: (item: { zh: string; en: string }) => string) {
  const item = TYPE_LABEL[type] ?? TYPE_LABEL.other;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.cls}`}>{label(item)}</span>;
}

function userLabel(item: AdminFeedbackItem) {
  return item.user_nickname || item.user_phone || item.user_id || "匿名用户";
}

export default function AdminFeedback() {
  const { tText, L, optionLabel } = useLabel();
  const queryClient = useQueryClient();
  const canUpdate = useAdminPermissionStore((s) => s.can("user.update"));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<"" | AdminFeedbackStatus>("");
  const [type, setType] = useState<"" | AdminFeedbackType>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [drafts, setDrafts] = useState<Record<string, FeedbackDraft>>({});

  const queryParams = useMemo<AdminFeedbackListParams>(() => ({
    page,
    pageSize,
    keyword: keyword.trim(),
    status: status || "all",
    type: type || "all",
    dateFrom: dateFrom.trim(),
    dateTo: dateTo.trim(),
  }), [page, pageSize, keyword, status, type, dateFrom, dateTo]);

  const listQuery = useQuery({
    queryKey: adminQueryKeys.feedback(queryParams),
    queryFn: () => feedbackService.fetchFeedbackList(queryParams),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: FeedbackDraft }) =>
      feedbackService.updateFeedback(id, {
        status: draft.status,
        handler_note: draft.handler_note.trim(),
      }),
    onSuccess: (_data, variables) => {
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
      toast.success(tText("反馈处理结果已保存"));
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.feedbackRoot() });
    },
    onError: (error) => {
      toast.error(toastErrorMessage(error, "保存反馈处理结果失败"));
    },
  });

  const feedbackList = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading && !listQuery.data;
  const error = listQuery.isError && !listQuery.data;
  const filtersActive = Boolean(keyword.trim() || status || type || dateFrom || dateTo);

  const getDraft = (item: AdminFeedbackItem): FeedbackDraft =>
    drafts[item.id] ?? { status: item.status, handler_note: item.handler_note || "" };

  const updateDraft = (id: string, patch: Partial<FeedbackDraft>) => {
    const source = feedbackList.find((item) => item.id === id);
    if (!source) return;
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...getDraft(source), ...patch },
    }));
  };

  const clearFilters = () => {
    setKeyword("");
    setStatus("");
    setType("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const saveFeedback = (item: AdminFeedbackItem) => {
    if (!canUpdate) {
      toast.error(tText("当前账号没有处理反馈的权限"));
      return;
    }
    updateMutation.mutate({ id: item.id, draft: getDraft(item) });
  };

  const renderEditor = (item: AdminFeedbackItem, compact = false) => {
    const draft = getDraft(item);
    const changed = draft.status !== item.status || draft.handler_note.trim() !== (item.handler_note || "").trim();
    return (
      <div className={`min-w-0 space-y-2 ${compact ? "" : "w-[17rem]"}`}>
        <AdminFilterSelect
          value={draft.status}
          disabled={!canUpdate || updateMutation.isPending}
          onChange={(e) => updateDraft(item.id, { status: e.target.value as AdminFeedbackStatus })}
          variant="card"
          className="w-full min-w-0"
          aria-label={L("处理状态", "Handling status")}
        >
          {STATUS_OPTIONS.filter((option) => option.value).map((option) => (
            <option key={option.value} value={option.value}>
              {optionLabel(option)}
            </option>
          ))}
        </AdminFilterSelect>
        <textarea
          value={draft.handler_note}
          disabled={!canUpdate || updateMutation.isPending}
          onChange={(e) => updateDraft(item.id, { handler_note: e.target.value })}
          rows={compact ? 2 : 3}
          placeholder={L("填写处理备注，方便后续跟进", "Add an internal handling note")}
          className="w-full min-w-0 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/15 disabled:opacity-60"
        />
        <PermissionGate permission="user.update">
          <UnifiedButton
            type="button"
            disabled={!changed || updateMutation.isPending}
            onClick={() => saveFeedback(item)}
            className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg btn-theme-price px-3 py-2 text-xs font-semibold text-[var(--theme-price-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 size={14} />
            {updateMutation.isPending ? L("保存中", "Saving") : L("保存处理", "Save")}
          </UnifiedButton>
        </PermissionGate>
      </div>
    );
  };

  const renderMobileCard = (item: AdminFeedbackItem) => (
    <AdminTableMobileCard className="space-y-3 p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {typeBadge(item.type, optionLabel)}
            {statusBadge(item.status, optionLabel)}
          </div>
          <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</p>
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{item.content}</p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(item.created_at)}</span>
      </div>
      <div className="space-y-2">
        <AdminTableMobileCardField label={L("用户", "User")}>{userLabel(item)}</AdminTableMobileCardField>
        <AdminTableMobileCardField label={L("联系方式", "Contact")}>{item.contact || item.user_phone || "-"}</AdminTableMobileCardField>
        <AdminTableMobileCardField label={L("订单号", "Order #")}>{item.order_no || "-"}</AdminTableMobileCardField>
        <AdminTableMobileCardField label={L("来源页面", "Source page")}>
          <span className="break-all text-xs text-muted-foreground">{item.page_url || "-"}</span>
        </AdminTableMobileCardField>
        {item.handler_note ? (
          <AdminTableMobileCardField label={L("当前备注", "Current note")}>
            <span className="text-xs text-muted-foreground">{item.handler_note}</span>
          </AdminTableMobileCardField>
        ) : null}
      </div>
      {renderEditor(item, true)}
    </AdminTableMobileCard>
  );

  return (
    <PermissionGate permission="user.view" mode="page">
      <AdminPageShell
        className="min-w-0"
        hint={<Tx>集中查看用户提交的意见反馈，按类型、状态和时间筛选，并记录处理结果。</Tx>}
        toolbar={(
          <UnifiedButton
            type="button"
            onClick={() => void listQuery.refetch()}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"
          >
            <RefreshCw size={15} />
            <Tx>刷新</Tx>
          </UnifiedButton>
        )}
        filters={(
          <div className="space-y-3">
            <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-[minmax(12rem,1fr)_repeat(2,minmax(9rem,12rem))]">
              <SearchBar
                value={keyword}
                onChange={(value) => {
                  setKeyword(value);
                  setPage(1);
                }}
                placeholder={L("搜索标题 / 内容 / 联系方式 / 订单号", "Search title / content / contact / order")}
              />
              <AdminFilterSelect
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as "" | AdminFeedbackStatus);
                  setPage(1);
                }}
                variant="card"
                className="w-full min-w-0"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>{optionLabel(option)}</option>
                ))}
              </AdminFilterSelect>
              <AdminFilterSelect
                value={type}
                onChange={(e) => {
                  setType(e.target.value as "" | AdminFeedbackType);
                  setPage(1);
                }}
                variant="card"
                className="w-full min-w-0"
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>{optionLabel(option)}</option>
                ))}
              </AdminFilterSelect>
            </div>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{L("提交开始", "Submitted from")}</p>
                <SegmentedDateInput value={dateFrom} onChange={(value) => { setDateFrom(value); setPage(1); }} />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{L("提交结束", "Submitted to")}</p>
                <SegmentedDateInput value={dateTo} onChange={(value) => { setDateTo(value); setPage(1); }} />
              </div>
              {filtersActive ? (
                <UnifiedButton
                  type="button"
                  onClick={clearFilters}
                  className="min-h-[40px] rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <Tx>清空筛选</Tx>
                </UnifiedButton>
              ) : null}
            </div>
          </div>
        )}
      >
        <AnimatedTable
          loading={loading}
          error={error}
          errorTitle={L("反馈加载失败", "Failed to load feedback")}
          errorDescription={L("反馈接口暂时没有返回数据，请检查网络或稍后重试。", "The feedback API did not return data. Please check the network and try again.")}
          onRetry={() => void listQuery.refetch()}
          rows={feedbackList}
          rowKey={(item) => item.id}
          skeletonRows={8}
          skeletonCols={8}
          className="rounded-xl border border-border bg-card"
          tableClassName="min-w-[1120px] w-full text-sm"
          theadClassName="border-b border-border bg-secondary/50"
          emptyIcon={MessageSquareMore}
          emptyTitle={filtersActive ? L("没有匹配的反馈", "No matching feedback") : L("暂无意见反馈", "No feedback yet")}
          emptyDescription={filtersActive ? L("可以换个筛选条件再查。", "Try changing the filters.") : L("用户提交后会出现在这里。", "User submissions will appear here.")}
          renderMobileCard={renderMobileCard}
          footer={(
            <Pagination
              total={total}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )}
          thead={(
            <tr>
              {TABLE_HEADERS.map((header, index) => (
                <th key={header} className={adminTableHeadCellClass(TABLE_ALIGNS[index] ?? "left")}>
                  {header}
                </th>
              ))}
            </tr>
          )}
          renderRow={(item) => (
            <>
              <td className={adminTableCellClass("center")}>{typeBadge(item.type, optionLabel)}</td>
              <td className={adminTableCellClass("left", "max-w-[18rem]")}>
                <AdminTableCellGroup
                  lines={[
                    { text: item.title },
                    { text: item.content, muted: true },
                  ]}
                  tooltipLines={[item.title, item.content, item.page_url ? `来源页面：${item.page_url}` : ""].filter(Boolean)}
                  maxWidth="17rem"
                />
              </td>
              <td className={adminTableCellClass("left")}>
                <AdminTableCell value={userLabel(item)} fullText={[item.user_nickname, item.user_phone, item.user_id].filter(Boolean).join("\n")} maxWidth="9rem" />
              </td>
              <td className={adminTableCellClass("left")}>
                <AdminTableCell value={item.contact || item.user_phone || "-"} fullText={item.contact || item.user_phone || ""} maxWidth="10rem" />
              </td>
              <td className={adminTableCellClass("left")}>
                <AdminTableCell value={item.order_no || "-"} fullText={item.order_no || ""} maxWidth="9rem" mono />
              </td>
              <td className={adminTableCellClass("center")}>{statusBadge(item.status, optionLabel)}</td>
              <td className={adminTableCellClass("left", "whitespace-nowrap text-xs text-muted-foreground")}>
                {formatDateTime(item.created_at)}
              </td>
              <td className={adminTableCellClass("left")}>{renderEditor(item)}</td>
            </>
          )}
        />
      </AdminPageShell>
    </PermissionGate>
  );
}
