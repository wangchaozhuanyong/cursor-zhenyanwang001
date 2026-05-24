export type AdminTableColumnKind =
  | "name"
  | "text"
  | "number"
  | "money"
  | "percent"
  | "date"
  | "status"
  | "id"
  | "compact";

type ColumnPreset = {
  maxWidth: string;
  nowrap: boolean;
  allowTooltip: boolean;
};

const PRESETS: Record<AdminTableColumnKind, ColumnPreset> = {
  name: { maxWidth: "14rem", nowrap: false, allowTooltip: true },
  text: { maxWidth: "11rem", nowrap: false, allowTooltip: true },
  number: { maxWidth: "6.5rem", nowrap: true, allowTooltip: false },
  money: { maxWidth: "7.5rem", nowrap: true, allowTooltip: false },
  percent: { maxWidth: "5.5rem", nowrap: true, allowTooltip: false },
  date: { maxWidth: "9.5rem", nowrap: true, allowTooltip: true },
  status: { maxWidth: "7rem", nowrap: true, allowTooltip: false },
  id: { maxWidth: "7.5rem", nowrap: true, allowTooltip: true },
  compact: { maxWidth: "5rem", nowrap: true, allowTooltip: false },
};

export function getReportColumnKind(key: string): AdminTableColumnKind {
  if (key.endsWith("_id") || key === "id") return "id";
  if (
    key.endsWith("_at")
    || key.endsWith("_date")
    || key === "date"
    || key === "month"
    || key === "start_at"
    || key === "end_at"
  ) {
    return "date";
  }
  if (key.endsWith("_rate") || key.endsWith("_margin")) return "percent";
  if (
    key.includes("amount")
    || key.includes("sales")
    || key.includes("profit")
    || key.includes("fee")
    || key.includes("cost")
    || key === "price"
    || key === "paid_amount"
    || key === "gross_sales"
    || key === "net_sales"
  ) {
    return "money";
  }
  if (
    key.endsWith("_count")
    || key === "qty"
    || key === "pv"
    || key === "uv"
    || key === "stock"
    || key === "items_sold"
  ) {
    return "number";
  }
  if (key === "status" || key.endsWith("_status") || key === "type") return "status";
  if (
    key.includes("name")
    || key.includes("title")
    || key === "keyword"
    || key.includes("path")
    || key === "remark"
    || key === "notes"
    || key === "description"
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

export function getReportColumnMaxWidthStyle(key: string): { maxWidth: string } {
  return { maxWidth: getReportColumnPreset(key).maxWidth };
}

export function reportTableThClassName(key: string): string {
  const preset = getReportColumnPreset(key);
  const parts = ["px-2 py-2 text-center text-muted-foreground font-medium"];
  if (preset.nowrap) parts.push("whitespace-nowrap");
  return parts.join(" ");
}
