import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock, DatabaseBackup, Play, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import * as backupService from "@/services/admin/backupService";
import PermissionGate from "@/components/admin/PermissionGate";

const statusClass: Record<string, string> = {
  success: "text-emerald-700",
  running: "text-blue-700",
  queued: "text-amber-700",
  failed: "text-red-700",
  open: "text-red-700",
  resolved: "text-emerald-700",
};

function fmt(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function bytes(value?: number) {
  const n = Number(value || 0);
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(2)} KB`;
  return `${n} B`;
}

function StatusText({ value }: { value?: string }) {
  return <span className={statusClass[value || ""] || "text-muted-foreground"}>{value || "-"}</span>;
}

export default function AdminBackupCenter() {
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
      toast.success("已创建全量备份任务");
      await invalidate();
    },
    onError: (err: Error) => toast.error(err.message || "创建备份失败"),
  });

  const restoreMutation = useMutation({
    mutationFn: () => backupService.requestRestoreJob({
      restoreType,
      targetTime: targetTime || undefined,
      targetTable: targetTable || undefined,
      targetEntityId: targetEntityId || undefined,
    }),
    onSuccess: async () => {
      toast.success("已创建恢复任务，将先恢复到临时数据库");
      await invalidate();
    },
    onError: (err: Error) => toast.error(err.message || "创建恢复任务失败"),
  });

  const overview = overviewQuery.data;
  const latestFile = useMemo(() => filesQuery.data?.list?.[0], [filesQuery.data]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">备份与恢复</h1>
          <p className="mt-1 text-sm text-muted-foreground">系统设置 / 数据安全</p>
        </div>
        <PermissionGate permission="backup.create">
          <button
            type="button"
            onClick={() => fullBackupMutation.mutate()}
            disabled={fullBackupMutation.isPending}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <DatabaseBackup size={16} />
            手动创建备份
          </button>
        </PermissionGate>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><DatabaseBackup size={15} /> 最近全量备份</div>
          <div className="mt-2 text-base font-semibold">{fmt(overview?.latestFullBackupAt)}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock size={15} /> 最近增量备份</div>
          <div className="mt-2 text-base font-semibold">{fmt(overview?.latestIncrementalBackupAt)}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><RotateCcw size={15} /> 当前可恢复到</div>
          <div className="mt-2 text-base font-semibold">{fmt(overview?.latestRecoverableAt)}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck size={15} /> Binlog 状态</div>
          <div className={`mt-2 text-base font-semibold ${overview?.binlogHealthy ? "text-emerald-700" : "text-red-700"}`}>
            {overview?.binlogHealthy ? "正常" : "延迟或未配置"}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3 font-semibold">备份文件列表</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-secondary/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">类型</th>
                  <th className="px-4 py-2 text-left">状态</th>
                  <th className="px-4 py-2 text-left">存储</th>
                  <th className="px-4 py-2 text-left">大小</th>
                  <th className="px-4 py-2 text-left">可恢复时间</th>
                  <th className="px-4 py-2 text-left">校验</th>
                </tr>
              </thead>
              <tbody>
                {(filesQuery.data?.list || []).map((file) => (
                  <tr key={file.id} className="border-t border-border">
                    <td className="px-4 py-3">{file.file_kind}</td>
                    <td className="px-4 py-3"><StatusText value={file.job_status} /></td>
                    <td className="max-w-[260px] truncate px-4 py-3" title={file.storage_key}>{file.storage_provider}:{file.bucket || "local"}</td>
                    <td className="px-4 py-3">{bytes(file.size_bytes)}</td>
                    <td className="px-4 py-3">{fmt(file.recoverable_at)}</td>
                    <td className="px-4 py-3">{file.verified_at ? <CheckCircle2 size={16} className="text-emerald-700" /> : "-"}</td>
                  </tr>
                ))}
                {!filesQuery.data?.list?.length ? (
                  <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={6}>暂无备份文件</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <div className="font-semibold">创建恢复任务</div>
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="text-muted-foreground">恢复类型</span>
              <select value={restoreType} onChange={(e) => setRestoreType(e.target.value as typeof restoreType)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2">
                <option value="site">整站恢复</option>
                <option value="point_in_time">指定时间点恢复</option>
                <option value="table">单表恢复</option>
                <option value="order">单订单恢复</option>
                <option value="user">单用户恢复</option>
                <option value="pre_deploy_rollback">部署前版本回滚</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">指定时间点</span>
              <input type="datetime-local" value={targetTime} onChange={(e) => setTargetTime(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">表名</span>
              <input value={targetTable} onChange={(e) => setTargetTable(e.target.value)} placeholder="单表恢复时填写" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">订单/用户 ID</span>
              <input value={targetEntityId} onChange={(e) => setTargetEntityId(e.target.value)} placeholder="单订单或单用户恢复时填写" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" />
            </label>
            <PermissionGate permission="backup.restore.request">
              <button
                type="button"
                onClick={() => restoreMutation.mutate()}
                disabled={restoreMutation.isPending || !latestFile}
                className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
              >
                <Play size={16} />
                创建恢复任务
              </button>
            </PermissionGate>
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3 font-semibold">恢复任务</div>
          <div className="divide-y divide-border">
            {(restoreJobsQuery.data?.list || []).map((job) => (
              <div key={job.id} className="px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span>{job.restore_type}</span>
                  <StatusText value={job.status} />
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">{job.temp_db_name}</div>
              </div>
            ))}
            {!restoreJobsQuery.data?.list?.length ? <div className="px-4 py-8 text-center text-sm text-muted-foreground">暂无恢复任务</div> : null}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3 font-semibold">恢复演练记录</div>
          <div className="divide-y divide-border">
            {(drillsQuery.data || []).map((drill) => (
              <div key={drill.id} className="px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span>{fmt(drill.created_at)}</span>
                  <StatusText value={drill.status} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">耗时 {drill.duration_seconds ?? "-"} 秒</div>
              </div>
            ))}
            {!drillsQuery.data?.length ? <div className="px-4 py-8 text-center text-sm text-muted-foreground">暂无演练记录</div> : null}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3 font-semibold">备份失败告警</div>
          <div className="divide-y divide-border">
            {(alertsQuery.data || []).map((alert) => (
              <div key={alert.id} className="px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-red-700" />
                  <span className="font-medium">{alert.title}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{alert.message || alert.alert_type}</div>
              </div>
            ))}
            {!alertsQuery.data?.length ? <div className="px-4 py-8 text-center text-sm text-muted-foreground">暂无告警</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
