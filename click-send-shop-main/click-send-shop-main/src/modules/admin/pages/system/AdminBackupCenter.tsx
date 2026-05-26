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
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminT } from "@/hooks/useAdminT";
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
  const queryClient = useQueryClient();
  const [restoreType, setRestoreType] = useState<backupService.RestoreJobPayload["restoreType"]>("point_in_time");
  const [targetTime, setTargetTime] = useState("");
  const [targetEntityId, setTargetEntityId] = useState("");
  const [targetTable, setTargetTable] = useState("");

  const overviewQuery = useQuery({
    queryKey: adminQueryKeys.backupsOverview(),
    queryFn: backupService.fetchBackupOverview,
    refetchInterval: 60_000,
  });
  const filesQuery = useQuery({
    queryKey: adminQueryKeys.backupFiles({ page: 1, pageSize: 10 }),
    queryFn: () => backupService.fetchBackupFiles({ page: 1, pageSize: 10 }),
  });
  const restoreJobsQuery = useQuery({
    queryKey: adminQueryKeys.restoreJobs({ page: 1, pageSize: 10 }),
    queryFn: () => backupService.fetchRestoreJobs({ page: 1, pageSize: 10 }),
  });
  const alertsQuery = useQuery({
    queryKey: adminQueryKeys.backupAlerts(),
    queryFn: backupService.fetchBackupAlerts,
  });
  const drillsQuery = useQuery({
    queryKey: adminQueryKeys.restoreDrills(),
    queryFn: backupService.fetchRestoreDrills,
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
    mutationFn: () => backupService.requestRestoreJob({
      restoreType,
      targetTime: targetTime || undefined,
      targetTable: targetTable || undefined,
      targetEntityId: targetEntityId || undefined,
    }),
    onSuccess: async () => {
      toast.success(tText("已创建恢复任务，将先恢复到临时数据库"));
      await invalidate();
    },
    onError: (err: Error) => toast.error(err.message || tText("创建恢复任务失败")),
  });

  const overview = overviewQuery.data;
  const latestFile = useMemo(() => filesQuery.data?.list?.[0], [filesQuery.data]);

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
      <div className="grid gap-3 md:grid-cols-4">
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
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3 font-semibold"><Tx>备份文件列表</Tx></div>
          <AdminNativeTable stickyFirstColumn={false}>
              <thead className="bg-secondary/50 text-muted-foreground">
                <tr>
                  <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>类型</Tx></th>
                  <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>状态</Tx></th>
                  <th className={adminThClassName()}><Tx>存储位置</Tx></th>
                  <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>大小</Tx></th>
                  <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>可恢复时间</Tx></th>
                  <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>校验</Tx></th>
                </tr>
              </thead>
              <tbody>
                {(filesQuery.data?.list || []).map((file) => {
                  const storage = tText(formatBackupStorageLocation(file));
                  return (
                    <tr key={file.id} className="border-t border-border">
                      <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} font-medium text-foreground`)}>{tText(formatBackupFileKind(file.file_kind))}</td>
                      <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}><StatusBadge value={file.job_status} tText={tText} /></td>
                      <td className={adminTdClassName("max-w-[220px] truncate text-muted-foreground")} title={storage.title}>
                        {storage.label}
                      </td>
                      <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>{bytes(file.size_bytes)}</td>
                      <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>{fmt(file.recoverable_at)}</td>
                      <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>
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
          <div className="font-semibold"><Tx>创建恢复任务</Tx></div>
          <p className="mt-1 text-xs text-muted-foreground"><Tx>恢复将先写入临时数据库，校验通过后再由管理员确认切换。</Tx></p>
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="text-muted-foreground"><Tx>恢复类型</Tx></span>
              <select value={restoreType} onChange={(e) => setRestoreType(e.target.value as typeof restoreType)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2">
                <option value="site"><Tx>整站恢复</Tx></option>
                <option value="point_in_time"><Tx>指定时间点恢复</Tx></option>
                <option value="table"><Tx>单表恢复</Tx></option>
                <option value="order"><Tx>单订单恢复</Tx></option>
                <option value="user"><Tx>单用户恢复</Tx></option>
                <option value="pre_deploy_rollback"><Tx>部署前版本回滚</Tx></option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground"><Tx>指定时间点</Tx></span>
              <input type="datetime-local" value={targetTime} onChange={(e) => setTargetTime(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground"><Tx>表名</Tx></span>
              <input value={targetTable} onChange={(e) => setTargetTable(e.target.value)} placeholder={tText("单表恢复时填写")} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground"><Tx>订单/用户 ID</Tx></span>
              <input value={targetEntityId} onChange={(e) => setTargetEntityId(e.target.value)} placeholder={tText("单订单或单用户恢复时填写")} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" />
            </label>
            <PermissionGate permission="backup.restore.request">
              <button
                type="button"
                onClick={() => restoreMutation.mutate()}
                disabled={restoreMutation.isPending || !latestFile}
                className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
              >
                <Play size={16} />
                <Tx>创建恢复任务</Tx>
              </button>
            </PermissionGate>
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3 font-semibold"><Tx>恢复任务</Tx></div>
          <div className="divide-y divide-border">
            {(restoreJobsQuery.data?.list || []).map((job) => (
              <div key={job.id} className="px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{formatRestoreType(job.restore_type)}</span>
                  <StatusBadge value={job.status} tText={tText} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{formatRestoreTempDatabase(job.temp_db_name)}</div>
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
