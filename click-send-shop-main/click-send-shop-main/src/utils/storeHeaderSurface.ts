import type { ThemeConfig } from "@/types/theme";

/** 与会员首页顶栏一致，供 StoreTabHeader / 首页共用 */
export function getStoreHeaderSurfaceClass(themeConfig: ThemeConfig): string {
  const headerStyle = themeConfig.headerStyle;
  if (headerStyle === "dark") {
    return "bg-[color-mix(in_srgb,var(--theme-primary)_88%,black)] text-[var(--theme-primary-foreground)] border-transparent shadow-[var(--store-header-shadow)]";
  }
  if (headerStyle === "transparent") {
    return "bg-transparent border-transparent";
  }
  if (headerStyle === "premium") {
    return "store-glass-surface";
  }
  return "store-glass-surface";
}
