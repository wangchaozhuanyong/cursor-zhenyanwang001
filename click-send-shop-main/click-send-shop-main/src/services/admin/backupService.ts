import * as api from "@/api/admin/backup";

export type {
  BackupAlert,
  BackupFile,
  BackupJob,
  BackupOverview,
  RestoreDrillReport,
  RestoreJob,
  RestoreJobPayload,
} from "@/api/admin/backup";

export async function fetchBackupOverview() {
  const res = await api.getBackupOverview();
  return res.data;
}

export async function fetchBackupFiles(params?: Parameters<typeof api.getBackupFiles>[0]) {
  const res = await api.getBackupFiles(params);
  return res.data;
}

export async function requestFullBackup(reason?: string) {
  const res = await api.createFullBackup(reason);
  return res.data;
}

export async function fetchRestoreJobs(params?: Parameters<typeof api.getRestoreJobs>[0]) {
  const res = await api.getRestoreJobs(params);
  return res.data;
}

export async function requestRestoreJob(data: api.RestoreJobPayload) {
  const res = await api.createRestoreJob(data);
  return res.data;
}

export async function approveRestoreJob(id: string) {
  const res = await api.approveRestoreJob(id);
  return res.data;
}

export async function switchRestoreJob(id: string) {
  const res = await api.switchRestoreJob(id);
  return res.data;
}

export async function fetchRestoreDrills() {
  const res = await api.getRestoreDrills({ limit: 20 });
  return res.data;
}

export async function fetchBackupAlerts() {
  const res = await api.getBackupAlerts({ limit: 50 });
  return res.data;
}
