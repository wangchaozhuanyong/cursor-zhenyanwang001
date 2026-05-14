import {
  uploadFile as uploadFileApi,
  uploadFiles as uploadFilesApi,
  getUploadStorageStatus as getUploadStorageStatusApi,
} from "@/api/modules/upload";

export async function uploadSingle(file: File) {
  return uploadFileApi(file);
}

export async function uploadMultiple(files: File[]) {
  return uploadFilesApi(files);
}

export function getUploadStorageStatus(url: string) {
  return getUploadStorageStatusApi(url);
}
