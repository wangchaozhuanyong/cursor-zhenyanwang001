import { get, patch, post, put } from "@/api/request";
import type { ThemeConfig, ThemeSkin, ThemeSkinsPayload } from "@/types/theme";

export function getActiveTheme() {
  return get<ThemeConfig>("/theme/active");
}

export function updateSystemTheme(data: ThemeConfig) {
  return put<ThemeConfig>("/admin/system/theme", data);
}

export function getThemeSkins() {
  return get<ThemeSkinsPayload>(`/theme/skins?_=${Date.now()}`);
}

export function getAdminThemeSkins() {
  return get<ThemeSkinsPayload>("/admin/system/theme/skins");
}

export function updateSystemThemeSkins(data: ThemeSkinsPayload) {
  return put<ThemeSkinsPayload>("/admin/system/theme/skins", data);
}

export function saveThemeSkinDraft(themeKey: string, data: Partial<ThemeSkin>) {
  return patch<ThemeSkin>(`/admin/themes/${encodeURIComponent(themeKey)}`, data);
}

export function createThemePreviewDraft(themeKey: string, data: { config: ThemeConfig }) {
  return post<{ draftToken: string; themeKey: string; expiresAt: string }>(
    `/admin/themes/${encodeURIComponent(themeKey)}/preview`,
    data,
    { loadingMode: "silent" },
  );
}

export function publishThemeSkin(themeKey: string, data: { config?: ThemeConfig; setDefault?: boolean } = {}) {
  return post<ThemeSkinsPayload>(`/admin/themes/${encodeURIComponent(themeKey)}/publish`, data);
}

export function disableThemeSkin(themeKey: string) {
  return post<ThemeSkinsPayload>(`/admin/themes/${encodeURIComponent(themeKey)}/disable`);
}
