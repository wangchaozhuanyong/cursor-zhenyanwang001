/** 与后台「标签管理」颜色选项一致；红/绿/蓝跟皮肤语义色，金跟价格色 */
const COLOR_MAP: Record<string, string> = {
  红色:
    "border-[color-mix(in_srgb,var(--theme-danger)_20%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-danger)_10%,var(--theme-surface))] text-[var(--theme-danger)]",
  绿色:
    "border-[color-mix(in_srgb,var(--theme-success)_20%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-success)_10%,var(--theme-surface))] text-[var(--theme-success)]",
  蓝色:
    "border-[color-mix(in_srgb,var(--theme-primary)_20%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))] text-[var(--theme-primary)]",
  金色: "border-[color-mix(in_srgb,var(--theme-price)_20%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))] text-[var(--theme-price)]",
};

export function productTagBadgeClass(color?: string | null): string {
  const key = color && COLOR_MAP[color] ? color : "金色";
  return COLOR_MAP[key] || COLOR_MAP.金色;
}

/** 商品标签行内样式：优先后台配置色，否则跟皮肤 */
export function productTagInlineStyle(tag: { bg_color?: string | null; text_color?: string | null }) {
  if (tag.bg_color || tag.text_color) {
    return {
      backgroundColor: tag.bg_color || undefined,
      borderColor: tag.bg_color || "var(--theme-border)",
      color: tag.text_color || "var(--theme-text)",
    } as const;
  }
  return {
    backgroundColor: "color-mix(in srgb, var(--theme-price) 14%, var(--theme-surface))",
    borderColor: "color-mix(in srgb, var(--theme-price) 22%, var(--theme-border))",
    color: "var(--theme-price)",
  } as const;
}
