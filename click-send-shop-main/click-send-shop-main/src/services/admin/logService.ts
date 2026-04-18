import * as logApi from "@/api/admin/log";
import * as auditApi from "@/api/admin/audit";
import type { PaginatedData, PaginationParams } from "@/types/common";
import type { AuditLogListParams, AuditLogRow } from "@/api/admin/audit";
import type { AdminLog } from "@/types/admin";
import { unwrapPaginated } from "@/services/responseNormalize";

export type { AuditLogListParams, AuditLogRow };

export async function fetchAdminLogs(params?: PaginationParams & { action?: string }) {
  const res = await logApi.getAdminLogs(params);
  return unwrapPaginated<AdminLog>(res.data);
}

export async function fetchAuditLogs(params?: AuditLogListParams): Promise<PaginatedData<AuditLogRow>> {
  const res = await auditApi.getAuditLogs(params);
  return unwrapPaginated<AuditLogRow>(res.data);
}
