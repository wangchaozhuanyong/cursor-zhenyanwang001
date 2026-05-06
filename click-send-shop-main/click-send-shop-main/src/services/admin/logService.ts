import * as auditApi from "@/api/admin/audit";
import type { PaginatedData } from "@/types/common";
import type { AuditLogListParams, AuditLogRow } from "@/api/admin/audit";
import { unwrapPaginated } from "@/services/responseNormalize";

export type { AuditLogListParams, AuditLogRow };

export async function fetchAuditLogs(params?: AuditLogListParams): Promise<PaginatedData<AuditLogRow>> {
  const res = await auditApi.getAuditLogs(params);
  return unwrapPaginated<AuditLogRow>(res.data);
}
