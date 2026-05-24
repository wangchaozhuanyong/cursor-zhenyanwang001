import * as exportApi from "@/api/admin/exportCenter";
import type { ExportTask } from "@/api/admin/exportCenter";
import { unwrapList } from "@/services/responseNormalize";

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
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name || task.file_name;
  a.click();
  URL.revokeObjectURL(url);
}
