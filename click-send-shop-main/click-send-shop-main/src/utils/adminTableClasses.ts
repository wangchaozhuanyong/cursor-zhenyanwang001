import { cn } from "@/lib/utils";

/** 管理后台数据表：参与全局列宽/列间距自适应 */
export const ADMIN_DATA_TABLE_CLASS = "admin-data-table";

/** 固定列宽布局（主题预览等例外场景） */
export const ADMIN_TABLE_FIXED_CLASS = "admin-table-fixed";

/** 单元格不换行（订单号、操作列等） */
export const ADMIN_TABLE_NOWRAP_CLASS = "admin-table-nowrap";

/** 移动端/平板冻结首列 */
export const ADMIN_TABLE_STICKY_FIRST_CLASS = "admin-table-sticky-first";

export function adminTableClassName(
  extra?: string,
  options?: { fixed?: boolean },
): string {
  return cn(
    ADMIN_DATA_TABLE_CLASS,
    options?.fixed && ADMIN_TABLE_FIXED_CLASS,
    extra,
  );
}

export function adminThClassName(extra?: string): string {
  return cn(
    "text-left text-xs font-semibold text-muted-foreground",
    extra,
  );
}

export function adminTdClassName(extra?: string): string {
  return cn("align-middle text-foreground", extra);
}
