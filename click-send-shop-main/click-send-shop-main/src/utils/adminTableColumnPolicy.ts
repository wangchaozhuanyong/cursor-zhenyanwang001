import {
  ADMIN_TABLE_ALIGN_CENTER_CLASS,
  ADMIN_TABLE_ALIGN_LEFT_CLASS,
  ADMIN_TABLE_ALIGN_RIGHT_CLASS,
  type AdminTableAlign,
} from "@/utils/adminTableClasses";

export type AdminTableColumnKind =
  | "name"
  | "text"
  | "number"
  | "money"
  | "percent"
  | "date"
  | "status"
  | "id"
  | "compact"
  | "action";

type ColumnPreset = {
  maxWidth: string;
  nowrap: boolean;
  allowTooltip: boolean;
  align: AdminTableAlign;
};

const PRESETS: Record<AdminTableColumnKind, ColumnPreset> = {
  name: { maxWidth: "14rem", nowrap: false, allowTooltip: true, align: "left" },
  text: { maxWidth: "11rem", nowrap: false, allowTooltip: true, align: "left" },
  number: { maxWidth: "6.5rem", nowrap: true, allowTooltip: false, align: "right" },
  money: { maxWidth: "7.5rem", nowrap: true, allowTooltip: false, align: "right" },
  percent: { maxWidth: "5.5rem", nowrap: true, allowTooltip: false, align: "right" },
  date: { maxWidth: "9.5rem", nowrap: true, allowTooltip: true, align: "left" },
  status: { maxWidth: "7rem", nowrap: true, allowTooltip: false, align: "center" },
  id: { maxWidth: "7.5rem", nowrap: true, allowTooltip: true, align: "left" },
  compact: { maxWidth: "5rem", nowrap: true, allowTooltip: false, align: "center" },
  action: { maxWidth: "8rem", nowrap: true, allowTooltip: false, align: "right" },
};

function isMoneyKey(key: string): boolean {
  if (key.endsWith("_qty") || key === "qty" || key === "quantity") return false;
  return (
    key.includes("amount")
    || key.endsWith("_fee")
    || key.includes("profit")
    || key.includes("cost")
    || key === "price"
    || key === "paid_amount"
    || key === "gross_sales"
    || key === "net_sales"
    || key === "revenue"
    || key === "subtotal"
    || key === "total"
    || key === "discount"
    || key.includes("wallet")
    || (
      key.includes("sales")
      && !key.endsWith("_qty")
      && key !== "sales_qty"
      && !key.includes("daily")
      && !key.endsWith("_days")
    )
  );
}

function isNumberKey(key: string): boolean {
  return (
    key === "avg_daily_sales"
    || key === "available_stock_days"
    || key.endsWith("_count")
    || key.endsWith("_qty")
    || key === "qty"
    || key === "quantity"
    || key === "pv"
    || key === "uv"
    || key === "stock"
    || key === "points"
    || key === "points_balance"
    || key === "items_sold"
    || key === "sales_qty"
    || key.endsWith("_stock")
    || key.endsWith("_7d")
    || key.endsWith("_30d")
    || key === "priority"
    || key === "multiplier_percent"
    || key === "fixed_points"
    || key === "points_percent"
  );
}

export function getReportColumnKind(key: string): AdminTableColumnKind {
  if (key === "action" || key === "actions" || key === "op" || key === "operations") {
    return "action";
  }
  if (key.endsWith("_id") || key === "id") return "id";
  if (
    key.endsWith("_at")
    || key.endsWith("_date")
    || key === "date"
    || key === "month"
    || key === "start_at"
    || key === "end_at"
    || key === "expense_date"
  ) {
    return "date";
  }
  if (key.endsWith("_rate") || key.endsWith("_margin") || key.includes("percent")) {
    return "percent";
  }
  if (isNumberKey(key)) return "number";
  if (isMoneyKey(key)) return "money";
  if (key === "status" || key.endsWith("_status") || key === "type" || key === "enabled") {
    return "status";
  }
  if (
    key.includes("name")
    || key.includes("title")
    || key === "keyword"
    || key.includes("path")
    || key === "remark"
    || key === "notes"
    || key === "description"
    || key === "category"
  ) {
    return "name";
  }
  return "text";
}

export function getColumnPreset(kind: AdminTableColumnKind): ColumnPreset {
  return PRESETS[kind];
}

export function getReportColumnPreset(key: string): ColumnPreset {
  return getColumnPreset(getReportColumnKind(key));
}

export function getReportColumnAlign(key: string): AdminTableAlign {
  return getReportColumnPreset(key).align;
}

export function getReportColumnAlignClass(key: string): string {
  const align = getReportColumnAlign(key);
  if (align === "right") return ADMIN_TABLE_ALIGN_RIGHT_CLASS;
  if (align === "center") return ADMIN_TABLE_ALIGN_CENTER_CLASS;
  return ADMIN_TABLE_ALIGN_LEFT_CLASS;
}

export function getReportColumnMaxWidthStyle(key: string): { maxWidth: string } {
  return { maxWidth: getReportColumnPreset(key).maxWidth };
}

export function reportTableThClassName(key: string): string {
  const preset = getReportColumnPreset(key);
  const parts = [
    "px-2 py-2 text-muted-foreground font-medium",
    getReportColumnAlignClass(key),
  ];
  if (preset.nowrap) parts.push("whitespace-nowrap");
  if (preset.align === "right") parts.push("tabular-nums");
  return parts.join(" ");
}
