import { uploadFile as uploadFileApi, uploadFiles as uploadFilesApi } from "@/api/modules/upload";

export async function uploadSingle(file: File) {
  return uploadFileApi(file);
}

export async function uploadMultiple(files: File[]) {
  return uploadFilesApi(files);
}
