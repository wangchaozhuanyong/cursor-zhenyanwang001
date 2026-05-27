import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock, DatabaseBackup, Play, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import * as backupService from "@/services/admin/backupService";
import PermissionGate from "@/components/admin/PermissionGate";
import AdminNativeTable from "@/components/admin/AdminNativeTable";
import { formatDateTime } from "@/utils/formatDateTime";
import { Tx } from "@/components/admin/AdminText";
import SegmentedDateTimeInput from "@/components/admin/SegmentedDateTimeInput";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { toastErrorMessage } from "@/utils/errorMessage";
import {
  ADMIN_TABLE_NOWRAP_CLASS,
  adminTdClassName,
  adminThClassName,
} from "@/utils/adminTableClasses";
import {
  backupStatusTone,
  formatBackupAlertMessage,
  formatBackupAlertTitle,
  formatBackupFileKind,
  formatBackupStatus,
  formatBackupStorageLocation,
  formatRestoreTempDatabase,
  formatRestoreType,
} from "@/utils/backupLabels";

function fmt(value?: string | null) {
  if (!value) return "-";
  return formatDateTime(value);
}

function bytes(value?: number) {
  const n = Number(value || 0);
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(2)} KB`;
  return `${n} B`;
}

function StatusBadge({ value, tText }: { value?: string; tText: (zh: string) => string }) {
  const label = tText(formatBackupStatus(value));
  return (
    <span className={`inline-flex items-center rounded-full border border-current/20 px-2 py-0.5 text-xs font-medium ${backupStatusTone(value)}`}>
      {label}
    </span>
  );
}

export default function AdminBackupCenter() {
  const { tText } = useAdminT();
  const { confirm } = useAdminConfirm();
  const isSuperAdmin = useAdminPermissionStore((s) => s.isSuperAdmin);
  const queryClient = useQueryClient();
  const [restoreType, setRestoreType] = useState<backupService.RestoreJobPayload["restoreType"]>("site");
  const [targetTime, setTargetTime] = useState("");
  const [sourceBackupFileId, setSourceBackupFileId] = useState("");

  const overviewQuery = useQuery({
    queryKey: adminQueryKeys.backupsOverview(),
    queryFn: backupService.fetchBackupOverview,
    refetchInterval: 60_000,
  });
  const filesQuery = useQuery({
    queryKey: adminQueryKeys.backupFiles({ page: 1, pageSize: 10 }),
    queryFn: () => backupService.fetchBackupFiles({ page: 1, pageSize: 10 }),
    refetchInterval: 30_000,
  });
  const restoreJobsQuery = useQuery({
    queryKey: adminQueryKeys.restoreJobs({ page: 1, pageSize: 10 }),
    queryFn: () => backupService.fetchRestoreJobs({ page: 1, pageSize: 10 }),
    refetchInterval: 15_000,
  });
  const alertsQuery = useQuery({
    queryKey: adminQueryKeys.backupAlerts(),
    queryFn: backupService.fetchBackupAlerts,
    refetchInterval: 30_000,
  });
  const drillsQuery = useQuery({
    queryKey: adminQueryKeys.restoreDrills(),
    queryFn: backupService.fetchRestoreDrills,
    refetchInterval: 30_000,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.backupsRoot() }),
      queryClient.invalidateQueries({ queryKey: ["admin", "restore"] }),
    ]);
  };

  const fullBackupMutation = useMutation({
    mutationFn: () => backupService.requestFullBackup("备份中心手动触发"),
    onSuccess: async () => {
      toast.success(tText("已创建全量备份任务"));
      await invalidate();
    },
    onError: (err: Error) => toast.error(err.message || tText("创建备份失败")),
  });

  const restoreMutation = useMutation({
    mutationFn: (payload: backupService.RestoreJobPayload) => backupService.requestRestoreJob(payload),
    onSuccess: async () => {
      toast.success(tText("已创建恢复任务，将先恢复到临时数据库"));
      await invalidate();
    },
    onError: (err) => toast.error(toastErrorMessage(err, tText("创建恢复任务失败"))),
  });

  const approveRestoreMutation = useMutation({
    mutationFn: (id: string) => backupService.approveRestoreJob(id),
    onSuccess: async () => {
      toast.success(tText("已确认恢复任务"));
      await invalidate();
    },
    onError: (err) => toast.error(toastErrorMessage(err, tText("确认恢复任务失败"))),
  });

  const switchRestoreMutation = useMutation({
    mutationFn: (id: string) => backupService.switchRestoreJob(id),
    onSuccess: async (data) => {
      toast.success(data?.message || tText("已启动生产切换任务"));
      await invalidate();
    },
    onError: (err) => toast.error(toastErrorMessage(err, tText("启动生产切换失败"))),
  });

  const overview = overviewQuery.data;
  const hasSuccessfulFullBackup = Boolean(overview?.latestFullBackupAt);
  const latestFile = useMemo(
    () => filesQuery.data?.list?.find((file) => file.file_kind === "mysql_full" && file.job_status === "success"),
    [filesQuery.data],
  );
  const fullBackupFiles = useMemo(
    () => (filesQuery.data?.list || []).filter((file) => file.file_kind === "mysql_full" && file.job_status === "success"),
    [filesQuery.data],
  );
  const selectedSourceFile = useMemo(
    () => fullBackupFiles.find((file) => file.id === sourceBackupFileId) || latestFile,
    [fullBackupFiles, sourceBackupFileId, latestFile],
  );
  const restoreBlockedReason = !hasSuccessfulFullBackup
    ? tText("暂无成功的全量备份，无法创建恢复任务")
    : "";

  function buildRestorePayload(): backupService.RestoreJobPayload {
    const time = targetTime.trim();
    if (restoreType === "point_in_time" && !time) {
      throw new Error(tText("请填写指定时间点"));
    }
    return {
      restoreType,
      targetTime: time || undefined,
      sourceBackupFileId: sourceBackupFileId || undefined,
    };
  }

  const handleCreateRestoreJob = () => {
    try {
      restoreMutation.mutate(buildRestorePayload());
    } catch (err) {
      toast.error(toastErrorMessage(err, tText("创建恢复任务失败")));
    }
  };

  const confirmApproveRestoreJob = (job: backupService.RestoreJob) => {
    confirm({
      title: tText("确认恢复任务"),
      description: (
        <div className="space-y-1 text-sm">
          <div>{tText("确认后可将临时库数据切换至生产库，生产切换为不可逆操作。")}</div>
          <div>{tText("临时库")}：{formatRestoreTempDatabase(job.temp_db_name)}</div>
          {job.target_time ? <div>{tText("目标时间")}：{fmt(job.target_time)}</div> : null}
        </div>
      ),
      confirmText: tText("确认恢复"),
      danger: true,
      onConfirm: () => approveRestoreMutation.mutateAsync(job.id),
    });
  };

  const confirmSwitchRestoreJob = (job: backupService.RestoreJob) => {
    confirm({
      title: tText("执行生产切换"),
      description: (
        <div className="space-y-1 text-sm">
          <div>{tText("将把临时库数据覆盖写入生产数据库，请确保已停止写入流量并完成最终确认。")}</div>
          <div>{tText("临时库")}：{formatRestoreTempDatabase(job.temp_db_name)}</div>
        </div>
      ),
      confirmText: tText("执行切换"),
      danger: true,
      onConfirm: () => switchRestoreMutation.mutateAsync(job.id),
    });
  };

  const canApproveRestoreJob = (job: backupService.RestoreJob) =>
    ["temp_restored", "validated", "awaiting_approval"].includes(job.status);

  const canSwitchRestoreJob = (job: backupService.RestoreJob) => job.status === "approved";

  const jobNeedsRiskyActions = (job: backupService.RestoreJob) =>
    canApproveRestoreJob(job) || canSwitchRestoreJob(job);

  const showTargetTime = restoreType === "point_in_time";

  const renderRestoreJobRiskyActions = (job: backupService.RestoreJob) => {
    if (!jobNeedsRiskyActions(job)) return null;

    if (!isSuperAdmin) {
      return (
        <div className="mt-2 rounded-lg border border-dashed border-amber-200/80 bg-amber-50/50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <p><Tx>该任务待超级管理员确认或切换生产库；普通管理员仅可查看进度与失败原因。</Tx></p>
        </div>
      );
    }

    return (
      <div className="mt-3 rounded-lg border border-amber-300/80 bg-amber-50/60 p-3 dark:border-amber-800/50 dark:bg-amber-950/25">
        <div className="mb-2 flex items-start gap-2">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
          <div>
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-100"><Tx>高风险操作 · 仅超级管理员</Tx></p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-200/80">
              <Tx>确认恢复或执行生产切换将写入生产库，操作前请确认已停止业务写入且临时库校验已通过。</Tx>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canApproveRestoreJob(job) ? (
            <PermissionGate permission="backup.restore.approve">
              <button
                type="button"
                onClick={() => confirmApproveRestoreJob(job)}
                disabled={approveRestoreMutation.isPending}
                className="inline-flex min-h-[36px] items-center rounded-md border border-amber-400/60 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-50 dark:hover:bg-amber-900/50"
              >
                <Tx>确认恢复任务</Tx>
              </button>
            </PermissionGate>
          ) : null}
          {canSwitchRestoreJob(job) ? (
            <PermissionGate permission="backup.restore.approve">
              <button
                type="button"
                onClick={() => confirmSwitchRestoreJob(job)}
                disabled={switchRestoreMutation.isPending}
                className="inline-flex min-h-[36px] items-center rounded-md border border-red-400 bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                <Tx>执行生产切换</Tx>
              </button>
            </PermissionGate>
          ) : null}
        </div>
      </div>
    );
  };

  const renderValidationSummary = (job: backupService.RestoreJob) => {
    const result = job.validation_result;
    if (!result || typeof result !== "object") return null;
    const data = result as { ok?: boolean; missingCore?: string[]; replayedBinlogCount?: number };
    const missing = Array.isArray(data.missingCore) ? data.missingCore.filter(Boolean) : [];
    if (job.status === "failed" && missing.length) {
      return <div className="mt-1 text-xs text-red-700">{tText("缺少核心表")}：{missing.join(", ")}</div>;
    }
    if (data.ok === true || job.status === "awaiting_approval") {
      return (
        <div className="mt-1 text-xs text-emerald-700">
          {tText("校验通过")}，{tText("已回放增量日志")} {data.replayedBinlogCount ?? 0} {tText("个")}
        </div>
      );
    }
    return null;
  };

  return (
    <AdminPageShell
      hint={<Tx>管理系统全量/增量备份、恢复任务与演练记录。</Tx>}
      toolbar={(
        <PermissionGate permission="backup.create">
          <button
            type="button"
            onClick={() => fullBackupMutation.mutate()}
            disabled={fullBackupMutation.isPending}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <DatabaseBackup size={16} />
            <Tx>手动创建备份</Tx>
          </button>
        </PermissionGate>
      )}
    >
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><DatabaseBackup size={15} /><Tx>最近全量备份</Tx></div>
          <div className="mt-2 text-base font-semibold">{fmt(overview?.latestFullBackupAt)}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock size={15} /><Tx>最近增量备份</Tx></div>
          <div className="mt-2 text-base font-semibold">{fmt(overview?.latestIncrementalBackupAt)}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><RotateCcw size={15} /><Tx>当前可恢复到</Tx></div>
          <div className="mt-2 text-base font-semibold">{fmt(overview?.latestRecoverableAt)}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck size={15} /><Tx>增量日志状态</Tx></div>
          <div className={`mt-2 text-base font-semibold ${overview?.binlogHealthy ? "text-emerald-700" : "text-red-700"}`}>
            {overview?.binlogHealthy ? tText("正常") : tText("延迟或未配置")}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle size={15} /><Tx>待处理告警</Tx></div>
          <div className={`mt-2 text-base font-semibold ${(overview?.openAlertCount || 0) > 0 ? "text-red-700" : "text-foreground"}`}>
            {overview?.openAlertCount ?? 0}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle size={15} /><Tx>近 7 日失败任务</Tx></div>
          <div className={`mt-2 text-base font-semibold ${(overview?.failedJobCount7d || 0) > 0 ? "text-red-700" : "text-foreground"}`}>
            {overview?.failedJobCount7d ?? 0}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3 font-semibold"><Tx>备份文件列表</Tx></div>
          <AdminNativeTable stickyFirstColumn={false}>
              <thead className="bg-secondary/50 text-muted-foreground">
                <tr>
                  <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}><Tx>类型</Tx></th>
                  <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Tx>状态</Tx></th>
                  <th className={adminThClassName(undefined, "left")}><Tx>存储位置</Tx></th>
                  <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}><Tx>大小</Tx></th>
                  <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}><Tx>可恢复时间</Tx></th>
                  <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Tx>校验</Tx></th>
                </tr>
              </thead>
              <tbody>
                {(filesQuery.data?.list || []).map((file) => {
                  const storage = formatBackupStorageLocation(file);
                  return (
                    <tr key={file.id} className="border-t border-border">
                      <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} font-medium text-foreground`, "left")}>{tText(formatBackupFileKind(file.file_kind))}</td>
                      <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><StatusBadge value={file.job_status} tText={tText} /></td>
                      <td className={adminTdClassName("max-w-[220px] truncate text-muted-foreground", "left")} title={storage.title}>
                        {tText(storage.label)}
                      </td>
                      <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>{bytes(file.size_bytes)}</td>
                      <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>{fmt(file.recoverable_at)}</td>
                      <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}>
                        {file.verified_at ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 size={16} />
                            <Tx>已校验</Tx>
                          </span>
                        ) : (
                          <span className="text-muted-foreground"><Tx>待校验</Tx></span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!filesQuery.data?.list?.length ? (
                  <tr><td className={adminTdClassName("py-8 text-center text-muted-foreground")} colSpan={6}><Tx>暂无备份文件</Tx></td></tr>
                ) : null}
              </tbody>
          </AdminNativeTable>
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold"><Tx>创建恢复任务</Tx></div>
            {!isSuperAdmin ? (
              <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                <Tx>仅超级管理员可操作</Tx>
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground"><Tx>恢复将先写入临时数据库，校验通过后再由管理员确认切换。</Tx></p>
          <p className="mt-2 text-xs text-muted-foreground">
            {selectedSourceFile ? (
              <>
                <Tx>将使用全量备份</Tx>：{fmt(selectedSourceFile.recoverable_at || selectedSourceFile.created_at)}
              </>
            ) : (
              restoreBlockedReason || tText("正在读取可用全量备份")
            )}
          </p>
          {isSuperAdmin ? (
            <div className="mt-4 space-y-3 rounded-lg border border-amber-300/80 bg-amber-50/50 p-3 dark:border-amber-800/50 dark:bg-amber-950/20">
              <div className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-100">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
                <p className="leading-relaxed">
                  <span className="font-semibold"><Tx>高风险操作区</Tx></span>
                  <span className="text-amber-800/90 dark:text-amber-200/80">
                    {" "}
                    <Tx>创建恢复任务会先写入临时库；后续还需在「恢复任务」中确认并切换生产库。</Tx>
                  </span>
                </p>
              </div>
              {fullBackupFiles.length > 1 ? (
                <label className="block text-sm">
                  <span className="text-muted-foreground"><Tx>源备份文件</Tx></span>
                  <select
                    value={sourceBackupFileId}
                    onChange={(e) => setSourceBackupFileId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
                  >
                    <option value="">{tText("自动选择最新可用全量备份")}</option>
                    {fullBackupFiles.map((file) => (
                      <option key={file.id} value={file.id}>
                        {fmt(file.recoverable_at || file.created_at)} · {bytes(file.size_bytes)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="block text-sm">
                <span className="text-muted-foreground"><Tx>恢复类型</Tx></span>
                <select value={restoreType} onChange={(e) => setRestoreType(e.target.value as typeof restoreType)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2">
                  <option value="site"><Tx>整站恢复</Tx></option>
                  <option value="point_in_time"><Tx>指定时间点恢复</Tx></option>
                </select>
              </label>
              {showTargetTime ? (
                <label className="block text-sm">
                  <span className="text-muted-foreground"><Tx>指定时间点</Tx></span>
                  <SegmentedDateTimeInput value={targetTime} onChange={setTargetTime} className="mt-1 w-full" controlClassName="bg-background" />
                </label>
              ) : null}
              <PermissionGate permission="backup.restore.request">
                <button
                  type="button"
                  onClick={handleCreateRestoreJob}
                  disabled={restoreMutation.isPending || !hasSuccessfulFullBackup}
                  title={restoreBlockedReason || undefined}
                  className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
                >
                  <Play size={16} />
                  <Tx>创建恢复任务</Tx>
                </button>
              </PermissionGate>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-border bg-secondary/20 p-3 text-sm text-muted-foreground">
              <p><Tx>恢复属于高风险操作，已对普通管理员隐藏。</Tx></p>
              <p className="mt-1"><Tx>如需发起恢复，请在右侧「恢复任务」确认当前进度与失败原因后，联系超级管理员处理。</Tx></p>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold"><Tx>恢复任务</Tx></span>
              {isSuperAdmin ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  <Tx>含高风险确认项</Tx>
                </span>
              ) : null}
            </div>
            {!isSuperAdmin ? (
              <p className="mt-1 text-xs text-muted-foreground"><Tx>仅展示任务进度；确认恢复与生产切换需超级管理员处理。</Tx></p>
            ) : null}
          </div>
          <div className="divide-y divide-border">
            {(restoreJobsQuery.data?.list || []).map((job) => (
              <div key={job.id} className="px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{tText(formatRestoreType(job.restore_type))}</span>
                  <StatusBadge value={job.status} tText={tText} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{formatRestoreTempDatabase(job.temp_db_name)}</div>
                {job.target_time ? (
                  <div className="mt-1 text-xs text-muted-foreground">{tText("目标时间")}：{fmt(job.target_time)}</div>
                ) : null}
                {job.error_message ? <div className="mt-1 text-xs text-red-700">{job.error_message}</div> : null}
                {renderValidationSummary(job)}
                {job.status === "merged" ? (
                  <div className="mt-2 text-xs text-blue-700"><Tx>生产切换进行中，请稍后刷新</Tx></div>
                ) : null}
                {renderRestoreJobRiskyActions(job)}
              </div>
            ))}
            {!restoreJobsQuery.data?.list?.length ? <div className="px-4 py-8 text-center text-sm text-muted-foreground"><Tx>暂无恢复任务</Tx></div> : null}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3 font-semibold"><Tx>恢复演练记录</Tx></div>
          <div className="divide-y divide-border">
            {(drillsQuery.data || []).map((drill) => (
              <div key={drill.id} className="px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span>{fmt(drill.created_at)}</span>
                  <StatusBadge value={drill.status} tText={tText} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{tText("耗时")} {drill.duration_seconds ?? "-"} {tText("秒")}</div>
              </div>
            ))}
            {!drillsQuery.data?.length ? <div className="px-4 py-8 text-center text-sm text-muted-foreground"><Tx>暂无演练记录</Tx></div> : null}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3 font-semibold"><Tx>备份失败告警</Tx></div>
          <div className="divide-y divide-border">
            {(alertsQuery.data || []).map((alert) => (
              <div key={alert.id} className="px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0 text-red-700" />
                  <span className="font-medium text-foreground">
                    {tText(formatBackupAlertTitle(alert.title, alert.alert_type))}
                  </span>
                </div>
                <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {tText(formatBackupAlertMessage(alert.message, alert.alert_type))}
                </div>
              </div>
            ))}
            {!alertsQuery.data?.length ? <div className="px-4 py-8 text-center text-sm text-muted-foreground"><Tx>暂无告警</Tx></div> : null}
          </div>
        </section>
      </div>
    </AdminPageShell>
  );
}
