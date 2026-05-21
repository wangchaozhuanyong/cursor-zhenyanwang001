import * as api from "@/api/admin/dataRetention";

export type {
  DataCleanupOverview,
  DataCleanupPolicy,
  DataCleanupRun,
  DataCleanupRunListParams,
  DataCleanupRunStep,
} from "@/api/admin/dataRetention";

export async function fetchDataCleanupOverview() {
  const res = await api.getDataCleanupOverview();
  return res.data;
}

export async function fetchDataCleanupPolicies() {
  const res = await api.getDataCleanupPolicies();
  return res.data;
}

export async function saveDataCleanupPolicy(
  key: string,
  data: Parameters<typeof api.updateDataCleanupPolicy>[1],
) {
  const res = await api.updateDataCleanupPolicy(key, data);
  return res.data;
}

export async function resetDataCleanupDefaults() {
  const res = await api.resetDataCleanupPolicyDefaults();
  return res.data;
}

export async function previewDataCleanup(policyKeys: string[]) {
  const res = await api.previewDataCleanup({ policy_keys: policyKeys });
  return res.data;
}

export async function executeDataCleanup(previewRunId: number, policyKeys: string[]) {
  const res = await api.createDataCleanupRun({ preview_run_id: previewRunId, policy_keys: policyKeys });
  return res.data;
}

export async function fetchDataCleanupRuns(params?: api.DataCleanupRunListParams) {
  const res = await api.getDataCleanupRuns(params);
  return res.data;
}

export async function fetchDataCleanupRun(id: number | string) {
  const res = await api.getDataCleanupRun(id);
  return res.data;
}

export async function requestCancelDataCleanupRun(id: number | string) {
  const res = await api.cancelDataCleanupRun(id);
  return res.data;
}
