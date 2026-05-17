import type { PaginatedData } from "@/types/common";

function emptyPaginated<T>(): PaginatedData<T> {
  return { list: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
}

/**
 * 灏嗗悗绔?data 缁熶竴涓烘暟缁勶細鏀寔 T[] 鎴?{ list: T[] }銆? * 鐢ㄦ埛绔笌绠＄悊绔?Service 鍏辩敤锛岄伩鍏?Page 灞傝ˉ涓佸紡閫傞厤銆? */
export function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "list" in data) {
    const list = (data as { list: unknown }).list;
    if (Array.isArray(list)) return list as T[];
  }
  return [];
}

/**
 * 灏嗗悗绔?data 缁熶竴涓?PaginatedData锛氭敮鎸佹爣鍑嗗垎椤靛璞★紝鎴栬８鏁扮粍锛堥€€鍖栦负鍗曢〉锛夈€? */
export function unwrapPaginated<T>(data: unknown): PaginatedData<T> {
  if (data == null || typeof data !== "object") return emptyPaginated<T>();
  const d = data as unknown as Record<string, unknown>;
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

/** `{ count: number }` 绫诲搷搴旓紝鐢ㄤ簬鏈鏁扮瓑 */
export function unwrapCount(data: unknown): number {
  if (data && typeof data === "object" && "count" in data) {
    const n = Number((data as { count: unknown }).count);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
