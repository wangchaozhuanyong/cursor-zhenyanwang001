import type { SiteSettings, SiteSettingsSectionId } from "@/types/admin";
import { getAllPersistedFieldKeys, getSectionFieldKeys } from "./siteSettingsSections";
import { validateFooterNavItems, parseFooterNavJson } from "./footerNavUtils";

const CURRENCIES = new Set(["MYR", "CNY", "USD", "SGD"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ValidationIssue = { level: "error" | "warn"; message: string };

export function pickSettings(settings: SiteSettings, keys: readonly (keyof SiteSettings)[]): Partial<SiteSettings> {
  const out: Partial<SiteSettings> = {};
  for (const key of keys) {
    const v = settings[key];
    if (v !== undefined) out[key] = v;
  }
  return out;
}

export function normalizePayload(sectionId: SiteSettingsSectionId, payload: Partial<SiteSettings>): Partial<SiteSettings> {
  const next = { ...payload };
  if (sectionId === "orders" || getSectionFieldKeys("orders").some((k) => k in next)) {
    const days = parseInt(String(next.autoConfirmReceiveDays ?? "7"), 10);
    if (Number.isFinite(days)) {
      next.autoConfirmReceiveDays = String(Math.min(365, Math.max(1, days)));
    }
    const mins = parseInt(String(next.orderPaymentTimeoutMinutes ?? "30"), 10);
    if (Number.isFinite(mins)) {
      next.orderPaymentTimeoutMinutes = String(Math.min(43200, Math.max(1, mins)));
    }
  }
  if (sectionId === "tax" || getSectionFieldKeys("tax").some((k) => k in next)) {
    const rate = parseFloat(String(next.sstRatePercent ?? "0"));
    if (Number.isFinite(rate)) {
      next.sstRatePercent = String(Math.min(100, Math.max(0, rate)));
    }
  }
  return next;
}

export function validateSection(
  sectionId: SiteSettingsSectionId,
  settings: SiteSettings,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const keys = getSectionFieldKeys(sectionId);

  if (sectionId === "basic") {
    if (!String(settings.siteName ?? "").trim()) {
      issues.push({ level: "error", message: "站点名称必填" });
    }
    const cur = String(settings.currency ?? "").trim();
    if (!CURRENCIES.has(cur)) {
      issues.push({ level: "error", message: "货币必须是 MYR / CNY / USD / SGD" });
    }
  }

  if (sectionId === "contact") {
    const email = String(settings.contactEmail ?? "").trim();
    if (email && !EMAIL_RE.test(email)) {
      issues.push({ level: "error", message: "客服邮箱格式不正确" });
    }
  }

  if (sectionId === "orders") {
    const days = parseInt(String(settings.autoConfirmReceiveDays ?? ""), 10);
    if (!Number.isFinite(days) || days < 1 || days > 365) {
      issues.push({ level: "error", message: "自动确认天数须为 1–365" });
    }
    if (settings.orderPaymentTimeoutEnabled === "1") {
      const mins = parseInt(String(settings.orderPaymentTimeoutMinutes ?? ""), 10);
      if (!Number.isFinite(mins) || mins < 1 || mins > 43200) {
        issues.push({ level: "error", message: "未支付超时须为 1–43200 分钟" });
      }
    }
  }

  if (sectionId === "tax" && settings.sstEnabled === "1") {
    const rate = parseFloat(String(settings.sstRatePercent ?? ""));
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      issues.push({ level: "error", message: "SST 税率须为 0–100" });
    }
  }

  if (sectionId === "seo") {
    const desc = String(settings.seoDescription ?? "");
    if (desc.length > 160) {
      issues.push({ level: "warn", message: `SEO 描述已超过 160 字（当前 ${desc.length} 字），可能影响搜索结果展示` });
    }
    if (String(settings.ogImageUrl ?? "").trim()) {
      issues.push({ level: "warn", message: "分享图建议使用 1200×630 比例" });
    }
  }

  if (sectionId === "compliance" && settings.ageGateEnabled === "1") {
    const age = parseInt(String(settings.minimumAge ?? ""), 10);
    if (!Number.isFinite(age) || age < 0 || age > 120) {
      issues.push({ level: "error", message: "最低年龄须为 0–120" });
    }
  }

  if ((sectionId === "footer" || sectionId === "advanced") && keys.includes("footerNav")) {
    const { items, error } = parseFooterNavJson(settings.footerNav);
    if (error) issues.push({ level: "error", message: `页脚导航：${error}` });
    else {
      const navErr = validateFooterNavItems(items);
      if (navErr) issues.push({ level: "error", message: navErr });
    }
  }

  return issues;
}

export function validateAll(settings: SiteSettings): ValidationIssue[] {
  const ids: SiteSettingsSectionId[] = [
    "basic", "brand", "contact", "social", "orders", "tax", "seo", "compliance", "footer", "shopping", "analytics", "advanced",
  ];
  return ids.flatMap((id) => validateSection(id, settings));
}

export function buildSavePayload(
  settings: SiteSettings,
  mode: "section" | "all",
  sectionId?: SiteSettingsSectionId,
): Partial<SiteSettings> {
  const keys =
    mode === "all"
      ? getAllPersistedFieldKeys()
      : sectionId
        ? getSectionFieldKeys(sectionId)
        : [];
  const picked = pickSettings(settings, keys);
  if (mode === "section" && sectionId) {
    return normalizePayload(sectionId, picked);
  }
  let out: Partial<SiteSettings> = {};
  for (const id of [
    "basic", "brand", "contact", "social", "orders", "tax", "seo", "compliance", "footer", "shopping", "analytics",
  ] as SiteSettingsSectionId[]) {
    out = { ...out, ...normalizePayload(id, pickSettings(settings, getSectionFieldKeys(id))) };
  }
  return out;
}

export function sectionIsDirty(
  settings: SiteSettings,
  saved: SiteSettings,
  sectionId: SiteSettingsSectionId,
): boolean {
  const keys = getSectionFieldKeys(sectionId);
  return keys.some((k) => String(settings[k] ?? "") !== String(saved[k] ?? ""));
}
