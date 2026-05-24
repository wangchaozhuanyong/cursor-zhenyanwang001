import * as exportApi from "@/api/admin/exportCenter";
import type { ExportTask } from "@/api/admin/exportCenter";
import { unwrapList } from "@/services/responseNormalize";
import { runGuardedDownload } from "@/utils/downloadConfirm";
import { triggerBrowserBlobDownload } from "@/utils/fileDownload";

export type { ExportTask };

export async function loadExportTasks() {
  const res = await exportApi.listExportTasks();
  return unwrapList<ExportTask>(res.data);
}

export async function createExportTask(type: string, params?: Record<string, unknown>) {
  const res = await exportApi.createExportTask(type, params);
  return res.data;
}

export function getExportDownloadUrl(taskId: string) {
  return exportApi.getExportDownloadUrl(taskId);
}

export async function downloadExportTask(task: ExportTask) {
  const fileName = task.file_name || "export.csv";
  const started = await runGuardedDownload(async () => {
    const res = await fetch(getExportDownloadUrl(task.id), { credentials: "include" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message || "下载失败");
    }
    const cd = res.headers.get("Content-Disposition");
    let name = task.file_name;
    if (cd) {
      const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(cd);
      if (m) {
        try {
          name = decodeURIComponent(m[1]);
        } catch {
          name = m[1];
        }
      }
    }
    const blob = await res.blob();
    await triggerBrowserBlobDownload(blob, name || fileName);
  }, {
    title: "确认下载",
    fileName,
    description: `即将下载导出文件「${fileName}」，是否继续？`,
  });
  if (!started) return;
}
