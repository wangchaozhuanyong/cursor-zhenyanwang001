/** 后台保存皮肤后通知前台（同标签 CustomEvent + 跨标签 localStorage） */
export const THEME_REVISION_KEY = "theme_revision";

export function notifyGlobalThemeUpdated(): void {
  try {
    localStorage.setItem(THEME_REVISION_KEY, String(Date.now()));
  } catch {
    /* 隐私模式等 */
  }
  window.dispatchEvent(new Event("app:theme-updated"));
}
