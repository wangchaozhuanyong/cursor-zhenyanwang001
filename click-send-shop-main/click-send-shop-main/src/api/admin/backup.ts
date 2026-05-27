import { get, post } from "@/api/request";
import type { PaginatedData } from "@/types/common";

export type BackupJob = {
  id: string;
  job_type: string;
  status: string;
  trigger_source: string;
  reason?: string;
  started_at?: string | null;
  finished_at?: string | null;
  error_message?: string;
  created_at: string;
};

export type BackupFile = {
  id: string;
  backup_job_id: string;
  file_kind: string;
  storage_provider: string;
  bucket: string;
  storage_key: string;
  size_bytes: number;
  sha256: string;
  encrypted: boolean;
  recoverable_at?: string | null;
  retention_tier: string;
  verified_at?: string | null;
  verification_status?: string | null;
  verification_report?: unknown;
  manifest_json?: unknown;
  created_at: string;
  job_type?: string;
  job_status?: string;
};

export type BackupAlert = {
  id: string;
  alert_type: string;
  severity: string;
  status: string;
  title: string;
  message?: string;
  created_at: string;
};

export type RestoreJob = {
  id: string;
  restore_type: string;
  status: string;
  source_backup_file_id?: string | null;
  target_time?: string | null;
  target_table?: string | null;
  target_entity_id?: string | null;
  temp_db_name: string;
  validation_result?: unknown;
  diff_summary?: unknown;
  error_message?: string;
  created_at: string;
};

export type RestoreDrillReport = {
  id: string;
  status: string;
  temp_db_name?: string;
  duration_seconds?: number | null;
  error_message?: string;
  created_at: string;
};

export type BackupOverview = {
  latestFullBackupAt?: string | null;
  latestIncrementalBackupAt?: string | null;
  latestRecoverableAt?: string | null;
  binlogHealthy: boolean;
  binlogDelaySeconds?: number | null;
  openAlertCount: number;
  failedJobCount7d: number;
  recentJobs: BackupJob[];
  recentAlerts: BackupAlert[];
  recentDrills: RestoreDrillReport[];
  latestRestoreDrill?: RestoreDrillReport | null;
  latestConfigBackup?: BackupFile | null;
  latestUploadsBackup?: BackupFile | null;
  recoverableExplanation?: string;
  missingBackupItems?: Array<{ kind: string; label: string; severity: string }>;
  safeguards: Record<string, boolean>;
};

export type RestoreJobPayload = {
  restoreType: "site" | "point_in_time";
  sourceBackupFileId?: string;
  targetTime?: string;
  targetTable?: string;
  targetEntityId?: string;
};

export function getBackupOverview() {
  return get<BackupOverview>("/admin/backups/overview");
}

export function getBackupFiles(params?: { page?: number; pageSize?: number; kind?: string; status?: string }) {
  return get<PaginatedData<BackupFile>>("/admin/backups/files", params);
}

export function createFullBackup(reason = "manual") {
  return post<{ id: string; status: string }>("/admin/backups/full", { reason });
}

export function createConfigBackup(reason = "manual") {
  return post<{ id: string; status: string }>("/admin/backups/config", { reason });
}

export function createUploadsBackup(reason = "manual") {
  return post<{ id: string; status: string }>("/admin/backups/uploads", { reason });
}

export function getBackupAlerts(params?: { limit?: number; status?: string }) {
  return get<BackupAlert[]>("/admin/backups/alerts", params);
}

export function getRestoreJobs(params?: { page?: number; pageSize?: number }) {
  return get<PaginatedData<RestoreJob>>("/admin/restore/jobs", params);
}

export function createRestoreJob(data: RestoreJobPayload) {
  return post<RestoreJob>("/admin/restore/jobs", data);
}

export function approveRestoreJob(id: string) {
  return post<RestoreJob>(`/admin/restore/jobs/${id}/approve`);
}

export function switchRestoreJob(id: string) {
  return post<{ id: string; status: string; message?: string }>(`/admin/restore/jobs/${id}/switch`);
}

export function getRestoreDrills(params?: { limit?: number }) {
  return get<RestoreDrillReport[]>("/admin/restore/drills", params);
}
