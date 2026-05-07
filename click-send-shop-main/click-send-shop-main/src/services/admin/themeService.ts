import * as themeApi from "@/api/admin/theme";
import type { ThemeConfig } from "@/types/theme";

export async function fetchActiveThemeConfig() {
  const res = await themeApi.getActiveTheme();
  return res.data;
}

export async function saveSystemThemeConfig(data: ThemeConfig) {
  const res = await themeApi.updateSystemTheme(data);
  return res.data;
}

export async function fetchThemeSkins() {
  const res = await themeApi.getThemeSkins();
  return res.data;
}

export async function saveSystemThemeSkins(data: {
  defaultSkinId: string;
  skins: Array<{ id: string; name: string; config: ThemeConfig }>;
}) {
  const res = await themeApi.updateSystemThemeSkins(data);
  return res.data;
}

