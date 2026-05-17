import {
  uploadFile as uploadFileApi,
  uploadFiles as uploadFilesApi,
  getUploadStorageStatus as getUploadStorageStatusApi,
  type UploadRequestOptions,
} from "@/api/modules/upload";

export async function uploadSingle(file: File, options: UploadRequestOptions = {}) {
  return uploadFileApi(file, options);
}

export async function uploadSingleWithProgress(file: File, options: UploadRequestOptions = {}) {
  return uploadFileApi(file, options);
}

export async function uploadMultiple(files: File[]) {
  return uploadFilesApi(files);
}

export async function uploadMultipleWithProgress(files: File[], options: UploadRequestOptions = {}) {
  return uploadFilesApi(files, options);
}

export function getUploadStorageStatus(url: string) {
  return getUploadStorageStatusApi(url);
}
