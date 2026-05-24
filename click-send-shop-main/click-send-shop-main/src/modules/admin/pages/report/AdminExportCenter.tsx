import { formatDateTime } from "@/utils/formatDateTime";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, RefreshCw, CheckCircle2, XCircle, Clock, FileSpreadsheet } from "lucide-react";
import { AnimatedTable, LoadingButton } from "@/modules/micro-interactions";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import PermissionGate from "@/components/admin/PermissionGate";
import { Tx } from "@/components/admin/AdminText";
import AdminFieldHint from "@/components/admin/AdminFieldHint";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { toast } from "sonner";
import {
  createExportTask,
  getExportDownloadUrl,
  loadExportTasks,
} from "@/services/admin/exportCenterService";
import type { ExportTask } from "@/services/admin/exportCenterService";
import { getAdminAccessToken } from "@/utils/token";
import { EXPORT_TASK_STATUS, EXPORT_TASK_STATUS_META } from "@/constants/statusDictionary";
import { useAdminDisplayLabel } from "@/hooks/useAdminDisplayLabel";
import { toastErrorMessage } from "@/utils/errorMessage";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import { THEME_TEXT_DANGER, THEME_TEXT_SUCCESS, THEME_TEXT_WARNING } from "@/utils/themeVisuals";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { EXPORTABLE_REPORTS } from "./reportRegistry";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useAdminT } from "@/hooks/useAdminT";
import { useLocalizedAdminEmptyGuide } from "@/hooks/useLocalizedAdminEmptyGuide";

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock size={14} className={`animate-pulse ${THEME_TEXT_WARNING}`} />,
  success: <CheckCircle2 size={14} className={THEME_TEXT_SUCCESS} />,
  failed: <XCircle size={14} className={THEME_TEXT_DANGER} />,
};

function formatBytes(bytes: number) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminExportCenter() {
  const { tText } = useAdminT();
  const { exportType: labelExportType } = useAdminDisplayLabel();
  const exportStatusText = useMemo(
    () => ({
      pending: tText(EXPORT_TASK_STATUS_META.pending.label),
      success: tText(EXPORT_TASK_STATUS_META.success.label),
      failed: tText(EXPORT_TASK_STATUS_META.failed.label),
    }),
    [tText],
  );
  const { confirm } = useAdminConfirm();
  const exportTasksEmptyGuide = useLocalizedAdminEmptyGuide(ADMIN_EMPTY_GUIDES.exportTasks);
  const queryClient = useQueryClient();
  const capabilities = useSiteCapabilities();
  const [creating, setCreating] = useState(false);
  const exportTypes = useMemo(
    () => EXPORTABLE_REPORTS
      .filter((report) => !report.capability || capabilities[report.capability])
      .map((report) => ({ value: report.exportType!, label: report.title })),
    [capabilities],
  );
  const [selectedType, setSelectedType] = useState(exportTypes[0]?.value ?? "sales_daily");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (exportTypes.length === 0) return;
    if (!exportTypes.some((item) => item.value === selectedType)) {
      setSelectedType(exportTypes[0].value);
    }
  }, [exportTypes, selectedType]);

  const tasksQuery = useQuery({
    queryKey: adminQueryKeys.exportTasks(),
    queryFn: loadExportTasks,
    staleTime: 10_000,
    refetchInterval: (query) =>
      (query.state.data ?? []).some((t) => t.status === EXPORT_TASK_STATUS.PENDING) ? 3000 : false,
  });

  const tasks = tasksQuery.data ?? [];
  const loading = tasksQuery.isLoading && !tasksQuery.data;

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createExportTask(selectedType, {
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      toast.success(tText("导出任务已创建"));
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.exportTasks() });
    } catch (e) {
      toast.error(toastErrorMessage(e, "创建失败"));
    } finally {
      setCreating(false);
    }
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
          <div className="flex items-center gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><FileSpreadsheet size={20} /><Tx>导出中心</Tx></h2>
            <AdminFieldHint text={<Tx>支持按报表类型与日期范围创建导出任务</Tx>} />
          </div>
        </div>
        <button type="button" onClick={() => void tasksQuery.refetch()} className="touch-manipulation rounded-xl border border-border p-2.5 text-muted-foreground hover:bg-secondary" title={tText("刷新")}>
          <RefreshCw size={16} />
        </button>
      </div>

      <PermissionGate permission="report.export">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
          <span className="text-sm font-medium text-foreground"><Tx>创建导出:</Tx></span>
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="touch-manipulation min-h-[44px] rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none">
            {exportTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <SegmentedDateInput value={dateFrom} onChange={setDateFrom} className="min-w-[12rem]" />
          <SegmentedDateInput value={dateTo} onChange={setDateTo} className="min-w-[12rem]" />
          <LoadingButton
            type="button"
            variant="gold"
            state={creating ? "loading" : "normal"}
            loadingText="创建中..."
            onClick={() =>
              confirm({ title: tText("确认导出"),
                description: "确定创建导出任务？完成后可在列表下载文件。",
                confirmText: "开始导出",
                onConfirm: () => handleCreate(),
              })
            }
            className="touch-manipulation min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-semibold"
          ><Tx>
            创建导出任务
          </Tx></LoadingButton>
        </div>
      </PermissionGate>

      <AnimatedTable
        loading={loading}
        rows={tasks}
        rowKey={(t) => t.id}
        skeletonRows={6}
        skeletonCols={7}
        className="overflow-x-auto rounded-xl border border-border bg-card"
        tableClassName="w-full min-w-[760px] text-sm"
        theadClassName="border-b border-border bg-secondary/50"
        thead={(
          <tr>
            {"文件名,类型,状态,大小,创建时间,完成时间,操作".split(",").map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr>
        )}
        emptyIcon={exportTasksEmptyGuide.icon}
        emptyTitle={exportTasksEmptyGuide.title}
        emptyDescription={exportTasksEmptyGuide.description}
        emptyAction={<AdminEmptyGuideActions guide={exportTasksEmptyGuide} />}
        renderRow={(t) => (
          <>
            <td className="px-4 py-3 text-foreground">{t.file_name}</td>
            <td className="px-4 py-3 text-xs text-muted-foreground">{exportTypes.find((x) => x.value === t.type)?.label || labelExportType(t.type)}</td>
            <td className="px-4 py-3"><div className="flex items-center gap-1 text-xs">{STATUS_ICON[t.status]} {exportStatusText[t.status] || tText("未知")}</div></td>
            <td className="px-4 py-3 text-xs text-muted-foreground">{formatBytes(t.file_size)}</td>
            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{t.created_at ? formatDateTime(t.created_at) : "-"}</td>
            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{t.finished_at ? formatDateTime(t.finished_at) : "-"}</td>
            <td className="px-4 py-3">
              {t.status === EXPORT_TASK_STATUS.SUCCESS ? (
                <button type="button" onClick={() => handleDownload(t)} className="touch-manipulation rounded-lg border border-border p-1.5 text-theme-price hover:bg-secondary" title={tText("下载")}>
                  <Download size={14} />
                </button>
              ) : t.status === EXPORT_TASK_STATUS.PENDING ? <Loader2 size={14} className="animate-spin text-muted-foreground" /> : <span className="text-xs text-muted-foreground">-</span>}
            </td>
          </>
        )}
      />
    </div>
  );
}
