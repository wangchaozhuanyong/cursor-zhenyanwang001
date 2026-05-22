import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Database, FileSearch, History, Play, RefreshCw, Save, Shield, SlidersHorizontal, XCircle } from "lucide-react";
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
import { formatDateTime } from "@/utils/formatDateTime";
import Pagination from "@/components/admin/Pagination";

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

function StatusBadge({ status }: { status?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass(status)}`}>
      {statusText[status || ""] || status || "-"}
    </span>
  );
}

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function RunSteps({ steps }: { steps?: DataCleanupRunStep[] }) {
  if (!steps?.length) return <div className="text-sm text-muted-foreground">暂无步骤记录</div>;
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-secondary/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2">策略</th>
            <th className="px-3 py-2">表/对象</th>
            <th className="px-3 py-2">状态</th>
            <th className="px-3 py-2">命中</th>
            <th className="px-3 py-2">删除</th>
            <th className="px-3 py-2">批次</th>
            <th className="px-3 py-2">原因</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step) => (
            <tr key={step.id} className="border-t border-border">
              <td className="px-3 py-2 font-medium text-foreground">{step.policy_key}</td>
              <td className="px-3 py-2 text-muted-foreground">{step.table_name}</td>
              <td className="px-3 py-2"><StatusBadge status={step.status} /></td>
              <td className="px-3 py-2">{step.matched_count}</td>
              <td className="px-3 py-2">{step.deleted_count}</td>
              <td className="px-3 py-2">{step.batch_count}</td>
              <td className="max-w-[280px] truncate px-3 py-2 text-xs text-muted-foreground" title={step.error_message || ""}>
                {step.error_message || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
      toast.success("策略已保存");
      setDrafts({});
      await invalidateAll();
    },
    onError: (error) => toast.error(toastErrorMessage(error, "保存策略失败")),
  });

  const resetMutation = useMutation({
    mutationFn: resetDataCleanupDefaults,
    onSuccess: async () => {
      toast.success("已恢复默认策略");
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
      toast.success("预览已生成");
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
      toast.success("已请求取消");
      await invalidateAll();
    },
    onError: (error) => toast.error(toastErrorMessage(error, "取消失败")),
  });

  if (!canView) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-bold text-foreground">数据保存与清理中心</h1>
        <p className="text-sm text-muted-foreground">你无权查看该页面。</p>
      </div>
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
      toast.error("请先生成清理预览");
      return;
    }
    confirm({
      title: "确认执行数据清理",
      description: `本次预览命中 ${previewRun.total_matched} 条记录，执行后将按批删除命中的可清理数据。`,
      confirmText: "执行清理",
      danger: true,
      onConfirm: () => executeMutation.mutateAsync(),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">数据保存与清理中心</h1>
          <p className="text-sm text-muted-foreground">管理数据保留策略、清理预览、执行记录和防误删边界。</p>
        </div>
        <button
          type="button"
          onClick={() => void invalidateAll()}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-secondary"
        >
          <RefreshCw size={15} /> 刷新
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex min-h-[42px] items-center gap-2 border-b-2 px-3 text-sm font-medium ${
                active ? "border-[var(--theme-primary)] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="策略总数" value={overview?.policyCount ?? "-"} />
            <Metric label="启用策略" value={overview?.enabledPolicyCount ?? "-"} />
            <Metric label="锁定策略" value={overview?.lockedPolicyCount ?? "-"} hint="审计日志默认锁定" />
            <Metric label="批量范围" value={overview ? `${overview.batchSizeRange.min}-${overview.batchSizeRange.max}` : "-"} hint="每批删除条数" />
          </div>
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold text-foreground"><History size={16} /> 最近执行</div>
            <RunSteps steps={runDetailQuery.data?.steps} />
            {!selectedRunId && (
              <div className="space-y-2">
                {(overview?.recentRuns || []).map((run) => (
                  <button key={run.id} type="button" onClick={() => setSelectedRunId(run.id)} className="flex w-full items-center justify-between gap-3 rounded-lg bg-secondary/40 px-3 py-2 text-left text-sm hover:bg-secondary">
                    <span>#{run.id} {run.run_type}</span>
                    <span className="text-muted-foreground">命中 {run.total_matched} / 删除 {run.total_deleted}</span>
                    <StatusBadge status={run.status} />
                  </button>
                ))}
                {!overview?.recentRuns?.length ? <div className="text-sm text-muted-foreground">暂无执行记录</div> : null}
              </div>
            )}
          </section>
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle size={16} /> 默认保护表</div>
            <div className="flex flex-wrap gap-2">
              {(overview?.protectedTables || []).map((table) => (
                <span key={table} className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-xs">{table}</span>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "policies" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!canManage || resetMutation.isPending}
              onClick={() => confirm({ title: "恢复默认策略", description: "将重置 enabled、retention_days 和 batch_size。", confirmText: "恢复默认", onConfirm: () => resetMutation.mutateAsync() })}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-secondary disabled:opacity-50"
            >
              <RefreshCw size={15} /> 恢复默认
            </button>
          </div>
          {Object.entries(groupedPolicies).map(([category, items]) => (
            <section key={category} className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-3 font-semibold text-foreground">{category}</div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-secondary/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">策略</th>
                      <th className="px-3 py-2">表/对象</th>
                      <th className="px-3 py-2">保留天数</th>
                      <th className="px-3 py-2">批大小</th>
                      <th className="px-3 py-2">启用</th>
                      <th className="px-3 py-2">保护</th>
                      <th className="px-3 py-2">操作</th>
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
                            <div className="font-medium text-foreground">{policy.title}</div>
                            <div className="mt-1 max-w-[320px] text-xs text-muted-foreground">{policy.description}</div>
                            <div className="mt-1 text-[11px] text-muted-foreground">{policy.key}</div>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">{policy.table_name}</td>
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
                </table>
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {activeTab === "preview" ? (
        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-foreground">选择策略并生成预览</h2>
                <p className="text-sm text-muted-foreground">执行清理必须使用最近一次预览生成的 preview_run_id。</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setSelectedKeys(policies.filter((p) => p.enabled).map((p) => p.key)); setPreviewRun(null); }} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">选择启用项</button>
                <button type="button" onClick={() => { setSelectedKeys([]); setPreviewRun(null); }} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">清空</button>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {policies.map((policy) => (
                <label key={policy.key} className="flex min-h-[48px] items-start gap-2 rounded-lg border border-border p-3 text-sm hover:bg-secondary/50">
                  <input type="checkbox" checked={selectedKeys.includes(policy.key)} onChange={() => togglePolicySelection(policy.key)} className="mt-1 h-4 w-4" />
                  <span>
                    <span className="block font-medium text-foreground">{policy.title}</span>
                    <span className="block text-xs text-muted-foreground">{policy.table_name} · {policy.retention_days} 天</span>
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
                  命中 {previewRun.total_matched} 条 <StatusBadge status={previewRun.status} />
                </div>
              </div>
              <RunSteps steps={previewRun.steps} />
            </section>
          ) : null}
        </div>
      ) : null}

      {activeTab === "runs" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3 font-semibold text-foreground">执行记录</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-secondary/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">类型</th>
                    <th className="px-3 py-2">状态</th>
                    <th className="px-3 py-2">命中</th>
                    <th className="px-3 py-2">删除</th>
                    <th className="px-3 py-2">开始时间</th>
                    <th className="px-3 py-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} className="border-t border-border">
                      <td className="px-3 py-2 font-medium text-foreground">#{run.id}</td>
                      <td className="px-3 py-2">{run.run_type}</td>
                      <td className="px-3 py-2"><StatusBadge status={run.status} /></td>
                      <td className="px-3 py-2">{run.total_matched}</td>
                      <td className="px-3 py-2">{run.total_deleted}</td>
                      <td className="px-3 py-2 text-muted-foreground">{run.started_at ? formatDateTime(run.started_at) : "-"}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setSelectedRunId(run.id)} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-secondary">查看</button>
                          {run.status === "running" ? (
                            <button type="button" disabled={!canExecute} onClick={() => cancelMutation.mutate(run.id)} className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-50">取消</button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination total={totalRuns} page={runPage} pageSize={runPageSize} onPageChange={setRunPage} onPageSizeChange={(size) => { setRunPageSize(size); setRunPage(1); }} />
          </section>
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 font-semibold text-foreground">记录详情</div>
            {runDetailQuery.data ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>#{runDetailQuery.data.id} {runDetailQuery.data.run_type}</span>
                  <StatusBadge status={runDetailQuery.data.status} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded bg-secondary/50 p-2"><div className="text-xs text-muted-foreground">命中</div><strong>{runDetailQuery.data.total_matched}</strong></div>
                  <div className="rounded bg-secondary/50 p-2"><div className="text-xs text-muted-foreground">删除</div><strong>{runDetailQuery.data.total_deleted}</strong></div>
                  <div className="rounded bg-secondary/50 p-2"><div className="text-xs text-muted-foreground">失败</div><strong>{runDetailQuery.data.total_failed}</strong></div>
                </div>
                {runDetailQuery.data.error_message ? <div className="rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">{runDetailQuery.data.error_message}</div> : null}
                <RunSteps steps={runDetailQuery.data.steps} />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">选择一条记录查看步骤。</div>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "risk" ? (
        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-foreground"><Shield size={16} /> 防误删机制</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["不允许任意 SQL", "后台只能修改 retention_days、enabled、batch_size。"],
                ["必须先预览", "执行接口必须携带最近生成且未使用的 preview_run_id。"],
                ["保护核心交易表", "订单、支付、发票、库存流水、积分流水、返现流水默认禁止硬删除。"],
                ["批量删除", "每批限制在 500-2000 条，降低锁表风险。"],
                ["执行锁", "同一时间只能有一个清理任务持有全局锁。"],
                ["审计留痕", "预览、执行、取消、策略变更都会写入 audit_logs。"],
              ].map(([title, text]) => (
                <div key={title} className="rounded-lg border border-border bg-background p-3">
                  <div className="mb-1 flex items-center gap-2 font-medium text-foreground"><CheckCircle2 size={15} className="text-emerald-600" /> {title}</div>
                  <div className="text-sm text-muted-foreground">{text}</div>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <h2 className="mb-2 flex items-center gap-2 font-semibold"><XCircle size={16} /> 禁止清理范围</h2>
            <p>不得将 orders、order_items、payment_*、myinvois_*、inventory_stock_records、points_records、reward_* 加入硬删除策略。需要归档交易数据时应另行设计归档或冷存储流程。</p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
