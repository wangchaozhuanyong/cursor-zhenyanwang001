import {
  validateUploadFile,
  uploadFile,
  uploadFiles,
  uploadAdminSiteAsset,
  getUploadStorageStatus,
  type UploadFileResult,
  type UploadMode,
  type UploadRequestOptions,
  type UploadProgressCallback,
} from "@/api/modules/upload";

export {
  validateUploadFile,
  uploadFiles,
  uploadAdminSiteAsset,
  getUploadStorageStatus,
  type UploadFileResult,
  type UploadMode,
  type UploadRequestOptions,
  type UploadProgressCallback,
};

/** 单文件上传（页面层统一入口） */
export async function uploadSingle(
  file: File,
  options: UploadRequestOptions = {},
): Promise<UploadFileResult> {
  return uploadFile(file, options);
}

/** 带进度回调的单文件上传 */
export async function uploadSingleWithProgress(
  file: File,
  options: UploadRequestOptions = {},
): Promise<UploadFileResult> {
  return uploadFile(file, options);
}
