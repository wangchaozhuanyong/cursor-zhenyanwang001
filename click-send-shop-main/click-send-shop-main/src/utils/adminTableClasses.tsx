import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 管理后台数据表：参与全局列宽/列间距自适应 */
export const ADMIN_DATA_TABLE_CLASS = "admin-data-table";

/** 固定列宽布局（主题预览等例外场景） */
export const ADMIN_TABLE_FIXED_CLASS = "admin-table-fixed";

/** 单元格不换行（订单号、操作列等） */
export const ADMIN_TABLE_NOWRAP_CLASS = "admin-table-nowrap";

/** 允许长文案在单元格内换行（备注、描述等） */
export const ADMIN_TABLE_WRAP_CLASS = "admin-table-wrap";

/** 移动端/平板冻结首列 */
export const ADMIN_TABLE_STICKY_FIRST_CLASS = "admin-table-sticky-first";

/** div 网格布局的数据表（分类管理、事件中心等） */
export const ADMIN_DATA_GRID_CLASS = "admin-data-grid";

/** 列内容左对齐（默认，显式标注用于网格/首列） */
export const ADMIN_TABLE_ALIGN_LEFT_CLASS = "admin-table-align-left";

/** 列内容右对齐（金额、数量等） */
export const ADMIN_TABLE_ALIGN_RIGHT_CLASS = "admin-table-align-right";

/** 列内容居中对齐（状态、勾选等） */
export const ADMIN_TABLE_ALIGN_CENTER_CLASS = "admin-table-align-center";

export type AdminTableAlign = "left" | "right" | "center";

export function adminTableAlignClass(align: AdminTableAlign = "left"): string {
  if (align === "right") return ADMIN_TABLE_ALIGN_RIGHT_CLASS;
  if (align === "center") return ADMIN_TABLE_ALIGN_CENTER_CLASS;
  return ADMIN_TABLE_ALIGN_LEFT_CLASS;
}

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

export function adminDataGridClassName(extra?: string): string {
  return cn(ADMIN_DATA_GRID_CLASS, extra);
}

export function adminThClassName(extra?: string, align?: AdminTableAlign): string {
  return cn(
    "text-xs font-semibold text-muted-foreground",
    align !== undefined && adminTableAlignClass(align),
    extra,
  );
}

export function adminTdClassName(extra?: string, align?: AdminTableAlign): string {
  return cn(
    "align-middle text-foreground",
    align === "right" && "tabular-nums",
    align !== undefined && adminTableAlignClass(align),
    extra,
  );
}

/** 手写表格表头：统一 padding + 对齐（与 adminThClassName 语义类叠加） */
export function adminTableHeadCellClass(align: AdminTableAlign = "left", extra?: string): string {
  return cn(
    "px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap",
    adminTableAlignClass(align),
    extra,
  );
}

/** 手写表格单元格：统一 padding + 对齐 */
export function adminTableCellClass(align: AdminTableAlign = "left", extra?: string): string {
  return cn(
    "px-4 py-3 align-middle",
    adminTableAlignClass(align),
    align === "right" && "tabular-nums",
    extra,
  );
}

/** 手写表格表头行：labels 与 aligns 一一对应 */
export function adminTableTheadRow(
  labels: readonly string[],
  aligns: readonly AdminTableAlign[],
  renderLabel?: (label: string, index: number) => ReactNode,
) {
  return (
    <tr>
      {labels.map((label, index) => (
        <th key={`${label}-${index}`} className={adminTableHeadCellClass(aligns[index] ?? "left")}>
          {renderLabel ? renderLabel(label, index) : label}
        </th>
      ))}
    </tr>
  );
}
