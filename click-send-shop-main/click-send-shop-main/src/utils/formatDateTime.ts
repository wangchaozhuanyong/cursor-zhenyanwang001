/** 管理后台日期时间：ISO / UTC → 中文习惯可读格式 */

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseDate(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const raw = value.trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isDateOnlyString(raw: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(raw);
}

function isMidnightIso(raw: string) {
  return /T00:00:00(\.000)?(Z)?$/i.test(raw);
}

/** 2026-01-02 */
export function formatAdminDate(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  if (typeof value === "string" && isDateOnlyString(value.trim())) return value.trim();

  const d = parseDate(value);
  if (!d) return typeof value === "string" ? value : "—";

  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 2026-01-02 08:00:00（本地时区，24 小时制） */
export function formatAdminDateTime(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  const raw = typeof value === "string" ? value.trim() : "";
  if (isDateOnlyString(raw)) return `${raw} 00:00:00`;

  const d = parseDate(value);
  if (!d) return typeof value === "string" ? value : "—";

  if (raw && isMidnightIso(raw)) {
    return `${formatAdminDate(d)} 00:00:00`;
  }

  return `${formatAdminDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/** 有效期等区间：2026-01-02 ~ 2026-12-09 或带时分秒 */
export function formatAdminDateRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
  opts?: { withTime?: boolean },
): string {
  const fmt = opts?.withTime ? formatAdminDateTime : formatAdminDate;
  const a = fmt(start);
  const b = fmt(end);
  if (a === "—" && b === "—") return "—";
  if (a === "—") return `至 ${b}`;
  if (b === "—") return `${a} 起`;
  return `${a} ~ ${b}`;
}

/** 表格单元格：自动识别 ISO / 纯日期 */
export function formatAdminDateTimeAuto(value: unknown): string {
  if (value == null || value === "") return "—";
  if (value instanceof Date) return formatAdminDateTime(value);
  if (typeof value !== "string" && typeof value !== "number") return String(value);

  const raw = String(value).trim();
  if (isDateOnlyString(raw)) return raw;
  if (/T/.test(raw)) {
    if (isMidnightIso(raw)) return formatAdminDate(raw);
    return formatAdminDateTime(raw);
  }
  return formatAdminDateTime(raw);
}
