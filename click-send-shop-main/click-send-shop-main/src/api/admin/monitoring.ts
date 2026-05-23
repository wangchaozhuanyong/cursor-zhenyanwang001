import { get, patch, post } from "@/api/request";

export type MonitoringSeverity = "P0" | "P1" | "P2" | "P3" | "INFO";
export type MonitoringAnomalyStatus = "open" | "investigating" | "repair_pending" | "repaired" | "ignored" | "resolved";

export type MonitoringRule = {
  id: number;
  code: string;
  module: string;
  title: string;
  description?: string;
  severity: MonitoringSeverity;
  enabled: number | boolean;
  schedule_cron?: string | null;
  auto_fix_enabled: number | boolean;
  created_at?: string;
  updated_at?: string;
};

export type MonitoringRun = {
  id: number;
  run_type: string;
  rule_code?: string | null;
  status: "running" | "success" | "failed" | "cancelled";
  checked_count: number;
  anomaly_count: number;
  started_at?: string;
  finished_at?: string | null;
  duration_ms?: number | null;
  error_message?: string | null;
};

export type MonitoringAnomaly = {
  id: number;
  rule_code: string;
  module: string;
  severity: MonitoringSeverity;
  entity_type: string;
  entity_id: string;
  title: string;
  expected_value?: unknown;
  actual_value?: unknown;
  diff_value?: unknown;
  root_cause_code?: string;
  root_cause_message?: string;
  evidence?: Record<string, unknown> | null;
  status: MonitoringAnomalyStatus;
  seen_count: number;
  first_seen_at?: string;
  last_seen_at?: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
};

export type MonitoringRepairTask = {
  id: number;
  anomaly_id: number;
  anomaly_title?: string;
  rule_code?: string;
  severity?: MonitoringSeverity;
  entity_type?: string;
  entity_id?: string;
  repair_type: string;
  repair_status: "pending" | "approved" | "executed" | "failed" | "cancelled";
  before_snapshot?: unknown;
  after_snapshot?: unknown;
  suggestion?: Record<string, unknown> | null;
  operator_id?: string | null;
  operator_label?: string | null;
  remark?: string | null;
  executed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MonitoringOverview = {
  todayRunCount: number;
  todayAnomalyCount: number;
  openAnomalyCount: number;
  highRiskCount: number;
  fixedCount: number;
  moduleCounts: Array<{ module: string; count: number }>;
  recentHighRisk: MonitoringAnomaly[];
  recentRuns: MonitoringRun[];
};

export type MonitoringListParams = {
  page?: number;
  pageSize?: number;
  status?: string;
  severity?: string;
  module?: string;
  ruleCode?: string;
  entityType?: string;
  entityId?: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type Paginated<T> = {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type MonitoringAnomalyDetail = {
  anomaly: MonitoringAnomaly;
  changeEvents: Array<Record<string, unknown>>;
  repairTasks: MonitoringRepairTask[];
  runs: MonitoringRun[];
};

export function getMonitoringOverview() {
  return get<MonitoringOverview>("/admin/monitoring/overview");
}

export function getMonitoringAnomalies(params?: MonitoringListParams) {
  return get<Paginated<MonitoringAnomaly>>("/admin/monitoring/anomalies", params as Record<string, unknown>);
}

export function getMonitoringAnomalyDetail(id: string | number) {
  return get<MonitoringAnomalyDetail>(`/admin/monitoring/anomalies/${id}`);
}

export function rescanMonitoringAnomaly(id: string | number) {
  return post<MonitoringAnomaly>(`/admin/monitoring/anomalies/${id}/rescan`);
}

export function ignoreMonitoringAnomaly(id: string | number, remark?: string) {
  return post<MonitoringAnomaly>(`/admin/monitoring/anomalies/${id}/ignore`, { remark });
}

export function resolveMonitoringAnomaly(id: string | number, remark?: string) {
  return post<MonitoringAnomaly>(`/admin/monitoring/anomalies/${id}/resolve`, { remark });
}

export function createRepairTask(id: string | number, remark?: string) {
  return post<MonitoringRepairTask>(`/admin/monitoring/anomalies/${id}/create-repair-task`, { remark });
}

export function getRepairTasks(params?: { page?: number; pageSize?: number; status?: string }) {
  return get<Paginated<MonitoringRepairTask>>("/admin/monitoring/repair-tasks", params as Record<string, unknown>);
}

export function executeRepairTask(id: string | number) {
  return post<MonitoringRepairTask>(`/admin/monitoring/repair-tasks/${id}/execute`);
}

export function getMonitoringRules() {
  return get<MonitoringRule[]>("/admin/monitoring/rules");
}

export function updateMonitoringRule(code: string, data: Partial<Pick<MonitoringRule, "enabled" | "severity" | "schedule_cron" | "auto_fix_enabled">>) {
  return patch<MonitoringRule>(`/admin/monitoring/rules/${code}`, data);
}

export function runMonitoringRule(code: string) {
  return post<Record<string, unknown>>(`/admin/monitoring/rules/${code}/run`);
}

export function getMonitoringRuns(params?: { page?: number; pageSize?: number; status?: string; ruleCode?: string }) {
  return get<Paginated<MonitoringRun>>("/admin/monitoring/runs", params as Record<string, unknown>);
}
