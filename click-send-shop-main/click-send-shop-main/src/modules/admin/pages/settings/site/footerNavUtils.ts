import type { FooterNavEditorItem } from "@/types/content";

export const DEFAULT_FOOTER_NAV_ITEMS: FooterNavEditorItem[] = [
  { label: "关于我们", path: "/about", section: "support", enabled: true, sortOrder: 1 },
  { label: "帮助中心", path: "/help", section: "support", enabled: true, sortOrder: 2 },
  { label: "隐私政策", path: "/content/privacy-policy", section: "policy", enabled: true, sortOrder: 3 },
  { label: "用户协议", path: "/content/terms-of-service", section: "policy", enabled: true, sortOrder: 4 },
  { label: "退款政策", path: "/content/refund-policy", section: "policy", enabled: true, sortOrder: 5 },
  { label: "配送政策", path: "/content/shipping-policy", section: "policy", enabled: true, sortOrder: 6 },
];

const SECTION_SET = new Set<FooterNavEditorItem["section"]>(["support", "policy", "other"]);

export function normalizeFooterNavItem(raw: unknown, index: number): FooterNavEditorItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const label = String(o.label ?? "").trim();
  const path = String(o.path ?? "").trim();
  if (!label || !path) return null;
  const sectionRaw = String(o.section ?? "support");
  const section = SECTION_SET.has(sectionRaw as FooterNavEditorItem["section"])
    ? (sectionRaw as FooterNavEditorItem["section"])
    : "support";
  return {
    label,
    path,
    section,
    enabled: o.enabled === false ? false : true,
    sortOrder: Number(o.sortOrder ?? index + 1) || index + 1,
  };
}

export function parseFooterNavJson(raw?: string): { items: FooterNavEditorItem[]; error?: string } {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return { items: [...DEFAULT_FOOTER_NAV_ITEMS] };
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) return { items: [], error: "footerNav 必须为 JSON 数组" };
    const items = parsed
      .map((row, idx) => normalizeFooterNavItem(row, idx))
      .filter((x): x is FooterNavEditorItem => Boolean(x))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    if (!items.length) return { items: [], error: "至少需要一条有效导航" };
    return { items };
  } catch {
    return { items: [], error: "JSON 解析失败" };
  }
}

/** 写入 site_settings：仅保留启用项，按 sortOrder 排序 */
export function serializeFooterNavForSave(items: FooterNavEditorItem[]): string {
  const enabled = items
    .filter((it) => it.enabled !== false && it.label.trim() && it.path.trim())
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ label, path, section, sortOrder }) => ({
      label: label.trim(),
      path: path.trim(),
      section,
      sortOrder,
      enabled: true,
    }));
  return enabled.length ? JSON.stringify(enabled) : "";
}

export function validateFooterNavItems(items: FooterNavEditorItem[]): string | null {
  for (const it of items.filter((x) => x.enabled !== false)) {
    if (!it.label.trim() || !it.path.trim()) return "每条导航必须填写名称和路径";
    if (!SECTION_SET.has(it.section)) return "分组只能是 support / policy / other";
  }
  return null;
}
