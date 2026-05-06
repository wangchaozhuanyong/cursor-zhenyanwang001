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

