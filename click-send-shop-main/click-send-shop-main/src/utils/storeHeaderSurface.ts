import type { ThemeConfig } from "@/types/theme";

/** 与会员首页顶栏一致，供 StoreTabHeader / 首页共用 */
export function getStoreHeaderSurfaceClass(themeConfig: ThemeConfig): string {
  const headerStyle = themeConfig.headerStyle;
  if (headerStyle === "dark") {
    return "bg-[color-mix(in_srgb,var(--theme-primary)_88%,black)] text-[var(--theme-primary-foreground)] border-transparent";
  }
  if (headerStyle === "transparent") {
    return "bg-transparent border-transparent";
  }
  if (headerStyle === "premium") {
    return "bg-[color-mix(in_srgb,var(--theme-secondary)_16%,var(--theme-surface))] border-[var(--theme-border)]";
  }
  return "bg-[var(--theme-bg)]/90 border-[var(--theme-border)]";
}
