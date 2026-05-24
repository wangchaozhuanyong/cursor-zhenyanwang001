import { ApiError } from "@/types/common";
import { translateApiErrorMessage } from "@/utils/apiErrorMessage";

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function localizeMessage(message: string | undefined, fallback: string): string {
  const raw = message?.trim();
  if (!raw) return fallback;
  return translateApiErrorMessage(raw) || raw;
}

export function getErrorMessage(error: unknown, fallback = "操作失败"): string {
  if (error instanceof ApiError) {
    const data = error.data as Record<string, unknown> | undefined;
    const backendMessage = readString(data?.message) || readString(data?.error);
    if (error.code === 409) {
      const conflictFallback = "数据已被其他管理员修改，请刷新后再编辑";
      return localizeMessage(backendMessage || readString(error.message), conflictFallback);
    }
    const message = localizeMessage(backendMessage || readString(error.message), fallback);
    const traceId = readString(data?.traceId);
    return traceId && message !== fallback ? `${message}（追踪ID：${traceId}）` : message;
  }

  if (error instanceof Error) {
    return localizeMessage(readString(error.message), fallback);
  }

  if (typeof error === "object" && error !== null) {
    const data = error as Record<string, unknown>;
    return localizeMessage(readString(data.message) || readString(data.error), fallback);
  }

  return fallback;
}

export function toastErrorMessage(error: unknown, fallback = "操作失败"): string {
  return getErrorMessage(error, fallback);
}

