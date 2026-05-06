import { useEffect, useState, useCallback } from "react";
import { Download, Loader2, RefreshCw, CheckCircle2, XCircle, Clock, FileSpreadsheet } from "lucide-react";
import PermissionGate from "@/components/admin/PermissionGate";
import { toast } from "sonner";
import {
  createExportTask,
  getExportDownloadUrl,
  loadExportTasks,
} from "@/services/admin/exportCenterService";
import type { ExportTask } from "@/services/admin/exportCenterService";
import { getAdminAccessToken } from "@/utils/token";
import { EXPORT_TASK_STATUS, EXPORT_TASK_STATUS_META } from "@/constants/statusDictionary";
import { toastErrorMessage } from "@/utils/errorMessage";

const EXPORT_TYPES = [
  { value: "sales", label: "销售报表" },
  { value: "users_report", label: "用户报表" },
  { value: "products_report", label: "商品报表" },
  { value: "products", label: "商品数据" },
  { value: "orders", label: "订单数据" },
  { value: "users", label: "用户数据" },
];

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock size={14} className="text-yellow-500 animate-pulse" />,
  success: <CheckCircle2 size={14} className="text-green-500" />,
  failed: <XCircle size={14} className="text-destructive" />,
};

const STATUS_TEXT: Record<string, string> = {
  pending: EXPORT_TASK_STATUS_META.pending.label,
  success: EXPORT_TASK_STATUS_META.success.label,
  failed: EXPORT_TASK_STATUS_META.failed.label,
};

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminExportCenter() {
  const [tasks, setTasks] = useState<ExportTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedType, setSelectedType] = useState("sales");

  const loadTasks = useCallback(async () => {
    try {
      const rows = await loadExportTasks();
      setTasks(rows);
    } catch (e) { toast.error(toastErrorMessage(e, "加载导出列表失败")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  useEffect(() => {
    const hasPending = tasks.some((t) => t.status === EXPORT_TASK_STATUS.PENDING);
    if (!hasPending) return;
    const timer = setInterval(loadTasks, 3000);
    return () => clearInterval(timer);
  }, [tasks, loadTasks]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createExportTask(selectedType);
      toast.success("导出任务已创建");
      loadTasks();
    } catch (e) { toast.error(toastErrorMessage(e, "创建失败")); }
    finally { setCreating(false); }
  };

  const handleDownload = (task: ExportTask) => {
    const url = getExportDownloadUrl(task.id);
    const token = getAdminAccessToken();
    const a = document.createElement("a");
    a.href = token ? `${url}?token=${token}` : url;
    a.download = task.file_name;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><FileSpreadsheet size={20} /> 导出中心</h2>
          <p className="text-sm text-muted-foreground">管理所有后台数据导出任务</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={loadTasks} className="touch-manipulation rounded-xl border border-border p-2.5 text-muted-foreground hover:bg-secondary" title="刷新">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <PermissionGate permission="report.export">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
          <span className="text-sm font-medium text-foreground">创建导出:</span>
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="touch-manipulation min-h-[44px] rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none">
            {EXPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button type="button" onClick={handleCreate} disabled={creating} className="touch-manipulation flex min-h-[44px] items-center gap-1.5 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {creating ? "创建中..." : "创建导出任务"}
          </button>
        </div>
      </PermissionGate>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>
      ) : tasks.length === 0 ? (
        <div className="py-16 text-center">
          <FileSpreadsheet size={40} className="mx-auto text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">暂无导出任务</p>
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {tasks.map((t) => (
              <div key={t.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{t.file_name}</span>
                    <div className="flex items-center gap-1 text-xs">{STATUS_ICON[t.status]} {STATUS_TEXT[t.status]}</div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span>类型: {EXPORT_TYPES.find((x) => x.value === t.type)?.label || t.type}</span>
                    <span>大小: {formatBytes(t.file_size)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{t.created_at ? new Date(t.created_at).toLocaleString("zh-CN") : ""}</p>
                  {t.error_message && <p className="text-xs text-destructive">{t.error_message}</p>}
                  {t.status === EXPORT_TASK_STATUS.SUCCESS && (
                    <button type="button" onClick={() => handleDownload(t)} className="touch-manipulation flex min-h-[40px] w-full items-center justify-center gap-1 rounded-lg border border-gold/40 py-2 text-sm font-medium text-gold">
                      <Download size={14} /> 下载文件
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
            <table className="w-full min-w-[650px] text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  {["文件名", "类型", "状态", "大小", "创建时间", "完成时间", "操作"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-3 text-foreground">{t.file_name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{EXPORT_TYPES.find((x) => x.value === t.type)?.label || t.type}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs">{STATUS_ICON[t.status]} {STATUS_TEXT[t.status]}</div>
                      {t.error_message && <p className="mt-0.5 text-[10px] text-destructive truncate max-w-[150px]" title={t.error_message}>{t.error_message}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatBytes(t.file_size)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{t.created_at ? new Date(t.created_at).toLocaleString("zh-CN") : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{t.finished_at ? new Date(t.finished_at).toLocaleString("zh-CN") : "—"}</td>
                    <td className="px-4 py-3">
                      {t.status === EXPORT_TASK_STATUS.SUCCESS ? (
                        <button type="button" onClick={() => handleDownload(t)} className="touch-manipulation rounded-lg border border-border p-1.5 text-gold hover:bg-secondary" title="下载">
                          <Download size={14} />
                        </button>
                      ) : t.status === EXPORT_TASK_STATUS.PENDING ? (
                        <Loader2 size={14} className="animate-spin text-muted-foreground" />
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
