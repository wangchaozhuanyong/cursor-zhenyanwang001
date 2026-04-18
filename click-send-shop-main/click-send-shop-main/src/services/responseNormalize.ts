import type { PaginatedData } from "@/types/common";

function emptyPaginated<T>(): PaginatedData<T> {
  return { list: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
}

/**
 * 将后端 data 统一为数组：支持 T[] 或 { list: T[] }。
 * 用户端与管理端 Service 共用，避免 Page 层补丁式适配。
 */
export function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "list" in data) {
    const list = (data as { list: unknown }).list;
    if (Array.isArray(list)) return list as T[];
  }
  return [];
}

/**
 * 将后端 data 统一为 PaginatedData：支持标准分页对象，或裸数组（退化为单页）。
 */
export function unwrapPaginated<T>(data: unknown): PaginatedData<T> {
  if (data == null || typeof data !== "object") return emptyPaginated<T>();
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.list)) {
    const total = Number(d.total) || 0;
    const page = Number(d.page) || 1;
    const pageSize = Number(d.pageSize) || 20;
    const totalPages =
      typeof d.totalPages === "number" && Number.isFinite(d.totalPages)
        ? d.totalPages
        : total === 0
          ? 0
          : Math.ceil(total / pageSize);
    return {
      list: d.list as T[],
      total,
      page,
      pageSize,
      totalPages,
    };
  }
  if (Array.isArray(data)) {
    const list = data as T[];
    const n = list.length;
    return {
      list,
      total: n,
      page: 1,
      pageSize: n || 20,
      totalPages: n ? 1 : 0,
    };
  }
  return emptyPaginated<T>();
}

/** `{ count: number }` 类响应，用于未读数等 */
export function unwrapCount(data: unknown): number {
  if (data && typeof data === "object" && "count" in data) {
    const n = Number((data as { count: unknown }).count);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
