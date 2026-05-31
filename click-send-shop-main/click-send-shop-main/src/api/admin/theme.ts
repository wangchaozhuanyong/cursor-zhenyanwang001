import { get, put } from "@/api/request";
import type { ThemeConfig, ThemeSkinsPayload } from "@/types/theme";

export function getActiveTheme() {
  return get<ThemeConfig>("/theme/active");
}

export function updateSystemTheme(data: ThemeConfig) {
  return put<ThemeConfig>("/admin/system/theme", data);
}

export function getThemeSkins() {
  return get<ThemeSkinsPayload>(`/theme/skins?_=${Date.now()}`);
}

export function updateSystemThemeSkins(data: ThemeSkinsPayload) {
  return put<ThemeSkinsPayload>("/admin/system/theme/skins", data);
}
