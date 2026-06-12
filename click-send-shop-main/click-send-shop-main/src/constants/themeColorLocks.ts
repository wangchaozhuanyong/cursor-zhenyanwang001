/**
 * 业务品牌色锁定区。
 * 这些颜色本身有外部识别含义，不能跟随网站皮肤漂移，只允许集中维护。
 */
export const LOCKED_BRAND_COLORS = {
  wechat: "#07C160",
  telegram: "#229ED9",
  whatsapp: "#25D366",
  line: "#06C755",
} as const;

export const LOCKED_BRAND_COLOR_CLASSNAMES = {
  wechat: {
    icon: "text-[var(--brand-wechat)]",
    button:
      "border-[color-mix(in_srgb,var(--brand-wechat)_28%,var(--theme-border))] text-[color-mix(in_srgb,var(--brand-wechat)_72%,var(--theme-text-on-surface))] hover:bg-[color-mix(in_srgb,var(--brand-wechat)_10%,var(--theme-surface))]",
  },
  telegram: {
    icon: "text-[var(--brand-telegram)]",
    button:
      "border-[color-mix(in_srgb,var(--brand-telegram)_28%,var(--theme-border))] text-[color-mix(in_srgb,var(--brand-telegram)_72%,var(--theme-text-on-surface))] hover:bg-[color-mix(in_srgb,var(--brand-telegram)_10%,var(--theme-surface))]",
  },
  whatsapp: {
    icon: "text-[var(--brand-whatsapp)]",
    button:
      "border-[color-mix(in_srgb,var(--brand-whatsapp)_28%,var(--theme-border))] text-[color-mix(in_srgb,var(--brand-whatsapp)_72%,var(--theme-text-on-surface))] hover:bg-[color-mix(in_srgb,var(--brand-whatsapp)_10%,var(--theme-surface))]",
  },
  line: {
    icon: "text-[var(--brand-line)]",
    button:
      "border-[color-mix(in_srgb,var(--brand-line)_28%,var(--theme-border))] text-[color-mix(in_srgb,var(--brand-line)_72%,var(--theme-text-on-surface))] hover:bg-[color-mix(in_srgb,var(--brand-line)_10%,var(--theme-surface))]",
  },
} as const;
