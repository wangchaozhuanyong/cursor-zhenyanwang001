import * as themeApi from "@/api/admin/theme";
import { ApiError, type ApiResponse } from "@/types/common";
import type { ThemeConfig, ThemeSkin, ThemeSkinsPayload } from "@/types/theme";

function assertApiSuccess<T>(res: ApiResponse<T>): T {
  if (res.code !== 0) {
    throw new ApiError(res.code, res.message || "请求失败");
  }
  return res.data;
}

export async function fetchActiveThemeConfig() {
  const res = await themeApi.getActiveTheme();
  return assertApiSuccess(res);
}

export async function saveSystemThemeConfig(data: ThemeConfig) {
  const res = await themeApi.updateSystemTheme(data);
  return assertApiSuccess(res);
}

export async function fetchThemeSkins(): Promise<ThemeSkinsPayload> {
  const res = await themeApi.getAdminThemeSkins();
  return assertApiSuccess<ThemeSkinsPayload>(res);
}

export async function saveSystemThemeSkins(data: ThemeSkinsPayload): Promise<ThemeSkinsPayload> {
  const res = await themeApi.updateSystemThemeSkins(data);
  return assertApiSuccess<ThemeSkinsPayload>(res);
}

export async function saveThemeSkinDraft(themeKey: string, data: Partial<ThemeSkin>): Promise<ThemeSkin> {
  const res = await themeApi.saveThemeSkinDraft(themeKey, data);
  return assertApiSuccess<ThemeSkin>(res);
}

export async function createThemePreviewDraft(themeKey: string, data: { config: ThemeConfig }) {
  const res = await themeApi.createThemePreviewDraft(themeKey, data);
  return assertApiSuccess(res);
}

export async function publishThemeSkin(themeKey: string, data: { config?: ThemeConfig; setDefault?: boolean } = {}): Promise<ThemeSkinsPayload> {
  const res = await themeApi.publishThemeSkin(themeKey, data);
  return assertApiSuccess<ThemeSkinsPayload>(res);
}

export async function disableThemeSkin(themeKey: string): Promise<ThemeSkinsPayload> {
  const res = await themeApi.disableThemeSkin(themeKey);
  return assertApiSuccess<ThemeSkinsPayload>(res);
}
