import { get, post } from "../request";

export interface ExportTask {
  id: string;
  file_name: string;
  type: string;
  status: "pending" | "success" | "failed";
  file_size: number;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  finished_at: string | null;
}

export function createExportTask(type: string, params?: Record<string, unknown>) {
  return post<{ id: string; fileName: string; status: string }>("/admin/exports", { type, params });
}

export function listExportTasks() {
  return get<ExportTask[]>("/admin/exports");
}

export function getExportDownloadUrl(taskId: string) {
  const base = import.meta.env.VITE_API_BASE_URL ?? "/api";
  return `${base}/admin/exports/${taskId}/download`;
}
