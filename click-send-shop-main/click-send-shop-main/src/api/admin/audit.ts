import { get } from "../request";
import type { PaginatedData } from "@/types/common";

export interface AuditLogRow {
  id: string;
  operator_id: string | null;
  operator_name: string;
  operator_role: string;
  action_type: string;
  object_type: string;
  object_id: string | null;
  summary: string;
  before_json: unknown;
  after_json: unknown;
  ip: string;
  user_agent: string;
  request_path: string;
  request_method: string;
  result: "success" | "failure";
  error_message: string;
  created_at: string;
}

export interface AuditLogListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  operatorId?: string;
  objectType?: string;
  objectId?: string;
  actionType?: string;
  result?: "success" | "failure";
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "created_at" | "action_type" | "result";
  sortOrder?: "asc" | "desc";
}

export function getAuditLogs(params?: AuditLogListParams) {
  return get<PaginatedData<AuditLogRow>>("/admin/audit-logs", params as Record<string, string>);
}
