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
