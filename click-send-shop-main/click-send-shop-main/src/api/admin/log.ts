import { get } from "../request";
import type { AdminLog } from "@/types/admin";
import type { PaginatedData, PaginationParams } from "@/types/common";

export function getAdminLogs(params?: PaginationParams & { action?: string }) {
  return get<PaginatedData<AdminLog>>("/admin/logs", params as Record<string, string>);
}
