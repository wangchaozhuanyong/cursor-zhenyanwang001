import { ApiError } from "@/types/common";

/** fetch / AbortController 取消，不应 toast 或写入错误态 */
export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  return false;
}

export function getApiErrorCode(error: unknown): number | null {
  return error instanceof ApiError ? error.code : null;
}

/** 资源已被删除或不存在（404） */
export function isNotFoundError(error: unknown): boolean {
  return getApiErrorCode(error) === 404;
}
