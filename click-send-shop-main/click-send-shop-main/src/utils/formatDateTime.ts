/** 全站日期时间：中国时区（Asia/Shanghai）+ 中文「年月日 / 时分秒」展示 */

export const CN_TIMEZONE = "Asia/Shanghai";

function pad2(n: number | string) {
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

type CnParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
};

function partsInChina(d: Date, withTime: boolean): CnParts {
  const fmt = new Intl.DateTimeFormat("zh-CN", {
    timeZone: CN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(withTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }
      : {}),
  });
  const map: Partial<CnParts> = {};
  for (const p of fmt.formatToParts(d)) {
    if (p.type === "literal") continue;
    map[p.type as keyof CnParts] = p.value;
  }
  return {
    year: map.year ?? "",
    month: pad2(map.month ?? ""),
    day: pad2(map.day ?? ""),
    hour: pad2(map.hour ?? "0"),
    minute: pad2(map.minute ?? "0"),
    second: pad2(map.second ?? "0"),
  };
}

function formatCnDateParts(p: Pick<CnParts, "year" | "month" | "day">) {
  return `${p.year}年${p.month}月${p.day}日`;
}

function formatCnDateTimeParts(p: CnParts) {
  return `${formatCnDateParts(p)} ${p.hour}:${p.minute}:${p.second}`;
}

function formatDotDateTimeMinuteParts(p: CnParts) {
  return `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}`;
}

/** 2026年05月17日 */
export function formatDate(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  const raw = typeof value === "string" ? value.trim() : "";
  if (isDateOnlyString(raw)) {
    const [y, m, d] = raw.split("-");
    return `${y}年${m}月${d}日`;
  }

  const d = parseDate(value);
  if (!d) return typeof value === "string" ? value : "—";

  if (raw && isMidnightIso(raw)) {
    return formatCnDateParts(partsInChina(d, false));
  }

  return formatCnDateParts(partsInChina(d, false));
}

/** 2026年05月17日 14:30:05（中国时区，24 小时制） */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  const raw = typeof value === "string" ? value.trim() : "";
  if (isDateOnlyString(raw)) {
    const [y, m, d] = raw.split("-");
    return `${y}年${m}月${d}日 00:00:00`;
  }

  const d = parseDate(value);
  if (!d) return typeof value === "string" ? value : "—";

  if (raw && isMidnightIso(raw)) {
    return `${formatCnDateParts(partsInChina(d, false))} 00:00:00`;
  }

  return formatCnDateTimeParts(partsInChina(d, true));
}

/** 2026.06.15 19:59 */
export function formatDateTimeDotMinute(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  const raw = typeof value === "string" ? value.trim() : "";
  if (isDateOnlyString(raw)) {
    const [y, m, d] = raw.split("-");
    return `${y}.${m}.${d} 00:00`;
  }

  const d = parseDate(value);
  if (!d) return typeof value === "string" ? value : "—";

  if (raw && isMidnightIso(raw)) {
    const p = partsInChina(d, false);
    return `${p.year}.${p.month}.${p.day} 00:00`;
  }

  return formatDotDateTimeMinuteParts(partsInChina(d, true));
}

/** 有效期等区间 */
export function formatDateRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
  opts?: { withTime?: boolean },
): string {
  const fmt = opts?.withTime ? formatDateTime : formatDate;
  const a = fmt(start);
  const b = fmt(end);
  if (a === "—" && b === "—") return "—";
  if (a === "—") return `至 ${b}`;
  if (b === "—") return `${a} 起`;
  return `${a} ~ ${b}`;
}

/** 表格/列表：自动识别纯日期或带时间的 ISO */
export function formatDateTimeAuto(value: unknown): string {
  if (value == null || value === "") return "—";
  if (value instanceof Date) return formatDateTime(value);
  if (typeof value !== "string" && typeof value !== "number") return String(value);

  const raw = String(value).trim();
  if (isDateOnlyString(raw)) return formatDate(raw);
  if (/T/.test(raw)) {
    if (isMidnightIso(raw)) return formatDate(raw);
    return formatDateTime(raw);
  }
  return formatDateTime(raw);
}




