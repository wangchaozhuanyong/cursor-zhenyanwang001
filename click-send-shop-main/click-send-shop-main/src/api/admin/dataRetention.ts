import { get, post, put } from "@/api/request";
import type { PaginatedData } from "@/types/common";

export type DataCleanupRunStatus =
  | "previewed"
  | "running"
  | "success"
  | "partial_failed"
  | "failed"
  | "cancelled"
  | "skipped";

export type DataCleanupPolicy = {
  key: string;
  title: string;
  description: string;
  category: string;
  table_name: string;
  date_column: string;
  delete_mode: string;
  retention_days: number;
  default_retention_days: number;
  min_retention_days: number;
  batch_size: number;
  enabled: boolean;
  locked: boolean;
  protected: boolean;
};

export type DataCleanupRunStep = {
  id: number;
  run_id: number;
  policy_key: string;
  table_name: string;
  status: DataCleanupRunStatus;
  cutoff_at?: string | null;
  matched_count: number;
  deleted_count: number;
  batch_size: number;
  batch_count: number;
  sample_ids?: Array<string | number>;
  error_message?: string | null;
  started_at?: string;
  finished_at?: string | null;
  duration_ms?: number | null;
};

export type DataCleanupRun = {
  id: number;
  run_type: "preview" | "manual" | "scheduled" | string;
  status: DataCleanupRunStatus;
  triggered_by?: string | null;
  preview_run_id?: number | null;
  preview_consumed_at?: string | null;
  policy_keys: string[];
  total_matched: number;
  total_deleted: number;
  total_failed: number;
  cancel_requested?: boolean;
  error_message?: string | null;
  started_at?: string;
  finished_at?: string | null;
  duration_ms?: number | null;
  steps?: DataCleanupRunStep[];
};

export type DataCleanupOverview = {
  policyCount: number;
  enabledPolicyCount: number;
  lockedPolicyCount: number;
  protectedTables: string[];
  batchSizeRange: { min: number; max: number };
  previewTtlMinutes: number;
  recentRuns: DataCleanupRun[];
  runningRun?: DataCleanupRun | null;
};

export type DataCleanupPreviewPayload = {
  policy_keys?: string[];
};

export type DataCleanupRunPayload = {
  preview_run_id: number;
  policy_keys?: string[];
};

export type DataCleanupRunListParams = {
  page?: number;
  pageSize?: number;
  status?: string;
  runType?: string;
  policyKey?: string;
};

export function getDataCleanupOverview() {
  return get<DataCleanupOverview>("/admin/data-retention/overview");
}

export function getDataCleanupPolicies() {
  return get<DataCleanupPolicy[]>("/admin/data-retention/policies");
}

export function updateDataCleanupPolicy(
  key: string,
  data: Partial<Pick<DataCleanupPolicy, "retention_days" | "enabled" | "batch_size">>,
) {
  return put<DataCleanupPolicy>(`/admin/data-retention/policies/${key}`, data);
}

export function resetDataCleanupPolicyDefaults() {
  return post<DataCleanupPolicy[]>("/admin/data-retention/policies/reset-defaults");
}

export function previewDataCleanup(data: DataCleanupPreviewPayload) {
  return post<DataCleanupRun>("/admin/data-retention/preview", data);
}

export function createDataCleanupRun(data: DataCleanupRunPayload) {
  return post<DataCleanupRun>("/admin/data-retention/runs", data);
}

export function getDataCleanupRuns(params?: DataCleanupRunListParams) {
  return get<PaginatedData<DataCleanupRun>>("/admin/data-retention/runs", params as Record<string, unknown>);
}

export function getDataCleanupRun(id: number | string) {
  return get<DataCleanupRun>(`/admin/data-retention/runs/${id}`);
}

export function cancelDataCleanupRun(id: number | string) {
  return post<DataCleanupRun>(`/admin/data-retention/runs/${id}/cancel`);
}
