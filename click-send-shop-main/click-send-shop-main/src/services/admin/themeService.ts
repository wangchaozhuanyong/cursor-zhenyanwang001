import * as themeApi from "@/api/admin/theme";
import { ApiError, type ApiResponse } from "@/types/common";
import type { ThemeConfig } from "@/types/theme";

function assertApiSuccess<T>(res: ApiResponse<T>): T {
  if (res.code !== 0) {
    throw new ApiError(res.code, res.message || "请求失败");
  }
  return res.data;
}

export type ThemeSkinsPayload = {
  defaultSkinId: string;
  activeSkinId: string;
  skins: Array<{ id: string; name: string; clientEnabled?: boolean; config: ThemeConfig }>;
};

export async function fetchActiveThemeConfig() {
  const res = await themeApi.getActiveTheme();
  return assertApiSuccess(res);
}

export async function saveSystemThemeConfig(data: ThemeConfig) {
  const res = await themeApi.updateSystemTheme(data);
  return assertApiSuccess(res);
}

export async function fetchThemeSkins(): Promise<ThemeSkinsPayload> {
  const res = await themeApi.getThemeSkins();
  return assertApiSuccess<ThemeSkinsPayload>(res);
}

export async function saveSystemThemeSkins(data: ThemeSkinsPayload): Promise<ThemeSkinsPayload> {
  const res = await themeApi.updateSystemThemeSkins(data);
  return assertApiSuccess<ThemeSkinsPayload>(res);
}
