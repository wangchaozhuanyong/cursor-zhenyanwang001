import * as settingsApi from "@/api/admin/settings";
import { uploadAdminSiteAsset } from "@/api/modules/upload";
import type { SiteSettings, SiteSettingsSectionId } from "@/types/admin";
import type { SiteCapabilities } from "@/types/siteCapabilities";
import {
  buildSavePayload,
  pickSettings,
  validateAll,
  validateSection,
} from "@/modules/admin/pages/settings/site/siteSettingsValidation";
import { getSectionFieldKeys } from "@/modules/admin/pages/settings/site/siteSettingsSections";

export type { SiteSettingsSectionId };
export { buildSavePayload, pickSettings, validateAll, validateSection };

export async function fetchSiteSettings() {
  const res = await settingsApi.getSiteSettings();
  return res.data;
}

/** 仅提取某分组字段，供分组保存使用（不改变 API 契约） */
export function pickSiteSettingsForSection(
  settings: SiteSettings,
  sectionId: SiteSettingsSectionId,
): Partial<SiteSettings> {
  return pickSettings(settings, getSectionFieldKeys(sectionId));
}

export async function updateSiteSettings(data: Partial<SiteSettings>) {
  const res = await settingsApi.updateSiteSettings(data);
  return res.data;
}

/** 保存当前分组：校验 + 组 payload + 提交 */
export async function updateSiteSettingsSection(
  settings: SiteSettings,
  sectionId: SiteSettingsSectionId,
) {
  const errors = validateSection(sectionId, settings).filter((i) => i.level === "error");
  if (errors.length) {
    throw new Error(errors[0].message);
  }
  const payload = buildSavePayload(settings, "section", sectionId);
  return updateSiteSettings(payload);
}

export async function uploadSiteAsset(key: "logoUrl" | "faviconUrl", file: File) {
  return uploadAdminSiteAsset(key, file);
}

export async function fetchSiteCapabilities() {
  const res = await settingsApi.getSiteCapabilities();
  return res.data;
}

export async function updateSiteCapabilities(data: SiteCapabilities) {
  const res = await settingsApi.updateSiteCapabilities(data);
  return res.data;
}
