import * as api from "@/api/admin/myinvois";
import { unwrapPaginated } from "@/services/responseNormalize";

export type {
  MyInvoisDocument,
  MyInvoisDocumentListParams,
  MyInvoisProfile,
  MyInvoisStatus,
} from "@/api/admin/myinvois";

export async function fetchMyInvoisStatus() {
  const res = await api.getMyInvoisStatus();
  return res.data;
}

export async function saveMyInvoisConfig(payload: api.MyInvoisProfile) {
  await api.updateMyInvoisConfig(payload);
}

export async function fetchMyInvoisDocuments(params?: api.MyInvoisDocumentListParams) {
  const res = await api.getMyInvoisDocuments(params);
  return unwrapPaginated<api.MyInvoisDocument>(res.data);
}

export async function retryMyInvoisDocument(id: string) {
  await api.retryMyInvoisDocument(id);
}

export async function submitMyInvoisDocument(id: string) {
  await api.submitMyInvoisDocument(id);
}

export async function processPendingMyInvois(limit?: number) {
  const res = await api.processPendingMyInvois(limit);
  return res.data;
}

export async function createMyInvoisReconciliation(payload: { reconcile_date: string; document_type?: string; notes?: string }) {
  const res = await api.createMyInvoisReconciliation(payload);
  return res.data;
}
