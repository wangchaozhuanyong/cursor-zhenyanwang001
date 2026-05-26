import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Database, FileSearch, History, Info, Play, RefreshCw, Save, Shield, SlidersHorizontal, XCircle } from "lucide-react";
import AdminFieldHint, { AdminSectionTitle } from "@/components/admin/AdminFieldHint";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { toast } from "sonner";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import {
  executeDataCleanup,
  fetchDataCleanupOverview,
  fetchDataCleanupPolicies,
  fetchDataCleanupRun,
  fetchDataCleanupRuns,
  previewDataCleanup,
  requestCancelDataCleanupRun,
  resetDataCleanupDefaults,
  saveDataCleanupPolicy,
  type DataCleanupPolicy,
  type DataCleanupRun,
  type DataCleanupRunStep,
} from "@/services/admin/dataRetentionService";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatSystemErrorMessage } from "@/utils/systemErrorMessage";
import { formatDateTime } from "@/utils/formatDateTime";
import {
  formatDataCleanupCategory,
  formatDataCleanupPolicyKey,
  formatDataCleanupPolicyTitle,
  formatDataCleanupProtectedTable,
  formatDataCleanupRunType,
  formatDataCleanupTableName,
} from "@/utils/dataRetentionLabels";
import {
  DATA_RETENTION_CATEGORY_HINTS,
  DATA_RETENTION_FIELD_HINTS,
  DATA_RETENTION_PAGE_HINT,
  DATA_RETENTION_TAB_HINTS,
  getDataCleanupPolicyHelp,
} from "@/utils/dataRetentionHelp";
import Pagination from "@/components/admin/Pagination";
import AdminNativeTable from "@/components/admin/AdminNativeTable";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";
import {
  ADMIN_TABLE_NOWRAP_CLASS,
  adminTdClassName,
  adminThClassName,
} from "@/utils/adminTableClasses";

type TabKey = "overview" | "policies" | "preview" | "runs" | "risk";

const tabs: Array<{ key: TabKey; label: string; icon: typeof Database }> = [
  { key: "overview", label: "数据总览", icon: Database },
  { key: "policies", label: "保留策略设置", icon: SlidersHorizontal },
  { key: "preview", label: "清理预览", icon: FileSearch },
  { key: "runs", label: "执行记录", icon: History },
  { key: "risk", label: "风险说明", icon: Shield },
];

const statusText: Record<string, string> = {
  previewed: "已预览",
  running: "运行中",
  success: "成功",
  partial_failed: "部分失败",
  failed: "失败",
  cancelled: "已取消",
  skipped: "已跳过",
};

function statusClass(status?: string) {
  if (status === "success" || status === "previewed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "running") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "partial_failed") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "failed" || status === "cancelled") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function StatusBadge({ status, tText }: { status?: string; tText: (zh: string) => string }) {
  const raw = status ? statusText[status] : "";
  const label = raw ? tText(raw) : (status || "-");
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass(status)}`}>
      {label}
    </span>
  );
}

function HintLabel({
  label,
  hint,
  tText,
}: {
  label: string;
  hint?: string;
  tText: (zh: string) => string;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {tText(label)}
      {hint ? <AdminFieldHint text={tText(hint)} /> : null}
    </span>
  );
}

function Metric({
  label,
  value,
  hint,
  fieldHint,
  tText,
}: {
  label: string;
  value: string | number;
  hint?: string;
  fieldHint?: string;
  tText: (zh: string) => string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <HintLabel label={label} hint={fieldHint} tText={tText} />
      </div>
      <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{tText(hint)}</div> : null}
    </div>
  );
}

function RunSteps({
  steps,
  policyTitleByKey,
  tText,
}: {
  steps?: DataCleanupRunStep[];
  policyTitleByKey?: Record<string, string>;
  tText: (zh: string) => string;
}) {
  if (!steps?.length) return <div className="text-sm text-muted-foreground"><Tx>暂无步骤记录</Tx></div>;
  return (
    <AdminNativeTable className="rounded-lg border border-border" stickyFirstColumn={false}>
        <thead className="bg-secondary/50 text-xs text-muted-foreground">
          <tr>
            <th className={adminThClassName()}><Tx>策略</Tx></th>
            <th className={adminThClassName()}><Tx>清理对象</Tx></th>
            <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>状态</Tx></th>
            <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}>
              <HintLabel label="命中" hint={DATA_RETENTION_FIELD_HINTS.matched} tText={tText} />
            </th>
            <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}>
              <HintLabel label="删除" hint={DATA_RETENTION_FIELD_HINTS.deleted} tText={tText} />
            </th>
            <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}>
              <HintLabel label="批次" hint={DATA_RETENTION_FIELD_HINTS.batchCount} tText={tText} />
            </th>
            <th className={adminThClassName()}><Tx>原因</Tx></th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step) => (
            <tr key={step.id} className="border-t border-border">
              <td className={adminTdClassName("font-medium text-foreground")}>{tText(formatDataCleanupPolicyKey(step.policy_key, policyTitleByKey))}</td>
              <td className={adminTdClassName("text-muted-foreground")}>{tText(formatDataCleanupTableName(step.table_name, step.policy_key))}</td>
              <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}><StatusBadge status={step.status} tText={tText} /></td>
              <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>{step.matched_count}</td>
              <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>{step.deleted_count}</td>
              <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>{step.batch_count}</td>
              <td className={adminTdClassName("max-w-[280px] truncate text-xs text-muted-foreground")} title={step.error_message || ""}>
                {formatSystemErrorMessage(step.error_message)}
              </td>
            </tr>
          ))}
        </tbody>
    </AdminNativeTable>
  );
}

function groupPolicies(policies: DataCleanupPolicy[]) {
  return policies.reduce<Record<string, DataCleanupPolicy[]>>((acc, policy) => {
    const key = policy.category || "system";
    acc[key] = acc[key] || [];
    acc[key].push(policy);
    return acc;
  }, {});
}

export default function AdminDataRetention() {
  const { tText } = useAdminT();
  const queryClient = useQueryClient();
  const { confirm } = useAdminConfirm();
  const can = useAdminPermissionStore((s) => s.can);
  const isSuperAdmin = useAdminPermissionStore((s) => s.isSuperAdmin);
  const canView = isSuperAdmin || can("data_cleanup.view") || can("data_cleanup.manage") || can("data_cleanup.execute");
  const canManage = isSuperAdmin || can("data_cleanup.manage");
  const canExecute = isSuperAdmin || can("data_cleanup.execute");

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [selectionReady, setSelectionReady] = useState(false);
  const [previewRun, setPreviewRun] = useState<DataCleanupRun | null>(null);
  const [runPage, setRunPage] = useState(1);
  const [runPageSize, setRunPageSize] = useState(20);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<Pick<DataCleanupPolicy, "retention_days" | "enabled" | "batch_size">>>>({});

  const overviewQuery = useQuery({
    queryKey: adminQueryKeys.dataCleanupOverview(),
    queryFn: fetchDataCleanupOverview,
    enabled: canView,
    staleTime: 60_000,
  });
  const policiesQuery = useQuery({
    queryKey: adminQueryKeys.dataCleanupPolicies(),
    queryFn: fetchDataCleanupPolicies,
    enabled: canView,
    staleTime: 60_000,
  });
  const runsQuery = useQuery({
    queryKey: adminQueryKeys.dataCleanupRuns({ page: runPage, pageSize: runPageSize }),
    queryFn: () => fetchDataCleanupRuns({ page: runPage, pageSize: runPageSize }),
    enabled: canView,
    placeholderData: (previous) => previous,
  });
  const runDetailQuery = useQuery({
    queryKey: selectedRunId ? adminQueryKeys.dataCleanupRun(selectedRunId) : ["admin", "data-cleanup", "run", "none"],
    queryFn: () => fetchDataCleanupRun(selectedRunId as number),
    enabled: canView && selectedRunId != null,
  });

  const policies = useMemo(() => policiesQuery.data ?? [], [policiesQuery.data]);
  const policyTitleByKey = useMemo(
    () => Object.fromEntries(policies.map((policy) => [policy.key, tText(formatDataCleanupPolicyTitle(policy))])),
    [policies, tText],
  );
  const groupedPolicies = useMemo(() => groupPolicies(policies), [policies]);
  const selectedPolicies = useMemo(
    () => policies.filter((policy) => selectedKeys.includes(policy.key)),
    [policies, selectedKeys],
  );

  useEffect(() => {
    if (selectionReady || !policies.length) return;
    setSelectedKeys(policies.filter((policy) => policy.enabled).map((policy) => policy.key));
    setSelectionReady(true);
  }, [policies, selectionReady]);

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.dataCleanupRoot() }),
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.auditLogsRoot() }),
    ]);
  };

  const savePolicyMutation = useMutation({
    mutationFn: (policy: DataCleanupPolicy) => {
      const draft = drafts[policy.key] || {};
      return saveDataCleanupPolicy(policy.key, {
        retention_days: Number(draft.retention_days ?? policy.retention_days),
        enabled: draft.enabled ?? policy.enabled,
        batch_size: Number(draft.batch_size ?? policy.batch_size),
      });
    },
    onSuccess: async () => {
      toast.success(tText("策略已保存"));
      setDrafts({});
      await invalidateAll();
    },
    onError: (error) => toast.error(toastErrorMessage(error, "保存策略失败")),
  });

  const resetMutation = useMutation({
    mutationFn: resetDataCleanupDefaults,
    onSuccess: async () => {
      toast.success(tText("已恢复默认策略"));
      setDrafts({});
      setSelectionReady(false);
      await invalidateAll();
    },
    onError: (error) => toast.error(toastErrorMessage(error, "重置失败")),
  });

  const previewMutation = useMutation({
    mutationFn: () => previewDataCleanup(selectedKeys),
    onSuccess: async (run) => {
      setPreviewRun(run);
      setActiveTab("preview");
      toast.success(tText("预览已生成"));
      await invalidateAll();
    },
    onError: (error) => toast.error(toastErrorMessage(error, "生成预览失败")),
  });

  const executeMutation = useMutation({
    mutationFn: () => {
      if (!previewRun) throw new Error("请先生成清理预览");
      return executeDataCleanup(previewRun.id, previewRun.policy_keys);
    },
    onSuccess: async (run) => {
      setPreviewRun(null);
      setSelectedRunId(run.id);
      setActiveTab("runs");
      toast.success(`清理完成，删除 ${run.total_deleted} 条`);
      await invalidateAll();
    },
    onError: (error) => toast.error(toastErrorMessage(error, "执行清理失败")),
  });

  const cancelMutation = useMutation({
    mutationFn: requestCancelDataCleanupRun,
    onSuccess: async () => {
      toast.success(tText("已请求取消"));
      await invalidateAll();
    },
    onError: (error) => toast.error(toastErrorMessage(error, "取消失败")),
  });

  if (!canView) {
    return (
      <p className="text-sm text-muted-foreground"><Tx>你无权查看该页面。</Tx></p>
    );
  }

  const overview = overviewQuery.data;
  const runs = runsQuery.data?.list ?? [];
  const totalRuns = runsQuery.data?.total ?? 0;

  const setDraft = (key: string, patch: Partial<Pick<DataCleanupPolicy, "retention_days" | "enabled" | "batch_size">>) => {
    setDrafts((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), ...patch } }));
  };

  const togglePolicySelection = (key: string) => {
    setPreviewRun(null);
    setSelectedKeys((prev) => prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]);
  };

  const confirmExecute = () => {
    if (!previewRun) {
      toast.error(tText("请先生成清理预览"));
      return;
    }
    confirm({ title: tText("确认执行数据清理"),
      description: `本次预览命中 ${previewRun.total_matched} 条记录，执行后将按批删除命中的可清理数据。`,
      confirmText: "执行清理",
      danger: true,
      onConfirm: () => executeMutation.mutateAsync(),
    });
  };

  return (
    <AdminPageShell
      hint={(
        <>
          <p>{tText(DATA_RETENTION_PAGE_HINT)}</p>
          <p className="mt-1"><Tx>按规则删除过期记录；订单与付款等核心数据受保护。点击各处的「?」可查看通俗说明。</Tx></p>
        </>
      )}
      toolbar={(
        <button
          type="button"
          onClick={() => void invalidateAll()}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-secondary"
        >
          <RefreshCw size={15} /> <Tx>刷新</Tx>
        </button>
      )}
      filters={(
      <div className="flex flex-wrap gap-2 border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          const tabHint = DATA_RETENTION_TAB_HINTS[tab.key];
          return (
            <div
              key={tab.key}
              className={`inline-flex min-h-[42px] items-center gap-1 border-b-2 px-3 ${
                active ? "border-[var(--theme-primary)]" : "border-transparent"
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 text-sm font-medium ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={15} />
                {tText(tab.label)}
              </button>
              {tabHint ? <AdminFieldHint text={tText(tabHint)} /> : null}
            </div>
          );
        })}
      </div>
      )}
    >
      {activeTab === "overview" ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="策略总数" value={overview?.policyCount ?? "-"} fieldHint={DATA_RETENTION_FIELD_HINTS.policyCount} tText={tText} />
            <Metric label="启用策略" value={overview?.enabledPolicyCount ?? "-"} fieldHint={DATA_RETENTION_FIELD_HINTS.enabledPolicyCount} tText={tText} />
            <Metric
              label="锁定策略"
              value={overview?.lockedPolicyCount ?? "-"}
              hint="审计日志默认锁定"
              fieldHint={DATA_RETENTION_FIELD_HINTS.lockedPolicyCount}
              tText={tText}
            />
            <Metric
              label="批量范围"
              value={overview ? `${overview.batchSizeRange.min}-${overview.batchSizeRange.max}` : "-"}
              hint="每批删除条数"
              fieldHint={DATA_RETENTION_FIELD_HINTS.batchSizeRange}
              tText={tText}
            />
          </div>
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold text-foreground">
              <History size={16} />
              <Tx>最近执行</Tx>
            </div>
            <RunSteps steps={runDetailQuery.data?.steps} policyTitleByKey={policyTitleByKey} tText={tText} />
            {!selectedRunId && (
              <div className="space-y-2">
                {(overview?.recentRuns || []).map((run) => (
                  <button key={run.id} type="button" onClick={() => setSelectedRunId(run.id)} className="flex w-full items-center justify-between gap-3 rounded-lg bg-secondary/40 px-3 py-2 text-left text-sm hover:bg-secondary">
                    <span>#{run.id} {tText(formatDataCleanupRunType(run.run_type))}</span>
                    <span className="text-muted-foreground">命中 {run.total_matched} / 删除 {run.total_deleted}</span>
                    <StatusBadge status={run.status} tText={tText} />
                  </button>
                ))}
                {!overview?.recentRuns?.length ? <div className="text-sm text-muted-foreground"><Tx>暂无执行记录</Tx></div> : null}
              </div>
            )}
          </section>
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <AlertTriangle size={16} />
              <Tx>默认保护表</Tx>
              <AdminFieldHint text={tText(DATA_RETENTION_FIELD_HINTS.protectedTables)} />
            </div>
            <div className="flex flex-wrap gap-2">
              {(overview?.protectedTables || []).map((table) => (
                <span key={table} className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-xs" title={table}>
                  {tText(formatDataCleanupProtectedTable(table))}
                </span>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "policies" ? (
        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Info size={16} className="mt-0.5 shrink-0 text-[var(--theme-primary)]" />
              <div className="space-y-2">
                <p><Tx>修改数字后必须点该行的「保存」才会生效。鼠标移到表头或策略名称旁的 ? 可查看说明。</Tx></p>
                <ul className="space-y-1 text-xs">
                  <li className="flex items-center gap-1">
                    <span className="font-medium text-foreground"><Tx>保留天数</Tx></span>
                    <AdminFieldHint text={tText(DATA_RETENTION_FIELD_HINTS.retentionDays)} />
                  </li>
                  <li className="flex items-center gap-1">
                    <span className="font-medium text-foreground"><Tx>批大小</Tx></span>
                    <AdminFieldHint text={tText(DATA_RETENTION_FIELD_HINTS.batchSize)} />
                  </li>
                  <li className="flex items-center gap-1">
                    <span className="font-medium text-foreground"><Tx>启用</Tx></span>
                    <AdminFieldHint text={tText(DATA_RETENTION_FIELD_HINTS.enabled)} />
                  </li>
                </ul>
              </div>
            </div>
          </section>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!canManage || resetMutation.isPending}
              onClick={() => confirm({ title: tText("恢复默认策略"), description: "将重置启用状态、保留天数和批处理大小。", confirmText: "恢复默认", onConfirm: () => resetMutation.mutateAsync() })}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-secondary disabled:opacity-50"
            >
              <RefreshCw size={15} /> 恢复默认
            </button>
          </div>
          {Object.entries(groupedPolicies).map(([category, items]) => (
            <section key={category} className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <AdminSectionTitle
                  title={tText(formatDataCleanupCategory(category))}
                  hint={DATA_RETENTION_CATEGORY_HINTS[category] ? tText(DATA_RETENTION_CATEGORY_HINTS[category]) : undefined}
                />
              </div>
              <AdminNativeTable stickyFirstColumn={false}>
                  <thead className="bg-secondary/50 text-xs text-muted-foreground">
                    <tr>
                      <th className={adminThClassName()}><Tx>策略</Tx></th>
                      <th className={adminThClassName()}><Tx>清理对象</Tx></th>
                      <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}>
                        <HintLabel label="保留天数" hint={DATA_RETENTION_FIELD_HINTS.retentionDays} tText={tText} />
                      </th>
                      <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}>
                        <HintLabel label="批大小" hint={DATA_RETENTION_FIELD_HINTS.batchSize} tText={tText} />
                      </th>
                      <th className={adminThClassName()}>
                        <HintLabel label="启用" hint={DATA_RETENTION_FIELD_HINTS.enabled} tText={tText} />
                      </th>
                      <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}>
                        <HintLabel label="保护" hint={DATA_RETENTION_FIELD_HINTS.protected} tText={tText} />
                      </th>
                      <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>操作</Tx></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((policy) => {
                      const draft = drafts[policy.key] || {};
                      const retentionValue = Number(draft.retention_days ?? policy.retention_days);
                      const batchValue = Number(draft.batch_size ?? policy.batch_size);
                      const enabledValue = Boolean(draft.enabled ?? policy.enabled);
                      return (
                        <tr key={policy.key} className="border-t border-border align-top">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                              {tText(formatDataCleanupPolicyTitle(policy))}
                              <AdminFieldHint
                                text={tText(getDataCleanupPolicyHelp(policy.key, policy.description))}
                                contentClassName="max-w-xs"
                              />
                            </div>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">{tText(formatDataCleanupTableName(policy.table_name, policy.key))}</td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min={policy.locked ? policy.retention_days : 1}
                              max={3650}
                              value={retentionValue}
                              disabled={!canManage}
                              onChange={(event) => setDraft(policy.key, { retention_days: Number(event.target.value) })}
                              className="w-28 rounded-lg border border-border bg-background px-2 py-2 text-sm"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min={500}
                              max={2000}
                              value={batchValue}
                              disabled={!canManage}
                              onChange={(event) => setDraft(policy.key, { batch_size: Number(event.target.value) })}
                              className="w-28 rounded-lg border border-border bg-background px-2 py-2 text-sm"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={enabledValue}
                              disabled={!canManage || policy.locked}
                              onChange={(event) => setDraft(policy.key, { enabled: event.target.checked })}
                              className="h-4 w-4"
                            />
                          </td>
                          <td className="px-3 py-3">
                            {policy.locked || policy.protected ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                                <Shield size={12} /> {policy.locked ? "锁定" : "保护"}
                              </span>
                            ) : <span className="text-xs text-muted-foreground">-</span>}
                          </td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              disabled={!canManage || savePolicyMutation.isPending}
                              onClick={() => savePolicyMutation.mutate(policy)}
                              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-50"
                            >
                              <Save size={13} /> 保存
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
              </AdminNativeTable>
            </section>
          ))}
        </div>
      ) : null}

      {activeTab === "preview" ? (
        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <AdminSectionTitle
                  title={<Tx>选择策略并生成预览</Tx>}
                  hint={tText(DATA_RETENTION_FIELD_HINTS.previewWorkflow)}
                />
                <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                  <Tx>勾选每条策略旁的 ? 可查看会删什么、有什么限制。</Tx>
                  <AdminFieldHint text={tText(DATA_RETENTION_FIELD_HINTS.testEnvNote)} />
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setSelectedKeys(policies.filter((p) => p.enabled).map((p) => p.key)); setPreviewRun(null); }} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"><Tx>选择启用项</Tx></button>
                <button type="button" onClick={() => { setSelectedKeys([]); setPreviewRun(null); }} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"><Tx>清空</Tx></button>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {policies.map((policy) => (
                <label key={policy.key} className="flex min-h-[48px] items-start gap-2 rounded-lg border border-border p-3 text-sm hover:bg-secondary/50">
                  <input type="checkbox" checked={selectedKeys.includes(policy.key)} onChange={() => togglePolicySelection(policy.key)} className="mt-1 h-4 w-4" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      {tText(formatDataCleanupPolicyTitle(policy))}
                      <AdminFieldHint
                        text={tText(getDataCleanupPolicyHelp(policy.key, policy.description))}
                        contentClassName="max-w-xs"
                      />
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {tText("保留")} {policy.retention_days} {tText("天")}
                      {policy.enabled ? "" : ` · ${tText("未启用")}`}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!canExecute || !selectedKeys.length || previewMutation.isPending}
                onClick={() => previewMutation.mutate()}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <FileSearch size={16} /> 生成预览
              </button>
              <button
                type="button"
                disabled={!canExecute || !previewRun || executeMutation.isPending}
                onClick={confirmExecute}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Play size={16} /> 执行清理
              </button>
              <span className="text-sm text-muted-foreground">已选择 {selectedPolicies.length} 项</span>
            </div>
          </section>
          {previewRun ? (
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-foreground">预览 #{previewRun.id}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  命中 {previewRun.total_matched} 条 <StatusBadge status={previewRun.status} tText={tText} />
                </div>
              </div>
              <RunSteps steps={previewRun.steps} policyTitleByKey={policyTitleByKey} tText={tText} />
            </section>
          ) : null}
        </div>
      ) : null}

      {activeTab === "runs" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3 font-semibold text-foreground"><Tx>执行记录</Tx></div>
            <AdminNativeTable stickyFirstColumn={false}>
                <thead className="bg-secondary/50 text-xs text-muted-foreground">
                  <tr>
                    <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>编号</Tx></th>
                    <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>类型</Tx></th>
                    <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>状态</Tx></th>
                    <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}>
                      <HintLabel label="命中" hint={DATA_RETENTION_FIELD_HINTS.matched} tText={tText} />
                    </th>
                    <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}>
                      <HintLabel label="删除" hint={DATA_RETENTION_FIELD_HINTS.deleted} tText={tText} />
                    </th>
                    <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>开始时间</Tx></th>
                    <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>操作</Tx></th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} className="border-t border-border">
                      <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} font-medium text-foreground`)}>#{run.id}</td>
                      <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>{tText(formatDataCleanupRunType(run.run_type))}</td>
                      <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}><StatusBadge status={run.status} tText={tText} /></td>
                      <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>{run.total_matched}</td>
                      <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>{run.total_deleted}</td>
                      <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} text-muted-foreground`)}>{run.started_at ? formatDateTime(run.started_at) : "-"}</td>
                      <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setSelectedRunId(run.id)} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-secondary"><Tx>查看</Tx></button>
                          {run.status === "running" ? (
                            <button type="button" disabled={!canExecute} onClick={() => cancelMutation.mutate(run.id)} className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Tx>取消</Tx></button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
            </AdminNativeTable>
            <Pagination total={totalRuns} page={runPage} pageSize={runPageSize} onPageChange={setRunPage} onPageSizeChange={(size) => { setRunPageSize(size); setRunPage(1); }} />
          </section>
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 font-semibold text-foreground"><Tx>记录详情</Tx></div>
            {runDetailQuery.data ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>#{runDetailQuery.data.id} {tText(formatDataCleanupRunType(runDetailQuery.data.run_type))}</span>
                  <StatusBadge status={runDetailQuery.data.status} tText={tText} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded bg-secondary/50 p-2">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <HintLabel label="命中" hint={DATA_RETENTION_FIELD_HINTS.matched} tText={tText} />
                    </div>
                    <strong>{runDetailQuery.data.total_matched}</strong>
                  </div>
                  <div className="rounded bg-secondary/50 p-2">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <HintLabel label="删除" hint={DATA_RETENTION_FIELD_HINTS.deleted} tText={tText} />
                    </div>
                    <strong>{runDetailQuery.data.total_deleted}</strong>
                  </div>
                  <div className="rounded bg-secondary/50 p-2">
                    <div className="text-xs text-muted-foreground"><Tx>失败</Tx></div>
                    <strong>{runDetailQuery.data.total_failed}</strong>
                  </div>
                </div>
                {runDetailQuery.data.error_message ? <div className="rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">{formatSystemErrorMessage(runDetailQuery.data.error_message)}</div> : null}
                <RunSteps steps={runDetailQuery.data.steps} policyTitleByKey={policyTitleByKey} tText={tText} />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground"><Tx>选择一条记录查看步骤。</Tx></div>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "risk" ? (
        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-foreground"><Shield size={16} /><Tx>防误删机制</Tx></h2>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["禁止自定义 SQL", "后台仅允许修改保留天数、启用状态、批处理大小，不可编写或执行任意删除语句。"],
                ["必须先预览", "执行清理须关联最近一次生成、且尚未用于正式删除的预览任务编号，不可跳过预览。"],
                ["保护核心交易表", "订单、支付、发票、库存流水、积分流水、返现流水默认禁止硬删除。"],
                ["批量删除", "每批限制在 500～2000 条，降低锁表风险。"],
                ["执行锁", "同一时间只能有一个清理任务持有全局锁。"],
                ["审计留痕", "预览、执行、取消及策略变更均会写入审计日志，便于追溯。"],
              ].map(([title, text]) => (
                <div key={title} className="rounded-lg border border-border bg-background p-3">
                  <div className="mb-1 flex items-center gap-2 font-medium text-foreground"><CheckCircle2 size={15} className="text-emerald-600" /> {title}</div>
                  <div className="text-sm text-muted-foreground">{text}</div>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <h2 className="mb-2 flex items-center gap-2 font-semibold"><XCircle size={16} /><Tx>禁止清理范围</Tx></h2>
            <p>
              不得将
              {" "}
              {["orders", "order_items", "payment_*", "myinvois_*", "inventory_stock_records", "points_records", "reward_*"]
                .map((table) => tText(formatDataCleanupProtectedTable(table)))
                .join(tText("、"))}
              {" "}
              {tText("加入硬删除策略。需要归档交易数据时应另行设计归档或冷存储流程。")}
            </p>
          </section>
        </div>
      ) : null}
    </AdminPageShell>
  );
}
