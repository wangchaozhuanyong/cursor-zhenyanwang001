/** 与前台平板策略对齐：md 起进入平板，xl 才进入完整桌面。 */
export const MODAL_BREAKPOINTS = {
  md: 768,
  xl: 1280,
} as const;

/** 手机：< 768px */
export const MQ_MOBILE = `(max-width: ${MODAL_BREAKPOINTS.md - 1}px)`;

/** 平板：768px – 1279px */
export const MQ_TABLET = `(min-width: ${MODAL_BREAKPOINTS.md}px) and (max-width: ${MODAL_BREAKPOINTS.xl - 1}px)`;

/** 电脑：≥ 1280px */
export const MQ_DESKTOP = `(min-width: ${MODAL_BREAKPOINTS.xl}px)`;

/** 仅移动端优先使用 Bottom Sheet；平板及以上默认使用 Dialog。 */
export const MQ_SHEET_PREFERRED = MQ_MOBILE;

export type AppBreakpoint = "mobile" | "tablet" | "desktop";

export type AppModalTier = "light" | "standard" | "form" | "immersive";

export type ModalPresentation = "auto" | "sheet" | "dialog";

/** 弹层 z-index 基准（高于 Admin 侧栏 z-50、AnchoredPopover z-70） */
export const MODAL_BASE_Z = 100;

export const MODAL_Z_STEP = 20;
