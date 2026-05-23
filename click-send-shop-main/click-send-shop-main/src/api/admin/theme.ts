import { get, put } from "@/api/request";
import type { ThemeConfig } from "@/types/theme";

export function getActiveTheme() {
  return get<ThemeConfig>("/theme/active");
}

export function updateSystemTheme(data: ThemeConfig) {
  return put<ThemeConfig>("/admin/system/theme", data);
}

export function getThemeSkins() {
  return get<{
    defaultSkinId: string;
    activeSkinId: string;
    skins: Array<{ id: string; name: string; clientEnabled?: boolean; config: ThemeConfig }>;
  }>(`/theme/skins?_=${Date.now()}`);
}

export function updateSystemThemeSkins(data: {
  defaultSkinId: string;
  activeSkinId: string;
  skins: Array<{ id: string; name: string; clientEnabled?: boolean; config: ThemeConfig }>;
}) {
  return put<{
    defaultSkinId: string;
    activeSkinId: string;
    skins: Array<{ id: string; name: string; clientEnabled?: boolean; config: ThemeConfig }>;
  }>("/admin/system/theme/skins", data);
}

