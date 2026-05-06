import { ApiError } from "@/types/common";

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function getErrorMessage(error: unknown, fallback = "操作失败"): string {
  if (error instanceof ApiError) {
    const data = error.data as Record<string, unknown> | undefined;
    const backendMessage = readString(data?.message) || readString(data?.error);
    const message = backendMessage || readString(error.message);
    const traceId = readString(data?.traceId);
    return traceId && message ? `${message}（追踪ID：${traceId}）` : (message || fallback);
  }

  if (error instanceof Error) {
    return readString(error.message) || fallback;
  }

  if (typeof error === "object" && error !== null) {
    const data = error as Record<string, unknown>;
    return readString(data.message) || readString(data.error) || fallback;
  }

  return fallback;
}

export function toastErrorMessage(error: unknown, fallback = "操作失败"): string {
  return getErrorMessage(error, fallback);
}
